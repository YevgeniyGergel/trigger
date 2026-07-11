# Design: Google Calendar sync + video conferencing integrations

## Context

Trigger is a Next.js (App Router) + Prisma/PostgreSQL cabinet for psychologists. Sessions are booked publicly (`src/app/[slug]/`), managed in the cabinet (`src/app/(cabinet)/sessions/`), and slot availability is computed in `src/lib/slots.ts` / `src/lib/slot-conflict.ts` from working hours, blocked ranges, and existing sessions. Per-psychologist secrets (LiqPay private key) are already encrypted at the application level via `src/lib/crypto.ts`. Notifications (email + Telegram) go through `src/lib/notifications.ts`. There is an existing cron route (`src/app/api/cron/reminders/`) we can pattern-match for background reconciliation.

## Goals / Non-Goals

**Goals:**
- One Google account per psychologist, connected via OAuth, tokens encrypted at rest.
- Export session lifecycle (create/reschedule/cancel) to Google Calendar; import busy intervals into slot computation.
- Automatic meeting links (Google Meet, Zoom, Microsoft Teams) behind a pluggable provider interface.
- Graceful degradation: no external API failure may block booking, confirmation, reschedule, or cancellation.

**Non-Goals:**
- Syncing multiple calendars per account or non-primary calendars (v1 uses the primary calendar).
- Importing external events as Trigger sessions (busy intervals only).
- Client-side calendar connections (clients get an `.ics`-style link at most — actually out of scope entirely for v1).
- Zoom/Teams webhooks (meeting started/ended tracking).

## Decisions

### D1: One `IntegrationConnection` table for all providers
A single model keyed by `(psychologistId, provider)` with `provider ∈ {GOOGLE, ZOOM, TEAMS}`, encrypted `accessTokenEnc` / `refreshTokenEnc`, `expiresAt`, `externalAccountEmail`, and a `status` field. Alternative — separate tables per provider — rejected: the shape is identical (OAuth token pair + metadata) and a single table keeps the settings UI and token-refresh code generic.

### D2: REST via `fetch`, no provider SDKs
Google Calendar, Zoom, and Microsoft Graph are all called with plain `fetch` wrappers in `src/lib/integrations/` (`google-calendar.ts`, `zoom.ts`, `teams.ts`). Alternative — `googleapis` npm package — rejected: it's heavy (~10 MB), brings its own auth plumbing, and we need ~6 endpoints total. A shared `oauthFetch()` helper handles token refresh (refresh on 401 or when `expiresAt` is near, persist the new token).

### D3: Meeting providers behind a `MeetingProvider` interface
```ts
interface MeetingProvider {
  create(session, connection): Promise<{ joinUrl: string; externalId: string }>;
  update(session, connection): Promise<void>;
  delete(session, connection): Promise<void>;
}
```
Registered in a map keyed by the `MeetingProviderType` enum. Google Meet is a special case: it doesn't create a standalone meeting but sets `conferenceData` on the session's calendar event — implemented as a provider whose `create` delegates to the calendar-event code. Session lifecycle code only ever calls the interface.

### D4: Sync is best-effort inline + reconciled by cron
Calendar event and meeting operations run inline (fire after the DB write inside the same server action), wrapped in try/catch — a failure logs and sets a `syncPending` flag on the session rather than throwing. The existing cron route gains a reconciliation pass that retries sessions with `syncPending = true`. Alternative — a proper job queue — rejected as overkill for current scale; the flag + cron gives at-least-once semantics with no new infrastructure.

### D5: Free/busy with short cache and a booking-time re-check
Slot computation calls Google's `freeBusy` endpoint for the visible window, cached in-memory ~60 s per psychologist. Trigger-created events are excluded by subtracting intervals that exactly match existing session intervals (cheap and sufficient since Trigger events are also sessions we already subtract). On booking submission the busy check is repeated uncached; overlap → reject with the existing "slot taken" error path. On lookup failure, degrade to Trigger-only data (availability may briefly overbook against personal events — accepted trade-off, see risks).

### D6: Schema changes
- `enum IntegrationProvider { GOOGLE, ZOOM, TEAMS }`, `enum MeetingProviderType { NONE, GOOGLE_MEET, ZOOM, TEAMS }`
- `model IntegrationConnection` as in D1, `@@unique([psychologistId, provider])`
- `Psychologist.defaultMeetingProvider MeetingProviderType @default(NONE)`
- `Session`: `calendarEventId String?`, `meetingProvider MeetingProviderType @default(NONE)`, `meetingUrl String?`, `meetingExternalId String?`, `syncPending Boolean @default(false)`

### D7: OAuth routes
`src/app/api/integrations/[provider]/connect/route.ts` (redirect to consent, `state` = signed psychologist id + CSRF nonce) and `.../callback/route.ts` (code exchange, token encryption, upsert connection, redirect to `/settings`). Mirrors the Telegram-linking redirect pattern already in settings. Env vars: `GOOGLE_CLIENT_ID/SECRET`, `ZOOM_CLIENT_ID/SECRET`, `MS_CLIENT_ID/SECRET`, plus `INTEGRATIONS_REDIRECT_BASE_URL`.

## Risks / Trade-offs

- [Token refresh failure / revoked access] → connection marked `status = EXPIRED`, psychologist notified in Settings; sync silently pauses instead of erroring bookings.
- [Free/busy degradation can allow a double-booking against a personal event] → accepted for v1; failures are logged and the psychologist still sees the session in Trigger and can reschedule.
- [Google verification for Calendar scopes (restricted-ish review, consent screen)] → start in "testing" mode for development; production requires Google app verification — flagged as a deployment prerequisite, not a code task.
- [Teams `onlineMeetings` requires work/school accounts] → personal Microsoft accounts may fail; surface a clear error in Settings on connect.
- [Inline sync adds latency to booking actions] → calls are bounded by short timeouts (~5 s) and failures fall back to `syncPending`.

## Migration Plan

1. Additive Prisma migration (new enums, table, nullable columns) — no backfill needed; existing sessions simply have no calendar event/meeting.
2. Deploy with all provider env vars optional: an unset provider just hides its connect button.
3. Rollback: revert deploy; the new columns are unused and harmless.

## Resolved Questions

- PENDING sessions appear in Google Calendar from creation time (keeps the slot visibly held); decline/expiry goes through the cancellation path and deletes the event.
- Zoom app type: standard per-user OAuth app, since each psychologist has their own Zoom account.
- Sync is strictly one-way (Trigger → Google). Manual edits to Trigger events in Google are not read back and may be overwritten; a manually moved Trigger event just becomes a regular busy interval at its new time. On account switch, update/delete calls hitting a stale event id treat 404/410 as success, clear the id, and recreate the event where applicable.
