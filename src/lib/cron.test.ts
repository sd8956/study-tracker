import { describe, expect, it } from "vitest";
import { isCronAuthorized } from "./cron";

const SECRET = "s3cr3t-s3cr3t-s3cr3t";

describe("isCronAuthorized", () => {
  it("fail-closed sin secreto o con secreto corto", () => {
    expect(isCronAuthorized(`Bearer ${SECRET}`, undefined)).toBe(false);
    expect(isCronAuthorized("Bearer ", "")).toBe(false);
    expect(isCronAuthorized("Bearer short", "short")).toBe(false);
  });
  it("exige el header exacto", () => {
    expect(isCronAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(isCronAuthorized(SECRET, SECRET)).toBe(false);
    expect(isCronAuthorized(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(isCronAuthorized(null, SECRET)).toBe(false);
  });
});
