import { isSafeExternalUrl, type Block, type Session } from "./progress";

export const GROK_BASE = "https://grok.com/";
// Keep URLs well under common browser/server limits.
const MAX_PROMPT = 1800;

/** Prompt built only from curriculum content: no email, user id or progress data. */
export function buildGrokPrompt(session: Session, block: Block | undefined): string {
  const lines = [
    "Actúa como mi tutor de estudio para la ruta Cloud Security Architect.",
    `Bloque ${session.blockId}${block ? ` (${block.title})` : ""} · Día ${session.day} (${session.hours} h): ${session.title}`,
  ];
  if (session.description) lines.push(`Objetivo de la sesión: ${session.description}`);
  const links = session.links.filter((l) => isSafeExternalUrl(l.url));
  if (links.length) lines.push("Material:", ...links.map((l) => `- ${l.label}: ${l.url}`));
  lines.push(
    "Explícame los conceptos clave en pasos cortos, dame un ejercicio práctico y hazme 3 preguntas para comprobar que entendí. Responde en español.",
  );
  const prompt = lines.join("\n");
  return prompt.length > MAX_PROMPT ? `${prompt.slice(0, MAX_PROMPT - 1)}…` : prompt;
}

/** Always the fixed Grok origin; only the query value varies (no open redirect). */
export function grokUrl(prompt: string): string {
  const url = new URL(GROK_BASE);
  url.searchParams.set("q", prompt);
  return url.toString();
}
