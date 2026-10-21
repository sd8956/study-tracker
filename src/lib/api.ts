// Helpers shared by the route handlers.
import "server-only";
import { isLocalRequest } from "./origin";
import { getTutorConfig, TutorError } from "./tutor";
import type { TutorConfig } from "./tutor-core";

export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

/** 403 unless the request comes from this machine (Host and Origin are loopback). */
export function rejectNonLocal(request: Request): Response | null {
  return isLocalRequest(request.headers) ? null : jsonError(403, "Solo se aceptan solicitudes desde este equipo.");
}

export const TUTOR_MISSING = "El tutor no está configurado. Añade NAN_API_KEY a .env.local y reinicia la app.";

export function requireTutor(): TutorConfig | Response {
  return getTutorConfig() ?? jsonError(503, TUTOR_MISSING);
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const data = await request.json();
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function tutorFailure(e: unknown): Response {
  if (e instanceof TutorError) return jsonError(e.status, e.message);
  if (e instanceof Error && /formato/.test(e.message)) return jsonError(502, e.message);
  console.error("[tutor] unexpected failure", e instanceof Error ? e.name : typeof e);
  return jsonError(500, "Algo falló al hablar con el tutor. Inténtalo de nuevo.");
}
