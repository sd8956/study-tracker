import { NextResponse, type NextRequest } from "next/server";
import { isLocalHost } from "@/lib/origin";

// No login: the app only answers requests addressed to this machine (blocks DNS rebinding).
export function proxy(request: NextRequest) {
  if (!isLocalHost(request.headers.get("host"))) {
    return new NextResponse("Solo disponible desde este equipo.", { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
