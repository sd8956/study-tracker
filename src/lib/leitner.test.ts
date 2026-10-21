import { describe, expect, it } from "vitest";
import { REVIEW_LIMIT, applyReview, intervalFor, reviewQueue } from "./leitner";

const TODAY = "2026-10-20";

describe("applyReview", () => {
  it("intervals by box: 1, 3, 7, 21, 60 days", () => {
    expect([1, 2, 3, 4, 5].map(intervalFor)).toEqual([1, 3, 7, 21, 60]);
  });

  it("good moves up one box (max 5) and schedules by the new box", () => {
    expect(applyReview(1, "good", TODAY)).toEqual({ box: 2, due: "2026-10-23" });
    expect(applyReview(4, "good", TODAY)).toEqual({ box: 5, due: "2026-12-19" });
    expect(applyReview(5, "good", TODAY)).toEqual({ box: 5, due: "2026-12-19" });
  });

  it("hard keeps the box, due tomorrow", () => {
    expect(applyReview(3, "hard", TODAY)).toEqual({ box: 3, due: "2026-10-21" });
  });

  it("again resets to box 1, due tomorrow", () => {
    expect(applyReview(4, "again", TODAY)).toEqual({ box: 1, due: "2026-10-21" });
  });
});

describe("reviewQueue", () => {
  it("only due cards, oldest due first, capped at 15", () => {
    const cards = Array.from({ length: 20 }, (_, i) => ({
      cardKey: `k${String(i).padStart(2, "0")}`,
      due: i % 2 === 0 ? `2026-10-${String(20 - (i % 10)).padStart(2, "0")}` : "2026-10-25",
    }));
    const q = reviewQueue(cards, TODAY);
    expect(REVIEW_LIMIT).toBe(15);
    expect(q.length).toBe(10);
    expect(q.every((c) => c.due <= TODAY)).toBe(true);
    const dues = q.map((c) => c.due);
    expect([...dues].sort()).toEqual(dues);
    const many = Array.from({ length: 30 }, (_, i) => ({ cardKey: `c${i}`, due: TODAY }));
    expect(reviewQueue(many, TODAY)).toHaveLength(15);
  });
});
