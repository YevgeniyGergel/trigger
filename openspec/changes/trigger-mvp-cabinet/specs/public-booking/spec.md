## ADDED Requirements

### Requirement: Public Booking Page
The system SHALL provide a public, unauthenticated booking page at the psychologist's unique slug URL, showing available time slots based on their working hours and existing bookings.

#### Scenario: View available slots
- **WHEN** a visitor opens a psychologist's public booking page
- **THEN** the system displays only currently available (not already booked or blocked) upcoming time slots

#### Scenario: No availability
- **WHEN** a psychologist has no available slots in the visible date range
- **THEN** the system informs the visitor that no slots are currently available

### Requirement: Session Booking Submission
The system SHALL allow a visitor to book an available slot by providing their name, a required email address, and an optional phone number, without creating an account. The email is required so that notifications and fiscal receipts always have a delivery channel.

#### Scenario: Successful booking submission
- **WHEN** a visitor selects an available slot and submits a valid name and email (and optionally a phone number)
- **THEN** the system creates a session with status "pending" and links or creates the corresponding client record

#### Scenario: Booking without email rejected
- **WHEN** a visitor submits the booking form without an email address
- **THEN** the system rejects the submission with a validation error and does not create a session

#### Scenario: Slot taken concurrently
- **WHEN** two visitors attempt to book the same slot at nearly the same time
- **THEN** the system allows only the first submission to succeed and shows the second visitor an error that the slot is no longer available

### Requirement: Booking Rate Limiting
The system SHALL rate-limit booking submissions per IP address and per contact identifier to reduce spam bookings.

#### Scenario: Excessive booking attempts blocked
- **WHEN** the same IP address or contact submits more booking requests than the allowed threshold within a short time window
- **THEN** the system rejects further booking attempts until the rate limit window resets

### Requirement: Booking Confirmation Mode
The system SHALL let a psychologist choose, in their settings, how new bookings are confirmed: **manual confirmation** (default) or **prepayment required**. Prepayment mode SHALL be selectable only when the psychologist has an active payment integration. In prepayment mode, a booked session holds its slot for a configurable period (the unpaid hold); a successful payment automatically confirms the session, and a session still unpaid when the hold expires is automatically cancelled, freeing the slot. Sessions without a price (no payment amount) SHALL always follow manual confirmation regardless of the configured mode.

#### Scenario: Payment confirms the session
- **WHEN** the psychologist uses prepayment mode and the client's payment for a pending session succeeds
- **THEN** the system sets the session status to "confirmed" without requiring manual action

#### Scenario: Unpaid hold expires
- **WHEN** the psychologist uses prepayment mode and a pending session remains unpaid past the configured hold period
- **THEN** the system cancels the session automatically, frees the slot, and notifies the client

#### Scenario: Free session in prepayment mode
- **WHEN** the psychologist uses prepayment mode and a client books a service without a price
- **THEN** the session is created as "pending" with no hold deadline and awaits manual confirmation

### Requirement: Psychologist Booking Confirmation and Cancellation
The system SHALL allow the psychologist to confirm, cancel, or reschedule a pending or confirmed session from the cabinet. Rescheduling SHALL keep the session's current status (a confirmed session stays confirmed; a pending session stays pending) and SHALL validate the new time against existing sessions and blocked ranges the same way as a new booking.

#### Scenario: Confirm pending session
- **WHEN** a psychologist confirms a pending session
- **THEN** the system updates the session status to "confirmed"

#### Scenario: Cancel session
- **WHEN** a psychologist cancels a session
- **THEN** the system updates the session status to "cancelled" and frees up the corresponding time slot for future bookings

#### Scenario: Reschedule into a conflicting time rejected
- **WHEN** a psychologist reschedules a session to a time that overlaps another session or a blocked range
- **THEN** the system rejects the reschedule with a conflict error and the session keeps its original time

#### Scenario: Confirmed session completes automatically
- **WHEN** a confirmed session's end time passes without the session being cancelled
- **THEN** the system treats the session as "completed" (shown in history and calendar as completed)

### Requirement: Client-Facing Times in the Visitor's Timezone
The system SHALL display all dates and times on public client-facing pages (booking page, session status page) in the visitor's browser timezone, labeling the timezone explicitly when it differs from the psychologist's timezone (Europe/Kyiv). The client's IANA timezone SHALL be captured at booking time and stored with the client record for use in notifications.

#### Scenario: Visitor in another timezone books a slot
- **WHEN** a visitor whose browser timezone is Europe/Lisbon views a slot that starts at 14:00 Kyiv time
- **THEN** the booking page shows the slot as 12:00 with an explicit timezone label, and the session is stored at the correct absolute time

#### Scenario: Timezone captured at booking
- **WHEN** a visitor completes a booking
- **THEN** the system stores the visitor's browser timezone on the client record
