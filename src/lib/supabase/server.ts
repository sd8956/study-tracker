import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/env";

/**
 * Cliente Supabase con la sesión del usuario (cookies) y la anon/publishable key.
 * Todas las lecturas/escrituras pasan por RLS. No se usa service role en la app.
 */
export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Supabase no está configurado (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: no puede escribir cookies.
          // El proxy refresca la sesión en cada request, así que es seguro ignorarlo.
        }
      },
    },
  });
}
