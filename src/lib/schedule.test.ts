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

describe("projectSchedule (hour budget: Mon–Fri 2 h, Sat 3 h, Sun rest)", () => {
  const TUE = "2026-10-20";
  const WED = "2026-10-21";
  const THU = "2026-10-22";
  const NEXT_MON = "2026-10-26";
  const two = (...keys: string[]) => keys.map((key) => ({ key, hours: 2 }));

  it("fills each day's budget in order; Saturday's third hour starts the next session", () => {
    const items = two("a", "b", "c", "d", "e", "f", "g");
    const p = projectSchedule(items, new Map(), [], MON);
    expect(items.map((i) => p.get(i.key)?.date)).toEqual([MON, TUE, WED, THU, "2026-10-23", SAT, SAT]);
    expect(p.get("a")).toEqual({ date: MON, status: "current", segments: [{ date: MON, hours: 2 }] });
    expect(p.get("g")?.segments).toEqual([
      { date: SAT, hours: 1 },
      { date: NEXT_MON, hours: 1 },
    ]);
    expect(p.get("b")?.status).toBe("upcoming");
  });

  it("a 3 h session on a weekday spans two days and the next one fills the rest", () => {
    const items = [{ key: "a", hours: 2 }, { key: "b", hours: 3 }, { key: "c", hours: 2 }];
    const p = projectSchedule(items, new Map(), [], MON);
    expect(p.get("b")?.segments).toEqual([
      { date: TUE, hours: 2 },
      { date: WED, hours: 1 },
    ]);
    expect(p.get("c")?.segments).toEqual([
      { date: WED, hours: 1 },
      { date: THU, hours: 1 },
    ]);
  });

  it("on Sunday the current session starts on Monday", () => {
    const p = projectSchedule(two("a"), new Map(), [], SUN);
    expect(p.get("a")).toEqual({ date: NEXT_MON, status: "current", segments: [{ date: NEXT_MON, hours: 2 }] });
  });

  it("hours worked today use up today's budget", () => {
    const items = [...two("a"), { key: "b", hours: 3 }, ...two("c")];
    const done = new Map([["a", MON]]);
    const p = projectSchedule(items, done, [{ sessionKey: "a", date: MON, hours: 2 }], MON);
    expect(p.get("a")).toEqual({ date: MON, status: "done", segments: [] });
    expect(p.get("b")).toEqual({ date: TUE, status: "current", segments: [{ date: TUE, hours: 2 }, { date: WED, hours: 1 }] });
  });

  it("partial work on the current session shortens what is left of it", () => {
    const items = [{ key: "b", hours: 3 }, ...two("c")];
    const today = projectSchedule(items, new Map(), [{ sessionKey: "b", date: MON, hours: 2 }], MON);
    expect(today.get("b")?.segments).toEqual([{ date: TUE, hours: 1 }]);
    expect(today.get("c")?.segments).toEqual([{ date: TUE, hours: 1 }, { date: WED, hours: 1 }]);

    const nextDay = projectSchedule(items, new Map(), [{ sessionKey: "b", date: MON, hours: 2 }], TUE);
    expect(nextDay.get("b")?.segments).toEqual([{ date: TUE, hours: 1 }]);
    expect(nextDay.get("c")?.segments).toEqual([{ date: TUE, hours: 1 }, { date: WED, hours: 1 }]);
  });

  it("missed days do not skip sessions: the current one moves to today", () => {
    const p = projectSchedule(two("a", "b"), new Map([["a", "2026-10-01"]]), [], THU);
    expect(p.get("b")).toEqual({ date: THU, status: "current", segments: [{ date: THU, hours: 2 }] });
  });
});
