// Allowlist de emails. Lógica pura (testeable); la lectura de env vive en env.ts.
// Fail-closed: lista vacía o ausente => nadie tiene acceso.

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseAllowlist(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map(normalizeEmail)
      .filter((e) => e.length > 0 && e.includes("@")),
  );
}

export function isEmailAllowed(email: string | null | undefined, rawAllowlist: string | null | undefined): boolean {
  if (!email) return false;
  const list = parseAllowlist(rawAllowlist);
  if (list.size === 0) return false;
  return list.has(normalizeEmail(email));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email);
}
