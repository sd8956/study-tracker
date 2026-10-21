import { describe, expect, it } from "vitest";
import { computeStreak, heatmapWeeks } from "./stats";

describe("computeStreak", () => {
  it("counts consecutive study days; Sundays do not break it", () => {
    // Fri 23, Sat 24, (Sun 25), Mon 26.
    const active = new Set(["2026-10-23", "2026-10-24", "2026-10-26"]);
    expect(computeStreak(active, "2026-10-26")).toBe(3);
  });

  it("today without activity yet does not break the streak", () => {
    expect(computeStreak(new Set(["2026-10-23", "2026-10-24"]), "2026-10-26")).toBe(2);
  });

  it("a missed study day breaks it", () => {
    expect(computeStreak(new Set(["2026-10-21", "2026-10-23"]), "2026-10-23")).toBe(1);
    expect(computeStreak(new Set(), "2026-10-23")).toBe(0);
  });
});

describe("heatmapWeeks", () => {
  it("returns 12 Monday-first weeks ending with the current week", () => {
    const weeks = heatmapWeeks(new Map([["2026-10-20", 2]]), "2026-10-21");
    expect(weeks).toHaveLength(12);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    const last = weeks[11];
    expect(last[0].date).toBe("2026-10-19");
    expect(last[1]).toEqual({ date: "2026-10-20", count: 2, future: false });
    expect(last[3].future).toBe(true);
    expect(weeks[0][0].date).toBe("2026-08-03");
  });
});
