import { timingSafeEqual } from "node:crypto";

/**
 * Vercel Cron envía `Authorization: Bearer <CRON_SECRET>`.
 * Fail-closed: sin CRON_SECRET (o demasiado corto) nunca autoriza.
 */
export function isCronAuthorized(authorization: string | null | undefined, secret: string | null | undefined): boolean {
  if (!secret || secret.length < 16 || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(authorization);
  return expected.length === got.length && timingSafeEqual(expected, got);
}
