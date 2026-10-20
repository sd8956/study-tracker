"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import type { ReviewResult } from "@/lib/leitner";
import { REVIEW_RESULTS } from "@/lib/leitner";
import { isLocalRequest } from "@/lib/origin";
import { getPlan, questionFor } from "@/lib/plan";
import { studyTz, todayIn } from "@/lib/schedule";
import {
  clearChat,
  completeSession,
  importData,
  logEnglish,
  reviewCard,
  saveAnswer,
  saveNote,
  undoSession,
  type Result,
} from "@/lib/store";
import { MAX_ANSWER_CHARS } from "@/lib/tutor-core";

export type ActionResult = Result;

const NOT_LOCAL: ActionResult = { ok: false, error: "Solo se aceptan cambios desde este equipo." };
const INVALID: ActionResult = { ok: false, error: "Solicitud inválida." };

async function isLocal(): Promise<boolean> {
  return isLocalRequest(await headers());
}

const isKey = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length < 300;

export async function completeSessionAction(key: string): Promise<ActionResult> {
  if (!(await isLocal())) return NOT_LOCAL;
  if (!isKey(key)) return INVALID;
  const r = completeSession(getDb(), getPlan(), key, new Date(), studyTz());
  if (r.ok) revalidatePath("/", "layout");
  return r;
}

export async function undoSessionAction(key: string): Promise<ActionResult> {
  if (!(await isLocal())) return NOT_LOCAL;
  if (!isKey(key)) return INVALID;
  const r = undoSession(getDb(), getPlan(), key);
  if (r.ok) revalidatePath("/", "layout");
  return r;
}

export async function logEnglishAction(minutes: number): Promise<ActionResult> {
  if (!(await isLocal())) return NOT_LOCAL;
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes < 0 || minutes > 600) return INVALID;
  const now = new Date();
  logEnglish(getDb(), todayIn(studyTz(), now), minutes, now);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function reviewCardAction(cardKey: string, result: ReviewResult): Promise<ActionResult> {
  if (!(await isLocal())) return NOT_LOCAL;
  if (!isKey(cardKey) || !REVIEW_RESULTS.includes(result)) return INVALID;
  const now = new Date();
  const r = reviewCard(getDb(), cardKey, result, todayIn(studyTz(), now), now);
  if (r.ok) revalidatePath("/", "layout");
  return r;
}

/** Self-graded answer (used when there is no tutor, or the user prefers to grade alone). */
export async function saveSelfGradeAction(input: {
  sessionKey: string;
  kind: "review" | "evaluation";
  questionIndex: number;
  answer: string;
  score: number;
}): Promise<ActionResult> {
  if (!(await isLocal())) return NOT_LOCAL;
  const { sessionKey, kind, questionIndex, answer, score } = input ?? {};
  if (!isKey(sessionKey) || (kind !== "review" && kind !== "evaluation") || !Number.isInteger(questionIndex)) return INVALID;
  if (typeof score !== "number" || score < 0 || score > 10) return INVALID;
  if (typeof answer !== "string" || answer.length > MAX_ANSWER_CHARS) return INVALID;
  const session = getPlan().byKey.get(sessionKey);
  if (!session || !questionFor(session, kind, questionIndex)) return { ok: false, error: "Esa pregunta no existe." };
  saveAnswer(getDb(), { sessionKey, kind, questionIndex, answer, score, feedback: "Autoevaluación." }, new Date());
  revalidatePath("/progreso");
  return { ok: true };
}

export async function saveNoteAction(sessionKey: string, text: string): Promise<ActionResult> {
  if (!(await isLocal())) return NOT_LOCAL;
  if (!isKey(sessionKey) || typeof text !== "string" || text.length > 50_000) return INVALID;
  if (!getPlan().byKey.has(sessionKey)) return { ok: false, error: "Esa sesión no existe." };
  saveNote(getDb(), sessionKey, text, new Date());
  return { ok: true };
}

export async function clearChatAction(sessionKey: string): Promise<ActionResult> {
  if (!(await isLocal())) return NOT_LOCAL;
  if (!isKey(sessionKey)) return INVALID;
  clearChat(getDb(), sessionKey);
  return { ok: true };
}

const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export async function importBackupAction(formData: FormData): Promise<ActionResult> {
  if (!(await isLocal())) return NOT_LOCAL;
  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, error: "Elige un archivo .json." };
  if (file.size > MAX_BACKUP_BYTES) return { ok: false, error: "El archivo es demasiado grande." };
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: "El archivo no es JSON válido." };
  }
  const r = importData(getDb(), data);
  if (r.ok) revalidatePath("/", "layout");
  return r;
}
