# Add service types with per-service slot durations

## Why

A psychologist currently has a single global session duration and price, so every booking is the same 50-minute session. Real practices offer different formats — a 2-hour family consultation, a 30-minute intro call — and today these can't be booked at all, or require manual schedule juggling. Slot math also treats the break as invisible "dead space" between sessions, which makes mixed-duration grids drift off round times.

## What Changes

- **New `ServiceType` entity (per psychologist)**: name, slot duration, break duration, price, active flag, default flag, sort order. The break is *included in* the slot (e.g., a 60-minute slot = 50 min of session + 10 min break), so slots of different services align on round wall-clock times.
- **Public booking picks a service first**: the client chooses a service (name, "clean" session length, price), then sees slots generated with that service's slot duration as the grid step.
- **Sessions reference a service**: `Session.serviceTypeId` (nullable for legacy rows); `startAt`/`endAt` store the full slot; price is snapshotted from the service at booking time (existing `priceCents` behavior).
- **Cabinet management UI**: CRUD for service types on the Schedule page; session creation/edit in the cabinet selects a service type.
- **Slot generation reworked**: grid step becomes the selected service's `slotMinutes`; the separate `breakDurationMinutes` term disappears from the formula.
- **Migration**: each psychologist gets one auto-created default service ("Стандартна консультація") from their current `sessionDurationMinutes` + `breakDurationMinutes` + `defaultSessionPriceCents`. The old psychologist-level fields are removed after migration. **BREAKING** for internal code paths that read those fields (no external API surface).

## Capabilities

### New Capabilities

- `service-types`: managing a psychologist's service catalog (create, edit, deactivate, default selection) and its slot/break/price semantics.
- `service-based-booking`: public booking flow with service selection, per-service slot generation, and service-aware session creation in the cabinet.

### Modified Capabilities

<!-- No main specs exist yet in openspec/specs/ — booking/slot behavior changes are captured inside the new capability specs. -->

## Impact

- **Schema (Prisma)**: new `ServiceType` model; `Session.serviceTypeId`; drop `Psychologist.sessionDurationMinutes`, `breakDurationMinutes`, `defaultSessionPriceCents` after a data migration backfills the default service.
- **Slot logic**: `src/lib/slots.ts` (grid step from service), `src/lib/slot-conflict.ts` (unchanged — range-based checks already handle mixed durations).
- **Booking**: `src/app/[slug]/page.tsx`, `booking-form.tsx`, `actions.ts` — service selector, per-service slots, service-derived `endAt`/price.
- **Cabinet**: `src/app/(cabinet)/schedule/` (service CRUD UI + actions), `src/app/(cabinet)/sessions/` (service on create/edit), settings profile form loses the price/duration fields.
- **Pricing/pay flow**: `src/lib/session-price.ts` and pay pages keep working off `Session.priceCents` snapshot — no change.
- **Related change**: `add-calendar-video-integrations` consumes `startAt`/`endAt` as the full slot — compatible, no coordination needed.
