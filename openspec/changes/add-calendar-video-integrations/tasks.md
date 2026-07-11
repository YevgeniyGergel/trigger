# Tasks

## 1. Schema & foundation

- [ ] 1.1 Add Prisma enums (`IntegrationProvider`, `MeetingProviderType`), `IntegrationConnection` model, `Psychologist.defaultMeetingProvider`, and `Session` fields (`calendarEventId`, `meetingProvider`, `meetingUrl`, `meetingExternalId`, `syncPending`); create migration
- [ ] 1.2 Add env vars (`GOOGLE_CLIENT_ID/SECRET`, `ZOOM_CLIENT_ID/SECRET`, `MS_CLIENT_ID/SECRET`, `INTEGRATIONS_REDIRECT_BASE_URL`) to env validation/example files
- [ ] 1.3 Create `src/lib/integrations/connections.ts`: load/save connections with token encryption via `src/lib/crypto.ts`, shared `oauthFetch()` with token refresh and `EXPIRED` status handling (+ unit tests for refresh logic)

## 2. OAuth connect/disconnect

- [ ] 2.1 Implement `src/app/api/integrations/[provider]/connect/route.ts` — build consent URL with signed CSRF `state` for Google, Zoom, Microsoft
- [ ] 2.2 Implement `src/app/api/integrations/[provider]/callback/route.ts` — validate state, exchange code, fetch account email, upsert encrypted connection, redirect to `/settings` (with error param on denial)
- [ ] 2.3 Add disconnect server action (best-effort token revocation + delete connection + reset `defaultMeetingProvider` if it pointed at the disconnected provider, incl. `GOOGLE_MEET` on Google disconnect; exported calendar events are left in place)

## 3. Google Calendar sync

- [ ] 3.1 Implement `src/lib/integrations/google-calendar.ts`: create/update/delete event, `freeBusy` query
- [ ] 3.2 Hook event create/update/delete into booking (`src/app/[slug]/actions.ts`) and session lifecycle actions (`src/app/(cabinet)/sessions/actions.ts`), best-effort with `syncPending` flag on failure; treat 404/410 on stale event ids as success (clear the id, recreate on reschedule)
- [ ] 3.3 Add busy-interval source to slot computation (`src/lib/slots.ts` / `slot-conflict.ts`) with ~60 s cache, Trigger-event exclusion, and graceful degradation on API failure (+ unit tests)
- [ ] 3.4 Re-check busy intervals uncached at booking submission; reject with existing "slot taken" error on overlap
- [ ] 3.5 Add `syncPending` reconciliation pass to the cron route (`src/app/api/cron/reminders/route.ts` or a sibling route)

## 4. Meeting providers

- [ ] 4.1 Define `MeetingProvider` interface and provider registry in `src/lib/integrations/meetings.ts`
- [ ] 4.2 Implement Zoom provider (create/update/delete meeting via Zoom REST API)
- [ ] 4.3 Implement Teams provider (Microsoft Graph `onlineMeetings`)
- [ ] 4.4 Implement Google Meet provider (set `conferenceData` on the session's calendar event)
- [ ] 4.5 Hook meeting create/update/delete into confirm/reschedule/cancel lifecycle; store `meetingUrl`/`meetingExternalId`; failures log + set `syncPending` and surface a retry action on the session page

## 5. Settings UI

- [ ] 5.1 Add "Integrations" section to `src/app/(cabinet)/settings/`: connect/disconnect cards for Google Calendar, Zoom, Teams showing connected account email and status (incl. `EXPIRED` warning)
- [ ] 5.2 Add default meeting provider selector (only connected providers selectable; Meet disabled with hint when no Google connection) + server action with validation

## 6. Link delivery & polish

- [ ] 6.1 Include meeting link in booking confirmation and reminder templates in `src/lib/notifications.ts` (email + Telegram), omitted when absent
- [ ] 6.2 Show "Join meeting" link on the client session status page (`src/app/session/[sessionId]/`) and the psychologist session detail page (`src/app/(cabinet)/sessions/[id]/`)
- [ ] 6.3 Run full test suite, typecheck, and verify end-to-end flows (connect → book → confirm → reschedule → cancel) against provider sandboxes/test accounts
