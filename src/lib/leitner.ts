// Pure Leitner spaced-repetition rules.
import { addDays } from "./schedule";

export type ReviewResult = "good" | "hard" | "again";
export const REVIEW_RESULTS: ReviewResult[] = ["good", "hard", "again"];
export const REVIEW_LIMIT = 15;
export const MAX_BOX = 5;

const INTERVALS: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 21, 5: 60 };

export function intervalFor(box: number): number {
  return INTERVALS[Math.min(MAX_BOX, Math.max(1, box))];
}

/** good → box+1 (max 5), due in interval(newBox); hard → same box, due tomorrow; again → box 1, due tomorrow. */
export function applyReview(box: number, result: ReviewResult, today: string): { box: number; due: string } {
  if (result === "good") {
    const next = Math.min(MAX_BOX, box + 1);
    return { box: next, due: addDays(today, intervalFor(next)) };
  }
  if (result === "hard") return { box, due: addDays(today, 1) };
  return { box: 1, due: addDays(today, 1) };
}

/** Cards due today or earlier, oldest due first, capped. */
export function reviewQueue<T extends { cardKey: string; due: string }>(cards: T[], today: string, limit = REVIEW_LIMIT): T[] {
  return cards
    .filter((c) => c.due <= today)
    .sort((a, b) => a.due.localeCompare(b.due) || a.cardKey.localeCompare(b.cardKey))
    .slice(0, limit);
}
