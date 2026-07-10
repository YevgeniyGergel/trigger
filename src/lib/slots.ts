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
 * Simplification: working-hour times are interpreted in the server's local
 * time zone (no per-psychologist time zone support yet) — acceptable for a
 * single-country MVP, revisit if the product expands beyond Ukraine.
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

  const cursorDay = new Date(fromDate);
  cursorDay.setHours(0, 0, 0, 0);
  const endDay = new Date(toDate);
  endDay.setHours(0, 0, 0, 0);

  while (cursorDay <= endDay) {
    const weekday = cursorDay.getDay();
    const rulesForDay = workingHours.filter((rule) => rule.weekday === weekday);

    for (const rule of rulesForDay) {
      const dayStartMinutes = parseTimeToMinutes(rule.startTime);
      const dayEndMinutes = parseTimeToMinutes(rule.endTime);

      for (
        let slotStartMinutes = dayStartMinutes;
        slotStartMinutes + sessionDurationMinutes <= dayEndMinutes;
        slotStartMinutes += slotSpanMinutes
      ) {
        const slotStart = new Date(cursorDay);
        slotStart.setMinutes(slotStartMinutes);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotStart.getMinutes() + sessionDurationMinutes);

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

    cursorDay.setDate(cursorDay.getDate() + 1);
  }

  return slots;
}
