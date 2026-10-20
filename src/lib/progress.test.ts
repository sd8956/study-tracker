import { describe, expect, it } from "vitest";
import { buildProgress, domainOf, groupState, isSafeExternalUrl, percent } from "./progress";

const keys = ["a/1", "a/2", "b/1", "b/2"];

describe("buildProgress", () => {
  it("no progress: current is the first session", () => {
    const p = buildProgress(keys, new Set());
    expect(p.currentKey).toBe("a/1");
    expect(p.lastCompletedKey).toBeNull();
    expect(p.done).toBe(0);
    expect(p.canComplete("a/1")).toBe(true);
    expect(p.canComplete("a/2")).toBe(false);
  });

  it("current is the first not completed; only the last completed can be undone", () => {
    const p = buildProgress(keys, new Set(["a/1", "a/2"]));
    expect(p.currentKey).toBe("b/1");
    expect(p.statusOf("a/1")).toBe("done");
    expect(p.statusOf("b/1")).toBe("current");
    expect(p.statusOf("b/2")).toBe("future");
    expect(p.canUndo("a/2")).toBe(true);
    expect(p.canUndo("a/1")).toBe(false);
  });

  it("ignores completed keys that are not in the plan", () => {
    const p = buildProgress(keys, new Set(["gone/1", "a/1"]));
    expect(p.done).toBe(1);
    expect(p.lastCompletedKey).toBe("a/1");
  });

  it("all done: no current", () => {
    const p = buildProgress(keys, new Set(keys));
    expect(p.currentKey).toBeNull();
    expect(p.pct).toBe(100);
  });

  it("groupState", () => {
    const p = buildProgress(keys, new Set(["a/1", "a/2"]));
    expect(groupState(["a/1", "a/2"], p).state).toBe("hecho");
    expect(groupState(["b/1", "b/2"], p).state).toBe("en_curso");
    expect(groupState(["c/1"], p).state).toBe("pendiente");
  });
});

describe("helpers", () => {
  it("percent never shows 100 while incomplete nor 0 once started", () => {
    expect(percent(0, 0)).toBe(0);
    expect(percent(199, 200)).toBe(99);
    expect(percent(1, 400)).toBe(1);
    expect(percent(50, 100)).toBe(50);
  });

  it("domainOf and isSafeExternalUrl", () => {
    expect(domainOf("https://www.example.com/x")).toBe("example.com");
    expect(isSafeExternalUrl("https://a.example")).toBe(true);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrl("http://a.example")).toBe(false);
  });
});
