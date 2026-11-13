"""Local Flask companion to the static AZ4CAF study notebook."""

import json
import os
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, render_template, request, send_from_directory

try:
    import pymysql
except ImportError:  # MySQL is optional; the JSON dataset works on its own.
    pymysql = None

app = Flask(__name__)
app.config["MYSQL_ENABLED"] = os.getenv("MYSQL_ENABLED", "0").lower() in {"1", "true", "yes"}

DOCS_DIR = Path(__file__).resolve().parent / "docs"
DATA_FILE = DOCS_DIR / "data" / "study_content.json"


def load_content() -> dict[str, Any]:
    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


CONTENT = load_content()
FALLBACK_UNITS = CONTENT.get("units", [])
FALLBACK_NOTES = CONTENT.get("notes", [])
FALLBACK_FLASHCARDS = CONTENT.get("flashcards", [])
SEMESTER_BY_UNIT = {unit["name"]: unit["semester"] for unit in FALLBACK_UNITS}

for note in FALLBACK_NOTES:
    note.setdefault("semester", SEMESTER_BY_UNIT.get(note.get("unit"), 1))
for card in FALLBACK_FLASHCARDS:
    card.setdefault("semester", SEMESTER_BY_UNIT.get(card.get("unit"), 1))

UNITS_QUERY = "SELECT name, semester FROM units ORDER BY semester, name"
NOTES_QUERY = """
    SELECT n.topic, n.content, n.category, n.vendor, u.name AS unit, u.semester,
           n.source_title, n.source_url, n.case_study
    FROM study_notes n
    JOIN units u ON u.id = n.unit_id
    ORDER BY u.semester, u.name, n.topic
"""
CARDS_QUERY = """
    SELECT f.question, f.answer, f.category, u.name AS unit, u.semester
    FROM flashcards f
    JOIN units u ON u.id = f.unit_id
    ORDER BY u.semester, u.name, f.id
"""


def get_db_connection():
    if not app.config["MYSQL_ENABLED"] or pymysql is None:
        return None

    try:
        return pymysql.connect(
            host=os.getenv("MYSQL_HOST", "127.0.0.1"),
            port=int(os.getenv("MYSQL_PORT", "3306")),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            database=os.getenv("MYSQL_DATABASE", "az4caf_study"),
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=2,
            read_timeout=3,
            write_timeout=3,
            charset="utf8mb4",
        )
    except Exception:
        # Driver errors may contain credentials or server details; keep logs generic.
        app.logger.warning("MySQL unavailable; serving the bundled study content.")
        return None


def fetch_all(query: str, args: tuple[Any, ...] = ()):
    conn = get_db_connection()
    if conn is None:
        return None
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, args)
            return cursor.fetchall()
    except Exception:
        app.logger.warning("MySQL query failed; serving the bundled study content.")
        return None
    finally:
        try:
            conn.close()
        except Exception:
            pass


def merge_by_key(
    base_rows: list[dict[str, Any]],
    db_rows: list[dict[str, Any]] | None,
    key_fields: tuple[str, ...],
) -> list[dict[str, Any]]:
    """Overlay DB values without discarding richer JSON-only teaching fields."""
    def key_for(row):
        return tuple(str(row.get(field, "")).strip().casefold() for field in key_fields)

    merged = {key_for(row): dict(row) for row in base_rows}
    for row in db_rows or []:
        key = key_for(row)
        if not all(key):
            continue
        existing = merged.get(key, {})
        populated = {
            field: value for field, value in row.items()
            if value is not None and (not isinstance(value, str) or value.strip())
        }
        # Keep canonical identity spelling, which links notes to unit metadata.
        if existing:
            for field in key_fields:
                populated[field] = existing[field]
        merged[key] = {**existing, **populated}
    return list(merged.values())


def get_units():
    return merge_by_key(FALLBACK_UNITS, fetch_all(UNITS_QUERY), ("name",))


def get_notes():
    return merge_by_key(FALLBACK_NOTES, fetch_all(NOTES_QUERY), ("unit", "topic"))


def get_cards(notes=None):
    cards = merge_by_key(FALLBACK_FLASHCARDS, fetch_all(CARDS_QUERY), ("unit", "question"))
    if notes is None:
        notes = get_notes()
    vendors_by_group = {}
    for note in notes:
        group = (note.get("unit", "").casefold(), note.get("category", "").casefold())
        if note.get("vendor"):
            vendors_by_group.setdefault(group, set()).add(note["vendor"])
    for card in cards:
        group = (card.get("unit", "").casefold(), card.get("category", "").casefold())
        card["vendors"] = [card["vendor"]] if card.get("vendor") else sorted(vendors_by_group.get(group, []))
    return cards


def text_values(value):
    if isinstance(value, dict):
        return " ".join(text_values(part) for part in value.values())
    if isinstance(value, list):
        return " ".join(text_values(part) for part in value)
    return str(value or "")


def filter_rows(rows):
    for field in ("semester", "unit", "category", "vendor"):
        value = request.args.get(field, "").strip().casefold()
        if not value:
            continue
        if field == "vendor":
            rows = [row for row in rows if value in {
                str(vendor).casefold() for vendor in row.get("vendors", [row.get("vendor", "")])
            }]
        else:
            rows = [row for row in rows if str(row.get(field, "")).casefold() == value]
    query = request.args.get("q", "").strip().casefold()
    if query:
        rows = [row for row in rows if query in text_values(row).casefold()]
    return rows


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/assets/<path:filename>")
def assets(filename):
    return send_from_directory(DOCS_DIR / "assets", filename)


@app.route("/guides/<path:filename>")
def guides(filename):
    return send_from_directory(DOCS_DIR / "guides", filename)


@app.route("/index.html")
def static_index_alias():
    return index()


@app.route("/api/content")
def api_content():
    notes = get_notes()
    return jsonify({**CONTENT, "units": get_units(), "notes": notes, "flashcards": get_cards(notes)})


@app.route("/api/units")
def api_units():
    return jsonify(get_units())


@app.route("/api/notes")
def api_notes():
    return jsonify(filter_rows(get_notes()))


@app.route("/api/flashcards")
def api_flashcards():
    return jsonify(filter_rows(get_cards()))


if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "0") == "1")
