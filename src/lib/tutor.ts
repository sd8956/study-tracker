// NaN Builders client (OpenAI-compatible). Server-only: the API key never reaches the browser or the logs.
import "server-only";
import { tutorConfig, type ChatMessage, type TutorConfig } from "./tutor-core";

export const TUTOR_TIMEOUT_MS = 60_000;

export class TutorError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "TutorError";
  }
}

export function getTutorConfig(): TutorConfig | null {
  return tutorConfig(process.env);
}

export function isTutorEnabled(): boolean {
  return getTutorConfig() !== null;
}

async function callNan(cfg: TutorConfig, path: string, init: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}${path}`, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${cfg.apiKey}` },
      signal: AbortSignal.timeout(TUTOR_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new TutorError(504, "El tutor tardó demasiado en responder. Inténtalo de nuevo.");
    }
    throw new TutorError(502, "No se pudo conectar con NaN Builders. Revisa tu conexión.");
  }
  if (!res.ok) {
    // Log only the status: never the key, the request or the body.
    console.error("[tutor] upstream error", { path, status: res.status });
    if (res.status === 401 || res.status === 403) {
      throw new TutorError(502, "NaN Builders rechazó la clave. Revisa NAN_API_KEY en .env.local.");
    }
    if (res.status === 429) throw new TutorError(502, "Llegaste al límite de uso de NaN Builders. Espera un momento.");
    if (res.status === 413) throw new TutorError(413, "El audio es demasiado grande para transcribirlo.");
    throw new TutorError(502, `NaN Builders respondió con un error (HTTP ${res.status}).`);
  }
  try {
    return await res.json();
  } catch {
    throw new TutorError(502, "NaN Builders devolvió una respuesta ilegible.");
  }
}

export async function chatCompletion(
  cfg: TutorConfig,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const data = (await callNan(cfg, "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: cfg.chatModel,
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 1200,
    }),
  })) as { choices?: { message?: { content?: unknown } }[] };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new TutorError(502, "El tutor no devolvió respuesta.");
  return content.trim();
}

export async function transcribeAudio(cfg: TutorConfig, audio: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", cfg.sttModel);
  form.append("language", "es");
  const data = (await callNan(cfg, "/audio/transcriptions", { method: "POST", body: form })) as { text?: unknown };
  if (typeof data?.text !== "string") throw new TutorError(502, "La transcripción llegó vacía.");
  return data.text.trim();
}
