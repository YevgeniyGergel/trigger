# service-based-booking

## Purpose

The booking flow driven by service types: service selection on the public page, per-service slot generation, service-derived session creation in both public and cabinet flows, and client-facing presentation of the "clean" session length.

## Requirements

### Requirement: Client selects a service before choosing a slot
The public booking page SHALL show the psychologist's active service types with name, client-facing session length (slot minus break), and price, with the default service preselected. Available slots MUST be generated for the selected service using its slot duration as both the slot length and the grid step. Changing the selected service MUST refresh the slot list.

#### Scenario: Slots follow the selected service
- **WHEN** the psychologist works 10:00–14:00 and the client selects a 120-minute service
- **THEN** the offered slots are 10:00–12:00 and 12:00–14:00

#### Scenario: Client-facing length excludes the break
- **WHEN** a service has slot 60 min and break 10 min
- **THEN** the booking page shows the session length as 50 minutes

#### Scenario: Single active service
- **WHEN** the psychologist has only one active service
- **THEN** the booking page preselects it and shows the slot list immediately

### Requirement: Sessions are created from the selected service
A booked session SHALL store `startAt` and `endAt` spanning the full slot (session time plus break), reference the selected service type, and snapshot the service's price into the session's `priceCents`. The server MUST validate that the submitted service belongs to the psychologist and is active, and MUST derive `endAt` and price from the service on the server (never trusting client input).

#### Scenario: Booking a family consultation
- **WHEN** a client books a 120-minute service at 10:00 priced 2000 грн
- **THEN** the created session has startAt 10:00, endAt 12:00, the service reference, and priceCents 200000

#### Scenario: Inactive or foreign service rejected
- **WHEN** a booking is submitted with a service id that is deactivated or belongs to another psychologist
- **THEN** the booking is rejected with a validation error and no session is created

#### Scenario: Overlapping bookings of different services conflict
- **WHEN** a 60-minute session is already booked at 10:00 and a client submits a 120-minute booking at 09:00
- **THEN** the booking is rejected as a slot conflict

### Requirement: Cabinet session creation uses service types
When a psychologist creates or edits a session in the cabinet, the system SHALL let them pick an active service type (default preselected) and SHALL derive the session's end time and price from it the same way as public booking. The psychologist MAY override the derived price of an individual session while its payment is not completed (the payment-processing "Session Price Configuration" requirement; the service price is the default, the override wins). For a session that is already paid, editing MUST NOT re-derive or override the price: the snapshotted `priceCents` stays as charged.

#### Scenario: Manual session with a service
- **WHEN** the psychologist creates a session at 15:00 with a 30-minute intro service
- **THEN** the session spans 15:00–15:30 with the intro service's price snapshotted

#### Scenario: Editing a paid session keeps its price
- **WHEN** the psychologist changes the service of a session the client has already paid for
- **THEN** the session's time span follows the new service but `priceCents` remains the amount that was paid

#### Scenario: Price override on an unpaid session
- **WHEN** the psychologist sets a custom price on an unpaid session created from a 1500 грн service
- **THEN** the session's `priceCents` reflects the custom price and the payment request uses it; the service's catalog price is unchanged

### Requirement: Client-facing surfaces show the session length, not the slot
Wherever a client sees a session's duration — booking confirmation and reminder notifications, the client session status page — the system SHALL present the start time together with the client-facing session length (slot minus break) taken from the referenced service, not the full slot interval. Sessions without a service reference (legacy) MAY show the full interval.

#### Scenario: Reminder mentions the clean length
- **WHEN** a reminder is sent for a 10:00 session on a service with slot 60 min and break 10 min
- **THEN** the message says the session starts at 10:00 and lasts 50 minutes, without mentioning 11:00
