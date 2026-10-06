import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Todo excepto assets estáticos y el cron (que se protege con CRON_SECRET).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|api/cron/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
