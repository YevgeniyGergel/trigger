## ADDED Requirements

### Requirement: Client Record Creation
The system SHALL allow a psychologist to create a client record with name and contact info (phone and/or email), either manually or automatically from a public booking submission.

#### Scenario: Manual client creation
- **WHEN** a psychologist adds a new client with name and phone number
- **THEN** the system creates a client record scoped to that psychologist's account

#### Scenario: Auto-created from booking
- **WHEN** a new person books a session via the public booking page using contact info not already in the psychologist's client list
- **THEN** the system automatically creates a client record linked to that booking

#### Scenario: Booking matched to an existing client
- **WHEN** a booking is submitted whose email matches an existing client of that psychologist (email is the matching key; phone is informational)
- **THEN** the system links the session to the existing client record instead of creating a duplicate

#### Scenario: Deactivated client books again
- **WHEN** a booking is submitted whose email matches a deactivated client
- **THEN** the system links the session to that record and reactivates the client

### Requirement: Client List and Profile View
The system SHALL allow a psychologist to view a list of their clients and open a client's profile showing contact info and session history.

#### Scenario: View client list
- **WHEN** an authenticated psychologist opens the clients page
- **THEN** the system displays all clients belonging to that psychologist, sorted by most recent session

#### Scenario: View client session history
- **WHEN** a psychologist opens a specific client's profile
- **THEN** the system displays that client's past and upcoming sessions along with linked notes and payment statuses

### Requirement: Client Record Editing
The system SHALL allow a psychologist to edit or deactivate a client record.

#### Scenario: Edit contact info
- **WHEN** a psychologist updates a client's phone number or email
- **THEN** the system saves the updated contact info and uses it for future session confirmations

#### Scenario: Deactivate client
- **WHEN** a psychologist marks a client as inactive
- **THEN** the system hides the client from the default active-client list but preserves their session history
