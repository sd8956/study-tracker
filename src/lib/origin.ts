// The app has no login: it only serves requests addressed to this machine.
// Host must be a loopback name (blocks DNS rebinding); Origin, when present, must be too (blocks CSRF).

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function hostnameOf(host: string): string {
  const h = host.trim().toLowerCase();
  if (h.startsWith("[")) return h.slice(0, h.indexOf("]") + 1);
  return h.split(":")[0];
}

export function isLocalHost(host: string | null): boolean {
  return !!host && LOCAL_HOSTNAMES.has(hostnameOf(host));
}

export function isLocalRequest(headers: Headers): boolean {
  if (!isLocalHost(headers.get("host"))) return false;
  const origin = headers.get("origin");
  if (origin === null) return true;
  try {
    const u = new URL(origin);
    return (u.protocol === "http:" || u.protocol === "https:") && LOCAL_HOSTNAMES.has(u.hostname);
  } catch {
    return false;
  }
}
