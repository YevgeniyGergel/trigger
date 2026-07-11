/**
 * Explicit Europe/Kyiv timezone handling, independent of the process's own
 * timezone (process.env.TZ). Vercel reserves TZ as a system env var name and
 * won't let it be set from the dashboard, so the original plan of pinning
 * TZ=Europe/Kyiv for production (see design.md) doesn't work there — every
 * working-hours/slot/calendar calculation and every displayed date/time must
 * instead convert explicitly, via Intl, rather than relying on
 * Date.getHours()/setHours()/getDay() (which read the *process* local time).
 */

export const APP_TIMEZONE = "Europe/Kyiv";

export type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  second: number;
  weekday: number; // 0 (Sun) .. 6 (Sat) — matches Date.getDay() / WorkingHour.weekday
};

/** Wall-clock components of `date` as observed in Europe/Kyiv. */
export function getZonedParts(date: Date): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  let hour = get("hour");
  if (hour === 24) hour = 0; // some engines format midnight as "24" under hour12:false
  const minute = get("minute");
  const second = get("second");

  // Weekday depends only on the calendar date, so deriving it from a
  // timezone-free UTC-midnight instant of the same Y-M-D is safe.
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return { year, month, day, hour, minute, second, weekday };
}

function getOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    timeZoneName: "shortOffset",
  }).formatToParts(instant);
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const match = /GMT([+-])(\d+)(?::(\d+))?/.exec(raw);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = match[3] ? Number(match[3]) : 0;
  return sign * (hours * 60 + minutes);
}

/**
 * Converts Kyiv wall-clock components to the absolute instant (UTC) they
 * represent. Resolved via a "guess, then correct" pass so the DST-transition
 * dates (late March / late October) still resolve to the right offset; the
 * literal skipped/ambiguous hour on the transition night itself is the one
 * remaining edge case, deliberately left unhandled (no bookings happen at
 * 3 AM) rather than pulling in a full timezone-database library.
 */
export function zonedTimeToUtc(parts: {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
}): Date {
  const { year, month, day, hour = 0, minute = 0, second = 0 } = parts;
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset1 = getOffsetMinutes(guess);
  const utc1 = new Date(guess.getTime() - offset1 * 60_000);
  const offset2 = getOffsetMinutes(utc1);
  return offset2 === offset1 ? utc1 : new Date(guess.getTime() - offset2 * 60_000);
}

/** The Kyiv-local midnight instant on the calendar day containing `date`. */
export function startOfDay(date: Date): Date {
  const { year, month, day } = getZonedParts(date);
  return zonedTimeToUtc({ year, month, day });
}

/**
 * Shifts `date` by `days` Kyiv calendar days, preserving its Kyiv wall-clock
 * time of day. Day-overflow (e.g. day 32) is normalized via Date.UTC rather
 * than hand-rolled month-length arithmetic.
 */
export function addDays(date: Date, days: number): Date {
  const { year, month, day, hour, minute, second } = getZonedParts(date);
  const rolled = new Date(Date.UTC(year, month - 1, day + days));
  return zonedTimeToUtc({
    year: rolled.getUTCFullYear(),
    month: rolled.getUTCMonth() + 1,
    day: rolled.getUTCDate(),
    hour,
    minute,
    second,
  });
}

/** Formats `date` in Europe/Kyiv — the timezone-aware replacement for bare toLocaleString/toLocaleDateString/toLocaleTimeString calls. */
export function formatKyiv(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale = "uk-UA"
): string {
  return date.toLocaleString(locale, { ...options, timeZone: APP_TIMEZONE });
}
