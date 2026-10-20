import { describe, expect, it } from "vitest";
import { isLocalRequest } from "./origin";

const h = (init: Record<string, string>) => new Headers(init);

describe("isLocalRequest", () => {
  it("accepts localhost and 127.0.0.1 hosts with or without a same-host origin", () => {
    expect(isLocalRequest(h({ host: "127.0.0.1:3000" }))).toBe(true);
    expect(isLocalRequest(h({ host: "localhost:3000", origin: "http://localhost:3000" }))).toBe(true);
    expect(isLocalRequest(h({ host: "127.0.0.1:3123", origin: "http://127.0.0.1:3123" }))).toBe(true);
    expect(isLocalRequest(h({ host: "[::1]:3000" }))).toBe(true);
  });

  it("rejects a cross-site origin", () => {
    expect(isLocalRequest(h({ host: "127.0.0.1:3000", origin: "https://evil.example" }))).toBe(false);
    expect(isLocalRequest(h({ host: "127.0.0.1:3000", origin: "null" }))).toBe(false);
  });

  it("rejects a loopback origin served from another port or host name", () => {
    expect(isLocalRequest(h({ host: "127.0.0.1:3000", origin: "http://localhost:8080" }))).toBe(false);
    expect(isLocalRequest(h({ host: "127.0.0.1:3000", origin: "http://127.0.0.1:8080" }))).toBe(false);
    expect(isLocalRequest(h({ host: "127.0.0.1:3000", origin: "http://localhost:3000" }))).toBe(false);
  });

  it("rejects a foreign Host (DNS rebinding) and a missing Host", () => {
    expect(isLocalRequest(h({ host: "evil.example" }))).toBe(false);
    expect(isLocalRequest(h({ host: "localhost.evil.example:3000" }))).toBe(false);
    expect(isLocalRequest(h({}))).toBe(false);
  });
});
