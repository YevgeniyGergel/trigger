# service-types

## ADDED Requirements

### Requirement: Psychologist manages a catalog of service types
The system SHALL let a psychologist create, edit, and deactivate service types. A service type MUST have a name, a slot duration in minutes, and a break duration in minutes (0 allowed, break included within the slot); a price MAY be set (an unset price means the session has no payment amount, distinct from an explicit 0). Deletion SHALL be allowed only for a non-default service that no sessions reference; otherwise deactivation MUST be used. Deactivated services MUST NOT be bookable but existing sessions keep their reference. Editing a service's durations or price MUST NOT change the time span or the snapshotted price of already-created sessions.

#### Scenario: Create a service type
- **WHEN** the psychologist creates "Сімейна консультація" with slot 120 min, break 15 min, price 2000 грн
- **THEN** the service appears in the catalog and becomes bookable on the public page

#### Scenario: Break must fit inside the slot
- **WHEN** the psychologist submits a service with break duration greater than or equal to the slot duration
- **THEN** the system rejects the input with a validation error

#### Scenario: Deactivate a service with existing sessions
- **WHEN** the psychologist deactivates a service that has booked sessions
- **THEN** the service disappears from the public booking page, and existing sessions still display the service name

#### Scenario: Editing a service does not rewrite existing sessions
- **WHEN** the psychologist changes a service's slot duration from 60 to 90 minutes while future sessions are booked on it
- **THEN** the existing sessions keep their original start/end times and snapshotted price; only new bookings use the new duration

#### Scenario: Service without a price
- **WHEN** the psychologist creates a service with the price left empty
- **THEN** the service is bookable, the booking page shows no price for it, and sessions created from it have no payment amount

### Requirement: Exactly one default service type
The system SHALL ensure each psychologist has exactly one default service type at all times. Registration MUST create an initial active default service ("Стандартна консультація", 60-minute slot, 10-minute break, no price) so the invariant holds from the first day. The default service MUST be preselected in booking flows. Setting a new default MUST unset the previous one. The default service MUST NOT be deactivated or deleted while it is the default.

#### Scenario: New psychologist gets a default service
- **WHEN** a psychologist completes registration
- **THEN** they have one active default service "Стандартна консультація" (slot 60 min, break 10 min, no price) and their public page is bookable immediately

#### Scenario: Change the default
- **WHEN** the psychologist marks another active service as default
- **THEN** that service becomes default and the previous default loses the flag

#### Scenario: Cannot deactivate the default
- **WHEN** the psychologist tries to deactivate the current default service
- **THEN** the system rejects the action and asks to pick another default first

### Requirement: Existing psychologists are migrated to a default service
The system SHALL create one default service type per existing psychologist during migration, named "Стандартна консультація", with slot duration equal to the psychologist's previous session + break duration, break duration equal to the previous break, and price equal to the previous default session price (unset when the psychologist had no default price). Existing sessions MAY remain without a service reference.

#### Scenario: Migration backfill
- **WHEN** the migration runs for a psychologist with 50 min sessions, 10 min breaks, and a 1500 грн default price
- **THEN** they get an active default service "Стандартна консультація" with slot 60 min, break 10 min, price 1500 грн

#### Scenario: Legacy sessions render without a service
- **WHEN** a pre-migration session without `serviceTypeId` is displayed in the cabinet
- **THEN** it renders normally, without a service name
