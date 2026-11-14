"""Validate stable curriculum identities, learning paths, quizzes and source references."""
import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]


def validate(content, learning=None):
    errors = []
    if not isinstance(content, dict):
        return ["Curriculum must be an object."]
    if content.get("schema_version") != 2:
        errors.append("Expected curriculum schema_version 2.")

    def rows(data, key):
        value = data.get(key)
        if not isinstance(value, list) or any(not isinstance(item, dict) for item in value):
            errors.append(f"{key}: expected an array of objects")
            return []
        return value

    def string(row, field, label):
        if not isinstance(row.get(field), str) or not row[field].strip():
            errors.append(f"{label}: missing nonempty string {field}")

    def strings(row, field, label, minimum=1):
        values = row.get(field)
        if not isinstance(values, list) or len(values) < minimum or any(not isinstance(v, str) or not v.strip() for v in values):
            errors.append(f"{label}: expected {field} array with at least {minimum} strings")
            return []
        return values

    def registry(items, label):
        identifiers = []
        for i, item in enumerate(items):
            string(item, "id", f"{label}[{i}]")
            if isinstance(item.get("id"), str):
                identifiers.append(item["id"])
                if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:-]{0,127}", item["id"]) or item["id"] in {"constructor", "prototype"}:
                    errors.append(f"{label}[{i}]: invalid stable ID")
        if len(identifiers) != len(set(identifiers)):
            errors.append(f"{label}: duplicate stable IDs")
        return {item["id"]: item for item in items if isinstance(item.get("id"), str)}

    units = rows(content, "units")
    unit_map = registry(units, "units")
    names = {u.get("name") for u in units if isinstance(u.get("name"), str)}
    if len(units) != 9 or len(names) != 9:
        errors.append("Expected the nine distinct programme units, including the optional project.")
    for unit in units:
        if type(unit.get("semester")) is not int or unit["semester"] not in (1, 2):
            errors.append("Unit semesters must be 1 or 2.")
        strings(unit, "outcomes", unit.get("id", "unit"))
    if not isinstance(content.get("programme"), dict):
        errors.append("Missing programme context.")
    sources = registry(rows(content, "sources"), "sources")
    for source in sources.values():
        for field in ("title", "url", "version", "verification_status"):
            string(source, field, source["id"])
        if (urlparse(str(source.get("url", ""))).scheme != "https"
                or not urlparse(str(source.get("url", ""))).netloc):
            errors.append(f"{source['id']}: source URL must use HTTPS")
        if source.get("verification_status") not in ("document-reviewed", "reference-only"):
            errors.append(f"{source['id']}: unknown verification status")
        if source.get("verification_status") == "document-reviewed" and not source.get("reviewed_on"):
            errors.append(f"{source['id']}: reviewed sources need a review date")

    maps = {}
    for collection, identity, required in (
        ("notes", "topic", ("unit", "topic", "category", "vendor", "content", "source_title", "source_url", "case_study", "worked_example", "practice", "check_question", "check_answer")),
        ("flashcards", "question", ("unit", "category", "question", "answer")),
    ):
        items = rows(content, collection)
        maps[collection] = registry(items, collection)
        seen, covered, legacy = set(), set(), set()
        for i, item in enumerate(items):
            label = f"{collection}[{i}]"
            for field in required:
                string(item, field, label)
            key = tuple(str(item.get(field, "")) for field in ("unit", identity))
            if key in seen:
                errors.append(f"{label}: duplicate unit/{identity}")
            seen.add(key)
            covered.add(item.get("unit_id") if isinstance(item.get("unit_id"), str) else "")
            unit = unit_map.get(str(item.get("unit_id", "")))
            if not unit or item.get("unit") != unit.get("name"):
                errors.append(f"{label}: invalid unit link")
            if unit and item.get("semester") != unit.get("semester"):
                errors.append(f"{label}: semester disagrees with unit")
            for old_key in strings(item, "legacy_keys", label):
                if old_key in legacy:
                    errors.append(f"{label}: duplicate legacy migration key")
                legacy.add(old_key)
            if collection == "notes":
                strings(item, "key_points", label, 3)
                for source_id in strings(item, "source_ids", label):
                    if source_id not in sources:
                        errors.append(f"{label}: unknown source {source_id}")
                parsed = urlparse(str(item.get("source_url", "")))
                if parsed.scheme != "https" or not parsed.netloc:
                    errors.append(f"{label}: expected HTTPS source URL")
        for unit_id in unit_map.keys() - covered:
            errors.append(f"{collection}: no coverage for {unit_id}")

    if learning is None:
        return errors
    if not isinstance(learning, dict):
        return errors + ["Learning content must be an object."]
    if learning.get("schema_version") != 2:
        errors.append("Expected learning schema_version 2.")
    lessons = registry(rows(learning, "lessons"), "lessons")
    questions = registry(rows(learning, "questions"), "questions")
    labs = registry(rows(learning, "labs"), "labs")
    capstones = registry(rows(learning, "capstones"), "capstones")
    all_ids = [*unit_map, *sources, *maps["notes"], *maps["flashcards"], *lessons, *questions, *labs, *capstones]
    if len(all_ids) != len(set(all_ids)):
        errors.append("Stable IDs must be unique across content types.")

    def references(row, field, target, minimum=0, same_unit=False):
        values = strings(row, field, row.get("id", field), minimum)
        for identifier in values:
            linked = target.get(identifier)
            if linked is None:
                errors.append(f"{row.get('id')}: unknown {field} reference {identifier}")
            elif same_unit and linked.get("unit_id") != row.get("unit_id"):
                errors.append(f"{row.get('id')}: {field} reference belongs to another unit")
        return values

    covered_notes, covered_cards = set(), set()
    for lesson in lessons.values():
        for field in ("title", "unit_id"):
            string(lesson, field, lesson["id"])
        if not isinstance(lesson.get("unit_id"), str) or lesson["unit_id"] not in unit_map:
            errors.append(f"{lesson['id']}: unknown unit")
        strings(lesson, "objectives", lesson["id"])
        for field in ("estimated_minutes", "order"):
            if type(lesson.get(field)) is not int or lesson[field] < 1:
                errors.append(f"{lesson['id']}: {field} must be a positive integer")
        covered_notes.update(references(lesson, "note_ids", maps["notes"], 1, True))
        covered_cards.update(references(lesson, "card_ids", maps["flashcards"], 1, True))
        references(lesson, "lab_ids", labs)
        references(lesson, "prerequisite_ids", lessons)
    if covered_notes != set(maps["notes"]):
        errors.append("Every note must be included in a lesson.")
    if covered_cards != set(maps["flashcards"]):
        errors.append("Every recall card must be included in a lesson.")
    visiting, visited = set(), set()

    def visit(identifier):
        if identifier in visiting:
            errors.append(f"Lesson prerequisite cycle at {identifier}")
            return
        if identifier in visited:
            return
        visiting.add(identifier)
        dependencies = lessons.get(identifier, {}).get("prerequisite_ids", [])
        for dependency in dependencies if isinstance(dependencies, list) else []:
            if isinstance(dependency, str) and dependency in lessons:
                visit(dependency)
        visiting.remove(identifier)
        visited.add(identifier)
    for identifier in lessons:
        visit(identifier)
    counts = Counter(str(l.get("unit_id")) for l in lessons.values())
    for unit_id in unit_map:
        if counts[unit_id] < 4:
            errors.append(f"{unit_id}: needs at least four lessons")
        orders = [l.get("order") for l in lessons.values() if l.get("unit_id") == unit_id]
        if len(set(str(o) for o in orders)) != len(orders):
            errors.append(f"{unit_id}: duplicate lesson order")

    for question in questions.values():
        label = question["id"]
        for field in ("prompt", "explanation"):
            string(question, field, label)
        choices = strings(question, "choices", label, 4)
        if len(choices) != 4 or len(set(choices)) != 4:
            errors.append(f"{label}: needs four distinct choices")
        if type(question.get("correct_index")) is not int or not 0 <= question["correct_index"] < 4:
            errors.append(f"{label}: invalid correct_index")
        if question.get("kind") not in ("scenario", "knowledge"):
            errors.append(f"{label}: unknown question kind")
        references(question, "note_ids", maps["notes"], 1, True)
        references(question, "source_ids", sources, 1)
        if not isinstance(question.get("unit_id"), str) or question["unit_id"] not in unit_map:
            errors.append(f"{label}: unknown unit")
    for unit_id in unit_map:
        unit_questions = [q for q in questions.values() if q.get("unit_id") == unit_id]
        if len(unit_questions) != 12 or sum(q.get("kind") == "scenario" for q in unit_questions) != 4:
            errors.append(f"{unit_id}: needs twelve questions, including four scenarios")
    for item in [*labs.values(), *capstones.values()]:
        label = item["id"]
        for field in ("title", "expected_result", "cleanup", "evidence_prompt", "guide_url"):
            string(item, field, label)
        strings(item, "steps", label, 3)
        guide = str(item.get("guide_url", ""))
        if not guide.startswith("./guides/") or ".." in guide or not "#" in guide:
            errors.append(f"{label}: guide_url must target a local guide section")
    for lab in labs.values():
        strings(lab, "prerequisites", lab["id"])
        strings(lab, "troubleshooting", lab["id"])
        if not isinstance(lab.get("unit_id"), str) or lab["unit_id"] not in unit_map:
            errors.append(f"{lab['id']}: unknown lab unit")
        if lab.get("verification_status") not in ("reviewed", "locally-tested"):
            errors.append(f"{lab['id']}: invalid verification status")
    if len(capstones) != 2 or {c.get("semester") for c in capstones.values() if type(c.get("semester")) is int} != {1, 2}:
        errors.append("Expected one capstone per semester.")
    for capstone in capstones.values():
        string(capstone, "scenario", capstone["id"])
        strings(capstone, "objectives", capstone["id"])
        references(capstone, "lab_ids", labs, 1)
    return errors


def main():
    content = json.loads((ROOT / "docs/data/study_content.json").read_text(encoding="utf-8"))
    learning = json.loads((ROOT / "docs/data/learning_content.json").read_text(encoding="utf-8"))
    errors = validate(content, learning)
    if errors:
        raise SystemExit("\n".join(errors))
    print(f"Validated {len(content['units'])} units, {len(content['notes'])} notes, {len(content['flashcards'])} cards, {len(learning['lessons'])} lessons and {len(learning['questions'])} questions.")


if __name__ == "__main__":
    main()
