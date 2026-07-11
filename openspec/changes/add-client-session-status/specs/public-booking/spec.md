## ADDED Requirements

### Requirement: Client Session Status Page
The system SHALL provide a public, unauthenticated, read-only page at `/session/[sessionId]` showing the current status of a single session, identified by the session's id.

#### Scenario: View session status
- **WHEN** a client opens `/session/[sessionId]` for an existing session
- **THEN** the system displays the psychologist's name, the session date/time (in the visitor's browser timezone, labeled when it differs from Europe/Kyiv), the session status (pending/confirmed/cancelled/completed), and the payment status; a reschedule is reflected as the updated date/time, not a separate status

#### Scenario: Unknown session id
- **WHEN** a visitor opens `/session/[sessionId]` for an id that does not correspond to any session
- **THEN** the system shows a not-found state without leaking whether other session ids exist

#### Scenario: Page reflects cancellation or reschedule
- **WHEN** a psychologist cancels or reschedules a session after the client has received the status page link
- **THEN** the page shows the updated status and, for a reschedule, the new date/time
