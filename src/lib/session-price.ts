/**
 * Single source of truth for "what does this session cost" — used by both
 * the public pay page (display) and the checkout action (the actual charge)
 * so the two can't silently diverge if the fallback rule ever changes.
 * Returns null (not 0) when no price is configured at all; 0 is a valid,
 * distinct "free session" price and must not be treated as "unset".
 */
export function getSessionAmountCents(session: {
  priceCents: number | null;
  psychologist: { defaultSessionPriceCents: number | null };
}): number | null {
  return session.priceCents ?? session.psychologist.defaultSessionPriceCents;
}
