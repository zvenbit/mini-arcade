import concurrent.futures
from datetime import datetime, timezone
from functools import partial
import http.client
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
from stats_server import StatsStore, make_server

new_id = lambda: str(uuid.uuid4())


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / 'counts.sqlite3'
        self.now = datetime(2026, 11, 8, 15, 59, 59, tzinfo=timezone.utc).timestamp()
        self.store = StatsStore(self.path, ['2048', 'snake'], lambda: self.now)

    def tearDown(self):
        self.tmp.cleanup()

    def test_scope_uniques_idempotency_restart(self):
        first, second, event = new_id(), new_id(), new_id()
        self.store.record('lobby', event, first)
        self.store.record('lobby', event, first)
        self.store.record('2048', new_id(), first)
        result = self.store.record('2048', new_id(), second)
        self.assertEqual(result['site'], {'today': 3, 'total': 3, 'visitorsToday': 2})
        self.assertEqual(result['page'], {'id': '2048', 'today': 2, 'total': 2, 'visitorsToday': 2})
        reopened = StatsStore(self.path, ['2048', 'snake'], lambda: self.now)
        self.assertEqual(reopened.read('2048'), result)
        self.assertEqual(reopened.read('snake')['page']['total'], 0)
        self.assertEqual(reopened.read('lobby')['site']['total'], 3)

    def test_beijing_midnight_and_retained_totals(self):
        visitor, event = new_id(), new_id()
        self.store.record('lobby', event, visitor)
        self.now += 2
        result = self.store.read('lobby')
        self.assertEqual(result['date'], '2026-11-09')
        self.assertEqual(result['site'], {'today': 0, 'total': 1, 'visitorsToday': 0})
        self.store.record('lobby', event, visitor)  # a delayed retry of yesterday's event
        result = self.store.record('lobby', new_id(), visitor)
        self.assertEqual(result['site'], {'today': 1, 'total': 2, 'visitorsToday': 1})

    def test_missing_identity_does_not_fake_people(self):
        result = self.store.record('lobby', new_id(), None)
        self.assertEqual(result['site'], {'today': 1, 'total': 1, 'visitorsToday': 0})

    def test_concurrent_updates_and_duplicate_retries(self):
        visitor, event = new_id(), new_id()
        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
            list(pool.map(lambda _: self.store.record('2048', event, visitor), range(30)))
            list(pool.map(lambda _: self.store.record('snake', new_id(), visitor), range(60)))
        self.assertEqual(self.store.read('2048')['site'], {'today': 61, 'total': 61, 'visitorsToday': 1})
        self.assertEqual(self.store.read('2048')['page']['total'], 1)
        self.assertEqual(self.store.read('snake')['page']['total'], 60)

    def test_input_validation_leaves_counts_unchanged(self):
        for args in [('bogus', new_id(), None), ('lobby', 'bad', None), ('lobby', new_id(), 'bad')]:
            with self.assertRaises(ValueError):
                self.store.record(*args)
        self.assertEqual(self.store.read('lobby')['site']['total'], 0)


class HTTPTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.web = root / 'web'; self.web.mkdir()
        (self.web / 'index.html').write_text('<h1>Arcade</h1>')
        (self.web / 'games').mkdir()
        (self.web / 'games' / 'game.js').write_text('export const loaded=true;')
        (self.web / 'server').mkdir()
        (self.web / 'server' / 'secret.json').write_text('{}')
        (root / 'private.json').write_text('{}')
        (self.web / 'outside.json').symlink_to(root / 'private.json')
        store = StatsStore(root / 'counts.sqlite3', ['2048'])
        self.server = make_server(store, port=0, allowed_origins=['https://arcade.venai.cn'], static_root=self.web)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join(); self.tmp.cleanup()

    def request(self, method, path, body=None, headers=None):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        conn.request(method, path, body, headers or {})
        response = conn.getresponse(); data = response.read()
        status, response_headers = response.status, dict(response.getheaders())
        conn.close()
        return status, response_headers, data

    def test_api_and_protected_preview(self):
        payload = json.dumps({'page': '2048', 'eventId': new_id(), 'visitorId': new_id()})
        headers = {'Content-Type': 'application/json', 'Origin': 'https://arcade.venai.cn'}
        status, hdr, body = self.request('POST', '/api/visits', payload, headers)
        self.assertEqual(status, 200); self.assertEqual(hdr['Cache-Control'], 'no-store')
        self.assertEqual(json.loads(body)['page']['total'], 1)
        self.assertEqual(self.request('GET', '/api/stats?page=2048')[0], 200)
        self.assertEqual(self.request('GET', '/api/health')[0], 200)
        self.assertEqual(self.request('GET', '/')[0], 200)
        self.assertEqual(self.request('HEAD', '/games/game.js')[0], 200)
        for path in ['/server/secret.json', '/outside.json', '/%2e%2e/private.json', '/.git/config']:
            self.assertEqual(self.request('GET', path)[0], 404)
            self.assertEqual(self.request('HEAD', path)[0], 404)

    def test_reject_bad_posts_without_writes(self):
        good = {'Content-Type': 'application/json', 'Origin': 'https://arcade.venai.cn'}
        self.assertEqual(self.request('POST', '/api/visits', '{}', {**good, 'Origin': 'https://evil.example'})[0], 403)
        self.assertEqual(self.request('POST', '/api/visits', '{}', {**good, 'Content-Type': 'text/plain'})[0], 415)
        self.assertEqual(self.request('POST', '/api/visits', '[]', good)[0], 400)
        self.assertEqual(self.request('POST', '/api/visits', '{broken', good)[0], 400)
        self.assertEqual(self.request('POST', '/api/visits', 'x' * 1025, good)[0], 413)
        self.assertEqual(json.loads(self.request('GET', '/api/stats')[2])['site']['total'], 0)


if __name__ == '__main__':
    unittest.main()
