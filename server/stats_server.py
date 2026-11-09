#!/usr/bin/env python3
"""Same-origin visit counters; Python 3.9+, SQLite, no third-party packages."""
import argparse
from contextlib import closing
from datetime import datetime, timedelta, timezone
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import sqlite3
import time
from urllib.parse import parse_qs, unquote, urlsplit

SHANGHAI = timezone(timedelta(hours=8))
UUID = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')


class SubmissionLimited(Exception):
    pass


class StatsStore:
    def __init__(self, path, pages, clock=time.time):
        self.path = str(path)
        self.pages = {'lobby', *pages}
        self.clock = clock
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with closing(self.connect()) as db, db:
            db.execute('PRAGMA journal_mode=WAL')
            db.executescript('''
                CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS totals (scope TEXT PRIMARY KEY, visits INTEGER NOT NULL DEFAULT 0);
                CREATE TABLE IF NOT EXISTS daily (
                    scope TEXT NOT NULL, day TEXT NOT NULL, visits INTEGER NOT NULL DEFAULT 0,
                    visitors INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(scope, day));
                CREATE TABLE IF NOT EXISTS visitors (
                    scope TEXT NOT NULL, day TEXT NOT NULL, visitor TEXT NOT NULL,
                    PRIMARY KEY(scope, day, visitor));
                CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, created REAL NOT NULL);
                CREATE INDEX IF NOT EXISTS events_created ON events(created);
                CREATE TABLE IF NOT EXISTS suggestions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    request_id TEXT NOT NULL UNIQUE, kind TEXT NOT NULL,
                    title TEXT NOT NULL, description TEXT NOT NULL, nickname TEXT NOT NULL,
                    created REAL NOT NULL);
                CREATE TABLE IF NOT EXISTS suggestion_limits (
                    day TEXT NOT NULL, visitor TEXT NOT NULL, count INTEGER NOT NULL,
                    last_at REAL NOT NULL, PRIMARY KEY(day, visitor));
            ''')
            db.execute('INSERT OR IGNORE INTO meta VALUES (?, ?)', ('started_at', self.date()))

    def connect(self):
        db = sqlite3.connect(self.path, timeout=15)
        db.execute('PRAGMA busy_timeout=15000')
        return db

    def date(self):
        return datetime.fromtimestamp(self.clock(), SHANGHAI).date().isoformat()

    def check_page(self, page):
        if not isinstance(page, str) or page not in self.pages:
            raise ValueError('Unknown page')

    def snapshot(self, db, page, day):
        def counts(scope):
            total = db.execute('SELECT visits FROM totals WHERE scope=?', (scope,)).fetchone()
            daily = db.execute('SELECT visits, visitors FROM daily WHERE scope=? AND day=?', (scope, day)).fetchone()
            return {'today': daily[0] if daily else 0, 'total': total[0] if total else 0,
                    'visitorsToday': daily[1] if daily else 0}
        return {'date': day, 'timezone': 'Asia/Shanghai',
                'startedAt': db.execute("SELECT value FROM meta WHERE key='started_at'").fetchone()[0],
                'site': counts('site'), 'page': {'id': page, **counts(page)}}

    def read(self, page):
        self.check_page(page)
        with closing(self.connect()) as db, db:
            db.execute('BEGIN')
            return self.snapshot(db, page, self.date())

    def record(self, page, event_id, visitor_id):
        self.check_page(page)
        if not isinstance(event_id, str) or not UUID.fullmatch(event_id):
            raise ValueError('Invalid event id')
        if visitor_id is not None and (not isinstance(visitor_id, str) or not UUID.fullmatch(visitor_id)):
            raise ValueError('Invalid visitor id')
        now = self.clock()
        day = datetime.fromtimestamp(now, SHANGHAI).date().isoformat()
        with closing(self.connect()) as db, db:
            db.execute('BEGIN IMMEDIATE')
            cleanup = db.execute("SELECT value FROM meta WHERE key='cleanup_day'").fetchone()
            if not cleanup or cleanup[0] != day:
                db.execute('DELETE FROM events WHERE created < ?', (now - 7 * 86400,))
                db.execute('DELETE FROM visitors WHERE day < ?', (day,))
                db.execute("INSERT OR REPLACE INTO meta VALUES ('cleanup_day', ?)", (day,))
            inserted = db.execute('INSERT OR IGNORE INTO events VALUES (?, ?)', (event_id, now)).rowcount
            if inserted:
                # A random browser ID, hashed with the day. Never store IP, UA or raw IDs.
                visitor = hashlib.sha256((day + ':' + visitor_id).encode()).hexdigest() if visitor_id else None
                for scope in ('site', page):
                    db.execute('INSERT INTO totals VALUES (?, 1) ON CONFLICT(scope) DO UPDATE SET visits=visits+1', (scope,))
                    db.execute('INSERT INTO daily VALUES (?, ?, 1, 0) ON CONFLICT(scope,day) DO UPDATE SET visits=visits+1', (scope, day))
                    if visitor and db.execute('INSERT OR IGNORE INTO visitors VALUES (?, ?, ?)', (scope, day, visitor)).rowcount:
                        db.execute('UPDATE daily SET visitors=visitors+1 WHERE scope=? AND day=?', (scope, day))
            return self.snapshot(db, page, day)


    @staticmethod
    def suggestion(row):
        return dict(zip(('id', 'kind', 'title', 'description', 'nickname', 'createdAt'), row))

    def list_suggestions(self, before=None):
        if before is not None and (not isinstance(before, int) or not 0 < before < 2**63):
            raise ValueError('Invalid cursor')
        with closing(self.connect()) as db, db:
            db.execute('BEGIN')
            total = db.execute('SELECT COUNT(*) FROM suggestions').fetchone()[0]
            rows = db.execute('''SELECT id, kind, title, description, nickname, created
                FROM suggestions WHERE (? IS NULL OR id < ?) ORDER BY id DESC LIMIT 21''',
                (before, before)).fetchall()
            return {'items': [self.suggestion(row) for row in rows[:20]], 'total': total,
                    'nextCursor': rows[19][0] if len(rows) > 20 else None}

    def submit_suggestion(self, payload):
        request_id, visitor_id = payload.get('requestId'), payload.get('visitorId')
        if any(not isinstance(v, str) or not UUID.fullmatch(v) for v in (request_id, visitor_id)):
            raise ValueError('Invalid identity')
        kind = payload.get('kind')
        if kind not in ('game', 'idea'):
            raise ValueError('Invalid kind')
        values = []
        for key, minimum, maximum in [('title', 2, 40), ('description', 5, 500), ('nickname', 0, 20)]:
            value = payload.get(key, '')
            if not isinstance(value, str):
                raise ValueError('Invalid text')
            value = value.strip()
            if not minimum <= len(value) <= maximum or any(ord(c) < 32 and c not in '\n\t\r' for c in value):
                raise ValueError('Invalid text')
            values.append(value)
        title, description, nickname = values
        now, day = self.clock(), self.date()
        visitor = hashlib.sha256((day + ':' + visitor_id).encode()).hexdigest()
        with closing(self.connect()) as db, db:
            db.execute('BEGIN IMMEDIATE')
            previous = db.execute('''SELECT id, kind, title, description, nickname, created
                FROM suggestions WHERE request_id=?''', (request_id,)).fetchone()
            if previous:
                if previous[1:5] != (kind, title, description, nickname):
                    raise ValueError('Request already used')
                return self.suggestion(previous)
            db.execute('DELETE FROM suggestion_limits WHERE day < ?', (day,))
            limit = db.execute('SELECT count, last_at FROM suggestion_limits WHERE day=? AND visitor=?',
                               (day, visitor)).fetchone()
            if limit and (limit[0] >= 5 or now - limit[1] < 60):
                raise SubmissionLimited()
            cursor = db.execute('''INSERT INTO suggestions
                (request_id, kind, title, description, nickname, created) VALUES (?, ?, ?, ?, ?, ?)''',
                (request_id, kind, title, description, nickname, now))
            db.execute('''INSERT INTO suggestion_limits VALUES (?, ?, 1, ?)
                ON CONFLICT(day,visitor) DO UPDATE SET count=count+1, last_at=excluded.last_at''',
                (day, visitor, now))
            return self.suggestion((cursor.lastrowid, kind, title, description, nickname, now))


class StatsHandler(SimpleHTTPRequestHandler):
    server_version = 'ArcadeStats/1'

    def __init__(self, *args, **kwargs):
        server = args[2]
        super().__init__(*args, directory=str(server.static_root or Path.cwd()), **kwargs)

    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def log_message(self, fmt, *args):
        # Avoid recording visitor identifiers and IP addresses in application logs.
        pass

    def respond(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def page(self):
        return parse_qs(urlsplit(self.path).query).get('page', ['lobby'])[0]

    def static_allowed(self):
        root = self.server.static_root
        if not root:
            return False
        path = unquote(urlsplit(self.path).path).lstrip('/') or 'index.html'
        target = (root / path).resolve()
        if not target.is_relative_to(root) or any(part.startswith('.') for part in Path(path).parts):
            return False
        if Path(path).parts[0] in {'server', 'tests', 'deploy'}:
            return False
        return target.is_file() and target.suffix.lower() in {'.html', '.js', '.css', '.json', '.svg', '.png', '.jpg', '.webp', '.mp3', '.wav', '.ogg', '.ico'}

    def do_GET(self):
        path = urlsplit(self.path).path
        try:
            if path == '/api/health':
                self.respond(200, {'ok': True})
            elif path == '/api/stats':
                self.respond(200, self.server.store.read(self.page()))
            elif path == '/api/suggestions':
                before = parse_qs(urlsplit(self.path).query).get('before', [None])[0]
                self.respond(200, self.server.store.list_suggestions(int(before) if before is not None else None))
            elif self.static_allowed():
                if urlsplit(self.path).path == '/':
                    self.path = '/index.html'
                super().do_GET()
            else:
                self.respond(404, {'error': 'Not found'})
        except ValueError:
            self.respond(400, {'error': 'Invalid request'})
        except sqlite3.Error:
            self.respond(503, {'error': 'Statistics unavailable'})

    def do_HEAD(self):
        if self.static_allowed():
            if urlsplit(self.path).path == '/':
                self.path = '/index.html'
            super().do_HEAD()
        else:
            self.respond(404, {'error': 'Not found'})

    def do_POST(self):
        path = urlsplit(self.path).path
        if path not in ('/api/visits', '/api/suggestions'):
            return self.respond(404, {'error': 'Not found'})
        if self.headers.get('Origin') not in self.server.allowed_origins:
            return self.respond(403, {'error': 'Origin not allowed'})
        if self.headers.get('Content-Type', '').split(';')[0].strip() != 'application/json':
            return self.respond(415, {'error': 'JSON required'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= (4096 if path == '/api/suggestions' else 1024):
                return self.respond(413, {'error': 'Invalid request size'})
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError('Invalid payload')
            if path == '/api/suggestions':
                result = self.server.store.submit_suggestion(payload)
            else:
                result = self.server.store.record(payload.get('page'), payload.get('eventId'), payload.get('visitorId'))
            self.respond(200, result)
        except SubmissionLimited:
            self.respond(429, {'error': '请间隔一分钟再推荐，每个浏览器每天最多提交 5 条。'})
        except (ValueError, UnicodeError):
            self.respond(400, {'error': 'Invalid request'})
        except sqlite3.Error:
            self.respond(503, {'error': 'Statistics unavailable'})


def make_server(store, port=46175, allowed_origins=(), static_root=None):
    server = ThreadingHTTPServer(('127.0.0.1', port), StatsHandler)
    server.store = store
    server.allowed_origins = set(allowed_origins)
    server.static_root = Path(static_root).resolve() if static_root else None
    return server


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=46175)
    parser.add_argument('--db', type=Path, required=True)
    parser.add_argument('--catalog', type=Path, default=Path(__file__).resolve().parents[1] / 'games.json')
    parser.add_argument('--allow-origin', action='append', default=[])
    parser.add_argument('--static-root', type=Path, help='Local preview only; production should use Nginx')
    args = parser.parse_args()
    pages = [game['id'] for game in json.loads(args.catalog.read_text())]
    store = StatsStore(args.db, pages)
    origins = args.allow_origin or [f'http://127.0.0.1:{args.port}', f'http://localhost:{args.port}']
    with make_server(store, args.port, origins, args.static_root) as server:
        print(f'Arcade stats: http://127.0.0.1:{args.port}', flush=True)
        server.serve_forever()


if __name__ == '__main__':
    main()
