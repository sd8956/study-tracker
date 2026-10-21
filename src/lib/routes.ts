// URL helpers shared by server and client components.
export function sessionHref(key: string): string {
  return `/sesion/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Inverse of sessionHref: the session key in a `/sesion/...` path, or null. */
export function sessionKeyFromPath(pathname: string): string | null {
  const m = /^\/sesion\/(.+?)\/?$/.exec(pathname);
  if (!m) return null;
  try {
    return m[1].split("/").map(decodeURIComponent).join("/");
  } catch {
    return null;
  }
}
