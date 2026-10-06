import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isCronAuthorized } from "@/lib/cron";

export const dynamic = "force-dynamic";

/**
 * Ping periódico (Vercel Cron) para que el proyecto Supabase free no se pause por inactividad.
 * Llama a public.keepalive() (select true) con la anon key: no lee ni escribe datos.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.rpc("keepalive");
  if (error) {
    console.error("[cron] keepalive failed", { code: error.code });
    return NextResponse.json({ ok: false }, { status: 502 });
  }
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
