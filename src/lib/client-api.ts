// Browser-side helpers for the local API routes.

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function parse<T>(res: Response): Promise<ApiResult<T>> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const error = body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string"
      ? (body as { error: string }).error
      : `Error inesperado (HTTP ${res.status}).`;
    return { ok: false, error };
  }
  return { ok: true, data: body as T };
}

export async function postJson<T>(url: string, payload: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await parse<T>(res);
  } catch {
    return { ok: false, error: "No se pudo contactar con la app. ¿Sigue corriendo?" };
  }
}

export async function postForm<T>(url: string, form: FormData): Promise<ApiResult<T>> {
  try {
    return await parse<T>(await fetch(url, { method: "POST", body: form }));
  } catch {
    return { ok: false, error: "No se pudo contactar con la app. ¿Sigue corriendo?" };
  }
}

export type GradeResponse = { score: number; feedback: string; missing: string[] };

export function gradeAnswer(input: {
  sessionKey: string;
  questionIndex: number;
  kind: "review" | "evaluation" | "feynman";
  answer: string;
}) {
  return postJson<GradeResponse>("/api/tutor/grade", input);
}
