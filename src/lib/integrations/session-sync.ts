import { prisma } from "@/lib/prisma";
import { getConnection } from "./connections";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  CalendarEventNotFoundError,
} from "./google-calendar";
import { getMeetingProvider, type MeetingSession } from "./meetings";

type SyncSession = {
  id: string;
  startAt: Date;
  endAt: Date;
  calendarEventId: string | null;
  meetingProvider: "NONE" | "GOOGLE_MEET" | "ZOOM";
  meetingExternalId: string | null;
  psychologistId: string;
  client: { name: string };
};

async function loadSession(sessionId: string): Promise<SyncSession | null> {
  return prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      calendarEventId: true,
      meetingProvider: true,
      meetingExternalId: true,
      psychologistId: true,
      client: { select: { name: true } },
    },
  });
}

function toMeetingSession(session: SyncSession): MeetingSession {
  return {
    id: session.id,
    startAt: session.startAt,
    endAt: session.endAt,
    calendarEventId: session.calendarEventId,
    meetingExternalId: session.meetingExternalId,
    clientName: session.client.name,
  };
}

/**
 * Best-effort Google Calendar event creation for a newly booked/created
 * session (PENDING or CONFIRMED) — a failure never blocks the booking
 * itself; it just leaves syncPending set so the cron reconciliation pass
 * retries it (design.md D4).
 */
export async function syncSessionCreated(sessionId: string): Promise<void> {
  const session = await loadSession(sessionId);
  if (!session) return;

  const connection = await getConnection(session.psychologistId, "GOOGLE");
  if (!connection || connection.status !== "ACTIVE") return;

  try {
    const event = await createCalendarEvent(connection, {
      summary: `Сесія з ${session.client.name}`,
      startAt: session.startAt,
      endAt: session.endAt,
    });
    await prisma.session.update({
      where: { id: sessionId },
      data: { calendarEventId: event.eventId, syncPending: false },
    });
  } catch (error) {
    console.error(`[integrations] calendar event create failed for session ${sessionId}:`, error);
    await prisma.session.update({ where: { id: sessionId }, data: { syncPending: true } });
  }
}

/**
 * Updates the calendar event and, if the session already has a meeting, the
 * meeting's time — both best-effort. Reschedule/cancellation always operate
 * through the session's own stored meetingProvider, never the
 * psychologist's current default (design.md meeting-links).
 */
export async function syncSessionRescheduled(sessionId: string): Promise<void> {
  const session = await loadSession(sessionId);
  if (!session) return;

  let pending = false;

  const connection = await getConnection(session.psychologistId, "GOOGLE");
  if (connection && connection.status === "ACTIVE") {
    try {
      if (session.calendarEventId) {
        try {
          await updateCalendarEvent(connection, session.calendarEventId, {
            startAt: session.startAt,
            endAt: session.endAt,
          });
        } catch (error) {
          if (!(error instanceof CalendarEventNotFoundError)) throw error;
          const recreated = await createCalendarEvent(connection, {
            summary: `Сесія з ${session.client.name}`,
            startAt: session.startAt,
            endAt: session.endAt,
          });
          await prisma.session.update({
            where: { id: sessionId },
            data: { calendarEventId: recreated.eventId },
          });
        }
      } else {
        const created = await createCalendarEvent(connection, {
          summary: `Сесія з ${session.client.name}`,
          startAt: session.startAt,
          endAt: session.endAt,
        });
        await prisma.session.update({ where: { id: sessionId }, data: { calendarEventId: created.eventId } });
      }
    } catch (error) {
      console.error(`[integrations] calendar event update failed for session ${sessionId}:`, error);
      pending = true;
    }
  }

  if (session.meetingProvider !== "NONE") {
    const provider = getMeetingProvider(session.meetingProvider);
    if (provider) {
      try {
        await provider.update(toMeetingSession(session), session.psychologistId);
      } catch (error) {
        console.error(`[integrations] meeting update failed for session ${sessionId}:`, error);
        pending = true;
      }
    }
  }

  await prisma.session.update({ where: { id: sessionId }, data: { syncPending: pending } });
}

/**
 * Deletes the calendar event and any meeting, best-effort. Called for both
 * a manual cancellation and an auto-cancellation (e.g. an unpaid PENDING
 * hold expiring) since both go through cancelSession's generic
 * PENDING/CONFIRMED -> CANCELLED transition.
 */
export async function syncSessionCancelled(sessionId: string): Promise<void> {
  const session = await loadSession(sessionId);
  if (!session) return;

  let pending = false;

  if (session.calendarEventId) {
    const connection = await getConnection(session.psychologistId, "GOOGLE");
    if (connection && connection.status === "ACTIVE") {
      try {
        await deleteCalendarEvent(connection, session.calendarEventId);
        await prisma.session.update({ where: { id: sessionId }, data: { calendarEventId: null } });
      } catch (error) {
        console.error(`[integrations] calendar event delete failed for session ${sessionId}:`, error);
        pending = true;
      }
    }
  }

  if (session.meetingProvider !== "NONE") {
    const provider = getMeetingProvider(session.meetingProvider);
    if (provider) {
      try {
        await provider.delete(toMeetingSession(session), session.psychologistId);
      } catch (error) {
        console.error(`[integrations] meeting delete failed for session ${sessionId}:`, error);
        pending = true;
      }
    }
  }

  await prisma.session.update({ where: { id: sessionId }, data: { syncPending: pending } });
}

/**
 * Creates a meeting via the psychologist's current default provider when a
 * session becomes CONFIRMED. Once created, the meeting belongs to the
 * session (meetingProvider is stored on it) — later default-provider
 * changes don't touch it (design.md meeting-links).
 */
/**
 * Retries whichever sync step is outstanding for a session with
 * syncPending = true — shared by the cron reconciliation pass and the
 * psychologist-facing "retry" action on the session detail page.
 */
export async function retrySessionSync(sessionId: string): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { status: true, calendarEventId: true, meetingProvider: true },
  });
  if (!session) return;

  if (session.status === "CANCELLED") {
    await syncSessionCancelled(sessionId);
  } else if (!session.calendarEventId) {
    await syncSessionCreated(sessionId);
  } else if (session.status === "CONFIRMED" && session.meetingProvider === "NONE") {
    await syncSessionConfirmed(sessionId);
  } else {
    await syncSessionRescheduled(sessionId);
  }
}

export async function syncSessionConfirmed(sessionId: string): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      calendarEventId: true,
      meetingProvider: true,
      meetingExternalId: true,
      psychologistId: true,
      client: { select: { name: true } },
      psychologist: { select: { defaultMeetingProvider: true } },
    },
  });
  if (!session || session.meetingProvider !== "NONE") return;

  const defaultProvider = session.psychologist.defaultMeetingProvider;
  if (defaultProvider === "NONE") return;

  const provider = getMeetingProvider(defaultProvider);
  if (!provider) return;

  try {
    const result = await provider.create(toMeetingSession(session), session.psychologistId);
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        meetingProvider: defaultProvider,
        meetingUrl: result.joinUrl,
        meetingExternalId: result.externalId,
        ...(result.calendarEventId ? { calendarEventId: result.calendarEventId } : {}),
        syncPending: false,
      },
    });
  } catch (error) {
    console.error(`[integrations] meeting create failed for session ${sessionId}:`, error);
    await prisma.session.update({ where: { id: sessionId }, data: { syncPending: true } });
  }
}
