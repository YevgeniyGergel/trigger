## ADDED Requirements

### Requirement: Psychologist LiqPay Merchant Credentials
The system SHALL allow a psychologist to enter their own LiqPay `public_key` and `private_key`, obtained by registering their own merchant account directly with LiqPay, and SHALL store the `private_key` encrypted at the application level with a key held outside the primary database.

#### Scenario: Psychologist connects LiqPay
- **WHEN** a psychologist enters valid LiqPay public and private keys in payment settings
- **THEN** the system stores the private key encrypted and marks the psychologist's payment integration as active

#### Scenario: No payment provider connected
- **WHEN** a psychologist has not entered LiqPay credentials
- **THEN** the system does not offer online card payment for that psychologist's sessions and shows a setup prompt in the cabinet

#### Scenario: Test vs production mode
- **WHEN** a psychologist's LiqPay account is in test mode
- **THEN** the system clearly labels checkout links and payment statuses as test transactions

### Requirement: Fiscal Receipt Delivery
The system SHALL request a fiscal receipt from LiqPay's built-in cash register service for each successful payment by including the client's email in the payment request.

#### Scenario: Fiscal receipt requested on payment
- **WHEN** a session payment is created for a psychologist with an active LiqPay integration
- **THEN** the system includes the client's email in the payment request so LiqPay can deliver a fiscal receipt upon success

### Requirement: Session Price Configuration
The system SHALL allow a psychologist to set a default session price and optionally override the price for an individual session.

#### Scenario: Set default price
- **WHEN** a psychologist sets a default session price in their profile
- **THEN** the system applies that price to newly booked sessions unless overridden

#### Scenario: Override price for a session
- **WHEN** a psychologist edits the price of a specific session before payment is completed
- **THEN** the system uses the overridden price when generating the payment request

### Requirement: Card Payment via LiqPay
The system SHALL generate a LiqPay checkout link for a session's price and allow the client to pay by card without leaving a guided flow from the booking confirmation.

#### Scenario: Client initiates payment
- **WHEN** a client opens the payment link for their session
- **THEN** the system redirects them to a LiqPay checkout for the exact session amount in UAH

#### Scenario: Payment completed
- **WHEN** LiqPay notifies the system via webhook that a payment succeeded
- **THEN** the system marks the session's payment status as "paid", records the provider transaction ID, and — if the psychologist uses prepayment confirmation mode — sets the session status to "confirmed"

#### Scenario: Payment failed
- **WHEN** LiqPay notifies the system via webhook that a payment attempt failed
- **THEN** the system sets the session's payment status to "failed" and allows the client to retry payment; a retry generates a new checkout and returns the payment status to "pending"

#### Scenario: Checkout abandoned
- **WHEN** the client opens a checkout but never completes it (no webhook arrives)
- **THEN** the session's payment status remains "pending" and the client can reopen the payment link at any time

### Requirement: Payment Status Visibility
The system SHALL display the payment status of each session (pending, paid, failed, refunded) to the psychologist in the cabinet.

#### Scenario: View payment status in session list
- **WHEN** a psychologist views their session list or calendar
- **THEN** the system shows the current payment status for each session

### Requirement: Refund on Cancellation of a Paid Session
The system SHALL, when a psychologist cancels a session whose payment status is "paid", offer to refund the payment via the LiqPay refund API using the psychologist's merchant credentials. A successful refund SHALL set the payment status to "refunded" and notify the client. The psychologist MAY decline the refund (e.g., per their cancellation policy), in which case the payment status stays "paid" and the session is cancelled.

#### Scenario: Refund issued on cancellation
- **WHEN** a psychologist cancels a paid session and confirms the refund prompt
- **THEN** the system issues a refund through LiqPay, sets the payment status to "refunded" upon provider confirmation, and notifies the client

#### Scenario: Refund declined by psychologist
- **WHEN** a psychologist cancels a paid session and declines the refund prompt
- **THEN** the session is cancelled, the payment status remains "paid", and no refund request is sent

#### Scenario: Refund request fails
- **WHEN** the LiqPay refund request fails
- **THEN** the payment status remains "paid", the psychologist sees the error with a retry action, and no client notification about a refund is sent

### Requirement: Webhook Signature Verification
The system SHALL verify the authenticity of incoming LiqPay webhook notifications before updating any payment status.

#### Scenario: Valid webhook signature
- **WHEN** a webhook request arrives with a valid LiqPay signature
- **THEN** the system processes the payment status update

#### Scenario: Invalid or missing webhook signature
- **WHEN** a webhook request arrives with an invalid or missing signature
- **THEN** the system rejects the request and does not update any payment status
