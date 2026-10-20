import { jsonError, readJson, rejectNonLocal, requireTutor, tutorFailure } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getPlan, sessionText } from "@/lib/plan";
import { appendChat } from "@/lib/store";
import { chatCompletion } from "@/lib/tutor";
import { buildChatSystemPrompt, validateChatMessages } from "@/lib/tutor-core";

export async function POST(request: Request) {
  const rejected = rejectNonLocal(request);
  if (rejected) return rejected;
  const cfg = requireTutor();
  if (cfg instanceof Response) return cfg;

  const body = await readJson(request);
  const sessionKey = body?.sessionKey;
  const messages = validateChatMessages(body?.messages);
  if (typeof sessionKey !== "string" || !messages) return jsonError(400, "Solicitud inválida.");

  const plan = getPlan();
  const session = plan.byKey.get(sessionKey);
  if (!session) return jsonError(404, "Esa sesión no existe.");
  const moduleTitle = plan.moduleById.get(session.moduleId)?.title ?? "";

  try {
    const reply = await chatCompletion(cfg, [
      { role: "system", content: buildChatSystemPrompt({ title: session.title, moduleTitle, content: sessionText(session) }) },
      ...messages,
    ]);
    appendChat(
      getDb(),
      sessionKey,
      [messages[messages.length - 1], { role: "assistant", content: reply }],
      new Date(),
    );
    return Response.json({ reply }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return tutorFailure(e);
  }
}
