// Pure progress statistics.
import { addDays, isStudyDay, weekday } from "./schedule";

/**
 * Consecutive study days (Mon–Sat) with activity, counting back from today.
 * Sundays never break the streak; today without activity yet does not break it either.
 */
export function computeStreak(active: Set<string>, today: string): number {
  let streak = 0;
  let d = today;
  if (!active.has(d)) d = addDays(d, -1);
  for (let guard = 0; guard < 5000; guard++) {
    if (!isStudyDay(d)) {
      d = addDays(d, -1);
      continue;
    }
    if (!active.has(d)) break;
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

export type HeatCell = { date: string; count: number; future: boolean };

/** `weeks` Monday-first columns ending with the week that contains today. */
export function heatmapWeeks(counts: Map<string, number>, today: string, weeks = 12): HeatCell[][] {
  const monday = addDays(today, -((weekday(today) + 6) % 7));
  const start = addDays(monday, -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(start, w * 7 + d);
      return { date, count: counts.get(date) ?? 0, future: date > today };
    }),
  );
}
