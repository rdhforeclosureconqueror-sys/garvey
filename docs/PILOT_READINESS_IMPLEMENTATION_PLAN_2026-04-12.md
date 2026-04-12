# Pilot Readiness Must-Fix Implementation Plan (Live Test Follow-up)

Date: 2026-04-12

## Scope Summary
Live testing confirms Tap runtime analytics and event logging are functioning, and dashboard totals are being received. Remaining work is primarily product hardening across consent-first VOC, customer identity attribution, operator-grade Tap analytics UX, Return Engine review/social proof, and dashboard operations (booking + notifications).

---

## Priority Order

## P0 — Must Fix for Pilot

### P0.1 VOC consent must be first and blocking
**Goal**
- Consent gate is step 1 in Voice of the Customer.
- Assessment cannot proceed until consent is accepted.
- Remove runtime failure risk around consent feature context.

**Implementation tasks**
1. Enforce consent-first UI flow and disable question loading until accepted.
2. Persist required consent acceptance before loading questions.
3. Keep consent feature context defaulted in UI and service responses to avoid undefined runtime references.
4. Add explicit error state and event telemetry for consent-declined / consent-save-failed paths.

**Exact files to change**
- `public/voc.html` (consent-first gate, identity requirements before Continue, submit gating, runtime guards).
- `public/js/api-contract.js` (if endpoint contracts require consent key additions).
- `server/index.js` (`/api/features/consent`, `/api/consent/required`, and customer result/VOC read enforcement paths).
- `server/db.js` (only if consent profile indexing/constraints need strengthening).
- `tests/`:
  - add/extend VOC consent flow test (new test file or append in existing VOC/customer flow tests).

**API/schema additions (minimal)**
- API (optional hardening): extend `/api/features/consent` response with explicit `required_for_voc: true|false`.
- API (optional): return normalized `consent_state` payload from `/api/consent/required` for immediate UI confirmation.
- Schema: no mandatory new table; current `customer_consent_profiles` + `consent_event_log` can support this.

**Acceptance mapping**
- VOC opens on consent step.
- Consent is required before proceeding.
- No `consentFeature is not defined` runtime path.

---

### P0.2 Customer sign-in/identification prompt for points + discounts
**Goal**
- Introduce explicit “Sign in to earn points and discounts” identity step early in flow.
- Capture at least name, email, phone.
- Attribute bookings, visits, Tap actions, Return Engine actions, and VOC to one customer profile.

**Implementation tasks**
1. Add identity capture card at entry points (Tap hub and rewards/VOC handoff).
2. Normalize identity resolution order: signed-in session > active customer local context > query params > form capture.
3. On booking reservation, persist customer linkage (`user_id` and email) rather than only free-text name/phone.
4. Ensure all core event writers include customer linkage where available (`user_id`, email, session id).
5. Add “known customer trail” view in dashboard/customer profile panel.

**Exact files to change**
- Frontend:
  - `public/voc.html` (identity fields and guard).
  - `public/rewards.html` (sign-in prompt and session capture messaging).
  - `server/tapHubRenderer.js` (Tap hub entry CTA/identity gate before booking/rewards).
- Backend/API:
  - `server/tapCrmRoutes.js` (booking reservation payload validation + customer linkage).
  - `server/index.js` (shared identity resolution helpers + rewards/VOC event write attribution).
  - `server/accessControl.js` (if actor/customer role checks need expansion).
- Data layer:
  - `server/tapCrmDb.js` (booking schema migration for customer linkage fields).
  - `server/db.js` (if shared user resolution indexes are needed).
- Tests:
  - booking attribution tests
  - rewards/VOC attribution tests
  - customer profile aggregation tests

**API/schema additions (required)**
- `tap_crm_bookings` additions:
  - `customer_email TEXT`
  - `customer_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL`
  - `customer_phone_e164 TEXT` (normalized)
  - `source_session_id TEXT`
- New owner endpoint:
  - `GET /api/tap-crm/console/bookings?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Reservation write contract update:
  - POST `/api/tap-crm/public/tags/:tagCode/booking/reservations` accepts `{ customer_name, customer_email, customer_phone, customer_user_id?, session_id? }`.

**Acceptance mapping**
- Identity established early in flow.
- Bookings attributable to a customer profile.
- Repeat visits trackable by person.

---

### P0.3 Tap dashboard analytics UI must be visual (not raw JSON)
**Goal**
- Replace JSON-only analytics block with glanceable visual operator dashboard.
- Visual breakdown for taps, check-ins, bookings, pay clicks, tip clicks, Return Engine clicks.

**Implementation tasks**
1. Add KPI tiles for top counters.
2. Add bar/donut chart(s) for event type distribution.
3. Add trend chart (daily activity) and recent event feed.
4. Keep raw JSON as collapsible debug panel (optional) instead of primary UI.

**Exact files to change**
- `tapcrm/index.html` (visual analytics containers/cards/charts replacing `<pre>` as primary view).
- `tapcrm/index.html` inline script or extracted JS module (chart render and API mapping).
- `server/tapCrmRoutes.js` (`/console/analytics/summary` response expansion for chart-ready timeseries + booking counts).
- `server/tapCrmDb.js` (indexes if needed for grouped date queries).
- Tests:
  - API contract test for analytics summary shape (counts + timeseries + event breakdown).

**API/schema additions (required)**
- Expand `/api/tap-crm/console/analytics/summary` with:
  - `totals`: taps/checkins/bookings/pay_clicks/tip_clicks/return_engine_clicks
  - `timeseries_daily`: `[ { day, taps, checkins, bookings, pay_clicks, tip_clicks, return_engine_clicks } ]`
  - `by_event_type`: normalized event list
- No mandatory new table.

**Acceptance mapping**
- Analytics visually readable.
- Operator can understand activity at a glance.

---

## P1 — High Priority Product Improvements

### P1.4 Reviews on custom Return Engine home page + social proof
**Goal**
- Show tenant-specific reviews after owner-message section.
- Include futuristic copy + review graph + customer-only video showcase (max 5).
- Prevent owner-uploaded non-customer showcase videos in this block.
- Add customer likes on reviews.

**Implementation tasks**
1. Add review/social-proof section to Return Engine home template.
2. Query only tenant-scoped approved reviews.
3. Add star distribution graph and total review count.
4. Render video showcase from customer review media only; cap to 5 latest/highest quality.
5. Add review-like action (per user, per review).

**Exact files to change**
- Frontend:
  - `public/index.html` (Return Engine landing sections and placement after owner messages).
  - `public/engine/customer-return-engine.js` (review interactions + like submission wiring).
  - `public/rewards.html` (optional “like reviews” UI hook if embedded there).
- Backend:
  - `server/index.js` (tenant reviews fetch extension + like endpoint + customer-only media filtering).
  - `server/resultEngine.js` (if Return Engine payload composition is centralized here).
- Data layer:
  - `server/db.js` (new review-like table migration).
- Tests:
  - tenant-scoped reviews feed test
  - customer-only video showcase guard test
  - review-like endpoint test

**API/schema additions (required)**
- New table: `review_likes` (`tenant_id`, `review_id`, `user_id`, `created_at`, unique `(tenant_id, review_id, user_id)`).
- New endpoints:
  - `POST /t/:slug/reviews/:reviewId/like`
  - `DELETE /t/:slug/reviews/:reviewId/like`
- Extend reviews response with aggregate like count and current-user liked flag.

**Acceptance mapping**
- Business-specific reviews on Return Engine landing page.
- Social proof visible with stats.
- Video showcase customer-review-only, max 5.

---

### P1.5 Tap dashboard booking/calendar + persistent notifications
**Goal**
- Add booking calendar operations to Tap dashboard.
- Notifications for bookings and payments remain “new” until acknowledged.

**Implementation tasks**
1. Add calendar view panel in Tap dashboard.
2. Add notifications center with unread/new badges.
3. Create notification records on booking create and payment event capture.
4. Add acknowledge action to transition notification state from `new` to `seen`.

**Exact files to change**
- Frontend:
  - `tapcrm/index.html` (calendar + notification center UI).
- Backend/API:
  - `server/tapCrmRoutes.js` (owner bookings read endpoint, notifications list, acknowledge endpoint, booking-triggered notification creation).
  - `server/index.js` (payment event notification emit path if payment logging is centralized there).
- Data layer:
  - `server/tapCrmDb.js` (new `tap_crm_notifications` table migration).
- Tests:
  - booking notifications lifecycle test
  - payment notifications lifecycle test
  - acknowledgement persistence test

**API/schema additions (required)**
- New table: `tap_crm_notifications`
  - `id`, `tenant_id`, `type` (`booking|payment|system`), `title`, `payload_json`, `is_new`, `acknowledged_at`, `created_at`.
- Endpoints:
  - `GET /api/tap-crm/console/bookings/calendar?from=&to=`
  - `GET /api/tap-crm/console/notifications`
  - `POST /api/tap-crm/console/notifications/:id/ack`

**Acceptance mapping**
- Bookings visible on dashboard calendar.
- Payment events produce notifications.
- Notifications persist as new until acknowledged.

---

## Existing Customer Identity Model Fit Assessment

## Can the current model support the booking/sign-in trail cleanly?
**Short answer:** partially, but not cleanly end-to-end without schema/API extensions.

**What already exists and helps**
- Tenant-scoped `users` table with unique `(tenant_id, email)` identity anchor.
- Activity tables (`visits`, `actions`, `reviews`, `referrals`, `wishlist`) already support `user_id` attribution.
- VOC/assessment and consent pipelines already support email/session linkage.
- Customer profile endpoints already aggregate per-customer activity.

**Current gaps blocking clean trail**
- `tap_crm_bookings` currently stores `customer_name` + `customer_phone` only (no canonical `user_id` or customer email).
- Tap event logs are rich for event counts, but customer-person linkage is inconsistent unless identity is pushed through each event writer.
- No first-class notification table/state for “new until acknowledged” operations.

**Conclusion**
- The existing identity model is strong enough as the canonical base **if** booking and Tap event schemas are extended to carry user linkage.
- Recommended approach is additive migrations (no destructive change), then backfill by email matching where possible.

---

## Delivery Sequencing (Recommended)
1. P0.1 Consent-first VOC gate and runtime hardening.
2. P0.2 Identity capture + booking attribution migration + event linkage.
3. P0.3 Tap analytics visualization + expanded analytics summary payload.
4. P1.5 Booking calendar + notifications (operational controls).
5. P1.4 Return Engine review/social proof (customer-facing conversion layer).

This sequence keeps pilot legal/compliance and attribution correctness first, then operator visibility, then conversion polish.
