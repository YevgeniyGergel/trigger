import { oauthFetch, type Connection } from "./connections";

const MEETINGS_BASE = "https://api.zoom.us/v2/users/me/meetings";

export class ZoomMeetingNotFoundError extends Error {}

export type ZoomMeetingResult = {
  meetingId: string;
  joinUrl: string;
};

async function readErrorBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function createZoomMeeting(
  connection: Connection,
  params: { topic: string; startAt: Date; endAt: Date }
): Promise<ZoomMeetingResult> {
  const durationMinutes = Math.round((params.endAt.getTime() - params.startAt.getTime()) / 60_000);

  const response = await oauthFetch(connection, MEETINGS_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: params.topic,
      type: 2, // scheduled meeting
      start_time: params.startAt.toISOString(),
      duration: durationMinutes,
      timezone: "UTC",
      settings: { join_before_host: true, waiting_room: true },
    }),
  });
  if (!response.ok) {
    throw new Error(`Zoom meeting create failed (${response.status}): ${await readErrorBody(response)}`);
  }

  const json = (await response.json()) as { id: number; join_url: string };
  return { meetingId: String(json.id), joinUrl: json.join_url };
}

/**
 * Throws ZoomMeetingNotFoundError on 404 — mirrors the Google Calendar
 * stale-event handling (design.md), though for Zoom this only comes up if
 * the meeting was deleted directly in the Zoom app.
 */
export async function updateZoomMeeting(
  connection: Connection,
  meetingId: string,
  params: { startAt: Date; endAt: Date }
): Promise<void> {
  const durationMinutes = Math.round((params.endAt.getTime() - params.startAt.getTime()) / 60_000);

  const response = await oauthFetch(connection, `https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start_time: params.startAt.toISOString(),
      duration: durationMinutes,
      timezone: "UTC",
    }),
  });

  if (response.status === 404) {
    throw new ZoomMeetingNotFoundError(meetingId);
  }
  if (!response.ok && response.status !== 204) {
    throw new Error(`Zoom meeting update failed (${response.status}): ${await readErrorBody(response)}`);
  }
}

export async function deleteZoomMeeting(connection: Connection, meetingId: string): Promise<void> {
  const response = await oauthFetch(connection, `https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: "DELETE",
  });
  if (response.ok || response.status === 204 || response.status === 404) {
    return;
  }
  throw new Error(`Zoom meeting delete failed (${response.status}): ${await readErrorBody(response)}`);
}
