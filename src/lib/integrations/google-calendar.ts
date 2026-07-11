import { randomUUID } from "node:crypto";
import type { DateRange } from "@/lib/slots";
import { oauthFetch, type Connection } from "./connections";

const EVENTS_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";

export class CalendarEventNotFoundError extends Error {}

export type CalendarEventResult = {
  eventId: string;
  meetUrl: string | null;
};

function toGoogleDateTime(date: Date) {
  return { dateTime: date.toISOString(), timeZone: "UTC" };
}

// Google returns the Meet link as one of possibly several conferenceData
// entryPoints; the "video" entry point is the join URL.
function extractMeetUrl(event: {
  conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
}): string | null {
  const entry = event.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video");
  return entry?.uri ?? null;
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function createCalendarEvent(
  connection: Connection,
  params: { summary: string; description?: string; startAt: Date; endAt: Date; withMeet?: boolean }
): Promise<CalendarEventResult> {
  const body: Record<string, unknown> = {
    summary: params.summary,
    description: params.description,
    start: toGoogleDateTime(params.startAt),
    end: toGoogleDateTime(params.endAt),
  };

  let url = EVENTS_BASE;
  if (params.withMeet) {
    body.conferenceData = { createRequest: { requestId: randomUUID() } };
    url = `${EVENTS_BASE}?conferenceDataVersion=1`;
  }

  const response = await oauthFetch(connection, url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Google Calendar event create failed (${response.status}): ${await readErrorBody(response)}`);
  }

  const json = (await response.json()) as { id: string; conferenceData?: unknown };
  return { eventId: json.id, meetUrl: extractMeetUrl(json as Parameters<typeof extractMeetUrl>[0]) };
}

/**
 * Updates an existing event. Throws CalendarEventNotFoundError on 404/410 —
 * per design.md, callers treat a stale event id (e.g. after reconnecting a
 * different Google account) as "clear the id and recreate" rather than an
 * error.
 */
export async function updateCalendarEvent(
  connection: Connection,
  eventId: string,
  params: { summary?: string; startAt: Date; endAt: Date; withMeet?: boolean }
): Promise<CalendarEventResult> {
  const body: Record<string, unknown> = {
    start: toGoogleDateTime(params.startAt),
    end: toGoogleDateTime(params.endAt),
    ...(params.summary ? { summary: params.summary } : {}),
  };

  let url = `${EVENTS_BASE}/${eventId}`;
  if (params.withMeet) {
    body.conferenceData = { createRequest: { requestId: randomUUID() } };
    url += "?conferenceDataVersion=1";
  }

  const response = await oauthFetch(connection, url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.status === 404 || response.status === 410) {
    throw new CalendarEventNotFoundError(eventId);
  }
  if (!response.ok) {
    throw new Error(`Google Calendar event update failed (${response.status}): ${await readErrorBody(response)}`);
  }

  const json = (await response.json()) as { id: string; conferenceData?: unknown };
  return { eventId: json.id, meetUrl: extractMeetUrl(json as Parameters<typeof extractMeetUrl>[0]) };
}

/** No-op (success) on 404/410 — the event is already gone either way. */
export async function deleteCalendarEvent(connection: Connection, eventId: string): Promise<void> {
  const response = await oauthFetch(connection, `${EVENTS_BASE}/${eventId}`, { method: "DELETE" });
  if (response.ok || response.status === 404 || response.status === 410) {
    return;
  }
  throw new Error(`Google Calendar event delete failed (${response.status}): ${await readErrorBody(response)}`);
}

export async function fetchBusyIntervals(connection: Connection, timeMin: Date, timeMax: Date): Promise<DateRange[]> {
  const response = await oauthFetch(connection, FREEBUSY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: "primary" }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Google Calendar freeBusy failed (${response.status}): ${await readErrorBody(response)}`);
  }

  const json = (await response.json()) as {
    calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
  };
  const busy = json.calendars?.primary?.busy ?? [];
  return busy.map((interval) => ({ startAt: new Date(interval.start), endAt: new Date(interval.end) }));
}
