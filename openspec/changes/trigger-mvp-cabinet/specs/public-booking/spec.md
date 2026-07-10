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
The system SHALL allow a visitor to book an available slot by providing their name and contact info (phone or email), without creating an account.

#### Scenario: Successful booking submission
- **WHEN** a visitor selects an available slot and submits valid name and contact info
- **THEN** the system creates a session with status "pending" and links or creates the corresponding client record

#### Scenario: Slot taken concurrently
- **WHEN** two visitors attempt to book the same slot at nearly the same time
- **THEN** the system allows only the first submission to succeed and shows the second visitor an error that the slot is no longer available

### Requirement: Booking Rate Limiting
The system SHALL rate-limit booking submissions per IP address and per contact identifier to reduce spam bookings.

#### Scenario: Excessive booking attempts blocked
- **WHEN** the same IP address or contact submits more booking requests than the allowed threshold within a short time window
- **THEN** the system rejects further booking attempts until the rate limit window resets

### Requirement: Psychologist Booking Confirmation and Cancellation
The system SHALL allow the psychologist to confirm, cancel, or reschedule a pending or confirmed session from the cabinet.

#### Scenario: Confirm pending session
- **WHEN** a psychologist confirms a pending session
- **THEN** the system updates the session status to "confirmed"

#### Scenario: Cancel session
- **WHEN** a psychologist cancels a session
- **THEN** the system updates the session status to "cancelled" and frees up the corresponding time slot for future bookings
