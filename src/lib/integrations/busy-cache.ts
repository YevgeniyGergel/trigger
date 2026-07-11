import type { DateRange } from "@/lib/slots";
import { getConnection } from "./connections";
import { fetchBusyIntervals } from "./google-calendar";

const CACHE_TTL_MS = 60_000;

const cache = new Map<string, { expiresAt: number; intervals: DateRange[] }>();

/**
 * Google Calendar busy intervals for the booking window, cached in-memory
 * ~60s per psychologist (design.md D5) to keep the public booking page fast
 * under repeated loads. On any failure (no connection, API error/timeout)
 * degrades to an empty list rather than blocking the page.
 */
export async function fetchBusyIntervalsUncached(
  psychologistId: string,
  timeMin: Date,
  timeMax: Date
): Promise<DateRange[]> {
  const connection = await getConnection(psychologistId, "GOOGLE");
  if (!connection || connection.status !== "ACTIVE") {
    return [];
  }
  try {
    return await fetchBusyIntervals(connection, timeMin, timeMax);
  } catch (error) {
    console.error(`[integrations] freeBusy lookup failed for psychologist ${psychologistId}:`, error);
    return [];
  }
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Uncached re-check at booking/reschedule submission time (design.md D5) —
 * the cached list used for slot display can be up to ~60s stale, so the
 * actual write is guarded by a fresh lookup. Degrades to "not busy" on any
 * failure, same as the cached path: an external outage must never block a
 * booking.
 */
export async function isSlotBusy(psychologistId: string, startAt: Date, endAt: Date): Promise<boolean> {
  const intervals = await fetchBusyIntervalsUncached(psychologistId, startAt, endAt);
  return intervals.some((r) => rangesOverlap(startAt, endAt, r.startAt, r.endAt));
}

/**
 * Filters out busy intervals that exactly match an existing Trigger
 * session's [startAt, endAt) — Trigger's own exported events would
 * otherwise double-count as both a "session" and a "busy interval" for the
 * same time (design.md D5).
 */
export function excludeTriggerEvents(busy: DateRange[], sessions: DateRange[]): DateRange[] {
  const sessionKeys = new Set(sessions.map((s) => `${s.startAt.getTime()}-${s.endAt.getTime()}`));
  return busy.filter((r) => !sessionKeys.has(`${r.startAt.getTime()}-${r.endAt.getTime()}`));
}

export async function getCachedBusyIntervals(
  psychologistId: string,
  timeMin: Date,
  timeMax: Date
): Promise<DateRange[]> {
  const cached = cache.get(psychologistId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.intervals;
  }

  const intervals = await fetchBusyIntervalsUncached(psychologistId, timeMin, timeMax);
  cache.set(psychologistId, { expiresAt: Date.now() + CACHE_TTL_MS, intervals });
  return intervals;
}
