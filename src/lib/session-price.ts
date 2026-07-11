/**
 * Single source of truth for "what does this session cost" — used by both
 * the public pay page (display) and the checkout action (the actual charge)
 * so the two can't silently diverge. Price is always snapshotted onto the
 * session at creation time (from the selected service, or manually set in
 * the cabinet) — there is no psychologist-level fallback. Returns null (not
 * 0) when no price is configured; 0 is a valid, distinct "free session"
 * price and must not be treated as "unset".
 */
export function getSessionAmountCents(session: { priceCents: number | null }): number | null {
  return session.priceCents;
}
