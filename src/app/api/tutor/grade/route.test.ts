import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as chat } from "../chat/route";
import { POST as transcribe } from "../../transcribe/route";
import { POST as grade } from "./route";

const req = (url: string, headers: Record<string, string>, body: BodyInit = "{}") =>
  new Request(`http://127.0.0.1:3000${url}`, { method: "POST", headers, body });

beforeEach(() => {
  vi.stubEnv("STUDY_DB_PATH", join(mkdtempSync(join(tmpdir(), "study-route-")), "study.db"));
  vi.stubEnv("STUDY_CONTENT_DIR", join(__dirname, "..", "..", "..", "..", "..", "test", "fixtures", "content"));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("tutor route handlers", () => {
  it("reject cross-site requests with 403", async () => {
    vi.stubEnv("NAN_API_KEY", "test-key");
    const evil = { host: "127.0.0.1:3000", origin: "https://evil.example", "content-type": "application/json" };
    for (const [handler, url] of [
      [grade, "/api/tutor/grade"],
      [chat, "/api/tutor/chat"],
      [transcribe, "/api/transcribe"],
    ] as const) {
      const res = await handler(req(url, evil));
      expect(res.status).toBe(403);
    }
  });

  it("return 503 with a Spanish message when NAN_API_KEY is missing", async () => {
    vi.stubEnv("NAN_API_KEY", "");
    const res = await grade(req("/api/tutor/grade", { host: "127.0.0.1:3000", "content-type": "application/json" }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/NAN_API_KEY/);
  });

  it("grade looks the model answer up on the server, stores and returns the parsed grade", async () => {
    vi.stubEnv("NAN_API_KEY", "test-key");
    const fetchMock = vi.fn(async () =>
      Response.json({ choices: [{ message: { content: '{"score": 8, "feedback": "Bien", "missing": []}' } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await grade(
      req(
        "/api/tutor/grade",
        { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "content-type": "application/json" },
        JSON.stringify({
          sessionKey: "01-alpha/01-first-lesson",
          questionIndex: 1,
          kind: "review",
          answer: "Partir el rango",
          modelAnswer: "IGNORED BY SERVER",
        }),
      ),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ score: 8, feedback: "Bien", missing: [] });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.nan.builders/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const sent = String(init.body);
    expect(sent).toContain("Buscar partiendo el rango a la mitad.");
    expect(sent).not.toContain("IGNORED BY SERVER");
  });

  it("grade returns 404 for an unknown question", async () => {
    vi.stubEnv("NAN_API_KEY", "test-key");
    const res = await grade(
      req(
        "/api/tutor/grade",
        { host: "localhost:3000", "content-type": "application/json" },
        JSON.stringify({ sessionKey: "01-alpha/01-first-lesson", questionIndex: 99, kind: "review", answer: "x" }),
      ),
    );
    expect(res.status).toBe(404);
  });
});
