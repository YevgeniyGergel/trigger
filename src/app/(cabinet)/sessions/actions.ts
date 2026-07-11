"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { checkSlotConflict, type SlotConflictReason } from "@/lib/slot-conflict";
import { zonedTimeToUtc } from "@/lib/timezone";
import { manualSessionSchema } from "@/lib/validation/manual-session";
import {
  notifyClient,
  sessionCancelledForClient,
  sessionConfirmedForClient,
  sessionRescheduledForClient,
} from "@/lib/notifications";
import {
  syncSessionCreated,
  syncSessionConfirmed,
  syncSessionCancelled,
  syncSessionRescheduled,
  retrySessionSync,
} from "@/lib/integrations/session-sync";
import { isSlotBusy } from "@/lib/integrations/busy-cache";

export type SessionActionResult = {
  error?: string;
};

const SLOT_CONFLICT_MESSAGES_MANUAL: Record<SlotConflictReason, string> = {
  outside_working_hours: "Обраний час поза робочими годинами",
  blocked: "Цей час заблоковано у розкладі",
  session_overlap: "У цей час вже є інша сесія",
};

export type ManualSessionFormState = {
  error?: string;
};

export async function createManualSession(
  _prevState: ManualSessionFormState,
  formData: FormData
): Promise<ManualSessionFormState> {
  const psychologist = await requireCurrentPsychologist();

  const parsed = manualSessionSchema.safeParse({
    clientId: formData.get("clientId"),
    serviceTypeId: formData.get("serviceTypeId"),
    startAt: formData.get("startAt"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некоректні дані" };
  }

  // <input type="datetime-local"> has no timezone offset — it's the
  // psychologist's own Kyiv wall-clock time, parsed explicitly rather than
  // via `new Date(raw)` (see rescheduleSession above for the same issue).
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(parsed.data.startAt);
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

  const [client, service] = await Promise.all([
    prisma.client.findFirst({
      where: { id: parsed.data.clientId, psychologistId: psychologist.id },
    }),
    prisma.serviceType.findFirst({
      where: { id: parsed.data.serviceTypeId, psychologistId: psychologist.id, active: true },
    }),
  ]);
  if (!client) {
    return { error: "Клієнта не знайдено" };
  }
  if (!service) {
    return { error: "Обрана послуга недоступна" };
  }

  const endAt = new Date(startAt.getTime() + service.slotMinutes * 60_000);

  if (await isSlotBusy(psychologist.id, startAt, endAt)) {
    return { error: SLOT_CONFLICT_MESSAGES_MANUAL.session_overlap };
  }

  let sessionId: string;
  try {
    sessionId = await prisma.$transaction(
      async (tx) => {
        const conflict = await checkSlotConflict(tx, {
          psychologistId: psychologist.id,
          startAt,
          endAt,
          skipWorkingHours: true,
        });
        if (conflict) {
          throw new SlotConflictErrorManual(conflict);
        }

        const created = await tx.session.create({
          data: {
            psychologistId: psychologist.id,
            clientId: client.id,
            serviceTypeId: service.id,
            startAt,
            endAt,
            status: "CONFIRMED",
            priceCents: service.priceCents,
          },
        });
        return created.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (error instanceof SlotConflictErrorManual) {
      return { error: SLOT_CONFLICT_MESSAGES_MANUAL[error.reason] };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { error: "У цей час щойно з'явилась інша сесія. Спробуйте ще раз." };
    }
    throw error;
  }

  try {
    await notifyClient(
      client,
      "BOOKING_CONFIRMATION",
      sessionConfirmedForClient(startAt, sessionId, service.slotMinutes - service.breakMinutes),
      sessionId
    );
  } catch (error) {
    console.error("[sessions] manual booking notification failed:", error);
  }

  try {
    await syncSessionCreated(sessionId);
    await syncSessionConfirmed(sessionId);
  } catch (error) {
    console.error("[sessions] calendar/meeting sync failed:", error);
  }

  revalidatePath("/sessions");
  revalidatePath(`/clients/${client.id}`);
  redirect(`/sessions/${sessionId}`);
}

class SlotConflictErrorManual extends Error {
  constructor(readonly reason: SlotConflictReason) {
    super(reason);
  }
}

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

  try {
    await syncSessionConfirmed(sessionId);
  } catch (error) {
    console.error("[sessions] meeting sync failed:", error);
  }

  return {};
}

export async function cancelSession(
  sessionId: string,
  comment?: string
): Promise<SessionActionResult> {
  const psychologist = await requireCurrentPsychologist();
  const trimmedComment = comment?.trim() || undefined;

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

  const cancelled = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { client: true },
  });
  if (cancelled) {
    try {
      await notifyClient(
        cancelled.client,
        "CANCELLATION",
        sessionCancelledForClient(cancelled.startAt, cancelled.id, trimmedComment),
        cancelled.id
      );
    } catch (error) {
      console.error("[sessions] cancellation notification failed:", error);
    }

    try {
      await syncSessionCancelled(cancelled.id);
    } catch (error) {
      console.error("[sessions] calendar/meeting cancellation sync failed:", error);
    }
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
  const comment = String(formData.get("comment") ?? "").trim() || undefined;

  // Re-check Google Calendar busy intervals uncached, outside the
  // transaction below (an external API call has no business holding a
  // Serializable transaction's locks).
  const existing = await prisma.session.findFirst({
    where: { id: sessionId, psychologistId: psychologist.id, status: { in: ["PENDING", "CONFIRMED"] } },
    select: { startAt: true, endAt: true },
  });
  if (existing) {
    const durationMs = existing.endAt.getTime() - existing.startAt.getTime();
    const candidateEndAt = new Date(startAt.getTime() + durationMs);
    if (await isSlotBusy(psychologist.id, startAt, candidateEndAt)) {
      return { error: SLOT_CONFLICT_MESSAGES.session_overlap };
    }
  }

  let rescheduledClient;
  try {
    rescheduledClient = await prisma.$transaction(
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
          include: { client: true },
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

        return session.client;
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

  try {
    await notifyClient(
      rescheduledClient,
      "RESCHEDULED",
      sessionRescheduledForClient(startAt, sessionId, comment),
      sessionId
    );
  } catch (error) {
    console.error("[sessions] reschedule notification failed:", error);
  }

  try {
    await syncSessionRescheduled(sessionId);
  } catch (error) {
    console.error("[sessions] reschedule calendar/meeting sync failed:", error);
  }

  revalidatePath("/sessions");
  return {};
}

export async function retrySessionSyncAction(sessionId: string): Promise<SessionActionResult> {
  const psychologist = await requireCurrentPsychologist();

  const session = await prisma.session.findFirst({
    where: { id: sessionId, psychologistId: psychologist.id },
    select: { id: true },
  });
  if (!session) {
    return { error: "Сесію не знайдено" };
  }

  try {
    await retrySessionSync(sessionId);
  } catch (error) {
    console.error("[sessions] manual sync retry failed:", error);
    return { error: "Не вдалося синхронізувати. Спробуйте пізніше." };
  }

  revalidatePath(`/sessions/${sessionId}`);
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

  // A paid session's priceCents is the amount actually charged — it must
  // stay untouched no matter how the session is edited afterwards.
  const result = await prisma.session.updateMany({
    where: { id: sessionId, psychologistId: psychologist.id, paymentStatus: { not: "PAID" } },
    data: { priceCents },
  });

  revalidatePath("/sessions");

  if (result.count === 0) {
    const paid = await prisma.session.findFirst({
      where: { id: sessionId, psychologistId: psychologist.id, paymentStatus: "PAID" },
    });
    return { error: paid ? "Сесію вже оплачено — її вартість змінити не можна" : "Сесію не знайдено" };
  }
  return {};
}
