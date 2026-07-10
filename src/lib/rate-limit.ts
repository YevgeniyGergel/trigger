type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Sweep on roughly 1 in 100 calls rather than every call (cheap) or via a
// timer (keeps a serverless/edge process alive for no reason) — bounds
// buckets' size to "currently active keys" instead of "all keys ever seen".
const SWEEP_PROBABILITY = 0.01;

function sweepExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

/**
 * In-memory fixed-window rate limiter. Sufficient for a single-instance MVP
 * deployment; on multi-instance serverless hosting each instance keeps its
 * own counters, so this becomes a soft limit rather than a hard one — an
 * accepted trade-off since the psychologist can still see and cancel
 * suspicious bookings (see design.md risks).
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  if (Math.random() < SWEEP_PROBABILITY) {
    sweepExpired(now);
  }

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}
