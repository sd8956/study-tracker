// Pure calendar logic for the study schedule: Mon–Fri 2 h, Saturday 3 h, Sunday rest.
// Dates are plain 'YYYY-MM-DD' strings in the study time zone.

export const DEFAULT_TZ = "America/Bogota";

export function studyTz(): string {
  return process.env.STUDY_TZ || DEFAULT_TZ;
}

/** Calendar date of `now` in time zone `tz`. */
export function todayIn(tz: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Calendar date (in `tz`) of an ISO timestamp. */
export function dateIn(iso: string, tz: string): string {
  return todayIn(tz, new Date(iso));
}

function toUtc(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(date: string, n: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: string): number {
  return toUtc(date).getUTCDay();
}

/** Hours of route study planned for that day. */
export function dayBudget(date: string): 0 | 2 | 3 {
  const w = weekday(date);
  return w === 0 ? 0 : w === 6 ? 3 : 2;
}

export function isStudyDay(date: string): boolean {
  return weekday(date) !== 0;
}

/** First study day strictly after `date`. */
export function nextStudyDay(date: string): string {
  let d = addDays(date, 1);
  while (!isStudyDay(d)) d = addDays(d, 1);
  return d;
}

export type Planned = { date: string; status: "done" | "current" | "upcoming" };

/**
 * Projects a date for every session, in plan order. Completed sessions keep their completion date.
 * The current session (first not completed) is planned for today, or for the next study day when
 * today is Sunday or a session was already completed today; each later session takes the next study day.
 */
export function projectSchedule(keys: string[], completed: Map<string, string>, today: string): Map<string, Planned> {
  const out = new Map<string, Planned>();
  const doneToday = [...completed.values()].includes(today);
  let next = !isStudyDay(today) || doneToday ? nextStudyDay(today) : today;
  let first = true;
  for (const key of keys) {
    const doneDate = completed.get(key);
    if (doneDate !== undefined) {
      out.set(key, { date: doneDate, status: "done" });
      continue;
    }
    out.set(key, { date: next, status: first ? "current" : "upcoming" });
    first = false;
    next = nextStudyDay(next);
  }
  return out;
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "lun 19 oct" */
export function shortDate(date: string): string {
  const d = toUtc(date);
  return `${WEEKDAYS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "lunes 19 de oct" */
export function longDate(date: string): string {
  const d = toUtc(date);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
}
