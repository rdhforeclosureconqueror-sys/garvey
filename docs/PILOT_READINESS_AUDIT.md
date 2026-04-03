# Pilot Project Readiness Audit + Test Matrix

_Date:_ April 3, 2026

## 1. PHASE READ CONFIRMATION
- This is a **launch-readiness / capability-audit / test-coverage pass**.
- This is **not** a redesign pass.
- Scope split into:
  - **Track A:** Customer Return Engine pilot (owner + customer return loop)
  - **Track B:** GARVEY pilot (business operating system pathways)
  - Plus combined-system readiness.

## 2. SYSTEM CAPABILITY INVENTORY

### Business Owner
1. **Owner account lifecycle (signup/signin/signout/session)**
   - What it does: creates owner tenant, persists session cookie, restores session, signs out.
   - Where: backend owner routes + homepage owner auth UI.
   - Powered by: `POST /api/owner/signup`, `POST /api/owner/signin`, `POST /api/owner/signout`, `GET /api/owner/session`, `public/index.html` owner controls.
   - For: business owner.
   - Status: **Operational** (route presence + UI wiring + session cookie flow in code).

2. **Owner onboarding gate to assessment**
   - What it does: redirects owner to assessment until onboarding flag is complete.
   - Where: dashboard route and owner auth UI state.
   - Powered by: `/dashboard.html` redirect behavior and intake completion update.
   - For: business owner.
   - Status: **Operational**.

3. **Owner dashboard hub**
   - What it does: central operational hub (campaigns, products/reviews, spotlight, contributions, customer insights, messaging).
   - Where: `dashboardnew/index.html` + `dashboardnew/app.js` + tenant analytics routes.
   - Powered by: `/t/:slug/dashboard`, `/t/:slug/customers`, `/t/:slug/customers/:userId/profile`, `/t/:slug/messages`, `/t/:slug/campaigns/summary`, `/t/:slug/analytics`, campaign/review/spotlight/contribution routes.
   - For: business owner/admin.
   - Status: **Partially operational** (code-complete, but live runtime probes not executed in this environment).

### Customer
4. **Customer rewards loop (checkin/action/review/referral/wishlist)**
   - What it does: awards points, tracks status/history, persists loop context.
   - Where: customer return engine + rewards routes/pages.
   - Powered by: `public/engine/customer-return-engine.js`, `/api/rewards/*`, `/api/rewards/status`, `/api/rewards/history`, `public/rewards.html`.
   - For: customer.
   - Status: **Operational** at contract/route level and unit-tested engine behavior.

5. **Customer result + return CTA continuity**
   - What it does: customer result page links back into rewards loop with preserved tenant/email/cid/crid + owner context.
   - Where: `public/results_customer.html`, customer return engine.
   - Powered by: `/api/results/customer/:crid`, `/api/results/:email?type=customer`, rewards URL builder.
   - For: customer.
   - Status: **Operational** (code path present); runtime UX needs manual verification.

### Dashboard / Ops
6. **Tenant analytics summary**
   - What it does: aggregates visits/actions/points/daily activity.
   - Where: `/t/:slug/dashboard`.
   - For: owner/admin/staff with tenant scope.
   - Status: **Operational**.

7. **Customer roster + profile detail**
   - What it does: owner sees customer list, points, archetype, assessment linkage, activity counts.
   - Where: `/t/:slug/customers`, `/t/:slug/customers/:userId/profile`, dashboard UI profile pane.
   - For: owner/admin/staff.
   - Status: **Operational**.

8. **Segments + archetype grouping**
   - What it does: groups customer assessments into personal/buyer archetype segments and list views.
   - Where: `/t/:slug/segments`, `/api/archetypes/groups`, `/api/archetypes/group`.
   - For: owner/admin.
   - Status: **Operational**.

### Messaging
9. **Owner outbound messaging to single customer or archetype group**
   - What it does: owner composes message to one customer email or segment.
   - Where: `/t/:slug/messages` (POST/GET) + dashboard message UI.
   - For: owner/admin.
   - Status: **Operational**.

10. **Customer inbox fetch**
   - What it does: resolves inbound messages for customer email and segment membership.
   - Where: `/t/:slug/messages/inbox`.
   - For: customer.
   - Status: **Operational** (endpoint); frontend surfacing appears limited outside dashboard/admin contexts.

### Assessments
11. **Question retrieval + strict assessment type enforcement**
   - What it does: serves assessment questions for `business_owner` or `customer` only.
   - Where: `/api/questions`, `public/intake.html`, `public/voc.html`.
   - For: owner/customer.
   - Status: **Operational**.

12. **Business owner assessment save + result generation + onboarding completion**
   - What it does: scores owner answers, persists submission, marks onboarding complete, records campaign event.
   - Where: `/api/intake` (owner path), `/api/results/:email`.
   - For: owner.
   - Status: **Operational**.

13. **Customer assessment + result retrieval by email and CRID**
   - What it does: stores/retrieves customer archetype result contracts and shareable context.
   - Where: `/api/intake` (customer mode), `/api/results/:email?type=customer`, `/api/results/customer/:crid`, `/api/customer/share-result`.
   - For: customer + owner visibility.
   - Status: **Partially operational** (core routes exist; end-to-end runtime not probed here).

### QR / Campaigns
14. **Campaign create/list + QR generation**
   - What it does: owner creates campaign, gets share links (landing/rewards/voc), downloads QR.
   - Where: `/api/campaigns/create`, `/api/campaigns/list`, `/api/campaigns/qr`, dashboard campaign UI.
   - For: owner/admin.
   - Status: **Operational** with policy + membership checks.

15. **Campaign event telemetry**
   - What it does: records visit/assessment/reward/share events for campaign attribution.
   - Where: campaign event recording helper + rewards/intake/share endpoints.
   - For: owner ops/analytics.
   - Status: **Operational**.

### Rewards / Points
16. **Unified points ledger + status**
   - What it does: exposes points summary and event history for customer.
   - Where: `/api/rewards/status`, `/api/rewards/history`.
   - For: customer, owner visibility through analytics.
   - Status: **Operational**.

17. **Contributions/support economy**
   - What it does: contribution add/support/status/history with role-checked controls.
   - Where: `/api/contributions/*`, dashboard contribution panel.
   - For: owner/admin (plus customer contribution entry points).
   - Status: **Operational** at route level; business-policy tuning likely needed post-pilot.

### Customer Profiles / Tracking
18. **Showcase + review-proof moderation + tracking**
   - What it does: product catalog, approved review proof, showcase tracking events.
   - Where: `/t/:slug/products*`, `/t/:slug/reviews*`, `/t/:slug/showcase*`, homepage showcase widgets.
   - For: owner ops + customer-facing discovery.
   - Status: **Partially operational** (broad surface; requires manual e2e check by role).

19. **Spotlight + business claim moderation**
   - What it does: spotlight submissions/feed/claims/moderation.
   - Where: `/api/spotlight/*`, homepage + dashboard spotlight controls.
   - For: customers/community + admins/owners.
   - Status: **Operational** by route; moderation UX still needs live pass.

### GARVEY
20. **GARVEY pathway phased engines (foundation/structure/execution/intelligence/infrastructure/routing/evolution)**
   - What it does: business operating-system workflow with phase state, gadgets, checkpoints.
   - Where: `public/garvey.html` and mounted APIs `/api/foundation`, `/api/structure`, `/api/execution`, `/api/intelligence`, `/api/infrastructure`, `/api/routing`, `/api/evolution`.
   - For: owners/operators.
   - Status: **Partially operational** for pilot: code surface is broad and mounted, but needs focused e2e scenario validation by phase.

21. **Kanban board persistence for GARVEY**
   - What it does: board/card persistence and movement.
   - Where: `/api/kanban/*`, `public/garvey-kanban.js`.
   - For: owners/operators.
   - Status: **Operational** (mounted + client wired).

### Shared Auth / Routing / Permissions
22. **Role/policy enforcement + tenant boundary checks**
   - What it does: action-based policy (`evaluatePolicy`) + membership checks for owner routes.
   - Where: `server/accessControl.js`, `requirePolicyAction`, `requireOwnerTenantMembership` in `server/index.js`.
   - For: all roles.
   - Status: **Operational** but with risk: any route not using helper functions can drift.

23. **Cross-origin API base contract for split frontend/backend deployments**
   - What it does: uses backend base on `garveyfrontend` host via `window.GarveyApi.buildUrl`.
   - Where: `public/js/api-contract.js`, dashboard + intake + index fetch usage.
   - For: all web clients.
   - Status: **Operational** (diagnostic audit passed targeted scans).

---

## 3. TRACK A — CUSTOMER RETURN ENGINE PILOT

### A. Capability summary
Includes owner auth/onboarding, owner dashboard visibility, customer reward loop, customer assessment, campaign QR, points/activity tracking, reviews/support/VOC hooks, and owner visibility into customer records.

**Current readiness:** **Conditional-Go** (code and contracts in place; must run live runtime probes + manual role-path regression before pilot).

### B. Test matrix

| Test | Role | Entry page | Steps | Expected | Pass/Fail criteria | Dependencies | Status |
|---|---|---|---|---|---|---|---|
| Owner signup creates tenant + default campaign | Owner | `/index.html` | Fill business/email/password → Create Owner Account | 201 + session cookie + redirect to owner assessment | Pass if redirected to `/intake.html?assessment=business_owner...` with tenant/email | `POST /api/owner/signup` | Working (route-contract) |
| Owner signin restores dashboard pathing | Owner | `/index.html` | Enter email/password → Owner Sign In | Session restored, `next_route` based on onboarding flag | Pass if onboarding false => intake; true => dashboard | `POST /api/owner/signin`, `GET /api/owner/session` | Working (route-contract) |
| Owner assessment completion unlocks dashboard | Owner | `/intake.html?assessment=business_owner` | Complete answers and submit | Result payload + onboarding_complete true | Pass if subsequent `/dashboard.html` no longer reroutes to intake | `POST /api/intake`, membership update, `GET /dashboard.html` | Partially verified |
| Campaign create/list/QR | Owner | `/dashboard.html` | Create campaign, load list, preview QR | Campaign appears + QR image resolves | Pass if list row and QR PNG/SVG return 200 | `/api/campaigns/create`, `/api/campaigns/list`, `/api/campaigns/qr` | Working (route-contract) |
| Customer QR landing to rewards continuity | Customer | Campaign QR (`/rewards.html?tenant&cid`) | Scan QR, enter/retain email, perform check-in | Points increment + cid retained + status refresh | Pass if `/api/rewards/status` reflects points and cid trace | `/api/rewards/checkin`, `/api/rewards/status` | Unverified live |
| Customer review earns reward with metadata | Customer | `/rewards.html` | Submit review text + rating + optional product | Review reward + status refresh + ledger entry | Pass if response includes points change + review payload | `/api/rewards/review`, `/api/rewards/status` | Working (unit+route) |
| Wishlist/referral actions | Customer | `/rewards.html` | Submit wishlist/referral | Reward and event stored | Pass if points and history update | `/api/rewards/wishlist`, `/api/rewards/referral`, `/api/rewards/history` | Unverified live |
| Customer assessment -> result -> rewards CTA | Customer | `/intake.html?assessment=customer` | Complete assessment, open results, click Claim Rewards | Result page loads archetype + CTA routes to rewards with context | Pass if tenant/email/cid/crid preserved | `/api/intake`, `/api/results/:email`, `/api/results/customer/:crid` | Partially verified |
| VOC intake from campaign | Customer | `/voc.html?tenant&cid` | Answer VOC questions and submit | Customer routed to customer results with context | Pass if result page resolves and links to rewards | `/api/questions`, `/api/vocIntake`, `/api/results/customer/:crid` | Partially verified |
| Owner customer table/profile linkage | Owner | `/dashboard.html#customers` | Open customer row/profile | Profile shows points, activity, latest assessment linkage | Pass if profile endpoint returns assessment linkage and render no errors | `/t/:slug/customers`, `/t/:slug/customers/:userId/profile` | Working (route), UI unverified |
| Owner messages to customer/group | Owner | `/dashboard.html` | Send single and group message | Message appears in owner list; customer inbox query returns it | Pass if message row persisted and inbox filter matches | `/t/:slug/messages`, `/t/:slug/messages/inbox` | Partially verified |
| Contributions/support panel | Owner/Admin | `/dashboard.html` | Add contribution and allocate support | Totals/history refresh | Pass if status/history update and errors handled | `/api/contributions/add`, `/api/contributions/support`, `/api/contributions/status` | Working (route-contract) |

### C. Readiness checklist

#### MUST PASS before pilot
- Owner signup/signin/session/signout e2e in deployed target.
- Owner assessment completion and onboarding gate behavior.
- Campaign create/list/QR and QR target routing (landing/rewards/voc).
- Rewards status + checkin + at least one additional action (review or wishlist) with points update.
- Customer assessment save/result fetch by email + CRID.
- Owner dashboard baseline loads: dashboard, customers, analytics, segments.
- Permission guard checks for owner-only actions (campaign create, product/review moderation, messages).

#### SHOULD PASS before pilot
- Spotlight submission/claim/moderation loop.
- Contributions/support full loop with admin and owner personas.
- Customer inbox rendering path in customer surface.
- Retry/error UX for missing tenant/email contexts.

#### CAN WAIT until after pilot
- Advanced segmentation messaging templates.
- Deep optimization of contribution economics/rules.
- Expanded campaign ranking visual polish.

### D. Blockers
1. **No live target smoke execution in this audit context** (`BASE_URL` missing), so runtime pass remains unproven.
2. **Large multi-surface owner dashboard** introduces higher regression risk without scripted e2e role-play across sections.
3. **Customer-facing message inbox visibility** appears endpoint-complete but UI exposure is less explicit than owner-side tooling.

### E. Recommended final fixes before launch
1. Run `diagnostics:live` against staging/prod URL and require all critical probes PASS.
2. Add one scripted browser-level happy-path covering: owner signup → assessment → campaign QR → customer checkin/review → owner dashboard visibility.
3. Add explicit customer inbox page/section link if messaging is a pilot promise.
4. Freeze pilot scope toggles (features config) so contributions/spotlight are intentionally on/off.

---

## 4. TRACK B — GARVEY PILOT

### A. Capability summary
GARVEY pilot centers on phased business operating-system workflows (foundation, structure, execution, intelligence, infrastructure, routing, evolution) plus kanban persistence and gadgets.

**Current readiness:** **No-Go for full GARVEY pilot today** (broad API/page surface exists, but lacks validated end-to-end pilot scenario proving each phase transition and permission behavior in live runtime).

### B. Test matrix

| Test | Role | Entry page | Steps | Expected | Pass/Fail criteria | Dependencies | Status |
|---|---|---|---|---|---|---|---|
| GARVEY board bootstrap | Owner | `/garvey.html?tenant=...` | Load page first time, initialize | Foundation/state cards load and persist | Pass if `/api/kanban/ensure` + phase state calls succeed | `/api/kanban/*`, `/api/foundation/initialize` | Unverified live |
| Foundation phase core cards | Owner | `/garvey.html` | Create/update mission/customer/value cards | Cards persisted, dashboard indicators turn active | Pass if reload preserves card content | `/api/foundation/state`, `/api/foundation/cards/:cardType` | Unverified live |
| Structure roles + ownership validator | Owner | `/garvey.html` | Add role, assign operator, run ownership validator | Gaps and recommendations return | Pass if role changes reflected in structure state | `/api/structure/roles`, `/api/structure/operator-assignment`, `/api/structure/gadget/ownership-validator` | Unverified live |
| Execution item pipeline | Owner/Operator | `/garvey.html` | Add execution item + recurring checklist gadget | Item appears in execution state and logs | Pass if state endpoint reflects inserted items | `/api/execution/items`, `/api/execution/state`, gadgets | Unverified live |
| Intelligence scoring + gap detect | Owner | `/garvey.html` | Submit KPI/score, run gap detect | Gap priorities and guidance update | Pass if intelligence state includes score/gaps | `/api/intelligence/score`, `/api/intelligence/gaps/detect`, `/api/intelligence/state` | Unverified live |
| Infrastructure hub and recommendations | Owner | `/garvey.html` | Initialize infra, add tool/resource/template/link, validate links | Hub + recommendations respond with entries | Pass if hub and recommendations reflect updates | `/api/infrastructure/*` | Unverified live |
| Routing state/issues/notifications | Owner | `/garvey.html` | Initialize routing and inspect issues/tasks/notifications | Routing logs and verify endpoint respond | Pass if all route calls return expected contract | `/api/routing/*` | Unverified live |
| Evolution phase state mutations | Owner | `/garvey.html` | Trigger evolution updates and reload state | Evolution state stable across refresh | Pass if no contract breaks in `/api/evolution/*` | `/api/evolution/*` | Unverified live |
| GARVEY permissions guard | Staff/Owner/Admin | GARVEY APIs | Attempt cross-tenant/role-limited actions | Denied when tenant mismatch or role invalid | Pass if forbidden for unauthorized actor and allowed for owner/admin | `evaluatePolicy`, membership checks | Partially verified (code-level) |

### C. Readiness checklist

#### MUST PASS before GARVEY pilot
- End-to-end journey through all GARVEY phases on one tenant.
- Persistence validation across refresh/relogin for each phase state.
- Role guard validation for owner vs staff vs admin on GARVEY update actions.
- Failure-path UX (missing tenant/session/role) does not dead-end without recovery instructions.

#### SHOULD PASS before GARVEY pilot
- Cross-linking from owner dashboard to GARVEY preserves tenant/session context.
- Gadget-generated outputs are idempotent and non-destructive.
- Kanban and phase states remain consistent under concurrent edits.

#### CAN WAIT until after pilot
- Full automation for each gadget branch.
- UI copy/polish in non-core guidance sections.

### D. Blockers
1. **No executed live phase-walk evidence** in this environment.
2. **Surface area complexity** (many phase APIs + gadgets) without focused pilot test script.
3. **Potential route family mismatch risk** (`/api/stability` aliasing routing routes) needs intentional validation to avoid operator confusion.

### E. Recommended final fixes before launch
1. Build a strict “GARVEY Phase Walkthrough” test script (single tenant, fixed dataset) and require PASS before pilot start.
2. Add phase-health badge panel showing backend status per phase call.
3. Document role matrix for GARVEY actions (owner/staff/admin) and validate with negative tests.

---

## 5. SHARED SYSTEM RISKS

1. **Auth:** Session cookie + query/email context both exist; if they diverge, URL/state confusion can occur without strict session precedence.
2. **Routing:** Cross-origin correctness depends on `GarveyApi.buildUrl`; ad-hoc relative fetch additions are future regression risk.
3. **Permissions:** Policy helper + membership checks are robust when used; risk is route drift where helper is omitted.
4. **Dashboard rendering:** Dashboard depends on many parallel API calls; one failing panel can create partial-render confusion.
5. **Profile linking:** Customer profile assumes latest assessment join; missing/late assessment can present “profile incomplete” states.
6. **Messaging:** Backend supports owner outbound + customer inbox, but customer-side discoverability needs explicit product decision.
7. **QR/Campaign lifecycle:** Campaign slug strictness can reject flows if QR carries invalid cid; error UX must be clear for operators.
8. **Assessment save/fetch/result linking:** Multiple lookup modes (email + crid + tenant) are powerful but can create tenant mismatch ambiguity unless monitored.
9. **Phone vs desktop behavior:** Owner dashboard is dense and desktop-first; pilot should explicitly define which owner actions are mobile-supported vs desktop-required.

---

## 6. DIAGNOSTIC RESULTS

### diagnostics:system
- Result: **PASS with warnings only**.
- Summary: 17 pass, 1 warn, 0 fail.
- Warning was runtime probe skipped due to missing `BASE_URL`; route/contract checks were successful.

### diagnostics:context
- Result: **PASS**.
- No context-propagation guard violations reported.

### diagnostics:live
- Result: **FAIL (environment precondition)**.
- Failure cause: missing `BACKEND_URL`/`BASE_URL`, not a discovered code defect by itself.

**Interpretation:** Code/route cohesion appears strong; live operational certainty still requires running diagnostics against actual deployed base URL.

---

## 7. FINAL PILOT VERDICT

### Can we launch Customer Return Engine pilot right now?
**Answer: NO (not yet).**
- Why: feature contracts/routes are present and cohesive, but required live runtime probes + manual role-based e2e have not been executed in this environment.
- Exact blockers:
  1. No live `diagnostics:live` pass on target environment.
  2. No completed full journey verification (owner signup → assessment → campaign QR → customer reward actions → owner dashboard visibility).
- Exact pass conditions needed:
  1. Live smoke PASS with base URL.
  2. Manual test matrix MUST PASS items completed and signed.

### Can we launch GARVEY pilot right now?
**Answer: NO.**
- Why: GARVEY surface is extensive and mounted, but no validated phase-by-phase live walkthrough with persistence + permissions evidence.
- Exact blockers:
  1. No GARVEY phase-walk execution evidence.
  2. No negative permission test evidence for role/tenant boundaries per phase action.
- Exact pass conditions needed:
  1. One complete GARVEY tenant walkthrough with saved artifacts/logs.
  2. Role-based authorization regression PASS for GARVEY update routes.

### Can we launch full combined system right now?
**Answer: NO.**
- Why: Combined launch requires both Track A and Track B PASS baselines; currently only code-level cohesion is confirmed.
- Exact blockers:
  1. Missing live target smoke evidence.
  2. Missing full GARVEY operational validation.
  3. Missing consolidated cross-track regression run.
- Exact pass conditions needed:
  1. Track A MUST PASS checklist complete.
  2. Track B MUST PASS checklist complete.
  3. Combined regression proving no session/context breaks when switching Owner Dashboard ↔ GARVEY ↔ Customer loop.
