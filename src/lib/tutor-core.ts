// Pure pieces of the NaN Builders tutor: config, prompts and defensive response parsing.

export type TutorConfig = { apiKey: string; baseUrl: string; chatModel: string; sttModel: string };
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type GradeKind = "review" | "evaluation" | "feynman";
export type Grade = { score: number; feedback: string; missing: string[] };

export const DEFAULT_BASE_URL = "https://api.nan.builders/v1";
export const MAX_ANSWER_CHARS = 6000;
export const MAX_CHAT_MESSAGES = 30;
export const MAX_CHAT_MESSAGE_CHARS = 4000;

export function tutorConfig(env: Record<string, string | undefined>): TutorConfig | null {
  const apiKey = env.NAN_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (env.NAN_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    chatModel: env.NAN_CHAT_MODEL?.trim() || "deepseek-v4-flash",
    sttModel: env.NAN_STT_MODEL?.trim() || "whisper",
  };
}

const GRADE_SYSTEM = [
  "Eres un tutor exigente pero amable que evalúa respuestas de estudio en español.",
  "Compara la respuesta del estudiante con la respuesta modelo: valora que las ideas clave estén y sean correctas, no la redacción.",
  "Responde SOLO con un objeto JSON válido, sin texto adicional ni bloques de código, con esta forma exacta:",
  '{"score": <número de 0 a 10>, "feedback": "<2 a 4 frases en español, tuteando>", "missing": ["<idea clave que faltó o estuvo mal>", ...]}',
].join("\n");

const KIND_LABEL: Record<GradeKind, string> = {
  review: "Pregunta de repaso",
  evaluation: "Pregunta de evaluación",
  feynman: "Consigna Feynman (explicar el tema con sus palabras, como a alguien que empieza)",
};

export function buildGradeMessages(input: {
  kind: GradeKind;
  question: string;
  modelAnswer: string;
  answer: string;
}): ChatMessage[] {
  return [
    { role: "system", content: GRADE_SYSTEM },
    {
      role: "user",
      content: [
        `${KIND_LABEL[input.kind]}:`,
        input.question,
        "",
        input.kind === "feynman" ? "Material de referencia (conceptos clave de la sesión):" : "Respuesta modelo:",
        input.modelAnswer,
        "",
        "Respuesta del estudiante:",
        input.answer.slice(0, MAX_ANSWER_CHARS),
      ].join("\n"),
    },
  ];
}

const FORMAT_ERROR = "El tutor respondió en un formato inesperado. Inténtalo de nuevo.";

/** Extracts {score, feedback, missing} from a model reply, tolerating fences and surrounding text. */
export function parseGradeResponse(text: string): Grade {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error(FORMAT_ERROR);
  let data: unknown;
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error(FORMAT_ERROR);
  }
  if (!data || typeof data !== "object") throw new Error(FORMAT_ERROR);
  const obj = data as Record<string, unknown>;
  const rawScore = typeof obj.score === "string" ? Number(obj.score.replace(",", ".")) : obj.score;
  if (typeof rawScore !== "number" || !Number.isFinite(rawScore)) throw new Error(FORMAT_ERROR);
  const score = Math.round(Math.min(10, Math.max(0, rawScore)) * 10) / 10;
  const feedback = typeof obj.feedback === "string" ? obj.feedback.trim().slice(0, 4000) : "";
  const missingRaw = Array.isArray(obj.missing) ? obj.missing : typeof obj.missing === "string" ? [obj.missing] : [];
  const missing = missingRaw
    .filter((m): m is string => typeof m === "string" && m.trim() !== "")
    .map((m) => m.trim().slice(0, 500))
    .slice(0, 10);
  return { score, feedback, missing };
}

/** Validates a client-sent chat history: user/assistant turns only, bounded, ending with the user. */
export function validateChatMessages(input: unknown): { role: "user" | "assistant"; content: string }[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_CHAT_MESSAGES) return null;
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of input) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as Record<string, unknown>;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || !content.trim() || content.length > MAX_CHAT_MESSAGE_CHARS) return null;
    out.push({ role, content });
  }
  return out[out.length - 1].role === "user" ? out : null;
}

export const MAX_CONTEXT_CHARS = 12000;

export function buildChatSystemPrompt(session: { title: string; moduleTitle: string; content: string }): string {
  const content =
    session.content.length > MAX_CONTEXT_CHARS ? `${session.content.slice(0, MAX_CONTEXT_CHARS)}\n[…contenido recortado…]` : session.content;
  return [
    "Eres el tutor de estudio de Santiago. Respondes en español neutro, tuteando, claro y breve.",
    "Usa el contenido de la sesión como referencia principal. Si te preguntan algo fuera de él, responde igual pero dilo.",
    "Prefiere ejemplos concretos y, cuando ayude, termina con una pregunta corta para comprobar que entendió.",
    "Usa markdown simple (listas, código). No uses HTML.",
    "",
    `Módulo: ${session.moduleTitle}`,
    `Sesión: ${session.title}`,
    "",
    "Contenido de la sesión:",
    content,
  ].join("\n");
}
