# Design: Service types with per-service slot durations

## Context

Slot generation (`src/lib/slots.ts`) currently steps through working hours by `sessionDurationMinutes + breakDurationMinutes`, both global per psychologist; the break lives *between* stored sessions as untracked dead space. Booking (`src/app/[slug]/actions.ts`) derives `endAt` and price from the psychologist's global fields. Conflict checking (`src/lib/slot-conflict.ts`) is range-overlap based inside a Serializable transaction, so it already handles arbitrary durations. This change was designed in an explore session; key semantics (break inside the slot, full-slot `startAt`/`endAt`) were decided there.

## Goals / Non-Goals

**Goals:**
- Multiple bookable services per psychologist with distinct slot duration, break, and price.
- Break included in the slot so mixed-duration grids stay on round wall-clock times.
- Clean migration: existing psychologists keep working with an auto-created default service.

**Non-Goals:**
- Base-grid/cell packing (variant B): per-service grids are enough for v1; cells can come later if fragmentation ever matters.
- Free/limited intro sessions ("one per client"), service-level working-hour restrictions, per-service locations.
- Client-facing service descriptions beyond name/length/price.

## Decisions

### D1: Break is part of the slot
`ServiceType.slotMinutes` is the full calendar footprint; `breakMinutes` (< slotMinutes, ≥ 0) is carved out of its tail. Client-facing "session length" = `slotMinutes − breakMinutes`. Alternative — keep break as inter-slot spacing (status quo) — rejected: it makes mixed-duration grids drift off round times and leaves the break unrepresented in stored data.

### D2: `Session.startAt/endAt` span the full slot
Conflict checks, calendar export, and meeting durations (the `add-calendar-video-integrations` change) all consume `startAt/endAt` unchanged. Only client-facing copy mentions the shorter "clean" time, sourced from the service. Alternative — store 50-minute sessions and pad grids externally — rejected: every consumer (conflicts, calendar, cron reminders) would need to know about padding.

### D3: Per-service slot grid (variant A)
`generateAvailableSlots` already takes duration as a parameter; the grid step becomes the selected service's `slotMinutes` and the separate break term is deleted. Each service gets its own grid anchored at working-hour start. Because breaks are internal, grids of 30/60/120-minute services align on round times; range-based conflict checks handle cross-service overlaps. Alternative — shared base grid with N-cell occupancy — deferred (see Non-Goals).

### D4: Schema
```prisma
model ServiceType {
  id             String  @id @default(cuid())
  psychologistId String
  name           String
  slotMinutes    Int
  breakMinutes   Int      @default(0)
  priceCents     Int?
  isDefault      Boolean  @default(false)
  active         Boolean  @default(true)
  sortOrder      Int      @default(0)
  ...
  @@index([psychologistId])
}
// Session: + serviceTypeId String? (SetNull on delete), relation
```
Default uniqueness is enforced in application code within a transaction (unset previous, set new), not a partial unique index — Prisma schema can't express `WHERE isDefault AND active` cleanly, and all writes go through one server action.

### D4a: Price is optional; registration seeds the default service
`priceCents` stays nullable — `getSessionAmountCents` already distinguishes "no price" (null) from a free session (0), and migrated psychologists without `defaultSessionPriceCents` need a valid state. A service without a price is bookable; its sessions have no payment amount. The "exactly one default" invariant is kept from day one by creating "Стандартна консультація" (slot 60, break 10, no price) inside the registration transaction. Editing a service never rewrites existing sessions (times or snapshotted price); paid sessions keep `priceCents` even if their service is changed in the cabinet.

### D5: Migration replaces the psychologist-level fields
A data migration creates the default service per psychologist (`slotMinutes = sessionDurationMinutes + breakDurationMinutes`, price copied), then a follow-up schema migration drops `sessionDurationMinutes`, `breakDurationMinutes`, `defaultSessionPriceCents`. `Session.serviceTypeId` stays nullable — legacy sessions are not backfilled. Alternative — keep old fields as fallback — rejected: dual sources of truth for duration/price is exactly the bug class this change removes.

### D6: Booking flow
Public page loads active services; the service selector drives slot fetching (slots computed server-side per service, same path as today with the service's duration). `createBooking` receives `serviceTypeId`, validates ownership + active, derives `endAt = startAt + slotMinutes` and `priceCents` server-side. Cabinet session creation gets the same selector and derivation.

## Risks / Trade-offs

- [Per-service grids can fragment the day when durations mix (a 30-min booking mid-morning breaks the 120-min grid)] → accepted for v1; psychologists can shape working hours, and variant B remains the upgrade path.
- [Migration ordering: default service must exist before old fields drop] → single deploy with data migration running inside the same `prisma migrate deploy` sequence; rollback = restore fields from the created default service.
- [Slot lists now vary by service — more computation per page view] → slots were already computed per request; one extra parameter, negligible.
- [In-flight change `add-calendar-video-integrations` touches the same booking actions] → land this change first (smaller, foundational); calendar change rebases trivially since it consumes `startAt/endAt`.
- [Client sees two durations: "50 min" on booking/notifications vs a 60-min calendar event or Zoom meeting spanning the full slot] → accepted: client-facing copy always states start time + clean length; calendar/meeting artifacts span the full slot by design (D2).

## Migration Plan

1. Additive migration: create `service_types` table + `Session.serviceTypeId`.
2. Data migration: backfill one default service per psychologist from existing fields.
3. Schema migration: drop the three psychologist-level fields; update all code paths in the same release.
4. Rollback: re-add fields, repopulate from each psychologist's default service.

## Open Questions

- Should the settings profile form link to service management (fields move to Schedule page), or should services live in Settings instead? Current lean: Schedule page, next to working hours.
