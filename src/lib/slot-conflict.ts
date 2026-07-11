import { Prisma, PrismaClient } from "@prisma/client";
import { getZonedParts, zonedTimeToUtc } from "./timezone";

type Queryable = PrismaClient | Prisma.TransactionClient;

export type SlotConflictReason = "outside_working_hours" | "blocked" | "session_overlap";

function isWithinWorkingHours(
  workingHours: { startTime: string; endTime: string }[],
  startAt: Date,
  endAt: Date
): boolean {
  const { year, month, day } = getZonedParts(startAt);

  return workingHours.some((rule) => {
    const [startHours, startMinutes] = rule.startTime.split(":").map(Number);
    const [endHours, endMinutes] = rule.endTime.split(":").map(Number);

    const ruleStart = zonedTimeToUtc({ year, month, day, hour: startHours, minute: startMinutes });
    const ruleEnd = zonedTimeToUtc({ year, month, day, hour: endHours, minute: endMinutes });

    return startAt >= ruleStart && endAt <= ruleEnd;
  });
}

/**
 * Single source of truth for "can this psychologist be booked for
 * [startAt, endAt)": used by both the public booking flow and the cabinet
 * reschedule flow so working-hours/blocked-range/overlap rules can't drift
 * between the two. Always call this from inside the caller's own
 * Serializable transaction — it only reads, the caller decides how the
 * write (or its absence) is committed.
 */
export async function checkSlotConflict(
  tx: Queryable,
  params: {
    psychologistId: string;
    startAt: Date;
    endAt: Date;
    excludeSessionId?: string;
    skipWorkingHours?: boolean;
  }
): Promise<SlotConflictReason | null> {
  const { psychologistId, startAt, endAt, excludeSessionId, skipWorkingHours } = params;

  if (!skipWorkingHours) {
    const workingHours = await tx.workingHour.findMany({
      where: { psychologistId, weekday: getZonedParts(startAt).weekday },
      select: { startTime: true, endTime: true },
    });
    if (!isWithinWorkingHours(workingHours, startAt, endAt)) {
      return "outside_working_hours";
    }
  }

  const blocked = await tx.blockedRange.findFirst({
    where: { psychologistId, startAt: { lt: endAt }, endAt: { gt: startAt } },
    select: { id: true },
  });
  if (blocked) {
    return "blocked";
  }

  const sessionConflict = await tx.session.findFirst({
    where: {
      psychologistId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
    },
    select: { id: true },
  });
  if (sessionConflict) {
    return "session_overlap";
  }

  return null;
}
