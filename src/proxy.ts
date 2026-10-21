import { NextResponse, type NextRequest } from "next/server";
import { isLocalHost } from "@/lib/origin";
import { getPlan } from "@/lib/plan";
import { sessionKeyFromPath } from "@/lib/routes";

// No login: the app only answers requests addressed to this machine (blocks DNS rebinding).
export function proxy(request: NextRequest) {
  if (!isLocalHost(request.headers.get("host"))) {
    return new NextResponse("Solo disponible desde este equipo.", { status: 403 });
  }
  // Unknown sessions get a real 404: the page itself streams (loading.tsx) and can no longer change its status.
  if (request.nextUrl.pathname.startsWith("/sesion/")) {
    const key = sessionKeyFromPath(request.nextUrl.pathname);
    if (key === null || !getPlan().byKey.has(key)) {
      return NextResponse.rewrite(new URL("/sesion-no-encontrada", request.url), { status: 404 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
