"""Validate curriculum relationships and learning fields without third-party packages."""
import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]


def validate(content):
    errors = []
    units = content.get("units", [])
    names = {unit.get("name") for unit in units}
    semesters = {unit.get("name"): unit.get("semester") for unit in units}
    if len(units) != 9 or len(names) != 9:
        errors.append("Expected the nine distinct programme units, including the optional project.")
    if any(value not in (1, 2) for value in semesters.values()):
        errors.append("Unit semesters must be 1 or 2.")
    if not isinstance(content.get("programme"), dict):
        errors.append("Missing programme context.")
    for collection, identity, required in (
        ("notes", "topic", ("unit", "topic", "category", "vendor", "content", "source_title", "source_url", "case_study", "worked_example", "practice", "check_question", "check_answer")),
        ("flashcards", "question", ("unit", "category", "question", "answer")),
    ):
        seen, covered = set(), set()
        rows = content.get(collection, [])
        for i, row in enumerate(rows):
            label = f"{collection}[{i}]"
            for field in required:
                if not isinstance(row.get(field), str) or not row[field].strip():
                    errors.append(f"{label}: missing nonempty string {field}")
            key = (row.get("unit"), row.get(identity))
            if key in seen:
                errors.append(f"{label}: duplicate {key}")
            seen.add(key)
            covered.add(row.get("unit"))
            if row.get("unit") not in names:
                errors.append(f"{label}: unknown unit")
            if "semester" in row and row["semester"] != semesters.get(row.get("unit")):
                errors.append(f"{label}: semester disagrees with unit")
            if collection == "notes":
                source = urlparse(row.get("source_url", ""))
                if source.scheme != "https" or not source.netloc:
                    errors.append(f"{label}: expected HTTPS source URL")
                points = row.get("key_points")
                if not isinstance(points, list) or len(points) < 3 or any(not isinstance(p, str) or not p.strip() for p in points):
                    errors.append(f"{label}: expected at least three teaching points")
        for name in sorted(names - covered):
            errors.append(f"{collection}: unit has no coverage: {name}")
    return errors


def main():
    content = json.loads((ROOT / "docs/data/study_content.json").read_text(encoding="utf-8"))
    errors = validate(content)
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"Validated {len(content['units'])} units, {len(content['notes'])} notes and {len(content['flashcards'])} flashcards.")


if __name__ == "__main__":
    main()
