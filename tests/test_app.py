"""Tests for fallback, DB overlays and the public study API; no MySQL needed."""

import unittest
from unittest.mock import MagicMock, patch

import app as study


class StudyApiTests(unittest.TestCase):
    def setUp(self):
        self.config = patch.dict(study.app.config, TESTING=True, MYSQL_ENABLED=False)
        self.config.start()
        self.addCleanup(self.config.stop)
        self.client = study.app.test_client()

    def test_default_mode_never_attempts_mysql_connection(self):
        with patch.object(study, "pymysql") as driver:
            response = self.client.get("/api/content")
        self.assertEqual(response.status_code, 200)
        driver.connect.assert_not_called()
        payload = response.get_json()
        self.assertEqual(len(payload["units"]), len(study.FALLBACK_UNITS))
        self.assertEqual(len(payload["notes"]), len(study.FALLBACK_NOTES))
        self.assertEqual(len(payload["flashcards"]), len(study.FALLBACK_FLASHCARDS))
        for key in study.CONTENT.keys() - {"units", "notes", "flashcards"}:
            self.assertEqual(payload[key], study.CONTENT[key])

    def test_connection_failure_returns_bundled_content(self):
        with patch.dict(study.app.config, MYSQL_ENABLED=True), patch.object(study, "pymysql") as driver:
            driver.connect.side_effect = RuntimeError("credentials must not be logged")
            with self.assertLogs(study.app.logger, level="WARNING") as logs:
                response = self.client.get("/api/notes")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.get_json()), len(study.FALLBACK_NOTES))
        self.assertNotIn("credentials must not be logged", " ".join(logs.output))

    def test_query_failure_closes_connection_and_falls_back(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value.__enter__.return_value
        cursor.execute.side_effect = RuntimeError("missing source_title column")
        with patch.object(study, "get_db_connection", return_value=connection):
            with self.assertLogs(study.app.logger, level="WARNING"):
                response = self.client.get("/api/notes")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.get_json()), len(study.FALLBACK_NOTES))
        connection.close.assert_called_once()

    def test_fieldwise_overlay_keeps_sources_and_teaching_fields(self):
        original = {
            "unit": "Core Networking (CCNA)", "topic": "Addressing",
            "content": "Original", "source_url": "https://example.org/guide",
            "key_points": ["Keep this"], "semester": 1,
        }
        rows = study.merge_by_key([original], [{
            "unit": "core networking (ccna)", "topic": "addressing",
            "content": "Updated", "source_url": None, "semester": None,
        }], ("unit", "topic"))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["content"], "Updated")
        self.assertEqual(rows[0]["source_url"], original["source_url"])
        self.assertEqual(rows[0]["key_points"], ["Keep this"])
        self.assertEqual(rows[0]["unit"], original["unit"])
        self.assertEqual(rows[0]["semester"], 1)
        self.assertEqual(original["content"], "Original")

    def test_filters_combine_and_search_nested_teaching_fields(self):
        rows = [
            {"unit": "Networking", "semester": 1, "category": "switching", "vendor": "Cisco", "key_points": ["Trunk tagging"]},
            {"unit": "Networking", "semester": 2, "category": "switching", "vendor": "Cisco", "key_points": ["Trunk tagging"]},
            {"unit": "Networking", "semester": 1, "category": "switching", "vendor": "Netgear", "key_points": ["Trunk tagging"]},
        ]
        with patch.object(study, "get_notes", return_value=rows):
            response = self.client.get("/api/notes", query_string={
                "semester": "1", "unit": "networking", "category": "SWITCHING",
                "vendor": "cisco", "q": "TRUNK",
            })
        self.assertEqual(response.get_json(), [rows[0]])

    def test_cards_inherit_vendor_from_matching_unit_and_category(self):
        cards = [{"unit": "Networking", "category": "switching", "question": "Q", "answer": "A"}]
        notes = [
            {"unit": "Networking", "category": "switching", "vendor": "Cisco"},
            {"unit": "Networking", "category": "switching", "vendor": "Netgear"},
            {"unit": "Networking", "category": "routing", "vendor": "Fortinet"},
        ]
        with patch.object(study, "FALLBACK_FLASHCARDS", cards), patch.object(study, "get_notes", return_value=notes):
            accepted = self.client.get("/api/flashcards?vendor=CISCO").get_json()
            rejected = self.client.get("/api/flashcards?vendor=Fortinet").get_json()
        self.assertEqual(len(accepted), 1)
        self.assertEqual(accepted[0]["vendors"], ["Cisco", "Netgear"])
        self.assertEqual(rejected, [])
        self.assertNotIn("vendors", cards[0])

    def test_asset_route_and_path_traversal(self):
        with patch.object(study, "send_from_directory", return_value="asset") as serve:
            response = self.client.get("/assets/study.js")
        self.assertEqual(response.status_code, 200)
        serve.assert_called_once_with(study.DOCS_DIR / "assets", "study.js")
        self.assertEqual(self.client.get("/assets/../data/study_content.json").status_code, 404)

    def test_unknown_filters_return_empty_lists(self):
        self.assertEqual(self.client.get("/api/notes?unit=Unknown").get_json(), [])
        self.assertEqual(self.client.get("/api/flashcards?q=no-match-needle-az4caf").get_json(), [])


if __name__ == "__main__":
    unittest.main()
