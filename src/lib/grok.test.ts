import { describe, expect, it } from "vitest";
import { buildGrokPrompt, grokUrl } from "./grok";
import type { Block, Session } from "./progress";

const block: Block = { id: 1, title: "IaC", goal: "g", certification: null, certificationCode: null, certificationDay: null, totalDays: 3 };
const session: Session = {
  id: 7, position: 7, blockId: 1, day: 2, hours: 2, title: "Variables y outputs", description: "Parametrizar módulos.",
  links: [
    { label: "Docs", url: "https://developer.hashicorp.com/terraform" },
    { label: "Bad", url: "javascript:alert(1)" },
    { label: "Plain", url: "http://example.com" },
  ],
};

describe("grok tutor", () => {
  it("prompt only has curriculum content and safe links", () => {
    const p = buildGrokPrompt(session, block);
    expect(p).toContain("Bloque 1 (IaC) · Día 2 (2 h): Variables y outputs");
    expect(p).toContain("Parametrizar módulos.");
    expect(p).toContain("https://developer.hashicorp.com/terraform");
    expect(p).not.toContain("javascript:");
    expect(p).not.toContain("http://example.com");
    expect(p).not.toMatch(/@|user_id|uid/i);
  });

  it("prompt is capped", () => {
    const long = { ...session, description: "x".repeat(5000) };
    expect(buildGrokPrompt(long, block).length).toBeLessThanOrEqual(1800);
  });

  it("url is always the fixed grok origin", () => {
    const u = new URL(grokUrl("hola & https://evil.com/?q=1#x"));
    expect(u.origin).toBe("https://grok.com");
    expect(u.pathname).toBe("/");
    expect(u.searchParams.get("q")).toBe("hola & https://evil.com/?q=1#x");
    expect([...u.searchParams.keys()]).toEqual(["q"]);
  });
});
