## ADDED Requirements

### Requirement: Working Hours Configuration
The system SHALL allow a psychologist to define recurring weekly working hours (days and time ranges) during which clients may book sessions.

#### Scenario: Set weekly availability
- **WHEN** a psychologist defines working hours for specific weekdays (e.g., Mon-Fri 10:00-18:00)
- **THEN** the system generates bookable time slots for those days according to the configured session duration

#### Scenario: Remove availability for a day
- **WHEN** a psychologist removes working hours for a given weekday
- **THEN** the system stops generating bookable slots for that weekday going forward

### Requirement: Slot Blocking and Exceptions
The system SHALL allow a psychologist to block specific time ranges (e.g., vacation, personal time) so they are not offered for booking, even if they fall within recurring working hours.

#### Scenario: Block a date range
- **WHEN** a psychologist blocks a specific date or date range
- **THEN** the system excludes any slots within that range from the public booking page

#### Scenario: Existing booking conflicts with new block
- **WHEN** a psychologist attempts to block a time range that already has a confirmed session
- **THEN** the system warns the psychologist of the conflicting session before allowing the block

### Requirement: Session Calendar View
The system SHALL provide the psychologist a calendar view (day and week) showing confirmed, pending, and cancelled sessions.

#### Scenario: View weekly calendar
- **WHEN** a psychologist opens the calendar in week view
- **THEN** the system displays all sessions for that week with their status (pending/confirmed/cancelled/completed)

#### Scenario: Navigate between weeks
- **WHEN** a psychologist navigates to the next or previous week
- **THEN** the system displays sessions and availability for the selected week
