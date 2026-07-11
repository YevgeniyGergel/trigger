# Tasks

## 1. Schema & migration

- [x] 1.1 Add `ServiceType` model and `Session.serviceTypeId` to Prisma schema; create additive migration
- [x] 1.2 Write data migration backfilling one default "Стандартна консультація" per psychologist from `sessionDurationMinutes`/`breakDurationMinutes`/`defaultSessionPriceCents`
- [x] 1.3 Drop `Psychologist.sessionDurationMinutes`, `breakDurationMinutes`, `defaultSessionPriceCents` (schema migration) after all code paths switch

## 2. Core logic

- [x] 2.1 Rework `generateAvailableSlots` (`src/lib/slots.ts`): grid step = service `slotMinutes`, remove the break term; update `src/lib/__tests__/slots.test.ts` incl. mixed-duration and round-time alignment cases
- [x] 2.2 Add service validation schema (`src/lib/validation/`) with break-fits-inside-slot rule (+ tests)
- [x] 2.3 Verify `checkSlotConflict` against cross-service overlaps (e.g., 120-min booking over an existing 60-min session) — extend `slot-conflict.test.ts`

## 3. Service management (cabinet)

- [x] 3.1 Server actions for service CRUD: create, edit, deactivate (blocked for current default), set-default (transactional unset/set), reorder
- [x] 3.2 Service management UI on the Schedule page (`src/app/(cabinet)/schedule/`): list with name/length/break/price, default badge, add/edit/deactivate forms
- [x] 3.3 Remove duration/price fields from settings profile form (`src/app/(cabinet)/settings/profile-form.tsx` + actions), link to service management

## 4. Public booking

- [x] 4.1 Service selector on `src/app/[slug]/page.tsx` / `booking-form.tsx`: cards with name, client-facing length (slot − break), price; default preselected; slot list refreshes per service
- [x] 4.2 Update `createBooking` (`src/app/[slug]/actions.ts`): accept `serviceTypeId`, validate ownership + active, derive `endAt` and `priceCents` from the service server-side; update `booking-validation` tests

## 5. Cabinet sessions & display

- [x] 5.1 Add service selector to cabinet session creation/edit (`src/app/(cabinet)/sessions/`), same server-side derivation; update `sessions/__tests__/actions.test.ts`
- [x] 5.2 Show service name on session lists, session detail page, client session status page, and in notification texts where session length is mentioned (client-facing length, not slot)

## 6. Verification

- [x] 6.1 Run full test suite + typecheck; manually verify end-to-end: create services (30/60/120), book each publicly, check grid alignment, conflicts across services, migration output on a seeded psychologist

## 7. Spec-review follow-ups

- [ ] 7.1 Create the initial default service ("Стандартна консультація", slot 60, break 10, no price) in the registration flow (`src/app/register/actions.ts`), inside the same transaction as the psychologist row (+ test) — the "exactly one default" invariant currently breaks for new sign-ups
- [ ] 7.2 Allow deleting a service that no sessions reference and that is not the default (deactivate remains the path otherwise); verify both blocks in `service-actions.ts` (+ tests)
- [ ] 7.3 Keep `priceCents` untouched when editing an already-paid session in the cabinet (no re-derivation from the new service); extend `sessions/__tests__/actions.test.ts`
- [ ] 7.4 Verify client-facing surfaces (booking confirmation, reminders, session status page) show start time + client-facing length (slot − break), not the full `startAt`–`endAt` interval; legacy sessions without a service may show the full interval
- [ ] 7.5 Re-run test suite + typecheck after the follow-ups
