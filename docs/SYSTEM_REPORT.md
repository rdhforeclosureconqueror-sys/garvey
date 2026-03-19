# Garvey System Report

## 1) System Map

### File Structure
- `server/index.js` — Express API, tenant behavior endpoints, intake endpoint, config endpoint, startup.
- `server/db.js` — PostgreSQL connection + schema bootstrap.
- `server/tenant.js` — tenant lookup + auto-create helpers.
- `server/biiEngine.js` — role scoring, recommendations, tenant config generation.
- `public/index.html` — behavior engine test UI (checkin/action/wishlist).
- `public/intake.html` — intake flow UI with 25/60 mode, section flow, progress bar, answer selection, submit.
- `public/dashboard.html` — tenant analytics dashboard.

### Data Flow
1. Tenant-scoped behavior events arrive via `/t/:slug/*`.
2. Tenant + user resolved/created.
3. Event rows inserted (`visits`, `actions`, `wishlist`) and user points updated.
4. Dashboard aggregates data from tenant tables.
5. Intake (`/intake`) creates session -> responses -> role scores/results.
6. Intake result generates/stores `tenant_config` feature flags.

### Endpoint Map
- `POST /t/:slug/checkin`
- `POST /t/:slug/action`
- `POST /t/:slug/wishlist`
- `GET /t/:slug/dashboard`
- `POST /intake`
- `GET /t/:slug/config`
- `GET /health`

## 2) Test Report

### Phase 1 — Behavior Engine
- PASS: Tenant manually inserted in DB.
- PASS: `/checkin` returned `points_added: 5` and user points `5`.
- PASS: `/action` with `review` returned `points_added: 5` and total points `10`.
- PASS: `/wishlist` saved wishlist row.
- PASS: `/dashboard` returned expected counts.

### Phase 2 — BII Engine
- PASS: `POST /intake` created session.
- PASS: `intake_responses` count matched provided answers.
- PASS: Role scores + primary/secondary roles computed.
- PASS: Recommendations returned in response.
- PASS: Results stored in `intake_results`.
- PASS: Tenant auto-create logic present and active through `ensureTenant`.

### Phase 3 — Auto System Generator
- PASS: Intake run generated tenant config.
- PASS: `tenant_config` persisted in DB.
- PASS: `GET /t/:slug/config` returns stored role-based config.

### Phase 4 — Frontend Intake Experience
- PASS: UI includes 25/60 mode toggle.
- PASS: Progress bar and percentage implemented.
- PASS: Section-based flow implemented.
- PASS: Answer selection UI implemented.
- PASS: Submit posts answers to backend and renders results.

### Phase 5 — Dashboard Expansion
- PASS: Dashboard shows users, visits, actions, points.
- PASS: Dashboard shows top actions.
- PASS: Simple analytics (`actions per user`) displayed.
- PASS: After new actions, dashboard data updates on refresh/poll.

## 3) Deployment Readiness
- Render readiness: `npm start` launches Express server and auto-initializes schema.
- DB readiness: PostgreSQL-backed schema creation verified.
- Endpoint readiness: behavior, intake, config, and dashboard endpoints verified with live requests.
