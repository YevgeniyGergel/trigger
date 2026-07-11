import { getZonedParts, zonedTimeToUtc, addDays as addKyivDays } from "./timezone";

/** The Kyiv-local Monday 00:00 instant of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const { year, month, day, weekday } = getZonedParts(date);
  const diff = weekday === 0 ? -6 : 1 - weekday; // week starts Monday
  const monday = new Date(Date.UTC(year, month - 1, day + diff));
  return zonedTimeToUtc({
    year: monday.getUTCFullYear(),
    month: monday.getUTCMonth() + 1,
    day: monday.getUTCDate(),
  });
}

export function addDays(date: Date, days: number): Date {
  return addKyivDays(date, days);
}

export function toDateParam(date: Date): string {
  // Kyiv calendar date, not the process-local one — a UTC-default host
  // (e.g. Vercel, which reserves the TZ env var and won't let it be set)
  // would otherwise roll this back to the previous day for Kyiv's UTC+2/+3.
  const { year, month, day } = getZonedParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseDateParam(value: string | undefined): Date {
  if (!value) return new Date();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  const [, year, month, day] = match;
  const parsed = zonedTimeToUtc({ year: Number(year), month: Number(month), day: Number(day) });
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
