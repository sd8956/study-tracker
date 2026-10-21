import { describe, expect, it } from "vitest";
import { buildGradeMessages, parseGradeResponse, tutorConfig, validateChatMessages } from "./tutor-core";

describe("parseGradeResponse", () => {
  it("parses strict JSON", () => {
    expect(parseGradeResponse('{"score": 8, "feedback": "Bien.", "missing": ["x"]}')).toEqual({
      score: 8,
      feedback: "Bien.",
      missing: ["x"],
    });
  });

  it("tolerates code fences and surrounding text, clamps and rounds the score", () => {
    const r = parseGradeResponse('Aquí va:\n```json\n{"score": 12.345, "feedback": "Ok", "missing": "uno"}\n```');
    expect(r).toEqual({ score: 10, feedback: "Ok", missing: ["uno"] });
    expect(parseGradeResponse('{"score": "7.25", "feedback": "a"}')).toEqual({ score: 7.3, feedback: "a", missing: [] });
    expect(parseGradeResponse('{"score": -3, "feedback": "a", "missing": [1, "b", null]}')).toEqual({
      score: 0,
      feedback: "a",
      missing: ["b"],
    });
  });

  it("throws a Spanish error when no usable JSON is present", () => {
    expect(() => parseGradeResponse("no sé")).toThrow(/formato/);
    expect(() => parseGradeResponse('{"feedback": "sin nota"}')).toThrow(/formato/);
  });
});

describe("buildGradeMessages", () => {
  it("includes question, model answer and student answer, asking for JSON in Spanish", () => {
    const msgs = buildGradeMessages({ kind: "review", question: "¿Q?", modelAnswer: "MA", answer: "mine" });
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toMatch(/JSON/);
    expect(msgs[1].content).toContain("¿Q?");
    expect(msgs[1].content).toContain("MA");
    expect(msgs[1].content).toContain("mine");
  });
});

describe("validateChatMessages", () => {
  it("keeps user/assistant messages and rejects bad input", () => {
    expect(validateChatMessages([{ role: "user", content: "hola" }])).toEqual([{ role: "user", content: "hola" }]);
    expect(validateChatMessages([{ role: "system", content: "x" }])).toBeNull();
    expect(validateChatMessages([])).toBeNull();
    expect(validateChatMessages([{ role: "assistant", content: "x" }])).toBeNull(); // must end with user
    expect(validateChatMessages("x")).toBeNull();
    expect(validateChatMessages([{ role: "user", content: "a".repeat(5000) }])).toBeNull();
  });
});

describe("tutorConfig", () => {
  it("is null without a key and fills defaults otherwise", () => {
    expect(tutorConfig({})).toBeNull();
    expect(tutorConfig({ NAN_API_KEY: "  " })).toBeNull();
    expect(tutorConfig({ NAN_API_KEY: "k" })).toEqual({
      apiKey: "k",
      baseUrl: "https://api.nan.builders/v1",
      chatModel: "deepseek-v4-flash",
      sttModel: "whisper",
    });
    expect(tutorConfig({ NAN_API_KEY: "k", NAN_BASE_URL: "https://x.example/v1/" })?.baseUrl).toBe("https://x.example/v1");
  });
});
