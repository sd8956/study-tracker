import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, isAllowed } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["email", "magiclink"];

/**
 * Destino del enlace del correo. Acepta:
 *  - ?token_hash=...&type=email  (plantilla recomendada; funciona en cualquier dispositivo)
 *  - ?code=...                   (flujo PKCE por defecto; mismo navegador que pidió el enlace)
 * Después vuelve a comprobar la allowlist; si no pasa, cierra la sesión.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const toLogin = (error: string) => NextResponse.redirect(new URL(`/login?error=${error}`, request.url));

  if (!getSupabaseEnv()) return toLogin("link");

  const supabase = await createClient();
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  let failed = true;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    failed = Boolean(error);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  }
  if (failed) return toLogin("link");

  const { data } = await supabase.auth.getUser();
  if (!data.user || !isAllowed(data.user.email)) {
    await supabase.auth.signOut();
    return toLogin("no_access");
  }

  return NextResponse.redirect(new URL("/", request.url));
}
