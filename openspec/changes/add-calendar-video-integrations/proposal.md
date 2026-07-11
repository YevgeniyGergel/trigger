# Add Google Calendar sync and video conferencing integrations

## Why

Psychologists currently manage their Trigger schedule in isolation: sessions booked through the platform don't appear in their personal calendar, and personal appointments don't block Trigger slots — leading to double-bookings and manual copying. Online sessions also have no meeting link: psychologists create Zoom/Meet links by hand and send them to clients themselves, which is the single most repetitive step of every booking.

## What Changes

- **Google Calendar connection (per psychologist)**: OAuth 2.0 flow from the Settings page to connect a Google account; tokens stored encrypted (same application-level encryption pattern as LiqPay keys).
- **Calendar sync (one-way export + busy import)**:
  - Sessions created/confirmed in Trigger are pushed to the connected Google Calendar as events; reschedules update the event, cancellations remove it. Manual edits to these events in Google are not read back.
  - Busy intervals from the connected calendar are treated like blocked ranges when computing available booking slots, preventing double-booking.
- **Video conferencing integration**: a session automatically gets a meeting link at confirmation time, based on the psychologist's chosen provider:
  - **Google Meet** — via the Calendar event's `conferenceData` (no extra connection needed once Calendar is linked).
  - **Zoom** — per-psychologist OAuth connection, meeting created via Zoom API.
  - **Microsoft Teams** — per-psychologist OAuth connection, meeting created via Microsoft Graph `onlineMeetings`.
  - Provider architecture is pluggable so more providers can be added later.
- **Meeting link surfaced everywhere it matters**: booking confirmation and reminder notifications (email + Telegram), the client-facing session status page, and the psychologist's session detail page.
- **Settings UI**: a new "Integrations" section for connecting/disconnecting Google Calendar, Zoom, and Teams, and choosing the default meeting provider (or "no online meeting").

## Capabilities

### New Capabilities

- `google-calendar-sync`: connecting a Google account, exporting Trigger sessions to Google Calendar (create/update/delete), and importing busy intervals into slot availability.
- `meeting-links`: connecting video providers (Zoom, Teams; Meet via Calendar), automatic meeting creation/cancellation for sessions, and delivery of the link to psychologist and client.

### Modified Capabilities

<!-- No main specs exist yet in openspec/specs/, so there are no requirement-level modifications — availability and notification behavior changes are captured inside the new capability specs. -->

## Impact

- **Schema (Prisma)**: new `IntegrationConnection` model (provider, encrypted tokens, per-psychologist); new fields on `Session` (`meetingProvider`, `meetingUrl`, `meetingExternalId`, `calendarEventId`); new psychologist preference for default meeting provider.
- **Slot computation**: `src/lib/slots.ts` / `src/lib/slot-conflict.ts` gain a busy-interval source from Google Calendar (with caching/graceful degradation when the API is unavailable).
- **Booking & session lifecycle**: `src/app/[slug]/actions.ts`, `src/app/(cabinet)/sessions/actions.ts` — hook calendar event and meeting creation into confirm/reschedule/cancel.
- **Notifications**: `src/lib/notifications.ts` templates include the meeting link.
- **Settings**: `src/app/(cabinet)/settings/` — new integrations section + server actions; OAuth callback routes under `src/app/api/integrations/`.
- **New dependencies**: none — Google Calendar, Zoom, and Microsoft Graph are called over REST via `fetch` (see design D2); new env vars for OAuth client IDs/secrets.
- **Security**: OAuth tokens encrypted at rest via existing `src/lib/crypto.ts`; scopes kept minimal (Calendar events + free/busy; Zoom `meeting:write`; Graph `OnlineMeetings.ReadWrite`).
