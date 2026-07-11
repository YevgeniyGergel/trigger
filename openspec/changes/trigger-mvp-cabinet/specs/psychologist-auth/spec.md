## ADDED Requirements

### Requirement: Psychologist Registration
The system SHALL allow a psychologist to create an account with email, password, and a unique public booking slug.

#### Scenario: Successful registration
- **WHEN** a psychologist submits a valid email, password, and full name
- **THEN** the system creates a new account, generates a unique public booking slug, and logs the psychologist in

#### Scenario: Duplicate email rejected
- **WHEN** a psychologist submits an email that is already registered
- **THEN** the system rejects the registration with a clear error and does not create a duplicate account

### Requirement: Psychologist Login
The system SHALL allow a registered psychologist to authenticate with email and password.

#### Scenario: Successful login
- **WHEN** a psychologist submits correct email and password
- **THEN** the system creates an authenticated session and redirects to the cabinet dashboard

#### Scenario: Invalid credentials
- **WHEN** a psychologist submits an incorrect email or password
- **THEN** the system denies access and shows a generic authentication error without revealing which field was wrong

### Requirement: Cabinet Access Restriction
The system SHALL restrict all cabinet pages (clients, schedule, sessions, notes, payments) to the authenticated psychologist who owns that data.

#### Scenario: Unauthenticated access blocked
- **WHEN** an unauthenticated user requests a cabinet page
- **THEN** the system redirects to the login page

#### Scenario: Cross-account data isolation
- **WHEN** an authenticated psychologist requests a resource (client, session, note) owned by a different psychologist account
- **THEN** the system denies access and returns a not-found or forbidden response

### Requirement: Public Booking Slug Management
The system SHALL allow a psychologist to view and edit their public booking profile (display name, slug, description) used on the public booking page.

#### Scenario: Update public profile
- **WHEN** a psychologist edits their display name or description in profile settings
- **THEN** the system saves the changes and reflects them on their public booking page

#### Scenario: Slug uniqueness enforced
- **WHEN** a psychologist attempts to change their slug to one already in use
- **THEN** the system rejects the change and keeps the previous slug

#### Scenario: Slug change warns about published links
- **WHEN** a psychologist changes their slug
- **THEN** the system warns, before saving, that previously shared booking links (business cards, social bios) will stop working
