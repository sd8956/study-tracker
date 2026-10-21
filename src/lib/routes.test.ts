import { describe, expect, it } from "vitest";
import { sessionHref, sessionKeyFromPath } from "./routes";

describe("sessionKeyFromPath", () => {
  it("round-trips sessionHref", () => {
    for (const key of ["01-problem-solving/01-estrategias", "cloud/b1-d3", "01-x/02-año ñ"]) {
      expect(sessionKeyFromPath(sessionHref(key))).toBe(key);
    }
  });

  it("returns null for other paths or malformed encodings", () => {
    expect(sessionKeyFromPath("/ruta")).toBeNull();
    expect(sessionKeyFromPath("/sesion")).toBeNull();
    expect(sessionKeyFromPath("/sesion/")).toBeNull();
    expect(sessionKeyFromPath("/sesion/%E0%A4%A")).toBeNull();
  });
});
