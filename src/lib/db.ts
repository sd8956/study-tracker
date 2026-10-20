// SQLite storage (node:sqlite). Server-only.
import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

// Each entry upgrades the schema by one version (PRAGMA user_version).
const MIGRATIONS: string[] = [
  `
  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE progress (
    session_key TEXT PRIMARY KEY,
    completed_at TEXT NOT NULL
  );
  CREATE TABLE english_log (
    date TEXT PRIMARY KEY CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    minutes INTEGER NOT NULL CHECK (minutes BETWEEN 0 AND 600),
    completed_at TEXT NOT NULL
  );
  CREATE TABLE cards (
    card_key TEXT PRIMARY KEY,
    session_key TEXT NOT NULL,
    question_index INTEGER NOT NULL,
    box INTEGER NOT NULL CHECK (box BETWEEN 1 AND 5),
    due_date TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX cards_due ON cards (due_date);
  CREATE TABLE card_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_key TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('good', 'hard', 'again')),
    reviewed_at TEXT NOT NULL
  );
  CREATE INDEX card_reviews_card ON card_reviews (card_key);
  CREATE TABLE answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_key TEXT NOT NULL,
    question_index INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('review', 'evaluation', 'feynman')),
    answer TEXT NOT NULL,
    score REAL,
    feedback TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX answers_session ON answers (session_key, kind, question_index);
  CREATE TABLE notes (
    session_key TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_key TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX chat_session ON chat_messages (session_key, id);
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

function migrate(db: DatabaseSync) {
  const current = (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
}

/** Opens (creating if needed) the database at `path` and brings its schema up to date. */
export function openDatabase(path: string): DatabaseSync {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  migrate(db);
  return db;
}

export function dbPath(): string {
  return process.env.STUDY_DB_PATH || join(process.cwd(), "data", "study.db");
}

// Survive dev hot reloads without reopening the file on every edit.
const globalForDb = globalThis as unknown as { __studyDb?: { path: string; db: DatabaseSync } };

export function getDb(): DatabaseSync {
  const path = dbPath();
  if (!globalForDb.__studyDb || globalForDb.__studyDb.path !== path) {
    globalForDb.__studyDb = { path, db: openDatabase(path) };
  }
  return globalForDb.__studyDb.db;
}

/** Runs `fn` inside BEGIN IMMEDIATE … COMMIT (rolls back on throw). */
export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
