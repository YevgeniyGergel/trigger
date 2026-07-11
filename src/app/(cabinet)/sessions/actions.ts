"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { checkSlotConflict, type SlotConflictReason } from "@/lib/slot-conflict";
import { zonedTimeToUtc } from "@/lib/timezone";

export type SessionActionResult = {
  error?: string;
};

export async function confirmSession(sessionId: string): Promise<SessionActionResult> {
  const psychologist = await requireCurrentPsychologist();

  const result = await prisma.session.updateMany({
    where: { id: sessionId, psychologistId: psychologist.id, status: "PENDING" },
    data: { status: "CONFIRMED" },
  });

  revalidatePath("/sessions");

  if (result.count === 0) {
    return { error: "Сесію вже змінено. Оновіть сторінку." };
  }
  return {};
}

export async function cancelSession(sessionId: string): Promise<SessionActionResult> {
  const psychologist = await requireCurrentPsychologist();

  // Cancelling only flips status — generateAvailableSlots() already filters
  // bookedRanges to PENDING/CONFIRMED sessions, so a CANCELLED session's
  // slot becomes bookable again on the public page without further action.
  const result = await prisma.session.updateMany({
    where: {
      id: sessionId,
      psychologistId: psychologist.id,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/sessions");

  if (result.count === 0) {
    return { error: "Сесію вже змінено. Оновіть сторінку." };
  }
  return {};
}

const SLOT_CONFLICT_MESSAGES: Record<SlotConflictReason, string> = {
  outside_working_hours: "Обраний час поза робочими годинами",
  blocked: "Цей час заблоковано у розкладі",
  session_overlap: "У цей час вже є інша сесія",
};

class SessionNotReschedulableError extends Error {}
class SlotConflictError extends Error {
  constructor(readonly reason: SlotConflictReason) {
    super(reason);
  }
}

export type RescheduleFormState = {
  error?: string;
};

export async function rescheduleSession(
  sessionId: string,
  _prevState: RescheduleFormState,
  formData: FormData
): Promise<RescheduleFormState> {
  const psychologist = await requireCurrentPsychologist();

  // The <input type="datetime-local"> value has no timezone offset — it's
  // the psychologist's own wall-clock time (Kyiv), not UTC or the server's
  // local time, so it must be parsed explicitly rather than via `new
  // Date(raw)` (which would read it as the server's local time — UTC on
  // Vercel, a multi-hour bug).
  const startAtRaw = String(formData.get("startAt") ?? "");
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(startAtRaw);
  if (!match) {
    return { error: "Некоректна дата/час" };
  }
  const [, year, month, day, hour, minute] = match;
  const startAt = zonedTimeToUtc({
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  });

  try {
    await prisma.$transaction(
      async (tx) => {
        // Re-read the session inside the transaction and require it to
        // still be PENDING/CONFIRMED — closes the gap where the session
        // could be cancelled in another tab between this read and the
        // final write below.
        const session = await tx.session.findFirst({
          where: {
            id: sessionId,
            psychologistId: psychologist.id,
            status: { in: ["PENDING", "CONFIRMED"] },
          },
        });
        if (!session) {
          throw new SessionNotReschedulableError();
        }

        const durationMs = session.endAt.getTime() - session.startAt.getTime();
        const endAt = new Date(startAt.getTime() + durationMs);

        const conflict = await checkSlotConflict(tx, {
          psychologistId: psychologist.id,
          startAt,
          endAt,
          excludeSessionId: sessionId,
        });
        if (conflict) {
          throw new SlotConflictError(conflict);
        }

        const updated = await tx.session.updateMany({
          where: { id: sessionId, status: session.status },
          data: { startAt, endAt },
        });
        if (updated.count === 0) {
          throw new SessionNotReschedulableError();
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (error instanceof SessionNotReschedulableError) {
      return { error: "Сесію не знайдено або її вже скасовано" };
    }
    if (error instanceof SlotConflictError) {
      return { error: SLOT_CONFLICT_MESSAGES[error.reason] };
    }
    // Serializable isolation makes Postgres abort one side of a concurrent
    // conflicting write instead of silently committing both.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { error: "У цей час щойно з'явилась інша сесія. Спробуйте ще раз." };
    }
    throw error;
  }

  revalidatePath("/sessions");
  return {};
}

export async function updateSessionPrice(
  sessionId: string,
  priceUah: number | null
): Promise<SessionActionResult> {
  const psychologist = await requireCurrentPsychologist();

  if (priceUah != null && (Number.isNaN(priceUah) || priceUah < 0)) {
    return { error: "Некоректна вартість" };
  }
  const priceCents = priceUah != null ? Math.round(priceUah * 100) : null;

  const result = await prisma.session.updateMany({
    where: { id: sessionId, psychologistId: psychologist.id },
    data: { priceCents },
  });

  revalidatePath("/sessions");

  if (result.count === 0) {
    return { error: "Сесію не знайдено" };
  }
  return {};
}
