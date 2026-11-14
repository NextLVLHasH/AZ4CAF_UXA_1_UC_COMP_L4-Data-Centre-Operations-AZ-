"""Run the same learner journeys against Flask and the static Pages build.

Run: CHROMIUM_EXECUTABLE=/usr/bin/chromium python -m unittest discover -s tests/browser -v
CI installs Playwright Chromium and omits CHROMIUM_EXECUTABLE.
"""
import functools
import json
import os
from pathlib import Path
import threading
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright
from werkzeug.serving import make_server, WSGIRequestHandler

import app as study

ROOT = Path(__file__).resolve().parents[2]
KEY = 'az4caf.study-progress.v2'


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class QuietWSGIHandler(WSGIRequestHandler):
    def log_request(self, *_args):
        pass


class LearningJourneyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / 'docs/data/study_content.json').read_text())
        cls.learning = json.loads((ROOT / 'docs/data/learning_content.json').read_text())
        cls.questions = {q['id']: q for q in cls.learning['questions']}
        study.app.config['MYSQL_ENABLED'] = False
        cls.flask = make_server('127.0.0.1', 0, study.app, request_handler=QuietWSGIHandler)
        cls.static = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT / 'docs')))
        cls.threads = [threading.Thread(target=s.serve_forever, daemon=True) for s in (cls.flask, cls.static)]
        for thread in cls.threads:
            thread.start()
        cls.bases = [f'http://127.0.0.1:{s.server_port}/' for s in (cls.flask, cls.static)]
        cls.playwright = sync_playwright().start()
        options = {'headless': True, 'args': ['--no-sandbox']}
        if os.getenv('CHROMIUM_EXECUTABLE'):
            options['executable_path'] = os.environ['CHROMIUM_EXECUTABLE']
        cls.browser = cls.playwright.chromium.launch(**options)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        for server in (cls.flask, cls.static):
            server.shutdown()
            server.server_close()
        for thread in cls.threads:
            thread.join(timeout=5)

    def setUp(self):
        self.pages = []

    def tearDown(self):
        outcome = self._outcome.result
        failed = any(test is self or getattr(test, 'test_case', None) is self for test, _ in outcome.errors + outcome.failures)
        if failed:
            destination = ROOT / 'test-results'
            destination.mkdir(exist_ok=True)
            for index, page in enumerate(self.pages):
                if not page.is_closed():
                    page.screenshot(path=str(destination / f'{self._testMethodName}-{index}.png'), full_page=True)

    def open(self, base, width=1440, initial_script=None):
        context = self.browser.new_context(viewport={'width': width, 'height': 1000}, accept_downloads=True)
        self.addCleanup(context.close)
        if initial_script:
            context.add_init_script(initial_script)
        page = context.new_page()
        self.pages.append(page)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(base)
        page.wait_for_selector('#continueDashboard:visible')
        self.addCleanup(lambda: self.assertEqual(errors, [], 'Browser JavaScript errors'))
        return page

    def saved(self, page):
        return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))', KEY)

    def test_pathway_quiz_and_lab_round_trip_on_both_surfaces(self):
        for base in self.bases:
            with self.subTest(base=base):
                page = self.open(base)
                page.locator('#pathwayTab').click()
                first = page.locator('[data-lesson-id]').first
                first.check()
                self.assertEqual(len(self.saved(page)['lessons']), 1)
                page.locator('#quizzesTab').click()
                page.locator('#startQuizBtn').click()
                question_sets = page.locator('#checkpointForm fieldset')
                self.assertEqual(question_sets.count(), 10)
                ids = question_sets.locator('input[type=radio]').evaluate_all('(inputs)=>[...new Set(inputs.map(i=>i.name))]')
                self.assertGreaterEqual(sum(self.questions[i]['kind'] == 'scenario' for i in ids), 3)
                for identifier in ids:
                    answer = self.questions[identifier]['correct_index']
                    page.locator(f'input[name="{identifier}"][value="{answer}"]').check()
                page.locator('#submitQuizBtn').click()
                self.assertIn('100%', page.locator('.quiz-score').inner_text())
                self.assertEqual(page.locator('.quiz-feedback').count(), 10)
                self.assertIn('fundamentals', self.saved(page)['quizzes'])
                page.locator('#labsTab').click()
                lab = page.locator('.lab-record').first
                lab.locator('[data-lab-step]').first.check()
                lab.locator('textarea').fill('Synthetic observation: the predicted result matched the local check.')
                lab.locator('textarea').blur()
                lab.locator('[data-lab-complete]').check()
                self.assertTrue(self.saved(page)['labs'][lab.get_attribute('id')]['complete'])
                page.reload()
                page.wait_for_selector('#continueDashboard:visible')
                self.assertEqual(len(self.saved(page)['lessons']), 1)
                self.assertEqual(self.saved(page)['quizzes']['fundamentals']['score'], 100)

    def test_legacy_migration_revision_and_backup_validation_are_atomic(self):
        note = self.data['notes'][0]
        card = self.data['flashcards'][0]
        legacy = {'notes': [note['legacy_keys'][0]], 'cards': {card['legacy_keys'][0]: 'again'}}
        for base in self.bases:
            with self.subTest(base=base):
                initial = 'localStorage.setItem("az4caf.study-progress.v1", ' + json.dumps(json.dumps(legacy)) + ');'
                page = self.open(base, initial_script=initial)
                self.assertEqual(self.saved(page)['notes'], [note['id']])
                page.locator('#cardsTab').click()
                page.locator('#startSessionBtn').click()
                self.assertLessEqual(page.locator('#cards .card').count(), 10)
                first = page.locator('#cards .card').first
                first.get_by_role('button', name='Reveal answer', exact=True).click()
                first.get_by_role('button', name='Got it:', exact=False).click()
                backup = self.saved(page)
                with page.expect_download() as download:
                    page.locator('#exportProgressBtn').click()
                exported = json.loads(Path(download.value.path()).read_text())
                self.assertEqual(exported, backup)
                page.locator('#importProgressFile').set_input_files({'name': 'bad.json', 'mimeType': 'application/json', 'buffer': b'{"version":99}'})
                page.wait_for_function('document.getElementById("backupStatus").textContent.includes("not imported")')
                self.assertEqual(self.saved(page), backup)
                self.assertTrue(page.locator('#importConfirm').is_hidden())
                replacement = {'version': 2, 'notes': [], 'cards': {}, 'lessons': [], 'labs': {}, 'quizzes': {}}
                page.locator('#importProgressFile').set_input_files({'name': 'valid.json', 'mimeType': 'application/json', 'buffer': json.dumps(replacement).encode()})
                page.locator('#confirmImportBtn').wait_for(state='visible')
                self.assertEqual(self.saved(page), backup)
                page.locator('#confirmImportBtn').click()
                self.assertEqual(self.saved(page), replacement)

    def test_search_vendor_parity_disclosures_and_guide_anchors(self):
        results = []
        for base in self.bases:
            with self.subTest(base=base):
                page = self.open(base)
                page.locator('#notesTab').click()
                page.locator('#clearFiltersBtn').click()
                note = page.locator('#notes .note').first
                identifier = note.get_attribute('id')
                topic = note.locator('h3').inner_text()
                note.locator('summary').first.click()
                page.locator('#searchInput').fill(topic)
                self.assertTrue(page.locator(f'#{identifier} > details').evaluate('(d)=>d.open'))
                page.locator('#clearFiltersBtn').click()
                page.locator('#searchInput').fill('referential integrity')
                guide = page.locator('#librarySearchResults a[href*="guides/"]').first
                guide.wait_for()
                link = guide.get_attribute('href')
                response = page.request.get(urljoin(page.url, link))
                self.assertEqual(response.status, 200)
                self.assertIn('id="' + link.split('#')[-1] + '"', response.text())
                page.locator('#clearFiltersBtn').click()
                page.locator('#cardsTab').click()
                page.locator('#revisionMode').select_option('all')
                page.locator('#vendorFilter').select_option('Cisco')
                results.append(page.locator('#cards .card').evaluate_all('(cards)=>cards.map(c=>c.id)'))
                page.locator('#searchInput').fill('zzzz-az4caf-no-match')
                self.assertTrue(page.locator('#emptyState').is_visible())
        self.assertEqual(results[0], results[1])
        expected = [c['id'] for c in self.data['flashcards'] if c.get('vendor') == 'Cisco']
        self.assertEqual(results[0], expected)

    def test_interactive_tools_keyboard_and_mobile_reflow(self):
        for base in self.bases:
            with self.subTest(base=base):
                page = self.open(base, width=390)
                page.keyboard.press('Tab')
                self.assertEqual(page.locator(':focus').inner_text(), 'Skip to study content')
                page.keyboard.press('Enter')
                self.assertEqual(page.locator(':focus').get_attribute('id'), 'main')
                page.locator('#practiceTab').click()
                self.assertEqual(page.locator('.tool-nav button').count(), 4)
                for tool in ['subnet', 'path', 'firewall', 'ai']:
                    page.locator(f'.tool-nav button[data-tool={tool}]').click()
                    self.assertEqual(page.locator('.tool-panel:visible').count(), 1)
                    self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
                page.locator('.tool-nav button[data-tool=subnet]').click()
                page.locator('#subnetCidr').fill('10.44.0.70/26')
                page.locator('#subnetCalculate').click()
                self.assertIn('10.44.0.64/26', page.locator('.tool-panel:visible').inner_text())
                page.locator('.tool-nav button[data-tool=ai]').click()
                page.get_by_role('button', name='Evaluate synthetic AI policy', exact=True).click()
                self.assertIn('ALLOW', page.locator('.tool-panel:visible').inner_text())
                page.set_viewport_size({'width': 320, 'height': 900})
                self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))

    def test_unreadable_progress_is_recoverable_and_not_overwritten(self):
        original = '{"version":99,"notes":["retained-evidence"]}'
        for base in self.bases:
            with self.subTest(base=base):
                initial = 'localStorage.setItem(' + json.dumps(KEY) + ', ' + json.dumps(original) + ');'
                page = self.open(base, initial_script=initial)
                self.assertIn('will not overwrite', page.locator('#backupStatus').inner_text())
                self.assertTrue(page.locator('#recoverProgressBtn').is_visible())
                page.locator('[data-lesson-id]').first.check()
                self.assertEqual(page.evaluate('(key)=>localStorage.getItem(key)', KEY), original)
                with page.expect_download() as download:
                    page.locator('#recoverProgressBtn').click()
                self.assertEqual(Path(download.value.path()).read_text(), original)

    def test_search_works_from_pathway_and_only_active_content_is_rendered(self):
        page = self.open(self.bases[1])
        self.assertTrue(page.locator('#pathwaySection').is_visible())
        self.assertEqual(page.locator('#cards .card').count(), 0)
        self.assertEqual(page.locator('#notes .note').count(), 0)
        page.locator('#searchInput').fill('Binary, Hex and Data Representation')
        self.assertTrue(page.locator('#studySection').is_visible())
        self.assertGreater(page.locator('#notes .note').count(), 0)
        self.assertEqual(page.locator('#cards .card').count(), 0)
        page.set_viewport_size({'width': 1024, 'height': 768})
        page.emulate_media(reduced_motion='reduce')
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))

    def test_deep_links_and_loading_failure(self):
        for base in self.bases:
            with self.subTest(base=base):
                page = self.open(base)
                page.goto(base + '#view=notes&note=note-001')
                page.locator('#note-001').wait_for(state='visible')
                self.assertTrue(page.locator('#note-001 > details').evaluate('(d)=>d.open'))
                self.assertIn('note-001', page.url)
                page.reload()
                page.locator('#note-001').wait_for(state='visible')
                self.assertTrue(page.locator('#note-001 > details').evaluate('(d)=>d.open'))
        page = self.browser.new_page()
        self.addCleanup(page.close)
        page.route('**/data/study_content.json', lambda route: route.fulfill(status=503, body='unavailable'))
        page.goto(self.bases[1])
        page.locator('#retryBtn').wait_for(state='visible')
        self.assertIn('could not load', page.locator('#loadState').inner_text())


if __name__ == '__main__':
    unittest.main()
