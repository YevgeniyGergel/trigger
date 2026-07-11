# google-calendar-sync

## ADDED Requirements

### Requirement: Psychologist can connect a Google account
The system SHALL let a psychologist connect exactly one Google account from the Settings page via OAuth 2.0 (authorization code flow with offline access). Access and refresh tokens MUST be stored encrypted at the application level. The system SHALL request only the minimal scopes needed for event management and free/busy lookup.

#### Scenario: Successful connection
- **WHEN** the psychologist clicks "Connect Google Calendar" and completes Google consent
- **THEN** the system stores the encrypted tokens, marks the connection active, and the Settings page shows the connected Google account email

#### Scenario: Consent denied
- **WHEN** the psychologist cancels or denies the Google consent screen
- **THEN** the system stores nothing and the Settings page shows an error message with no connection created

#### Scenario: Disconnect
- **WHEN** the psychologist clicks "Disconnect" on an active Google connection
- **THEN** the system revokes the token with Google (best effort), deletes the stored tokens, and stops all calendar sync for that psychologist; events already exported remain in the Google calendar untouched

#### Scenario: Reconnect with a different Google account
- **WHEN** the psychologist disconnects and later connects a different Google account, and a session with a calendar event id from the old account is rescheduled or cancelled
- **THEN** the update/delete against the new account fails with "not found", which the system treats as success: the stale event id is cleared and (on reschedule) a fresh event is created in the new calendar

### Requirement: Sessions are exported to Google Calendar
The system SHALL create a Google Calendar event on the psychologist's primary calendar when a session is created (PENDING or CONFIRMED), storing the event id on the session. The event MUST reflect the session time in the correct timezone and reference the client by name. When the session is rescheduled the event MUST be updated; when the session is cancelled — including a pending session that is declined or expires unpaid — the event MUST be deleted. Sync is strictly one-way (Trigger → Google): the system does not read back manual edits to Trigger-created events, and such edits MAY be overwritten on the next lifecycle change.

#### Scenario: Event created on booking
- **WHEN** a client books a session and the psychologist has an active Google connection
- **THEN** a calendar event is created for the session interval and its id is saved on the session record

#### Scenario: Event updated on reschedule
- **WHEN** a session with a linked calendar event is rescheduled
- **THEN** the calendar event's start and end times are updated to the new interval

#### Scenario: Event removed on cancellation
- **WHEN** a session with a linked calendar event is cancelled
- **THEN** the calendar event is deleted from the psychologist's calendar

#### Scenario: Calendar API failure does not block booking
- **WHEN** the Google Calendar API call fails during booking, reschedule, or cancellation
- **THEN** the session operation still succeeds, the failure is logged, and the sync is retried on the next lifecycle change or by a background reconciliation

#### Scenario: Manual edit of a Trigger event in Google
- **WHEN** the psychologist moves a Trigger-created event to a different time directly in Google Calendar
- **THEN** the Trigger session keeps its original time; the moved event is treated like any other busy interval, and a later reschedule/cancellation in Trigger overwrites or deletes the event

### Requirement: Google Calendar busy intervals block booking slots
The system SHALL treat busy intervals from the connected Google Calendar as unavailable when computing public booking slots, in addition to existing sessions, working hours, and blocked ranges. Events created by Trigger itself MUST NOT double-count. Busy data SHALL be cached briefly to keep the booking page fast.

#### Scenario: External event blocks a slot
- **WHEN** the psychologist has a personal Google Calendar event from 14:00 to 15:00 on a working day
- **THEN** the public booking page does not offer slots overlapping 14:00–15:00

#### Scenario: Free/busy lookup fails
- **WHEN** the Google free/busy request fails or times out
- **THEN** the booking page still renders slots computed from Trigger's own data only, and the failure is logged

#### Scenario: Booking race against a new external event
- **WHEN** a client submits a booking for a slot that has become busy in Google Calendar since the page loaded
- **THEN** the system re-checks busy intervals at submission time and rejects the booking with a "slot no longer available" error
