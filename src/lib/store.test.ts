import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./db";
import { loadPlanFrom } from "./plan";
import {
  completeSession,
  exportData,
  getCompleted,
  getDueCards,
  getEnglishLog,
  getWorkLog,
  importData,
  listCards,
  logEnglish,
  logWork,
  reviewCard,
  saveAnswer,
  undoSession,
} from "./store";

const plan = loadPlanFrom(join(__dirname, "..", "..", "test", "fixtures", "content"));
const TZ = "America/Bogota";
// Monday 2026-10-19, 15:00 in Bogotá.
const NOW = new Date("2026-10-19T20:00:00Z");
const K = plan.sessions.map((s) => s.key);

let db: DatabaseSync;
beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), "study-store-"));
  db = openDatabase(join(dir, "study.db"));
});

describe("migrations", () => {
  it("sets user_version and is idempotent", () => {
    const v = (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
    expect(v).toBeGreaterThan(0);
    const dir = mkdtempSync(join(tmpdir(), "study-store-"));
    const path = join(dir, "study.db");
    openDatabase(path).close();
    const again = openDatabase(path);
    expect((again.prepare("PRAGMA user_version").get() as { user_version: number }).user_version).toBe(v);
  });
});

describe("sequence rules", () => {
  it("only the current session can be completed", () => {
    expect(completeSession(db, plan, K[1], NOW, TZ)).toMatchObject({ ok: false });
    expect(completeSession(db, plan, "nope/none", NOW, TZ)).toMatchObject({ ok: false });
    expect(completeSession(db, plan, K[0], NOW, TZ)).toEqual({ ok: true });
    expect(completeSession(db, plan, K[0], NOW, TZ)).toMatchObject({ ok: false });
    expect(completeSession(db, plan, K[1], NOW, TZ)).toEqual({ ok: true });
    expect([...getCompleted(db).keys()]).toEqual([K[0], K[1]]);
    expect(getCompleted(db).get(K[0])).toBe(NOW.toISOString());
  });

  it("only the last completed session can be undone", () => {
    completeSession(db, plan, K[0], NOW, TZ);
    completeSession(db, plan, K[1], NOW, TZ);
    expect(undoSession(db, plan, K[0])).toMatchObject({ ok: false });
    expect(undoSession(db, plan, K[2])).toMatchObject({ ok: false });
    expect(undoSession(db, plan, K[1])).toEqual({ ok: true });
    expect(undoSession(db, plan, K[0])).toEqual({ ok: true });
    expect(getCompleted(db).size).toBe(0);
  });

  it("completing a lesson creates box-1 cards due tomorrow; undo removes unreviewed cards only", () => {
    completeSession(db, plan, K[0], NOW, TZ);
    const cards = listCards(db);
    expect(cards.map((c) => c.cardKey)).toEqual([1, 2, 3, 4].map((n) => `${K[0]}#${n}`));
    expect(cards.every((c) => c.box === 1 && c.due === "2026-10-20")).toBe(true);

    reviewCard(db, `${K[0]}#2`, "good", "2026-10-20", new Date("2026-10-20T20:00:00Z"));
    undoSession(db, plan, K[0]);
    expect(listCards(db).map((c) => c.cardKey)).toEqual([`${K[0]}#2`]);
  });

  it("a project creates no cards; a course creates cards from its review questions", () => {
    completeSession(db, plan, K[0], NOW, TZ);
    const before = listCards(db).length;
    completeSession(db, plan, K[1], NOW, TZ);
    expect(listCards(db).length).toBe(before);
    completeSession(db, plan, K[2], NOW, TZ);
    expect(listCards(db).length).toBe(before + 3);
  });
});

describe("cards", () => {
  it("review applies Leitner and logs the review; due queue respects today", () => {
    completeSession(db, plan, K[0], NOW, TZ);
    expect(getDueCards(db, "2026-10-19")).toHaveLength(0);
    expect(getDueCards(db, "2026-10-20")).toHaveLength(4);
    expect(reviewCard(db, `${K[0]}#1`, "good", "2026-10-20", NOW)).toEqual({ ok: true });
    expect(reviewCard(db, `${K[0]}#2`, "again", "2026-10-20", NOW)).toEqual({ ok: true });
    expect(reviewCard(db, "missing#1", "good", "2026-10-20", NOW)).toMatchObject({ ok: false });
    const byKey = new Map(listCards(db).map((c) => [c.cardKey, c]));
    expect(byKey.get(`${K[0]}#1`)).toMatchObject({ box: 2, due: "2026-10-23" });
    expect(byKey.get(`${K[0]}#2`)).toMatchObject({ box: 1, due: "2026-10-21" });
    const reviews = db.prepare("SELECT count(*) AS n FROM card_reviews").get() as { n: number };
    expect(reviews.n).toBe(2);
  });
});

describe("english log", () => {
  it("records one entry per date (idempotent)", () => {
    logEnglish(db, "2026-10-19", 60, NOW);
    logEnglish(db, "2026-10-19", 45, NOW);
    logEnglish(db, "2026-10-20", 60, NOW);
    expect([...getEnglishLog(db).entries()]).toEqual([
      ["2026-10-19", 45],
      ["2026-10-20", 60],
    ]);
  });
});

describe("export / import", () => {
  it("round-trips data and rejects invalid payloads without touching the DB", () => {
    completeSession(db, plan, K[0], NOW, TZ);
    logEnglish(db, "2026-10-19", 60, NOW);
    saveAnswer(db, { sessionKey: K[0], questionIndex: 1, kind: "review", answer: "a", score: 7, feedback: "f" }, NOW);
    const dump = exportData(db, NOW);

    const other = openDatabase(join(mkdtempSync(join(tmpdir(), "study-store-")), "study.db"));
    expect(importData(other, dump)).toEqual({ ok: true });
    expect(exportData(other, NOW)).toEqual(dump);

    expect(importData(other, { version: 99 })).toMatchObject({ ok: false });
    expect(importData(other, { ...dump, tables: { ...dump.tables, progress: [{ session_key: 5 }] } })).toMatchObject({
      ok: false,
    });
    expect(exportData(other, NOW)).toEqual(dump);
  });

  it("rejects a backup with missing tables instead of wiping them", () => {
    completeSession(db, plan, K[0], NOW, TZ);
    const dump = exportData(db, NOW);
    expect(importData(db, { ...dump, tables: {} })).toMatchObject({ ok: false });
    const partial: Record<string, unknown> = { ...dump.tables };
    delete partial.progress;
    expect(importData(db, { ...dump, tables: partial })).toMatchObject({ ok: false });
    expect(exportData(db, NOW)).toEqual(dump);
  });
});

describe("work log (hour budget)", () => {
  const TUE_NOW = new Date("2026-10-20T20:00:00Z");

  it("completing a session logs its remaining hours for today", () => {
    completeSession(db, plan, K[0], NOW, TZ);
    expect(getWorkLog(db)).toEqual([{ sessionKey: K[0], date: "2026-10-19", hours: 2, auto: true }]);
  });

  it("partial work is allowed only on the current session and below its remaining hours", () => {
    completeSession(db, plan, K[0], NOW, TZ);
    // K[1] is the 3 h project.
    expect(logWork(db, plan, K[2], 1, NOW, TZ)).toMatchObject({ ok: false });
    expect(logWork(db, plan, K[1], 0, NOW, TZ)).toMatchObject({ ok: false });
    expect(logWork(db, plan, K[1], 3, NOW, TZ)).toMatchObject({ ok: false });
    expect(logWork(db, plan, K[1], 1, NOW, TZ)).toEqual({ ok: true });
    expect(logWork(db, plan, K[1], 1, NOW, TZ)).toEqual({ ok: true });
    expect(logWork(db, plan, K[1], 1, NOW, TZ)).toMatchObject({ ok: false });
    expect(getWorkLog(db).filter((w) => w.sessionKey === K[1])).toEqual([
      { sessionKey: K[1], date: "2026-10-19", hours: 2, auto: false },
    ]);
  });

  it("completing after partial work logs only the remainder; undo keeps the partial work", () => {
    completeSession(db, plan, K[0], NOW, TZ);
    logWork(db, plan, K[1], 2, NOW, TZ);
    expect(completeSession(db, plan, K[1], TUE_NOW, TZ)).toEqual({ ok: true });
    expect(getWorkLog(db).filter((w) => w.sessionKey === K[1])).toEqual([
      { sessionKey: K[1], date: "2026-10-19", hours: 2, auto: false },
      { sessionKey: K[1], date: "2026-10-20", hours: 1, auto: true },
    ]);
    expect(undoSession(db, plan, K[1])).toEqual({ ok: true });
    expect(getWorkLog(db).filter((w) => w.sessionKey === K[1])).toEqual([
      { sessionKey: K[1], date: "2026-10-19", hours: 2, auto: false },
    ]);
  });

  it("is part of the backup", () => {
    completeSession(db, plan, K[0], NOW, TZ);
    logWork(db, plan, K[1], 1, NOW, TZ);
    const dump = exportData(db, NOW);
    expect(dump.tables.work_log).toHaveLength(2);
    const other = openDatabase(join(mkdtempSync(join(tmpdir(), "study-store-")), "study.db"));
    expect(importData(other, dump)).toEqual({ ok: true });
    expect(getWorkLog(other)).toEqual(getWorkLog(db));
  });
});
