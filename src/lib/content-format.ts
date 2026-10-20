// Pure parser for the study content format (docs/CONTENT-FORMAT.md). No I/O.

export type Phase = "books" | "datacamp" | "scrimba" | "cloud";
export type SessionKind = "lesson" | "project" | "evaluation" | "course" | "task";
export type ContentKind = Exclude<SessionKind, "task">;

export type Link = { label: string; url: string };
export type Question = { index: number; question: string; answer: string };

export type SessionSections = {
  objetivo?: string;
  estudio?: string;
  queHacer?: string;
  conceptos?: string;
  ejercicio?: string;
  feynman?: string;
  /** Cloud tasks: the agenda day text. */
  description?: string;
};

export type ParsedSession = {
  title: string;
  kind: ContentKind;
  hours: 2 | 3;
  sources: string[];
  links: Link[];
  sections: SessionSections;
  review: Question[];
  evaluation: Question[];
};

export type ParsedModule = {
  title: string;
  phase: Exclude<Phase, "cloud">;
  summary: string;
  intro: string;
};

export const MODULE_DIR_RE = /^\d{2}-[a-z0-9][a-z0-9-]*$/;
export const SESSION_FILE_RE = /^\d{2}-[a-z0-9][a-z0-9-]*\.md$/;

const KINDS: ContentKind[] = ["lesson", "project", "evaluation", "course"];
const MODULE_PHASES = ["books", "datacamp", "scrimba"] as const;

type SectionId = keyof Omit<SessionSections, "description"> | "review" | "evaluation";

const SECTION_TITLES: Record<string, SectionId> = {
  Objetivo: "objetivo",
  Estudio: "estudio",
  "Qué hacer": "queHacer",
  "Conceptos clave": "conceptos",
  "Preguntas de repaso": "review",
  "Preguntas de evaluación": "evaluation",
  Ejercicio: "ejercicio",
  "Explícalo con tus palabras": "feynman",
};
const TITLE_OF = Object.fromEntries(Object.entries(SECTION_TITLES).map(([t, id]) => [id, t])) as Record<SectionId, string>;

type Rule = "required" | "optional" | "forbidden";
// Columns of the table in docs/CONTENT-FORMAT.md.
const RULES: Record<ContentKind, Record<SectionId, Rule>> = {
  lesson: {
    objetivo: "required", estudio: "required", queHacer: "forbidden", conceptos: "required",
    review: "required", evaluation: "forbidden", ejercicio: "required", feynman: "required",
  },
  project: {
    objetivo: "required", estudio: "optional", queHacer: "required", conceptos: "optional",
    review: "optional", evaluation: "forbidden", ejercicio: "forbidden", feynman: "optional",
  },
  evaluation: {
    objetivo: "required", estudio: "optional", queHacer: "forbidden", conceptos: "optional",
    review: "forbidden", evaluation: "required", ejercicio: "forbidden", feynman: "optional",
  },
  course: {
    objetivo: "required", estudio: "optional", queHacer: "required", conceptos: "optional",
    review: "required", evaluation: "forbidden", ejercicio: "optional", feynman: "optional",
  },
};
const MIN_REVIEW: Partial<Record<ContentKind, number>> = { lesson: 4, course: 3 };
const MIN_EVALUATION = 8;

export class ContentError extends Error {
  constructor(file: string, message: string) {
    super(`${file}: ${message}`);
    this.name = "ContentError";
  }
}

function splitFrontmatter(text: string, file: string): { meta: Map<string, string>; body: string } {
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const m = src.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!m) throw new ContentError(file, "falta el frontmatter (bloque --- al inicio)");
  const meta = new Map<string, string>();
  for (const line of m[1].split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx <= 0) throw new ContentError(file, `línea de frontmatter inválida: "${line}"`);
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.length >= 2 && ((value[0] === '"' && value.endsWith('"')) || (value[0] === "'" && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }
    if (meta.has(key)) throw new ContentError(file, `campo de frontmatter repetido: ${key}`);
    meta.set(key, value);
  }
  return { meta, body: src.slice(m[0].length) };
}

function required(meta: Map<string, string>, key: string, file: string): string {
  const v = meta.get(key)?.trim();
  if (!v) throw new ContentError(file, `falta el campo "${key}" en el frontmatter`);
  return v;
}

/** Splits a markdown body into `## ` sections, ignoring headings inside fenced code blocks. */
function splitSections(body: string): { preamble: string; sections: { title: string; text: string }[] } {
  const lines = body.split("\n");
  const sections: { title: string; lines: string[] }[] = [];
  const preamble: string[] = [];
  let fence: string | null = null;
  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
    }
    const h2 = fence === null && !fenceMatch ? line.match(/^##\s+(.+?)\s*#*\s*$/) : null;
    if (h2) {
      sections.push({ title: h2[1].trim(), lines: [] });
      continue;
    }
    (sections.length ? sections[sections.length - 1].lines : preamble).push(line);
  }
  return {
    preamble: preamble.join("\n").trim(),
    sections: sections.map((s) => ({ title: s.title, text: s.lines.join("\n").trim() })),
  };
}

/** Numbered question + indented `R:` model answer (which may continue on further indented lines). */
export function parseQuestions(text: string, file: string, sectionTitle: string): Question[] {
  const out: Question[] = [];
  let cur: { question: string[]; answer: string[] | null } | null = null;
  const close = () => {
    if (!cur) return;
    const n = out.length + 1;
    const question = cur.question.join(" ").replace(/\s+/g, " ").trim();
    const answer = (cur.answer ?? []).join("\n").trim();
    if (!question) throw new ContentError(file, `${sectionTitle}: la pregunta ${n} está vacía`);
    if (!answer) throw new ContentError(file, `${sectionTitle}: la pregunta ${n} no tiene respuesta modelo (línea "R:")`);
    out.push({ index: n, question, answer });
    cur = null;
  };
  for (const line of text.split("\n")) {
    const item = line.match(/^\d+[.)]\s+(.*)$/);
    if (item) {
      close();
      cur = { question: [item[1]], answer: null };
      continue;
    }
    if (!line.trim()) {
      if (cur?.answer) cur.answer.push("");
      continue;
    }
    const indented = /^\s+/.test(line);
    if (!cur || !indented) {
      throw new ContentError(file, `${sectionTitle}: línea fuera de formato: "${line.trim().slice(0, 60)}"`);
    }
    const content = line.trim();
    const r = content.match(/^R:\s*(.*)$/);
    if (r && cur.answer === null) cur.answer = [r[1]];
    else if (cur.answer !== null) cur.answer.push(content);
    else cur.question.push(content);
  }
  close();
  return out;
}

export function parseLinks(raw: string | undefined, file: string): Link[] {
  if (!raw?.trim()) return [];
  return raw
    .split(" ; ")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.lastIndexOf("|");
      if (idx < 0) throw new ContentError(file, `link sin formato "Etiqueta | https://url": "${pair}"`);
      const label = pair.slice(0, idx).trim();
      const url = pair.slice(idx + 1).trim();
      let ok = false;
      try {
        ok = new URL(url).protocol === "https:";
      } catch {
        ok = false;
      }
      if (!ok) throw new ContentError(file, `los links deben ser https: "${url}"`);
      return { label: label || url, url };
    });
}

export function parseSessionFile(text: string, file: string): ParsedSession {
  const { meta, body } = splitFrontmatter(text, file);
  const title = required(meta, "title", file);
  const kind = required(meta, "kind", file) as ContentKind;
  if (!KINDS.includes(kind)) throw new ContentError(file, `kind inválido "${kind}" (usa ${KINDS.join(", ")})`);
  const hoursRaw = required(meta, "hours", file);
  if (hoursRaw !== "2" && hoursRaw !== "3") throw new ContentError(file, `hours inválido "${hoursRaw}" (usa 2 o 3)`);
  const sources = (meta.get("sources") ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  const links = parseLinks(meta.get("links"), file);

  const { sections: raw } = splitSections(body);
  const sections: SessionSections = {};
  const found = new Map<SectionId, string>();
  for (const s of raw) {
    const id = SECTION_TITLES[s.title];
    if (!id) throw new ContentError(file, `sección desconocida "## ${s.title}"`);
    if (found.has(id)) throw new ContentError(file, `sección repetida "## ${s.title}"`);
    found.set(id, s.text);
  }

  const rules = RULES[kind];
  for (const [id, rule] of Object.entries(rules) as [SectionId, Rule][]) {
    const has = found.has(id) && found.get(id) !== "";
    if (rule === "required" && !has) throw new ContentError(file, `falta la sección "## ${TITLE_OF[id]}" (kind ${kind})`);
    if (rule === "forbidden" && found.has(id)) {
      throw new ContentError(file, `la sección "## ${TITLE_OF[id]}" no aplica a kind ${kind}`);
    }
  }

  let review: Question[] = [];
  let evaluation: Question[] = [];
  for (const [id, text] of found) {
    if (id === "review") review = parseQuestions(text, file, TITLE_OF.review);
    else if (id === "evaluation") evaluation = parseQuestions(text, file, TITLE_OF.evaluation);
    else sections[id] = text;
  }
  const minReview = MIN_REVIEW[kind];
  if (minReview && review.length < minReview) {
    throw new ContentError(file, `"## Preguntas de repaso" necesita al menos ${minReview} preguntas (tiene ${review.length})`);
  }
  if (kind === "evaluation" && evaluation.length < MIN_EVALUATION) {
    throw new ContentError(
      file,
      `"## Preguntas de evaluación" necesita al menos ${MIN_EVALUATION} preguntas (tiene ${evaluation.length})`,
    );
  }

  return { title, kind, hours: hoursRaw === "3" ? 3 : 2, sources, links, sections, review, evaluation };
}

export function parseModuleFile(text: string, file: string): ParsedModule {
  const { meta, body } = splitFrontmatter(text, file);
  const title = required(meta, "title", file);
  const phase = required(meta, "phase", file);
  if (!(MODULE_PHASES as readonly string[]).includes(phase)) {
    throw new ContentError(file, `phase inválido "${phase}" (usa ${MODULE_PHASES.join(", ")})`);
  }
  return { title, phase: phase as ParsedModule["phase"], summary: meta.get("summary")?.trim() ?? "", intro: body.trim() };
}
