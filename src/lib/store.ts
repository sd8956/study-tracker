// Data access and study rules on top of SQLite. Every function takes the DB so tests can use a temp file.
import "server-only";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { transaction } from "./db";
import { applyReview, reviewQueue, type ReviewResult } from "./leitner";
import type { PlanSession } from "./plan";
import { addDays, todayIn } from "./schedule";
import type { GradeKind } from "./tutor-core";

export type Result = { ok: true } | { ok: false; error: string };
type PlanLike = { sessions: Pick<PlanSession, "key" | "kind" | "review">[] };

const plain = <T>(row: unknown): T => ({ ...(row as object) }) as T;

// ---------- progress ----------

/** session_key → completed_at (ISO), in completion order. */
export function getCompleted(db: DatabaseSync): Map<string, string> {
  const rows = db.prepare("SELECT session_key, completed_at FROM progress ORDER BY completed_at, rowid").all() as {
    session_key: string;
    completed_at: string;
  }[];
  return new Map(rows.map((r) => [r.session_key, r.completed_at]));
}

/** Completes `key` only if it is the current session (first not completed in plan order). */
export function completeSession(db: DatabaseSync, plan: PlanLike, key: string, now: Date, tz: string): Result {
  return transaction(db, (): Result => {
    const completed = getCompleted(db);
    const current = plan.sessions.find((s) => !completed.has(s.key));
    if (!plan.sessions.some((s) => s.key === key)) return { ok: false, error: "Esa sesión no existe." };
    if (!current || current.key !== key) return { ok: false, error: "Solo puedes marcar la sesión actual." };

    db.prepare("INSERT INTO progress (session_key, completed_at) VALUES (?, ?)").run(key, now.toISOString());
    if ((current.kind === "lesson" || current.kind === "course") && current.review.length > 0) {
      const due = addDays(todayIn(tz, now), 1);
      const insert = db.prepare(
        "INSERT OR IGNORE INTO cards (card_key, session_key, question_index, box, due_date, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
      );
      for (const q of current.review) insert.run(`${key}#${q.index}`, key, q.index, due, now.toISOString());
    }
    return { ok: true };
  });
}

/** Undoes `key` only if it is the last completed session in plan order. Removes its never-reviewed cards. */
export function undoSession(db: DatabaseSync, plan: PlanLike, key: string): Result {
  return transaction(db, (): Result => {
    const completed = getCompleted(db);
    const last = [...plan.sessions].reverse().find((s) => completed.has(s.key));
    if (!last || last.key !== key) return { ok: false, error: "Solo puedes deshacer la última sesión completada." };
    db.prepare("DELETE FROM progress WHERE session_key = ?").run(key);
    db.prepare(
      "DELETE FROM cards WHERE session_key = ? AND card_key NOT IN (SELECT card_key FROM card_reviews)",
    ).run(key);
    return { ok: true };
  });
}

// ---------- english ----------

export function logEnglish(db: DatabaseSync, date: string, minutes: number, now: Date): void {
  db.prepare(
    `INSERT INTO english_log (date, minutes, completed_at) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET minutes = excluded.minutes, completed_at = excluded.completed_at`,
  ).run(date, Math.round(minutes), now.toISOString());
}

/** date → minutes, ascending by date. */
export function getEnglishLog(db: DatabaseSync): Map<string, number> {
  const rows = db.prepare("SELECT date, minutes FROM english_log ORDER BY date").all() as { date: string; minutes: number }[];
  return new Map(rows.map((r) => [r.date, r.minutes]));
}

// ---------- cards ----------

export type Card = { cardKey: string; sessionKey: string; questionIndex: number; box: number; due: string };

export function listCards(db: DatabaseSync): Card[] {
  const rows = db
    .prepare("SELECT card_key, session_key, question_index, box, due_date FROM cards ORDER BY session_key, question_index")
    .all() as { card_key: string; session_key: string; question_index: number; box: number; due_date: string }[];
  return rows.map((r) => ({
    cardKey: r.card_key,
    sessionKey: r.session_key,
    questionIndex: r.question_index,
    box: r.box,
    due: r.due_date,
  }));
}

export function getDueCards(db: DatabaseSync, today: string): Card[] {
  return reviewQueue(listCards(db), today);
}

export function countDueCards(db: DatabaseSync, today: string): number {
  return (db.prepare("SELECT count(*) AS n FROM cards WHERE due_date <= ?").get(today) as { n: number }).n;
}

export function reviewCard(db: DatabaseSync, cardKey: string, result: ReviewResult, today: string, now: Date): Result {
  return transaction(db, (): Result => {
    const card = db.prepare("SELECT box FROM cards WHERE card_key = ?").get(cardKey) as { box: number } | undefined;
    if (!card) return { ok: false, error: "Esa tarjeta no existe." };
    const next = applyReview(card.box, result, today);
    db.prepare("UPDATE cards SET box = ?, due_date = ?, updated_at = ? WHERE card_key = ?").run(
      next.box,
      next.due,
      now.toISOString(),
      cardKey,
    );
    db.prepare("INSERT INTO card_reviews (card_key, result, reviewed_at) VALUES (?, ?, ?)").run(cardKey, result, now.toISOString());
    return { ok: true };
  });
}

/** Review dates (calendar dates in `tz` are derived by the caller). */
export function listReviewTimes(db: DatabaseSync): string[] {
  return (db.prepare("SELECT reviewed_at FROM card_reviews ORDER BY id").all() as { reviewed_at: string }[]).map((r) => r.reviewed_at);
}

// ---------- answers, notes, chat ----------

export type AnswerInput = {
  sessionKey: string;
  questionIndex: number;
  kind: GradeKind;
  answer: string;
  score: number | null;
  feedback: string | null;
};
export type AnswerRow = AnswerInput & { id: number; createdAt: string };

export function saveAnswer(db: DatabaseSync, a: AnswerInput, now: Date): number {
  const r = db
    .prepare(
      "INSERT INTO answers (session_key, question_index, kind, answer, score, feedback, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(a.sessionKey, a.questionIndex, a.kind, a.answer, a.score, a.feedback, now.toISOString());
  return Number(r.lastInsertRowid);
}

type AnswerDbRow = {
  id: number;
  session_key: string;
  question_index: number;
  kind: GradeKind;
  answer: string;
  score: number | null;
  feedback: string | null;
  created_at: string;
};
const toAnswer = (r: AnswerDbRow): AnswerRow => ({
  id: r.id,
  sessionKey: r.session_key,
  questionIndex: r.question_index,
  kind: r.kind,
  answer: r.answer,
  score: r.score,
  feedback: r.feedback,
  createdAt: r.created_at,
});

/** Latest answer per (kind, question) for a session. */
export function latestAnswers(db: DatabaseSync, sessionKey: string): AnswerRow[] {
  const rows = db
    .prepare(
      `SELECT * FROM answers a WHERE session_key = ? AND id = (
         SELECT max(id) FROM answers b WHERE b.session_key = a.session_key AND b.kind = a.kind AND b.question_index = a.question_index
       ) ORDER BY kind, question_index`,
    )
    .all(sessionKey) as AnswerDbRow[];
  return rows.map(toAnswer);
}

/** Per evaluation session: average of the latest score per question, as a percentage. */
export function evaluationScores(db: DatabaseSync): Map<string, { pct: number; answered: number }> {
  const rows = db
    .prepare(
      `SELECT session_key, avg(score) AS avg, count(*) AS n FROM answers a
       WHERE kind = 'evaluation' AND score IS NOT NULL AND id = (
         SELECT max(id) FROM answers b WHERE b.session_key = a.session_key AND b.kind = 'evaluation' AND b.question_index = a.question_index
       ) GROUP BY session_key`,
    )
    .all() as { session_key: string; avg: number; n: number }[];
  return new Map(rows.map((r) => [r.session_key, { pct: Math.round(r.avg * 10), answered: r.n }]));
}

export function getNote(db: DatabaseSync, sessionKey: string): string {
  const r = db.prepare("SELECT text FROM notes WHERE session_key = ?").get(sessionKey) as { text: string } | undefined;
  return r?.text ?? "";
}

export function saveNote(db: DatabaseSync, sessionKey: string, text: string, now: Date): void {
  db.prepare(
    `INSERT INTO notes (session_key, text, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(session_key) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at`,
  ).run(sessionKey, text, now.toISOString());
}

export type StoredChat = { role: "user" | "assistant"; content: string };

export function getChat(db: DatabaseSync, sessionKey: string, limit = 50): StoredChat[] {
  const rows = db
    .prepare("SELECT role, content FROM chat_messages WHERE session_key = ? ORDER BY id DESC LIMIT ?")
    .all(sessionKey, limit) as StoredChat[];
  return rows.reverse().map((r) => plain<StoredChat>(r));
}

export function appendChat(db: DatabaseSync, sessionKey: string, messages: StoredChat[], now: Date): void {
  transaction(db, () => {
    const insert = db.prepare("INSERT INTO chat_messages (session_key, role, content, created_at) VALUES (?, ?, ?, ?)");
    for (const m of messages) insert.run(sessionKey, m.role, m.content, now.toISOString());
  });
}

export function clearChat(db: DatabaseSync, sessionKey: string): void {
  db.prepare("DELETE FROM chat_messages WHERE session_key = ?").run(sessionKey);
}

// ---------- backup ----------

type ColType = "text" | "int" | "real?" | "text?";
const TABLES: Record<string, Record<string, ColType>> = {
  settings: { key: "text", value: "text" },
  progress: { session_key: "text", completed_at: "text" },
  english_log: { date: "text", minutes: "int", completed_at: "text" },
  cards: { card_key: "text", session_key: "text", question_index: "int", box: "int", due_date: "text", updated_at: "text" },
  card_reviews: { id: "int", card_key: "text", result: "text", reviewed_at: "text" },
  answers: {
    id: "int",
    session_key: "text",
    question_index: "int",
    kind: "text",
    answer: "text",
    score: "real?",
    feedback: "text?",
    created_at: "text",
  },
  notes: { session_key: "text", text: "text", updated_at: "text" },
  chat_messages: { id: "int", session_key: "text", role: "text", content: "text", created_at: "text" },
};
const ORDER_BY: Record<string, string> = {
  settings: "key",
  progress: "session_key",
  english_log: "date",
  cards: "card_key",
  card_reviews: "id",
  answers: "id",
  notes: "session_key",
  chat_messages: "id",
};

export const BACKUP_APP = "study-tracker";
export const BACKUP_VERSION = 1;
export type Backup = {
  app: typeof BACKUP_APP;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  tables: Record<string, Record<string, SQLInputValue>[]>;
};

export function exportData(db: DatabaseSync, now: Date): Backup {
  const tables: Backup["tables"] = {};
  for (const [name, cols] of Object.entries(TABLES)) {
    const rows = db.prepare(`SELECT ${Object.keys(cols).join(", ")} FROM ${name} ORDER BY ${ORDER_BY[name]}`).all();
    tables[name] = rows.map((r) => plain<Record<string, SQLInputValue>>(r));
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), tables };
}

function validValue(v: unknown, type: ColType): boolean {
  switch (type) {
    case "text":
      return typeof v === "string" && v.length <= 200_000;
    case "text?":
      return v === null || (typeof v === "string" && v.length <= 200_000);
    case "int":
      return typeof v === "number" && Number.isInteger(v);
    case "real?":
      return v === null || (typeof v === "number" && Number.isFinite(v));
  }
}

/** Replaces all data with a backup produced by exportData. Validates first; all-or-nothing. */
export function importData(db: DatabaseSync, input: unknown): Result {
  const invalid: Result = { ok: false, error: "El archivo no es una copia válida de Study Tracker." };
  if (!input || typeof input !== "object") return invalid;
  const data = input as Partial<Backup>;
  if (data.app !== BACKUP_APP || data.version !== BACKUP_VERSION || !data.tables || typeof data.tables !== "object") {
    return invalid;
  }
  for (const [name, cols] of Object.entries(TABLES)) {
    const rows = (data.tables as Record<string, unknown>)[name];
    if (rows === undefined) continue;
    if (!Array.isArray(rows)) return invalid;
    for (const row of rows) {
      if (!row || typeof row !== "object") return invalid;
      for (const [col, type] of Object.entries(cols)) {
        if (!validValue((row as Record<string, unknown>)[col], type)) return invalid;
      }
    }
  }
  try {
    transaction(db, () => {
      for (const [name, cols] of Object.entries(TABLES)) {
        db.exec(`DELETE FROM ${name}`);
        const names = Object.keys(cols);
        const insert = db.prepare(`INSERT INTO ${name} (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`);
        const rows = ((data.tables as Record<string, unknown>)[name] ?? []) as Record<string, SQLInputValue>[];
        for (const row of rows) insert.run(...names.map((c) => row[c]));
      }
    });
  } catch {
    return { ok: false, error: "La copia tiene datos inconsistentes; no se importó nada." };
  }
  return { ok: true };
}
