"use server";

import { isValidEmail, normalizeEmail } from "@/lib/allowlist";
import { getSiteUrl, getSupabaseEnv, isAllowed } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message: string; email?: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const raw = formData.get("email");
  const email = normalizeEmail(typeof raw === "string" ? raw : "");

  if (!isValidEmail(email)) {
    return { status: "error", message: "Escribe un correo válido.", email };
  }

  // Allowlist ANTES de pedir el enlace: a un correo no permitido no se le envía nada.
  if (!isAllowed(email)) {
    return { status: "error", message: "Este correo no tiene acceso.", email };
  }

  if (!getSupabaseEnv()) {
    return { status: "error", message: "El servicio no está configurado.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/confirm`,
      shouldCreateUser: false, // sin signup: el usuario se crea a mano en Supabase
    },
  });

  if (error) {
    console.error("[login] signInWithOtp failed", { status: error.status, code: error.code });
    return { status: "error", message: "No se pudo enviar el enlace. Espera unos minutos e inténtalo de nuevo.", email };
  }

  return { status: "sent", message: "Listo. Revisa tu correo y abre el enlace para entrar." };
}
