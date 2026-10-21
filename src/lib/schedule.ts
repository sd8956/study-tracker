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

export type Segment = { date: string; hours: number };
/** `date` is the completion date (done) or the first planned day; `segments` say how many hours fall on each day. */
export type Planned = { date: string; status: "done" | "current" | "upcoming"; segments: Segment[] };
export type ScheduleItem = { key: string; hours: number };
export type WorkEntry = { sessionKey: string; date: string; hours: number };

/**
 * Projects the pending sessions onto the calendar by hours, in plan order: each study day has a budget
 * (Mon–Fri 2 h, Sat 3 h) and a session takes as many days as its hours need, so a 3 h session can span
 * two weekdays and the next session starts in the hours left. Hours already worked today use up today's
 * budget; partial work on a session shortens what is left of it. Completed sessions keep their date.
 */
export function projectSchedule(
  items: ScheduleItem[],
  completed: Map<string, string>,
  work: WorkEntry[],
  today: string,
): Map<string, Planned> {
  const out = new Map<string, Planned>();
  const usedToday = work.filter((w) => w.date === today).reduce((sum, w) => sum + w.hours, 0);
  const worked = new Map<string, number>();
  for (const w of work) worked.set(w.sessionKey, (worked.get(w.sessionKey) ?? 0) + w.hours);

  let day = today;
  let left = dayBudget(today) - usedToday;
  const advance = () => {
    day = nextStudyDay(day);
    left = dayBudget(day);
  };
  if (left <= 0) advance();

  let first = true;
  for (const { key, hours } of items) {
    const doneDate = completed.get(key);
    if (doneDate !== undefined) {
      out.set(key, { date: doneDate, status: "done", segments: [] });
      continue;
    }
    let need = Math.max(hours - (worked.get(key) ?? 0), 0);
    const segments: Segment[] = [];
    while (need > 0) {
      if (left <= 0) advance();
      const take = Math.min(need, left);
      segments.push({ date: day, hours: take });
      need -= take;
      left -= take;
    }
    out.set(key, { date: segments[0]?.date ?? day, status: first ? "current" : "upcoming", segments });
    first = false;
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
