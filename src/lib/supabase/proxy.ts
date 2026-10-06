import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEmailAllowed } from "@/lib/allowlist";

const PUBLIC_PATHS = ["/login", "/auth/confirm"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Redirige conservando las cookies (refresh / sign-out) que Supabase haya escrito. */
function redirectWithCookies(request: NextRequest, from: NextResponse, pathname: string, search = "") {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  const res = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => res.cookies.set(c));
  from.headers.forEach((value, key) => {
    if (key.toLowerCase() === "cache-control" || key.toLowerCase() === "expires" || key.toLowerCase() === "pragma") {
      res.headers.set(key, value);
    }
  });
  return res;
}

/**
 * Refresca la sesión y aplica el guard optimista:
 *  - sin sesión en ruta privada -> /login
 *  - sesión con email fuera de la allowlist -> sign out + /login?error=no_access
 *  - sesión válida en /login -> /
 * Las páginas y server actions vuelven a comprobar (defensa en profundidad).
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return isPublic(pathname) ? NextResponse.next() : redirectWithCookies(request, NextResponse.next(), "/login");
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // getUser() valida el token contra Supabase Auth (no confía solo en la cookie).
  let user: { email?: string | null } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  if (user && !isEmailAllowed(user.email, process.env.ALLOWED_EMAILS)) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Aunque falle la revocación remota, las cookies se limpian localmente.
    }
    if (pathname === "/login") return response;
    return redirectWithCookies(request, response, "/login", "?error=no_access");
  }

  if (!user && !isPublic(pathname)) {
    return redirectWithCookies(request, response, "/login");
  }

  if (user && pathname === "/login") {
    return redirectWithCookies(request, response, "/");
  }

  return response;
}
