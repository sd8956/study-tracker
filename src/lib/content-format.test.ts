import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseModuleFile, parseSessionFile } from "./content-format";
import { loadPlanFrom } from "./plan";

const FIXTURES = join(__dirname, "..", "..", "test", "fixtures", "content");

const lesson = (overrides: { front?: string; body?: string } = {}) =>
  [
    "---",
    overrides.front ?? "title: L\nkind: lesson\nhours: 2",
    "---",
    "",
    overrides.body ??
      [
        "## Objetivo",
        "O.",
        "## Estudio",
        "E.",
        "## Conceptos clave",
        "- C",
        "## Preguntas de repaso",
        "1. ¿A?",
        "   R: a.",
        "2. ¿B?",
        "   R: b.",
        "3. ¿C?",
        "   R: c.",
        "4. ¿D?",
        "   R: d.",
        "## Ejercicio",
        "X.",
        "## Explícalo con tus palabras",
        "F.",
      ].join("\n"),
  ].join("\n");

describe("parseSessionFile", () => {
  it("parses frontmatter, sections and questions of a lesson", () => {
    const s = parseSessionFile(lesson(), "m/01-x.md");
    expect(s).toMatchObject({ title: "L", kind: "lesson", hours: 2, sources: [], links: [] });
    expect(s.sections.objetivo).toBe("O.");
    expect(s.sections.feynman).toBe("F.");
    expect(s.review.map((q) => q.question)).toEqual(["¿A?", "¿B?", "¿C?", "¿D?"]);
    expect(s.review[0]).toEqual({ index: 1, question: "¿A?", answer: "a." });
    expect(s.evaluation).toEqual([]);
  });

  it("keeps colons in values and parses sources and https links", () => {
    const s = parseSessionFile(
      lesson({
        front:
          "title: Uno: dos\nkind: lesson\nhours: 2\nsources: A, cap. 1 | B\nlinks: Viz | https://a.example/x ; Doc | https://b.example/y",
      }),
      "f.md",
    );
    expect(s.title).toBe("Uno: dos");
    expect(s.sources).toEqual(["A, cap. 1", "B"]);
    expect(s.links).toEqual([
      { label: "Viz", url: "https://a.example/x" },
      { label: "Doc", url: "https://b.example/y" },
    ]);
  });

  it("rejects non-https links naming the file", () => {
    expect(() =>
      parseSessionFile(lesson({ front: "title: L\nkind: lesson\nhours: 2\nlinks: X | http://a.example" }), "mod/01-x.md"),
    ).toThrow(/mod\/01-x\.md.*https/);
  });

  it("rejects hours outside {2,3} and unknown kinds", () => {
    expect(() => parseSessionFile(lesson({ front: "title: L\nkind: lesson\nhours: 4" }), "a.md")).toThrow(/a\.md.*hours/);
    expect(() => parseSessionFile(lesson({ front: "title: L\nkind: talk\nhours: 2" }), "a.md")).toThrow(/a\.md.*kind/);
    expect(() => parseSessionFile(lesson({ front: "kind: lesson\nhours: 2" }), "a.md")).toThrow(/a\.md.*title/);
  });

  it("requires the sections of each kind", () => {
    expect(() => parseSessionFile(lesson({ body: "## Objetivo\nO." }), "a.md")).toThrow(/a\.md.*Estudio/);
    expect(() =>
      parseSessionFile(lesson({ front: "title: P\nkind: project\nhours: 3", body: "## Objetivo\nO." }), "p.md"),
    ).toThrow(/p\.md.*Qué hacer/);
  });

  it("requires at least 4 review questions for lessons", () => {
    const body = lesson().split("4. ¿D?\n   R: d.\n").join("");
    expect(() => parseSessionFile(body, "a.md")).toThrow(/a\.md.*4/);
  });

  it("rejects questions without a model answer", () => {
    const body = lesson().replace("   R: b.", "");
    expect(() => parseSessionFile(body, "a.md")).toThrow(/a\.md.*pregunta 2/i);
  });

  it("rejects unknown sections and missing frontmatter", () => {
    expect(() => parseSessionFile(lesson().replace("## Ejercicio", "## Ejercicios"), "a.md")).toThrow(/a\.md.*Ejercicios/);
    expect(() => parseSessionFile("## Objetivo\nx", "a.md")).toThrow(/a\.md.*frontmatter/);
  });
});

describe("parseModuleFile", () => {
  it("parses module metadata and intro", () => {
    const m = parseModuleFile("---\ntitle: T\nphase: scrimba\nsummary: S\n---\n\nIntro.", "m/module.md");
    expect(m).toEqual({ title: "T", phase: "scrimba", summary: "S", intro: "Intro." });
  });

  it("rejects unknown phases", () => {
    expect(() => parseModuleFile("---\ntitle: T\nphase: cloud\n---\n", "m/module.md")).toThrow(/m\/module\.md.*phase/);
  });
});

describe("loadPlanFrom (fixtures)", () => {
  const plan = loadPlanFrom(FIXTURES);

  it("orders modules by NN, sessions by NN, then the cloud blocks", () => {
    expect(plan.sessions.map((s) => s.key)).toEqual([
      "01-alpha/01-first-lesson",
      "01-alpha/02-project",
      "02-beta/01-course",
      "02-beta/02-evaluation",
      "cloud/b1-d1",
      "cloud/b1-d2",
      "cloud/b2-d1",
    ]);
    expect(plan.modules.map((m) => [m.id, m.phase])).toEqual([
      ["01-alpha", "books"],
      ["02-beta", "datacamp"],
      ["cloud-b1", "cloud"],
      ["cloud-b2", "cloud"],
    ]);
  });

  it("maps agenda days to task sessions with hours, description and links", () => {
    const t = plan.byKey.get("cloud/b1-d1");
    expect(t).toMatchObject({ kind: "task", hours: 2, title: "Tarea uno", moduleId: "cloud-b1" });
    expect(t?.sections.description).toBe("Haz la tarea uno.");
    expect(t?.links).toEqual([{ label: "Tarea uno", url: "https://example.com/uno" }]);
    expect(plan.byKey.get("cloud/b1-d2")?.hours).toBe(3);
    expect(plan.modules.find((m) => m.id === "cloud-b2")?.block?.certificationCode).toBe("SAP-C03");
  });

  it("assigns global positions in plan order", () => {
    expect(plan.sessions.map((s) => s.position)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(plan.byKey.get("02-beta/02-evaluation")?.evaluation).toHaveLength(8);
  });

  it("works with no modules and no agenda", () => {
    const empty = loadPlanFrom(join(FIXTURES, "does-not-exist"));
    expect(empty.sessions).toEqual([]);
    expect(empty.modules).toEqual([]);
  });
});
