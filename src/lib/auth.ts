import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv, isAllowed } from "@/lib/env";

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type AuthContext = { user: User & { email: string }; supabase: Supabase };
export type AuthResult = { ok: true; ctx: AuthContext } | { ok: false; reason: "anon" | "no_access" };

/** Valida sesión (contra Supabase Auth) + allowlist. Memoizado por request. */
export const getAuth = cache(async (): Promise<AuthResult> => {
  await connection(); // siempre dinámico: nunca prerenderizar páginas privadas
  if (!getSupabaseEnv()) return { ok: false, reason: "anon" };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false, reason: "anon" };
  if (!data.user.email || !isAllowed(data.user.email)) return { ok: false, reason: "no_access" };
  return { ok: true, ctx: { user: data.user as AuthContext["user"], supabase } };
});

/** Guard para páginas: redirige a /login si no hay sesión válida y permitida. */
export async function requireUser(): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth.ok) redirect(auth.reason === "no_access" ? "/login?error=no_access" : "/login");
  return auth.ctx;
}
