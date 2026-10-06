import { describe, expect, it } from "vitest";
import { isEmailAllowed, isValidEmail, normalizeEmail, parseAllowlist } from "./allowlist";

describe("allowlist", () => {
  it("fail-closed: sin variable o vacía nadie entra", () => {
    expect(isEmailAllowed("santiago@example.com", undefined)).toBe(false);
    expect(isEmailAllowed("santiago@example.com", null)).toBe(false);
    expect(isEmailAllowed("santiago@example.com", "")).toBe(false);
    expect(isEmailAllowed("santiago@example.com", "   ")).toBe(false);
    expect(isEmailAllowed("santiago@example.com", " , ,")).toBe(false);
  });

  it("sin email no hay acceso", () => {
    expect(isEmailAllowed(undefined, "a@example.com")).toBe(false);
    expect(isEmailAllowed("", "a@example.com")).toBe(false);
    expect(isEmailAllowed(null, "a@example.com")).toBe(false);
  });

  it("no distingue mayúsculas y recorta espacios (lista y email)", () => {
    const raw = "  Santiago@Example.com , otro@example.com ";
    expect(isEmailAllowed("santiago@example.com", raw)).toBe(true);
    expect(isEmailAllowed("  SANTIAGO@EXAMPLE.COM ", raw)).toBe(true);
    expect(isEmailAllowed("otro@example.com", raw)).toBe(true);
  });

  it("rechaza emails no listados y coincidencias parciales", () => {
    const raw = "santiago@example.com";
    expect(isEmailAllowed("intruso@example.com", raw)).toBe(false);
    expect(isEmailAllowed("santiago@example.com.evil.io", raw)).toBe(false);
    expect(isEmailAllowed("xsantiago@example.com", raw)).toBe(false);
    expect(isEmailAllowed("example.com", raw)).toBe(false);
  });

  it("ignora entradas sin @ (no hay comodines de dominio)", () => {
    expect(parseAllowlist("example.com,*, a@b.co")).toEqual(new Set(["a@b.co"]));
    expect(isEmailAllowed("x@example.com", "example.com")).toBe(false);
  });

  it("normalizeEmail / isValidEmail", () => {
    expect(normalizeEmail("  A@B.Co ")).toBe("a@b.co");
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail(`${"a".repeat(250)}@b.co`)).toBe(false);
  });
});
