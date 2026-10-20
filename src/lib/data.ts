// Per-request view of the plan + progress for pages. Server-only.
import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "./db";
import { getPlan } from "./plan";
import { buildProgress } from "./progress";
import { dateIn, projectSchedule, studyTz, todayIn } from "./schedule";
import { getCompleted } from "./store";
import { isTutorEnabled } from "./tutor";

export const loadAppState = cache(async () => {
  // SQLite is synchronous: opt out of prerendering so every request reads fresh data.
  await connection();
  const plan = getPlan();
  const db = getDb();
  const tz = studyTz();
  const now = new Date();
  const today = todayIn(tz, now);
  const completedAt = getCompleted(db);
  const completedDates = new Map([...completedAt].map(([k, iso]) => [k, dateIn(iso, tz)]));
  const keys = plan.sessions.map((s) => s.key);
  const progress = buildProgress(keys, completedAt);
  const schedule = projectSchedule(keys, completedDates, today);
  return { plan, db, tz, now, today, completedDates, progress, schedule, tutorEnabled: isTutorEnabled() };
});

export type AppState = Awaited<ReturnType<typeof loadAppState>>;
