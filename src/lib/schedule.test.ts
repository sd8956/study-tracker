import { describe, expect, it } from "vitest";
import { addDays, dateIn, dayBudget, nextStudyDay, projectSchedule, todayIn, weekday } from "./schedule";

// 2026-10-19 is a Monday.
const MON = "2026-10-19";
const SAT = "2026-10-24";
const SUN = "2026-10-25";

describe("calendar helpers", () => {
  it("weekday and day budget: Mon–Fri 2 h, Sat 3 h, Sun rest", () => {
    expect(weekday(MON)).toBe(1);
    expect(weekday(SUN)).toBe(0);
    expect(dayBudget(MON)).toBe(2);
    expect(dayBudget(addDays(MON, 4))).toBe(2);
    expect(dayBudget(SAT)).toBe(3);
    expect(dayBudget(SUN)).toBe(0);
  });

  it("nextStudyDay skips Sunday", () => {
    expect(nextStudyDay(MON)).toBe("2026-10-20");
    expect(nextStudyDay(SAT)).toBe("2026-10-26");
    expect(nextStudyDay(SUN)).toBe("2026-10-26");
  });

  it("addDays crosses months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("todayIn / dateIn use the study time zone", () => {
    // 2026-10-20 03:00 UTC is still 2026-10-19 in Bogotá (UTC-5).
    const now = new Date("2026-10-20T03:00:00Z");
    expect(todayIn("America/Bogota", now)).toBe("2026-10-19");
    expect(todayIn("UTC", now)).toBe("2026-10-20");
    expect(dateIn("2026-10-20T03:00:00Z", "America/Bogota")).toBe("2026-10-19");
  });
});

describe("projectSchedule", () => {
  const keys = ["a", "b", "c", "d", "e", "f", "g"];

  it("plans the current session for today and one per study day after it", () => {
    const p = projectSchedule(keys, new Map(), MON);
    expect(keys.map((k) => p.get(k)?.date)).toEqual([
      "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-26",
    ]);
    expect(p.get("a")?.status).toBe("current");
    expect(p.get("b")?.status).toBe("upcoming");
  });

  it("on Sunday the current session is planned for Monday", () => {
    const p = projectSchedule(keys, new Map(), SUN);
    expect(p.get("a")).toEqual({ date: "2026-10-26", status: "current" });
  });

  it("completed sessions keep their completion date; after finishing today the next waits for the next study day", () => {
    const done = new Map([
      ["a", "2026-10-17"],
      ["b", MON],
    ]);
    const p = projectSchedule(keys, done, MON);
    expect(p.get("a")).toEqual({ date: "2026-10-17", status: "done" });
    expect(p.get("b")).toEqual({ date: MON, status: "done" });
    expect(p.get("c")).toEqual({ date: "2026-10-20", status: "current" });
    expect(p.get("d")?.date).toBe("2026-10-21");
  });

  it("missed days do not skip sessions: the current one moves to today", () => {
    const p = projectSchedule(keys, new Map([["a", "2026-10-01"]]), "2026-10-22");
    expect(p.get("b")).toEqual({ date: "2026-10-22", status: "current" });
  });
});
