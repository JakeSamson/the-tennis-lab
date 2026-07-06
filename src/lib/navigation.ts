/**
 * Only allow redirects to internal app paths. Anything else (full URLs,
 * protocol-relative //evil.com, javascript:) falls back to the given default.
 * Prevents open-redirect abuse of the ?redirect= param on auth pages.
 */
export function safeRedirect(target: string | null, fallback: string): string {
  if (!target) return fallback;
  if (!target.startsWith("/") || target.startsWith("//")) return fallback;
  return target;
}

/** Builds the shareable claim URL a coach sends to a player. */
export function buildClaimUrl(origin: string, token: string): string {
  return `${origin}/claim/${token}`;
}
