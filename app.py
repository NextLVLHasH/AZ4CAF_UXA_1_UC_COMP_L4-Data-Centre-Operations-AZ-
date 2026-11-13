import os
from typing import Any

from flask import Flask, jsonify, render_template, request

try:
    import pymysql
except Exception:  # pragma: no cover
    pymysql = None

app = Flask(__name__)


FALLBACK_UNITS = [
    {"name": "Fundamentals of Computer Science", "semester": 1},
    {"name": "Computer Systems Architecture (A+)", "semester": 1},
    {"name": "Core Networking (CCNA)", "semester": 1},
    {"name": "Applied Networking (CCNA)", "semester": 1},
    {"name": "Operating Systems", "semester": 2},
    {"name": "Core AI", "semester": 2},
    {"name": "Work Based Learning", "semester": 2},
    {"name": "Professional Practice", "semester": 2},
    {"name": "Designing a Computing Project (Optional)", "semester": 2},
]

FALLBACK_NOTES = [
    {
        "unit": "Core Networking (CCNA)",
        "topic": "VLANs and Trunking",
        "category": "switching",
        "vendor": "Cisco",
        "content": "Configure access/trunk ports, VLAN IDs, and inter-VLAN routing basics.",
    },
    {
        "unit": "Applied Networking (CCNA)",
        "topic": "Managed Switching",
        "category": "switching",
        "vendor": "Netgear",
        "content": "Use web and CLI tools to set port isolation, STP, and link aggregation.",
    },
    {
        "unit": "Applied Networking (CCNA)",
        "topic": "FortiSwitch Integration",
        "category": "switching",
        "vendor": "Fortinet",
        "content": "Manage FortiSwitch from FortiGate/FortiLink for policy-driven segmentation.",
    },
    {
        "unit": "Applied Networking (CCNA)",
        "topic": "Firewall Policy",
        "category": "firewall",
        "vendor": "Multi-vendor",
        "content": "Apply least privilege ACLs, zones, NAT, and logging for incident response.",
    },
    {
        "unit": "Core Networking (CCNA)",
        "topic": "Fiber Optics",
        "category": "fiber",
        "vendor": "Generic",
        "content": "Understand SMF vs MMF, connectors, transceivers (SFP/SFP+/QSFP), and budgets.",
    },
    {
        "unit": "Operating Systems",
        "topic": "Linux and Windows Ops",
        "category": "systems",
        "vendor": "Generic",
        "content": "Process/service management, patching, hardening, and access control.",
    },
    {
        "unit": "Computer Systems Architecture (A+)",
        "topic": "CompTIA A+ Hardware",
        "category": "hardware",
        "vendor": "CompTIA",
        "content": "Motherboards, CPUs, memory, storage RAID, and maintenance workflows.",
    },
    {
        "unit": "Core AI",
        "topic": "AI Foundations",
        "category": "ai",
        "vendor": "Generic",
        "content": "Data lifecycle, model evaluation, ethics, and practical AI operations.",
    },
    {
        "unit": "Work Based Learning",
        "topic": "Amazon Data Centre Internship",
        "category": "professional",
        "vendor": "Amazon",
        "content": "14-week experiential placement from Jan 2027 focused on operational readiness.",
    },
    {
        "unit": "Professional Practice",
        "topic": "Transferable Skills",
        "category": "professional",
        "vendor": "Generic",
        "content": "Communication, teamwork, planning, problem-solving, and numerical techniques.",
    },
]

FALLBACK_FLASHCARDS = [
    {
        "question": "Which semester includes Core Networking and Applied Networking?",
        "answer": "Semester 1 (Sep 2026 to Feb 2027).",
        "unit": "Core Networking (CCNA)",
        "category": "programme",
    },
    {
        "question": "What switching standards prevent loops in switched networks?",
        "answer": "Spanning Tree Protocol family (STP/RSTP/MSTP).",
        "unit": "Applied Networking (CCNA)",
        "category": "switching",
    },
    {
        "question": "How are Fortinet switches commonly centrally managed?",
        "answer": "Using FortiLink integration with FortiGate.",
        "unit": "Applied Networking (CCNA)",
        "category": "switching",
    },
    {
        "question": "Name two common firewall controls in data centres.",
        "answer": "Stateful policy rules and network address translation (NAT).",
        "unit": "Applied Networking (CCNA)",
        "category": "firewall",
    },
    {
        "question": "What is a key difference between SMF and MMF fiber?",
        "answer": "SMF supports longer distances with a smaller core; MMF is shorter-range and lower cost.",
        "unit": "Core Networking (CCNA)",
        "category": "fiber",
    },
]


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


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/units")
def api_units():
    rows = fetch_all("SELECT name, semester FROM units ORDER BY semester, name")
    return jsonify(rows if rows is not None else FALLBACK_UNITS)


@app.route("/api/notes")
def api_notes():
    filters = {
        "semester": request.args.get("semester"),
        "unit": request.args.get("unit"),
        "category": request.args.get("category"),
        "vendor": request.args.get("vendor"),
    }

    rows = fetch_all(
        """
        SELECT n.topic, n.content, n.category, n.vendor, u.name AS unit, u.semester
        FROM study_notes n
        JOIN units u ON u.id = n.unit_id
        ORDER BY u.semester, u.name, n.topic
        """
    )

    notes = rows if rows is not None else [
        {**n, "semester": next((u["semester"] for u in FALLBACK_UNITS if u["name"] == n["unit"]), 1)}
        for n in FALLBACK_NOTES
    ]

    for key, value in filters.items():
        if not value:
            continue
        if key == "semester":
            notes = [n for n in notes if str(n.get("semester")) == str(value)]
        else:
            notes = [n for n in notes if str(n.get(key, "")).lower() == value.lower()]

    return jsonify(notes)


@app.route("/api/flashcards")
def api_flashcards():
    rows = fetch_all(
        """
        SELECT f.question, f.answer, f.category, u.name AS unit, u.semester
        FROM flashcards f
        JOIN units u ON u.id = f.unit_id
        ORDER BY u.semester, u.name, f.id
        """
    )
    return jsonify(rows if rows is not None else [
        {**c, "semester": next((u["semester"] for u in FALLBACK_UNITS if u["name"] == c["unit"]), 1)}
        for c in FALLBACK_FLASHCARDS
    ])


if __name__ == "__main__":
    app.run(debug=True)
