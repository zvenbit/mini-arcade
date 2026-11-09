import concurrent.futures
import http.client
import json
from pathlib import Path
import sqlite3
import sys
import tempfile
import threading
import unittest
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
from stats_server import StatsStore, SubmissionLimited, make_server


def payload(**fields):
    return {'requestId': str(uuid.uuid4()), 'visitorId': str(uuid.uuid4()),
            'kind': 'game', 'title': '俄罗斯方块', 'description': '想玩可以保存进度的经典俄罗斯方块。',
            'nickname': '', **fields}


class SuggestionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / 'stats.sqlite3'
        self.now = 1794222000
        self.store = StatsStore(self.path, ['sokoban'], lambda: self.now)

    def tearDown(self):
        self.tmp.cleanup()

    def test_public_records_persist_without_affecting_statistics(self):
        self.store.record('lobby', str(uuid.uuid4()), None)
        original = self.store.read('lobby')
        item = self.store.submit_suggestion(payload(title='  俄罗斯方块  ', nickname=' 小玩家 '))
        reopened = StatsStore(self.path, ['sokoban'], lambda: self.now)
        self.assertEqual(reopened.list_suggestions(), {'items': [item], 'total': 1, 'nextCursor': None})
        self.assertEqual(item['title'], '俄罗斯方块')
        self.assertEqual(item['nickname'], '小玩家')
        self.assertNotIn('visitorId', item)
        self.assertNotIn('requestId', item)
        self.assertEqual(reopened.read('lobby'), original)

    def test_retry_is_idempotent_under_concurrency_and_limits(self):
        data = payload()
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            items = list(pool.map(lambda _: self.store.submit_suggestion(data), range(12)))
        self.assertEqual(len({item['id'] for item in items}), 1)
        with self.assertRaises(SubmissionLimited):
            self.store.submit_suggestion(payload(visitorId=data['visitorId']))
        with self.assertRaises(ValueError):
            self.store.submit_suggestion({**data, 'title': '另一个游戏'})
        for _ in range(4):
            self.now += 61
            self.store.submit_suggestion(payload(visitorId=data['visitorId']))
        self.now += 61
        with self.assertRaises(SubmissionLimited):
            self.store.submit_suggestion(payload(visitorId=data['visitorId']))
        self.assertEqual(self.store.submit_suggestion(data), items[0])
        self.now += 86400
        self.store.submit_suggestion(payload(visitorId=data['visitorId']))
        with sqlite3.connect(self.path) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM suggestion_limits').fetchone()[0], 1)

    def test_cursor_has_no_duplicates_when_new_recommendations_arrive(self):
        for _ in range(25):
            self.store.submit_suggestion(payload())
        first = self.store.list_suggestions()
        self.assertEqual(len(first['items']), 20)
        self.store.submit_suggestion(payload())
        last = self.store.list_suggestions(first['nextCursor'])
        self.assertEqual(len(last['items']), 5)
        self.assertIsNone(last['nextCursor'])
        self.assertEqual(len({r['id'] for r in first['items'] + last['items']}), 25)
        for invalid in [-1, 0, 2**63, 'bad']:
            with self.assertRaises(ValueError):
                self.store.list_suggestions(invalid)

    def test_invalid_fields_do_not_write_and_text_is_not_executed(self):
        for fields in [{'title': ' '}, {'title': '字'*41}, {'description': '太短'},
                       {'description': '字'*501}, {'nickname': '字'*21}, {'kind': []},
                       {'visitorId': None}, {'requestId': 'bad'}, {'title': '\x00bad'}]:
            with self.assertRaises(ValueError):
                self.store.submit_suggestion(payload(**fields))
        self.assertEqual(self.store.list_suggestions()['total'], 0)
        literal = '<img src=x onerror=alert(1)>'
        item = self.store.submit_suggestion(payload(title=literal, description="'); DROP TABLE suggestions; --"))
        self.assertEqual(self.store.list_suggestions()['items'][0]['title'], literal)
        self.assertEqual(item['id'], 1)


class SuggestionHTTPTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        store = StatsStore(Path(self.tmp.name) / 'stats.sqlite3', [])
        self.server = make_server(store, port=0, allowed_origins=['https://arcade.venai.cn'])
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.tmp.cleanup()

    def request(self, method, path, body=None, origin='https://arcade.venai.cn'):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        headers = {'Origin': origin, 'Content-Type': 'application/json'}
        conn.request(method, path, body, headers)
        response = conn.getresponse()
        data = json.loads(response.read())
        conn.close()
        return response.status, data

    def test_large_chinese_submission_public_read_retry_and_origin(self):
        data = payload(title='字'*40, description='游'*500, nickname='玩'*20)
        body = json.dumps(data, ensure_ascii=False).encode()
        self.assertGreater(len(body), 1024)
        status, saved = self.request('POST', '/api/suggestions', body)
        self.assertEqual(status, 200)
        self.assertEqual(self.request('POST', '/api/suggestions', body), (200, saved))
        self.assertEqual(self.request('GET', '/api/suggestions')[1]['total'], 1)
        status, _ = self.request('POST', '/api/suggestions', json.dumps(payload(visitorId=data['visitorId'])))
        self.assertEqual(status, 429)
        self.assertEqual(self.request('POST', '/api/suggestions', body, 'https://evil.example')[0], 403)
        self.assertEqual(self.request('POST', '/api/suggestions', b'x'*4097)[0], 413)
        self.assertEqual(self.request('POST', '/api/suggestions', '[]')[0], 400)
        self.assertEqual(self.request('GET', '/api/suggestions?before=bogus')[0], 400)
        self.assertEqual(self.request('GET', '/api/suggestions?before=9223372036854775808')[0], 400)


if __name__ == '__main__':
    unittest.main()
