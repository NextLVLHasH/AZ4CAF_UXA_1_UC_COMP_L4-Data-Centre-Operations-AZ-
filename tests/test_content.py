"""Curriculum integrity checks against intentionally damaged copies of maintained data."""
import copy
import json
from pathlib import Path
import unittest

from scripts.validate_content import validate

ROOT = Path(__file__).resolve().parents[1]


class CurriculumValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.content = json.loads((ROOT / "docs/data/study_content.json").read_text(encoding="utf-8"))
        cls.learning = json.loads((ROOT / "docs/data/learning_content.json").read_text(encoding="utf-8"))

    def copies(self):
        return copy.deepcopy(self.content), copy.deepcopy(self.learning)

    def assert_error(self, content, learning, expected):
        errors = validate(content, learning)
        self.assertTrue(any(expected in error for error in errors), (expected, errors))

    def test_complete_curriculum_and_learning_paths_are_valid(self):
        self.assertEqual(validate(self.content, self.learning), [])

    def test_malformed_top_level_and_collection_types_are_reported(self):
        self.assertEqual(validate([]), ["Curriculum must be an object."])
        for collection, malformed in (("notes", [None]), ("sources", {}), ("units", "not a list")):
            with self.subTest(collection=collection):
                content, learning = self.copies()
                content[collection] = malformed
                self.assert_error(content, learning, f"{collection}: expected an array of objects")
        self.assert_error(self.content, [], "Learning content must be an object.")
        for collection in ("lessons", "questions", "labs"):
            with self.subTest(malformed_unit=collection):
                content, learning = self.copies()
                learning[collection][0]["unit_id"] = []
                self.assert_error(content, learning, "unknown")
        content, learning = self.copies()
        learning["capstones"][0]["semester"] = []
        self.assert_error(content, learning, "Expected one capstone per semester")

    def test_duplicate_stable_ids_and_legacy_aliases_are_rejected(self):
        content, learning = self.copies()
        content["notes"][1]["id"] = content["notes"][0]["id"]
        self.assert_error(content, learning, "notes: duplicate stable IDs")
        content, learning = self.copies()
        content["flashcards"][1]["legacy_keys"] = content["flashcards"][0]["legacy_keys"]
        self.assert_error(content, learning, "duplicate legacy migration key")
        content, learning = self.copies()
        learning["labs"][0]["id"] = content["notes"][0]["id"]
        self.assert_error(content, learning, "Stable IDs must be unique across content types")

    def test_unknown_and_cross_unit_references_are_rejected(self):
        content, learning = self.copies()
        content["notes"][0]["source_ids"] = ["source-does-not-exist"]
        self.assert_error(content, learning, "unknown source source-does-not-exist")
        content, learning = self.copies()
        learning["lessons"][0]["lab_ids"] = ["lab-does-not-exist"]
        self.assert_error(content, learning, "unknown lab_ids reference lab-does-not-exist")
        content, learning = self.copies()
        lesson = learning["lessons"][0]
        different = next(note for note in content["notes"] if note["unit_id"] != lesson["unit_id"])
        lesson["note_ids"] = [different["id"]]
        self.assert_error(content, learning, "note_ids reference belongs to another unit")

    def test_question_answer_shape_and_scenario_coverage_are_enforced(self):
        for invalid in (True, -1, 4):
            with self.subTest(correct_index=invalid):
                content, learning = self.copies()
                learning["questions"][0]["correct_index"] = invalid
                self.assert_error(content, learning, "invalid correct_index")
        content, learning = self.copies()
        learning["questions"][0]["choices"] = ["Repeated"] * 4
        self.assert_error(content, learning, "needs four distinct choices")
        content, learning = self.copies()
        scenario = next(question for question in learning["questions"] if question["kind"] == "scenario")
        scenario["kind"] = "knowledge"
        self.assert_error(content, learning, "needs twelve questions, including four scenarios")

    def test_prerequisite_cycles_and_unmapped_content_are_rejected(self):
        content, learning = self.copies()
        first, second = learning["lessons"][:2]
        first["prerequisite_ids"] = [second["id"]]
        second["prerequisite_ids"] = [first["id"]]
        self.assert_error(content, learning, "Lesson prerequisite cycle")
        content, learning = self.copies()
        missing_note = content["notes"][0]["id"]
        for lesson in learning["lessons"]:
            lesson["note_ids"] = [identifier for identifier in lesson["note_ids"] if identifier != missing_note]
        self.assert_error(content, learning, "Every note must be included in a lesson")

    def test_source_records_require_real_https_hosts_and_review_evidence(self):
        for invalid in ("http://example.org/guide", "https:missing-host"):
            with self.subTest(source_url=invalid):
                content, learning = self.copies()
                content["sources"][0]["url"] = invalid
                self.assert_error(content, learning, "source URL must use HTTPS")
        content, learning = self.copies()
        content["sources"][0].update(verification_status="document-reviewed", reviewed_on=None)
        self.assert_error(content, learning, "reviewed sources need a review date")

    def test_labs_need_bounded_guides_steps_and_one_capstone_per_semester(self):
        content, learning = self.copies()
        learning["labs"][0]["guide_url"] = "https://example.org/run-this"
        learning["labs"][0]["steps"] = ["One vague action"]
        self.assert_error(content, learning, "guide_url must target a local guide section")
        self.assert_error(content, learning, "expected steps array with at least 3 strings")
        content, learning = self.copies()
        learning["capstones"][1]["semester"] = 1
        self.assert_error(content, learning, "Expected one capstone per semester")



class GeneratedLibraryLinkTests(unittest.TestCase):
    def test_generated_library_and_search_targets_exist(self):
        from html.parser import HTMLParser
        from urllib.parse import unquote, urlsplit

        class Document(HTMLParser):
            def __init__(self, text):
                super().__init__()
                self.identifiers, self.links = set(), []
                self.feed(text)

            def handle_starttag(self, _tag, attrs):
                attrs = dict(attrs)
                if attrs.get('id'):
                    self.identifiers.add(attrs['id'])
                self.links.extend(attrs[key] for key in ('href', 'src') if attrs.get(key))

        docs = ROOT / 'docs'
        files = [docs / 'index.html', *sorted((docs / 'guides').glob('*.html'))]
        documents = {path.resolve(): Document(path.read_text(encoding='utf-8')) for path in files}
        references = [(path, link) for path, doc in documents.items() for link in doc.links]
        index = json.loads((docs / 'data/search-index.json').read_text(encoding='utf-8'))
        references.extend((docs / 'index.html', entry['url']) for entry in index['entries'])
        learning = json.loads((docs / 'data/learning_content.json').read_text(encoding='utf-8'))
        references.extend((docs / 'index.html', item['guide_url']) for item in learning['labs'] + learning['capstones'])
        for source, link in references:
            url = urlsplit(link)
            if url.scheme or url.netloc:
                continue
            target = (source.parent / unquote(url.path)).resolve() if url.path else source.resolve()
            self.assertTrue(target.exists(), f'{source.name}: missing {link}')
            if url.fragment:
                self.assertIn(unquote(url.fragment), documents[target].identifiers, f'{source.name}: missing anchor {link}')


if __name__ == "__main__":
    unittest.main()
