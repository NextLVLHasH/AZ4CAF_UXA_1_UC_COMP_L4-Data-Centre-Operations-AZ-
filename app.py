import json
import os
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, render_template, request

try:
    import pymysql
except Exception:  # pragma: no cover
    pymysql = None

app = Flask(__name__)

DATA_FILE = Path(__file__).resolve().parent / "docs" / "data" / "study_content.json"


def load_content() -> dict[str, list[dict[str, Any]]]:
    if DATA_FILE.exists():
        with DATA_FILE.open("r", encoding="utf-8") as file:
            return json.load(file)

    return {"units": [], "notes": [], "flashcards": []}


CONTENT = load_content()
FALLBACK_UNITS = CONTENT.get("units", [])
FALLBACK_NOTES = CONTENT.get("notes", [])
FALLBACK_FLASHCARDS = CONTENT.get("flashcards", [])
SEMESTER_BY_UNIT = {unit["name"]: unit["semester"] for unit in FALLBACK_UNITS}

for note in FALLBACK_NOTES:
    note.setdefault("semester", SEMESTER_BY_UNIT.get(note.get("unit"), 1))
for card in FALLBACK_FLASHCARDS:
    card.setdefault("semester", SEMESTER_BY_UNIT.get(card.get("unit"), 1))


def get_db_connection():
    if pymysql is None:
        return None

    config = {
        "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
        "port": int(os.getenv("MYSQL_PORT", "3306")),
        "user": os.getenv("MYSQL_USER", "root"),
        "password": os.getenv("MYSQL_PASSWORD", ""),
        "database": os.getenv("MYSQL_DATABASE", "az4caf_study"),
        "cursorclass": pymysql.cursors.DictCursor,
        "connect_timeout": 2,
    }

    try:
        return pymysql.connect(**config)
    except Exception:
        return None


def fetch_all(query: str, args: tuple[Any, ...] = ()):
    conn = get_db_connection()
    if conn is None:
        return None

    try:
        with conn.cursor() as cursor:
            cursor.execute(query, args)
            return cursor.fetchall()
    finally:
        conn.close()


def merge_by_key(base_rows: list[dict[str, Any]], db_rows: list[dict[str, Any]] | None, key_fields: tuple[str, ...]):
    if not db_rows:
        return base_rows

    merged = {tuple(str(row.get(field, "")).lower() for field in key_fields): row for row in base_rows}
    for row in db_rows:
        key = tuple(str(row.get(field, "")).lower() for field in key_fields)
        merged[key] = row

    return list(merged.values())


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/units")
def api_units():
    db_rows = fetch_all("SELECT name, semester FROM units ORDER BY semester, name")
    units = merge_by_key(FALLBACK_UNITS, db_rows, ("name",))
    units.sort(key=lambda unit: (unit.get("semester", 9), unit.get("name", "")))
    return jsonify(units)


@app.route("/api/notes")
def api_notes():
    filters = {
        "semester": request.args.get("semester"),
        "unit": request.args.get("unit"),
        "category": request.args.get("category"),
        "vendor": request.args.get("vendor"),
    }

    db_rows = fetch_all(
        """
        SELECT n.topic, n.content, n.category, n.vendor, u.name AS unit, u.semester,
               n.source_title, n.source_url, n.case_study
        FROM study_notes n
        JOIN units u ON u.id = n.unit_id
        ORDER BY u.semester, u.name, n.topic
        """
    )

    notes = merge_by_key(FALLBACK_NOTES, db_rows, ("unit", "topic"))

    for key, value in filters.items():
        if not value:
            continue
        if key == "semester":
            notes = [note for note in notes if str(note.get("semester")) == str(value)]
        else:
            notes = [note for note in notes if str(note.get(key, "")).lower() == value.lower()]

    notes.sort(key=lambda note: (note.get("semester", 9), note.get("unit", ""), note.get("topic", "")))
    return jsonify(notes)


@app.route("/api/flashcards")
def api_flashcards():
    filters = {
        "semester": request.args.get("semester"),
        "unit": request.args.get("unit"),
        "category": request.args.get("category"),
    }

    db_rows = fetch_all(
        """
        SELECT f.question, f.answer, f.category, u.name AS unit, u.semester
        FROM flashcards f
        JOIN units u ON u.id = f.unit_id
        ORDER BY u.semester, u.name, f.id
        """
    )

    cards = merge_by_key(FALLBACK_FLASHCARDS, db_rows, ("unit", "question"))

    for key, value in filters.items():
        if not value:
            continue
        if key == "semester":
            cards = [card for card in cards if str(card.get("semester")) == str(value)]
        else:
            cards = [card for card in cards if str(card.get(key, "")).lower() == value.lower()]

    cards.sort(key=lambda card: (card.get("semester", 9), card.get("unit", ""), card.get("question", "")))
    return jsonify(cards)


if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "0") == "1")
