## MODIFIED Requirements

### Requirement: Booking Confirmation Notification
The system SHALL notify both the psychologist and the client through their configured channels when a session is booked. The notification to the client SHALL include a link to the session's public status page.

#### Scenario: New booking notifies psychologist
- **WHEN** a client successfully books a session via the public booking page
- **THEN** the system sends a notification to the psychologist with the client's name and requested time

#### Scenario: New booking confirms to client
- **WHEN** a booking is created
- **THEN** the system sends a confirmation notification to the client with session date, time, status, and a link to the session's public status page (`/session/[sessionId]`)

### Requirement: Session Reminder Notification
The system SHALL send an automated reminder to the client a configurable number of hours before a confirmed session. The reminder SHALL include a link to the session's public status page.

#### Scenario: Reminder sent before session
- **WHEN** the configured reminder lead time before a confirmed session is reached
- **THEN** the system sends a reminder notification to the client through their configured channel(s), including a link to the session's public status page

#### Scenario: Cancelled session does not trigger reminder
- **WHEN** a session is cancelled before the reminder lead time is reached
- **THEN** the system does not send a reminder for that session

## ADDED Requirements

### Requirement: Session Change Notification
The system SHALL notify the client through their configured channels when the psychologist cancels or reschedules their session, including a link to the session's public status page.

#### Scenario: Psychologist cancels a session
- **WHEN** a psychologist cancels a pending or confirmed session
- **THEN** the system sends a cancellation notification to the client with a link to the session's public status page

#### Scenario: Psychologist reschedules a session
- **WHEN** a psychologist reschedules a session to a new date/time
- **THEN** the system sends a notification to the client with the new date/time and a link to the session's public status page

#### Scenario: Unpaid session expires automatically
- **WHEN** a pending session is cancelled automatically because its unpaid hold expired (prepayment confirmation mode)
- **THEN** the system sends the client a cancellation notification that explains the hold expired and includes a link to the session's public status page
