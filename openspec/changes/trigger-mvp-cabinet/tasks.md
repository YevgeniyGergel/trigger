## 1. Project Setup & CI/CD

- [x] 1.1 Initialize git repository and push to a GitHub remote
- [x] 1.2 Scaffold Next.js (App Router, TypeScript) project
- [x] 1.3 Set up PostgreSQL database (EU region, e.g. Neon/Railway Frankfurt) and Prisma, configure connection
- [x] 1.4 Configure NextAuth with email/password provider for psychologist accounts
- [x] 1.5 Set up object storage (S3-compatible, e.g. Cloudflare R2 with EU data residency) for audio files
- [x] 1.6 Configure environment variables and secrets management (DB, NextAuth, LiqPay, storage, transcription API, Claude API)
- [x] 1.7 Set up base layout, routing structure (public routes vs. authenticated cabinet routes)
- [x] 1.8 Set up GitHub Actions CI workflow: lint, typecheck, and test on every pull request
- [ ] 1.9 Connect repository to Vercel for automatic preview deployments per pull request (manual: requires Vercel account)
- [x] 1.10 Configure Prisma migration check in CI (fail build on unapplied/conflicting migrations)
- [ ] 1.11 Set up branch protection on `main` requiring CI checks to pass before merge (manual: requires GitHub repo settings)

## 2. Psychologist Auth & Profile

- [x] 2.1 Define Prisma schema for `Psychologist` (email, password hash, name, slug, description, default session price)
- [x] 2.2 Implement registration flow (form, validation, unique email/slug check)
- [x] 2.3 Implement login flow via NextAuth
- [x] 2.4 Implement session/auth middleware restricting cabinet routes to authenticated owner
- [x] 2.5 Implement profile settings page (display name, slug, description, default price)
- [x] 2.6 Enforce slug uniqueness on profile update

## 3. Client Directory

- [ ] 3.1 Define Prisma schema for `Client` (psychologistId, name, phone, email, active flag)
- [ ] 3.2 Implement client list page scoped to authenticated psychologist
- [ ] 3.3 Implement manual client creation form
- [ ] 3.4 Implement client profile page showing contact info, session history, notes, payment statuses
- [ ] 3.5 Implement client edit and deactivate actions
- [ ] 3.6 Enforce cross-account data isolation on all client queries

## 4. Availability & Scheduling

- [ ] 4.1 Define Prisma schema for `WorkingHours` and blocked date ranges
- [ ] 4.2 Implement working hours configuration UI (weekly recurring schedule)
- [ ] 4.3 Implement slot generation logic based on working hours and session duration
- [ ] 4.4 Implement date-range blocking UI with conflict warning for existing sessions
- [ ] 4.5 Define Prisma schema for `Session` (psychologistId, clientId, startTime, endTime, status, price, paymentStatus)
- [ ] 4.6 Implement calendar view (day/week) showing sessions with status
- [ ] 4.7 Implement week/day navigation in calendar view

## 5. Public Booking

- [ ] 5.1 Implement public booking page at psychologist's slug URL showing available slots
- [ ] 5.2 Implement "no availability" empty state
- [ ] 5.3 Implement booking submission form (name, phone/email) creating a pending `Session` and linking/creating `Client`
- [ ] 5.4 Implement concurrency-safe slot reservation (prevent double-booking same slot)
- [ ] 5.5 Implement rate limiting on booking submissions by IP and contact identifier
- [ ] 5.6 Implement psychologist actions: confirm, cancel, reschedule a session
- [ ] 5.7 Free up slot in availability when a session is cancelled

## 6. Payment Processing (LiqPay)

- [ ] 6.1 Define Prisma schema for `Payment` (sessionId, provider, amount, status, providerTransactionId)
- [ ] 6.2 Implement default session price application and per-session price override
- [ ] 6.3 Implement psychologist payment settings UI to enter LiqPay `public_key`/`private_key`, with `private_key` encrypted via KMS-backed application-level encryption
- [ ] 6.4 Implement test/production mode flag and label test transactions in the UI
- [ ] 6.5 Integrate LiqPay checkout link generation for a session's price in UAH, including `rro_info` (client email) for fiscal receipt delivery
- [ ] 6.6 Implement client-facing payment page/redirect flow
- [ ] 6.7 Implement LiqPay webhook endpoint with signature verification
- [ ] 6.8 Update session payment status (pending/paid/failed/refunded) from verified webhook events
- [ ] 6.9 Reject and log webhook requests with invalid/missing signatures
- [ ] 6.10 Display payment status in session list and calendar views
- [ ] 6.11 Implement payment retry flow for failed/abandoned payments

## 7. Session Notes (Voice + Transcription + SOAP)

- [ ] 7.1 Define Prisma schema for `SessionNote` (sessionId, audioUrl, transcriptText, editedText, soapText, soapStatus, status) with transcript/SOAP fields stored encrypted
- [ ] 7.2 Set up KMS/secrets manager for the note-encryption key, separate from the primary database
- [ ] 7.3 Implement browser audio recording (MediaRecorder API) with microphone permission handling
- [ ] 7.4 Implement audio upload to object storage and note creation in "transcribing" status
- [ ] 7.5 Integrate transcription service (e.g. Whisper API) as an async job, encrypting transcript text on save
- [ ] 7.6 Update note status to "ready" with transcript text on success, "failed" on error with retry option
- [ ] 7.7 Integrate Claude API call to structure the transcript into a SOAP-format draft after transcription succeeds
- [ ] 7.8 Mark SOAP drafts as "unreviewed" until the psychologist edits/confirms them; handle SOAP structuring failures with retry option
- [ ] 7.9 Implement transcript and SOAP editing UI, preserving original audio
- [ ] 7.10 Enforce access control so only the owning psychologist can access audio/transcript/SOAP text
- [ ] 7.11 Display note (audio player + transcript + SOAP draft) on the client's session view

## 8. Notifications (Email + Telegram)

- [ ] 8.1 Set up transactional email provider (e.g. Resend/SendGrid) integration
- [ ] 8.2 Set up Telegram bot (Telegram Bot API) for outbound notifications only
- [ ] 8.3 Implement Telegram account linking via one-time deep-link token, associating chat ID with client/psychologist record
- [ ] 8.4 Implement notification channel preferences per psychologist (email default, Telegram optional)
- [ ] 8.5 Implement booking confirmation notifications (to psychologist and client) on new booking
- [ ] 8.6 Implement session reminder job (configurable lead time before confirmed sessions), skipping cancelled sessions
- [ ] 8.7 Implement payment status notifications (paid/failed) to psychologist and client
- [ ] 8.8 Implement email fallback when Telegram delivery fails or is not linked

## 9. Cross-Cutting Hardening

- [ ] 9.1 Add encryption at rest for stored audio files and verify storage bucket access policy
- [ ] 9.2 Add input validation and error handling across all public-facing endpoints (booking, payment webhook, Telegram linking)
- [ ] 9.3 Write integration tests for booking flow (slot generation, concurrent booking, cancellation)
- [ ] 9.4 Write integration tests for payment flow (checkout generation, webhook signature verification, status transitions, fiscal receipt request)
- [ ] 9.5 Write integration tests for notes flow (recording upload, transcription status transitions, SOAP structuring, encryption, access control)
- [ ] 9.6 Write integration tests for notifications (booking confirmation, reminder timing, Telegram fallback to email)
- [ ] 9.7 Manual end-to-end pass: register psychologist → connect LiqPay → set availability → public booking → payment → voice note → SOAP review → notifications received

## 10. Production Deployment

- [ ] 10.1 Provision managed Postgres, object storage, and KMS/secrets manager in production — all in EU region (Frankfurt/Amsterdam)
- [ ] 10.2 Configure Vercel deployment region to EU (`fra1`) for production
- [ ] 10.3 Configure production environment variables and LiqPay production credentials in Vercel
- [ ] 10.4 Configure production deploy trigger on merge to `main` (via the CI/CD pipeline set up in section 1)
- [ ] 10.5 Run Prisma migrations against the production database as part of the deploy step
- [ ] 10.6 Verify LiqPay webhook and Telegram bot webhook reachable from production URL
- [ ] 10.7 Smoke test full flow in production environment
- [ ] 10.8 Set up basic uptime/error monitoring (e.g. Vercel Analytics + Sentry) and alerting for webhook and job failures
