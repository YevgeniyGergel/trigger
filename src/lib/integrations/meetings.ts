import type { MeetingProviderType } from "@prisma/client";
import { getConnection } from "./connections";
import { createCalendarEvent, updateCalendarEvent, CalendarEventNotFoundError } from "./google-calendar";
import { createZoomMeeting, updateZoomMeeting, deleteZoomMeeting } from "./zoom";

export type MeetingSession = {
  id: string;
  startAt: Date;
  endAt: Date;
  calendarEventId: string | null;
  meetingExternalId: string | null;
  clientName: string;
};

export type MeetingCreateResult = {
  joinUrl: string;
  externalId: string;
  // Set when the provider created or attached to a Google Calendar event —
  // the caller persists this back onto the session's calendarEventId.
  calendarEventId?: string;
};

export class MeetingProviderNotConnectedError extends Error {}

/**
 * Pluggable meeting-creation interface (design.md D3): session lifecycle
 * code only ever calls through this, so adding a provider later (e.g.
 * Microsoft Teams) means implementing this interface and registering it
 * below — no changes to confirm/reschedule/cancel call sites.
 */
export interface MeetingProvider {
  create(session: MeetingSession, psychologistId: string): Promise<MeetingCreateResult>;
  update(session: MeetingSession, psychologistId: string): Promise<{ calendarEventId?: string } | void>;
  delete(session: MeetingSession, psychologistId: string): Promise<void>;
}

const googleMeetProvider: MeetingProvider = {
  // Google Meet has no meeting of its own — it's conferenceData on the
  // session's calendar event. If the event already exists (created by the
  // calendar-sync hook when the session was booked), attach conferenceData
  // to it; otherwise create a fresh event that carries both.
  async create(session, psychologistId) {
    const connection = await getConnection(psychologistId, "GOOGLE");
    if (!connection || connection.status !== "ACTIVE") {
      throw new MeetingProviderNotConnectedError("GOOGLE");
    }

    if (session.calendarEventId) {
      try {
        const updated = await updateCalendarEvent(connection, session.calendarEventId, {
          startAt: session.startAt,
          endAt: session.endAt,
          withMeet: true,
        });
        if (updated.meetUrl) {
          return { joinUrl: updated.meetUrl, externalId: updated.eventId, calendarEventId: updated.eventId };
        }
      } catch (error) {
        if (!(error instanceof CalendarEventNotFoundError)) {
          throw error;
        }
        // Stale event id — fall through and create a fresh one below.
      }
    }

    const created = await createCalendarEvent(connection, {
      summary: `Сесія з ${session.clientName}`,
      startAt: session.startAt,
      endAt: session.endAt,
      withMeet: true,
    });
    if (!created.meetUrl) {
      throw new Error("Google Calendar event was created without a Meet link");
    }
    return { joinUrl: created.meetUrl, externalId: created.eventId, calendarEventId: created.eventId };
  },

  async update(session, psychologistId) {
    const connection = await getConnection(psychologistId, "GOOGLE");
    if (!connection || connection.status !== "ACTIVE") {
      throw new MeetingProviderNotConnectedError("GOOGLE");
    }
    if (!session.calendarEventId) {
      throw new Error("Cannot update a Google Meet link without a linked calendar event");
    }
    await updateCalendarEvent(connection, session.calendarEventId, {
      startAt: session.startAt,
      endAt: session.endAt,
      withMeet: true,
    });
  },

  // The calendar event (and its conferenceData) is deleted by the
  // google-calendar-sync cancellation hook — nothing separate to clean up.
  async delete() {},
};

const zoomProvider: MeetingProvider = {
  async create(session, psychologistId) {
    const connection = await getConnection(psychologistId, "ZOOM");
    if (!connection || connection.status !== "ACTIVE") {
      throw new MeetingProviderNotConnectedError("ZOOM");
    }
    const meeting = await createZoomMeeting(connection, {
      topic: `Сесія з ${session.clientName}`,
      startAt: session.startAt,
      endAt: session.endAt,
    });
    return { joinUrl: meeting.joinUrl, externalId: meeting.meetingId };
  },

  async update(session, psychologistId) {
    const connection = await getConnection(psychologistId, "ZOOM");
    if (!connection || connection.status !== "ACTIVE") {
      throw new MeetingProviderNotConnectedError("ZOOM");
    }
    if (!session.meetingExternalId) {
      throw new Error("Cannot update a Zoom meeting without a stored meeting id");
    }
    await updateZoomMeeting(connection, session.meetingExternalId, {
      startAt: session.startAt,
      endAt: session.endAt,
    });
  },

  async delete(session, psychologistId) {
    const connection = await getConnection(psychologistId, "ZOOM");
    if (!connection || connection.status !== "ACTIVE" || !session.meetingExternalId) {
      return;
    }
    await deleteZoomMeeting(connection, session.meetingExternalId);
  },
};

const REGISTRY: Partial<Record<MeetingProviderType, MeetingProvider>> = {
  GOOGLE_MEET: googleMeetProvider,
  ZOOM: zoomProvider,
};

export function getMeetingProvider(type: MeetingProviderType): MeetingProvider | null {
  return REGISTRY[type] ?? null;
}
