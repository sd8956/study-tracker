import { jsonError, rejectNonLocal, requireTutor, tutorFailure } from "@/lib/api";
import { transcribeAudio } from "@/lib/tutor";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "video/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "video/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

export async function POST(request: Request) {
  const rejected = rejectNonLocal(request);
  if (rejected) return rejected;
  const cfg = requireTutor();
  if (cfg instanceof Response) return cfg;

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_AUDIO_BYTES + 64 * 1024) return jsonError(413, "El audio supera 10 MB.");

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return jsonError(400, "Solicitud inválida.");
  }
  if (!(file instanceof Blob) || file.size === 0) return jsonError(400, "No llegó ningún audio.");
  if (file.size > MAX_AUDIO_BYTES) return jsonError(413, "El audio supera 10 MB.");
  const mime = file.type.split(";")[0].trim().toLowerCase();
  const ext = EXTENSIONS[mime];
  if (!ext) return jsonError(415, "Formato de audio no soportado (usa webm, ogg o mp4).");

  try {
    const text = await transcribeAudio(cfg, file, `respuesta.${ext}`);
    return Response.json({ text }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return tutorFailure(e);
  }
}
