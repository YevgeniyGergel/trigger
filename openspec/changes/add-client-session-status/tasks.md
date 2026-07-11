## 1. Client Session Status Page

- [x] 1.1 Implement `/session/[sessionId]` public read-only page (mirror `src/app/pay/[sessionId]/page.tsx` structure): fetch session by id, show psychologist name, date/time, session status, payment status
- [x] 1.2 Handle unknown/nonexistent session id with a generic not-found state
- [x] 1.3 Add a rendering of session status labels (pending/confirmed/cancelled/rescheduled) reusing existing status display logic from the cabinet sessions views

## 2. Notification Content Updates

- [x] 2.1 Add `/session/[sessionId]` link to `bookingConfirmationForClient` template in `src/lib/notifications.ts`
- [x] 2.2 Add `/session/[sessionId]` link to `sessionReminderForClient` template in `src/lib/notifications.ts`
- [x] 2.3 Add new `sessionCancelledForClient` notification content (session details + status page link)
- [x] 2.4 Add new `sessionRescheduledForClient` notification content (new date/time + status page link)

## 3. Wire Up Cancel/Reschedule Notifications

- [x] 3.1 Call `notifyClient` with `sessionCancelledForClient` from `cancelSession` in `src/app/(cabinet)/sessions/actions.ts`
- [x] 3.2 Call `notifyClient` with `sessionRescheduledForClient` from `rescheduleSession` in `src/app/(cabinet)/sessions/actions.ts`

## 4. Tests

- [ ] 4.1 (skipped — no page-render test infra in repo; `/pay/[sessionId]`, the closest precedent, is untested the same way) Test `/session/[sessionId]` renders correct status for pending/confirmed/cancelled/rescheduled sessions
- [ ] 4.2 (skipped — same reason as 4.1) Test `/session/[sessionId]` returns not-found for a nonexistent id
- [x] 4.3 Test `cancelSession` triggers client notification with status page link
- [x] 4.4 Test `rescheduleSession` triggers client notification with new date/time and status page link
- [x] 4.5 Test booking confirmation and reminder notifications include the status page link
