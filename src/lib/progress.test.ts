import { describe, expect, it } from "vitest";
import { buildRoute, domainOf, isCertificationDay, isSafeExternalUrl, percent, type Block, type Session } from "./progress";
import { GENERIC_ERROR, rpcErrorMessage } from "./rpc-errors";

const blocks: Block[] = [
  { id: 1, title: "B1", goal: "g", certification: null, certificationCode: null, certificationDay: null, totalDays: 3 },
  { id: 2, title: "B2", goal: "g", certification: "X SAP-C03", certificationCode: "SAP-C03", certificationDay: 2, totalDays: 2 },
];
const s = (id: number, blockId: number, day: number): Session => ({
  id, position: id, blockId, day, hours: 2, title: `S${id}`, description: "", links: [],
});
// Desordenadas a propósito: buildRoute ordena por position.
const sessions = [s(4, 2, 1), s(1, 1, 1), s(3, 1, 3), s(2, 1, 2), s(5, 2, 2)];

describe("buildRoute", () => {
  it("sin progreso: current = primera, bloque 1 en curso", () => {
    const r = buildRoute(blocks, sessions, []);
    expect(r.current?.id).toBe(1);
    expect(r.next?.id).toBe(2);
    expect(r.lastCompleted).toBeNull();
    expect(r.done).toBe(0);
    expect(r.pct).toBe(0);
    expect(r.blocks.map((b) => b.state)).toEqual(["en_curso", "pendiente"]);
    expect(r.canComplete(1)).toBe(true);
    expect(r.canComplete(2)).toBe(false);
    expect(r.canUndo(1)).toBe(false);
  });

  it("current = primera no completada; no se puede saltar", () => {
    const r = buildRoute(blocks, sessions, [1, 2]);
    expect(r.current?.id).toBe(3);
    expect(r.statusOf(1)).toBe("done");
    expect(r.statusOf(3)).toBe("current");
    expect(r.statusOf(4)).toBe("future");
    expect(r.canComplete(4)).toBe(false);
    expect(r.canComplete(3)).toBe(true);
  });

  it("undo solo de la última completada", () => {
    const r = buildRoute(blocks, sessions, [1, 2]);
    expect(r.lastCompleted?.id).toBe(2);
    expect(r.canUndo(2)).toBe(true);
    expect(r.canUndo(1)).toBe(false);
    expect(r.canUndo(3)).toBe(false);
  });

  it("stats por bloque y cruce de bloque", () => {
    const r = buildRoute(blocks, sessions, [1, 2, 3]);
    expect(r.current?.id).toBe(4);
    expect(r.blocks[0]).toMatchObject({ done: 3, total: 3, pct: 100, state: "hecho" });
    expect(r.blocks[1]).toMatchObject({ done: 0, total: 2, pct: 0, state: "en_curso" });
  });

  it("ruta completa: sin current ni next", () => {
    const r = buildRoute(blocks, sessions, [1, 2, 3, 4, 5]);
    expect(r.current).toBeNull();
    expect(r.next).toBeNull();
    expect(r.pct).toBe(100);
    expect(r.lastCompleted?.id).toBe(5);
    expect(r.canComplete(5)).toBe(false);
    expect(r.blocks.every((b) => b.state === "hecho")).toBe(true);
  });

  it("ignora ids desconocidos", () => {
    const r = buildRoute(blocks, sessions, [999]);
    expect(r.done).toBe(0);
    expect(r.current?.id).toBe(1);
  });
});

describe("helpers", () => {
  it("percent", () => {
    expect(percent(47, 139)).toBe(34);
    expect(percent(138, 139)).toBe(99);
    expect(percent(139, 139)).toBe(100);
    expect(percent(0, 139)).toBe(0);
    expect(percent(0, 0)).toBe(0);
    expect(percent(1, 1000)).toBe(1);
  });

  it("isCertificationDay", () => {
    expect(isCertificationDay(s(5, 2, 2), blocks[1])).toBe(true);
    expect(isCertificationDay(s(4, 2, 1), blocks[1])).toBe(false);
    expect(isCertificationDay(s(2, 1, 2), blocks[0])).toBe(false);
  });

  it("domainOf / isSafeExternalUrl", () => {
    expect(domainOf("https://www.checkov.io/1.Welcome/Quick%20Start.html")).toBe("checkov.io");
    expect(domainOf("nope")).toBe("");
    expect(isSafeExternalUrl("https://calculator.aws")).toBe(true);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrl("http://example.com")).toBe(false);
  });

  it("rpcErrorMessage", () => {
    expect(rpcErrorMessage({ message: "not_current_session" })).toBe("Solo puedes marcar el día actual.");
    expect(rpcErrorMessage({ message: "ERROR: not_last_session" })).toBe("Solo puedes desmarcar el último día completado.");
    expect(rpcErrorMessage({ message: "fetch failed" })).toBe(GENERIC_ERROR);
    expect(rpcErrorMessage(null)).toBe(GENERIC_ERROR);
  });
});
