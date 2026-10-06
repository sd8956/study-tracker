"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { GENERIC_ERROR, rpcErrorMessage } from "@/lib/rpc-errors";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

function isSessionId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value < 100000;
}

/**
 * Marca la sesión como hecha. La regla "no saltar" la aplica Postgres
 * (complete_next_session + trigger) con la sesión del usuario y RLS.
 */
export async function completeSessionAction(sessionId: number): Promise<ActionResult> {
  if (!isSessionId(sessionId)) return { ok: false, error: GENERIC_ERROR };
  const auth = await getAuth();
  if (!auth.ok) return { ok: false, error: "No tienes acceso. Vuelve a entrar." };

  const { error } = await auth.ctx.supabase.rpc("complete_next_session", { p_session_id: sessionId });
  if (error) return { ok: false, error: rpcErrorMessage(error) };

  revalidatePath("/", "layout");
  redirect(`/?hecho=${sessionId}`);
}

/** Deshace la última sesión completada (debe ser `sessionId`). */
export async function undoSessionAction(sessionId: number): Promise<ActionResult> {
  if (!isSessionId(sessionId)) return { ok: false, error: GENERIC_ERROR };
  const auth = await getAuth();
  if (!auth.ok) return { ok: false, error: "No tienes acceso. Vuelve a entrar." };

  const { error } = await auth.ctx.supabase.rpc("undo_last_session", { p_session_id: sessionId });
  if (error) return { ok: false, error: rpcErrorMessage(error) };

  revalidatePath("/", "layout");
  return { ok: true, message: "Día desmarcado." };
}

export async function signOutAction(): Promise<void> {
  if (getSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
