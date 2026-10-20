import { jsonError, readJson, rejectNonLocal, requireTutor, tutorFailure } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getPlan, questionFor } from "@/lib/plan";
import { saveAnswer } from "@/lib/store";
import { chatCompletion } from "@/lib/tutor";
import { MAX_ANSWER_CHARS, buildGradeMessages, parseGradeResponse, type GradeKind } from "@/lib/tutor-core";

const KINDS: GradeKind[] = ["review", "evaluation", "feynman"];

export async function POST(request: Request) {
  const rejected = rejectNonLocal(request);
  if (rejected) return rejected;
  const cfg = requireTutor();
  if (cfg instanceof Response) return cfg;

  const body = await readJson(request);
  const sessionKey = body?.sessionKey;
  const kind = body?.kind as GradeKind;
  const questionIndex = body?.questionIndex ?? 0;
  const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
  if (typeof sessionKey !== "string" || !KINDS.includes(kind) || !Number.isInteger(questionIndex)) {
    return jsonError(400, "Solicitud inválida.");
  }
  if (!answer) return jsonError(400, "Escribe o dicta tu respuesta primero.");
  if (answer.length > MAX_ANSWER_CHARS) return jsonError(400, "La respuesta es demasiado larga.");

  const session = getPlan().byKey.get(sessionKey);
  const q = session ? questionFor(session, kind, questionIndex as number) : null;
  if (!q) return jsonError(404, "Esa pregunta no existe.");

  try {
    const reply = await chatCompletion(cfg, buildGradeMessages({ kind, question: q.question, modelAnswer: q.modelAnswer, answer }), {
      temperature: 0.2,
      maxTokens: 800,
    });
    const grade = parseGradeResponse(reply);
    const feedback = grade.missing.length
      ? `${grade.feedback}\n\nTe faltó:\n${grade.missing.map((m) => `- ${m}`).join("\n")}`
      : grade.feedback;
    saveAnswer(
      getDb(),
      { sessionKey, questionIndex: kind === "feynman" ? 0 : (questionIndex as number), kind, answer, score: grade.score, feedback },
      new Date(),
    );
    return Response.json(grade, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return tutorFailure(e);
  }
}
