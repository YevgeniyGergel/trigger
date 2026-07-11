# meeting-links

## ADDED Requirements

### Requirement: Psychologist can connect video providers and choose a default
The system SHALL let a psychologist connect a Zoom account via OAuth 2.0 from the Settings page, with tokens stored encrypted at the application level. Google Meet SHALL be available automatically when a Google Calendar connection is active, without a separate connection. The psychologist SHALL choose a default meeting provider (`NONE`, `GOOGLE_MEET`, `ZOOM`); only providers with an active connection MUST be selectable, and `NONE` MUST be the initial default. The provider architecture MUST remain pluggable so additional providers (e.g., Microsoft Teams) can be added later without changing session lifecycle code.

#### Scenario: Connect Zoom
- **WHEN** the psychologist completes the Zoom OAuth consent
- **THEN** the system stores encrypted tokens and Zoom becomes selectable as the default provider

#### Scenario: Meet requires Calendar connection
- **WHEN** the psychologist has no active Google Calendar connection
- **THEN** Google Meet is shown as unavailable with a hint to connect Google Calendar first

#### Scenario: Disconnecting the active default provider
- **WHEN** the psychologist disconnects the provider currently set as default
- **THEN** the default provider resets to `NONE` and future sessions get no meeting link

#### Scenario: Disconnecting Google Calendar while Meet is default
- **WHEN** the default provider is `GOOGLE_MEET` and the psychologist disconnects Google Calendar
- **THEN** the default provider resets to `NONE`, since Meet has no connection of its own — it rides on the Google Calendar connection

### Requirement: A meeting is created automatically for confirmed sessions
The system SHALL create a meeting via the default provider when a session becomes CONFIRMED, storing the provider, join URL, and external meeting id on the session. The meeting SHALL span the session's full `startAt`–`endAt` interval (the slot including the break). Once created, the meeting belongs to the session: later changes to the psychologist's default provider MUST NOT affect it, and reschedule/cancellation MUST operate through the session's own stored provider. On reschedule the meeting time MUST be updated (or the meeting recreated); on cancellation the meeting MUST be deleted (best effort). Provider integrations MUST be implemented behind a common interface so new providers can be added without changing the session lifecycle code.

#### Scenario: Meeting created on confirmation
- **WHEN** a session is confirmed and the psychologist's default provider is Zoom
- **THEN** a Zoom meeting is created for the session interval and its join URL is stored on the session

#### Scenario: Google Meet via calendar event
- **WHEN** a session is confirmed and the default provider is Google Meet
- **THEN** the session's Google Calendar event is created or updated with conference data and the Meet link is stored on the session

#### Scenario: Provider API failure does not block confirmation
- **WHEN** the provider API fails while creating a meeting
- **THEN** the session is still confirmed, the failure is logged, and the psychologist sees a warning on the session page with a retry action

#### Scenario: No default provider
- **WHEN** a session is confirmed and the default provider is `NONE`
- **THEN** no meeting is created and no meeting link is shown anywhere

#### Scenario: Changing the default does not touch existing meetings
- **WHEN** a confirmed session has a Zoom meeting and the psychologist switches the default provider to Google Meet, then reschedules that session
- **THEN** the session's Zoom meeting is updated to the new time; only sessions confirmed after the switch get Meet links

### Requirement: The meeting link is delivered to both parties
The system SHALL include the meeting join URL, when present, in booking confirmation and session reminder notifications (email and Telegram), on the client-facing session status page, and on the psychologist's session detail page.

#### Scenario: Link in reminder
- **WHEN** a session reminder is sent for a session that has a meeting URL
- **THEN** the email and Telegram messages contain the join link

#### Scenario: Link on client status page
- **WHEN** a client opens the session status page for a confirmed session with a meeting URL
- **THEN** the page shows a prominent "Join meeting" link

#### Scenario: No link for sessions without a meeting
- **WHEN** a session has no meeting URL
- **THEN** notifications and pages render without any meeting section
