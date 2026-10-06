import "server-only";
import { isEmailAllowed } from "./allowlist";

export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/** Allowlist server-only (ALLOWED_EMAILS). Fail-closed si no está definida. */
export function isAllowed(email: string | null | undefined): boolean {
  return isEmailAllowed(email, process.env.ALLOWED_EMAILS);
}

/** URL pública de la app para el enlace del correo. Nunca se deriva del header Host. */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
