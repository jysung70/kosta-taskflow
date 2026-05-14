import sqlite3
from contextlib import contextmanager

DB_PATH = "taskflow.db"

# DB 초기화 및 마이그레이션
def init_db():
    with get_conn() as conn:
        # 기본 테이블 생성
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                title        TEXT NOT NULL,
                status       TEXT NOT NULL DEFAULT 'todo',
                description  TEXT,
                start_date   TEXT,
                due_date     TEXT,
                completed_at TEXT,
                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # 기존 테이블에 컬럼 추가 (마이그레이션)
        existing = {row[1] for row in conn.execute("PRAGMA table_info(tasks)")}
        migrations = {
            "description":  "ALTER TABLE tasks ADD COLUMN description  TEXT",
            "start_date":   "ALTER TABLE tasks ADD COLUMN start_date   TEXT",
            "due_date":     "ALTER TABLE tasks ADD COLUMN due_date     TEXT",
            "completed_at": "ALTER TABLE tasks ADD COLUMN completed_at TEXT",
        }
        for col, sql in migrations.items():
            if col not in existing:
                conn.execute(sql)

@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
