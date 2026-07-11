import { getZonedParts, zonedTimeToUtc, startOfDay, addDays } from "./timezone";

export type WorkingHourRule = {
  weekday: number; // 0 = Sunday .. 6 = Saturday
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
};

export type DateRange = {
  startAt: Date;
  endAt: Date;
};

export type GenerateSlotsParams = {
  workingHours: WorkingHourRule[];
  sessionDurationMinutes: number;
  breakDurationMinutes: number;
  blockedRanges: DateRange[];
  bookedRanges: DateRange[];
  fromDate: Date;
  toDate: Date;
};

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Generates bookable slots between fromDate and toDate (inclusive of days),
 * derived from the psychologist's recurring weekly working hours, minus any
 * slot that overlaps a blocked range or an already-booked session.
 *
 * Working-hour times are interpreted as Europe/Kyiv wall-clock time (no
 * per-psychologist time zone support yet — single-country MVP), converted
 * explicitly via lib/timezone.ts rather than relying on the host process's
 * own local time zone (see timezone.ts for why).
 */
export function generateAvailableSlots(params: GenerateSlotsParams): DateRange[] {
  const {
    workingHours,
    sessionDurationMinutes,
    breakDurationMinutes,
    blockedRanges,
    bookedRanges,
    fromDate,
    toDate,
  } = params;

  const slotSpanMinutes = sessionDurationMinutes + breakDurationMinutes;
  if (sessionDurationMinutes <= 0 || slotSpanMinutes <= 0) {
    return [];
  }

  const slots: DateRange[] = [];
  const unavailable = [...blockedRanges, ...bookedRanges];

  let cursorDay = startOfDay(fromDate);
  const endDay = startOfDay(toDate);

  while (cursorDay <= endDay) {
    const { year, month, day, weekday } = getZonedParts(cursorDay);
    const rulesForDay = workingHours.filter((rule) => rule.weekday === weekday);

    for (const rule of rulesForDay) {
      const dayStartMinutes = parseTimeToMinutes(rule.startTime);
      const dayEndMinutes = parseTimeToMinutes(rule.endTime);

      for (
        let slotStartMinutes = dayStartMinutes;
        slotStartMinutes + sessionDurationMinutes <= dayEndMinutes;
        slotStartMinutes += slotSpanMinutes
      ) {
        const slotStart = zonedTimeToUtc({
          year,
          month,
          day,
          hour: Math.floor(slotStartMinutes / 60),
          minute: slotStartMinutes % 60,
        });
        const slotEndMinutes = slotStartMinutes + sessionDurationMinutes;
        const slotEnd = zonedTimeToUtc({
          year,
          month,
          day,
          hour: Math.floor(slotEndMinutes / 60),
          minute: slotEndMinutes % 60,
        });

        if (slotStart < fromDate || slotEnd > toDate) {
          continue;
        }

        const isBlocked = unavailable.some((range) =>
          rangesOverlap(slotStart, slotEnd, range.startAt, range.endAt)
        );

        if (!isBlocked) {
          slots.push({ startAt: slotStart, endAt: slotEnd });
        }
      }
    }

    cursorDay = addDays(cursorDay, 1);
  }

  return slots;
}
