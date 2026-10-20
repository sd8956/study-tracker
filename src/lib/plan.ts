// Loads the study plan from content/ (modules + the Cloud agenda). Server-only: reads the filesystem.
import "server-only";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseAgenda } from "../../scripts/agenda-parser.mjs";
import {
  ContentError,
  MODULE_DIR_RE,
  SESSION_FILE_RE,
  parseModuleFile,
  parseSessionFile,
  type Link,
  type Phase,
  type Question,
  type SessionKind,
  type SessionSections,
} from "./content-format";

export type { Link, Phase, Question, SessionKind } from "./content-format";

export type PlanSession = {
  key: string;
  moduleId: string;
  position: number;
  kind: SessionKind;
  title: string;
  hours: 2 | 3;
  sources: string[];
  links: Link[];
  sections: SessionSections;
  review: Question[];
  evaluation: Question[];
};

export type CloudBlock = {
  id: number;
  certification: string | null;
  certificationCode: string | null;
  certificationDay: number | null;
};

export type PlanModule = {
  id: string;
  phase: Phase;
  title: string;
  summary: string;
  intro: string;
  sessions: PlanSession[];
  block?: CloudBlock;
};

export type Plan = {
  modules: PlanModule[];
  sessions: PlanSession[];
  byKey: Map<string, PlanSession>;
  moduleById: Map<string, PlanModule>;
};

export const PHASES: { id: Phase; title: string }[] = [
  { id: "books", title: "Libros y repos" },
  { id: "datacamp", title: "DataCamp" },
  { id: "scrimba", title: "Scrimba" },
  { id: "cloud", title: "Cloud Security" },
];

const byNumericPrefix = (a: string, b: string) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b);

function loadModules(modulesDir: string): PlanModule[] {
  if (!existsSync(modulesDir)) return [];
  const dirs = readdirSync(modulesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && MODULE_DIR_RE.test(d.name))
    .map((d) => d.name)
    .sort(byNumericPrefix);

  return dirs.map((id) => {
    const dir = join(modulesDir, id);
    const moduleFile = join(dir, "module.md");
    if (!existsSync(moduleFile)) throw new ContentError(`content/modules/${id}/module.md`, "no existe");
    const meta = parseModuleFile(readFileSync(moduleFile, "utf8"), `content/modules/${id}/module.md`);
    const files = readdirSync(dir)
      .filter((f) => SESSION_FILE_RE.test(f))
      .sort(byNumericPrefix);
    const sessions: PlanSession[] = files.map((f) => {
      const parsed = parseSessionFile(readFileSync(join(dir, f), "utf8"), `content/modules/${id}/${f}`);
      return { ...parsed, key: `${id}/${f.slice(0, -3)}`, moduleId: id, position: 0 };
    });
    return { id, phase: meta.phase, title: meta.title, summary: meta.summary, intro: meta.intro, sessions };
  });
}

function loadCloud(agendaFile: string): PlanModule[] {
  if (!existsSync(agendaFile)) return [];
  let blocks;
  try {
    blocks = parseAgenda(readFileSync(agendaFile, "utf8"));
  } catch (e) {
    throw new ContentError("content/agenda.md", e instanceof Error ? e.message : String(e));
  }
  return blocks.map((b) => {
    const moduleId = `cloud-b${b.id}`;
    return {
      id: moduleId,
      phase: "cloud" as const,
      title: `Bloque ${b.id} · ${b.title}`,
      summary: b.goal,
      intro: "",
      block: {
        id: b.id,
        certification: b.certification,
        certificationCode: b.certificationCode,
        certificationDay: b.certificationDay,
      },
      sessions: b.sessions.map((s) => ({
        key: `cloud/b${b.id}-d${s.day}`,
        moduleId,
        position: 0,
        kind: "task" as const,
        title: s.title,
        hours: s.hours === 3 ? 3 : 2,
        sources: [],
        links: s.links,
        sections: { description: s.description },
        review: [],
        evaluation: [],
      })),
    };
  });
}

/** Parses the whole plan from a content directory (`modules/` + `agenda.md`). Throws ContentError on invalid files. */
export function loadPlanFrom(contentDir: string): Plan {
  const modules = [...loadModules(join(contentDir, "modules")), ...loadCloud(join(contentDir, "agenda.md"))];
  const sessions = modules.flatMap((m) => m.sessions);
  sessions.forEach((s, i) => (s.position = i));
  const byKey = new Map<string, PlanSession>();
  for (const s of sessions) {
    if (byKey.has(s.key)) throw new ContentError(s.key, "clave de sesión repetida");
    byKey.set(s.key, s);
  }
  return { modules, sessions, byKey, moduleById: new Map(modules.map((m) => [m.id, m])) };
}

export function contentDir(): string {
  return process.env.STUDY_CONTENT_DIR || join(process.cwd(), "content");
}

/** Cheap change detector: names + mtimes of every content file. */
function signature(dir: string): string {
  const parts: string[] = [];
  const walk = (d: string) => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".md")) parts.push(`${p}:${statSync(p).mtimeMs}`);
    }
  };
  walk(dir);
  return parts.sort().join("|");
}

let memo: { dir: string; sig: string; plan: Plan } | null = null;

/** Memoized plan; re-read when a content file changes. */
export function getPlan(): Plan {
  const dir = contentDir();
  const sig = signature(dir);
  if (memo && memo.dir === dir && memo.sig === sig) return memo.plan;
  const plan = loadPlanFrom(dir);
  memo = { dir, sig, plan };
  return plan;
}

/** The question and reference answer the tutor grades against. Always resolved on the server from the plan. */
export function questionFor(
  session: PlanSession,
  kind: "review" | "evaluation" | "feynman",
  index: number,
): { question: string; modelAnswer: string } | null {
  if (kind === "feynman") {
    const prompt = session.sections.feynman;
    if (!prompt) return null;
    const reference = [session.sections.objetivo, session.sections.conceptos].filter(Boolean).join("\n\n");
    return { question: prompt, modelAnswer: reference || session.title };
  }
  const list = kind === "review" ? session.review : session.evaluation;
  const q = list.find((x) => x.index === index);
  return q ? { question: q.question, modelAnswer: q.answer } : null;
}

/** Plain-text session content used as tutor context. */
export function sessionText(session: PlanSession): string {
  const s = session.sections;
  const parts: [string, string | undefined][] = [
    ["Objetivo", s.objetivo],
    ["Descripción", s.description],
    ["Estudio", s.estudio],
    ["Qué hacer", s.queHacer],
    ["Conceptos clave", s.conceptos],
    ["Ejercicio", s.ejercicio],
  ];
  const text = parts
    .filter(([, v]) => v)
    .map(([t, v]) => `## ${t}\n${v}`)
    .join("\n\n");
  const review = session.review.map((q) => `- ${q.question}`).join("\n");
  return review ? `${text}\n\n## Preguntas de repaso\n${review}` : text;
}
