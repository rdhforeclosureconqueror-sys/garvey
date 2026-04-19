# Full Repository Audit Report
Date: 2026-04-19 (UTC)
Scope: Whole repo inspection with emphasis on routes/pages/APIs/capabilities/strings/buttons/data/migrations/tests.

## 1) What exists (high-level)
- Monolithic Express server (`server/index.js`) with many first-party route families plus mounted routers for youth development, TDE extension, tap-CRM, kanban, structure/foundation/execution/intelligence/infrastructure/routing/evolution, rewards, spotlight, owner auth, consent, and verification.
- Static pages are served from `/public` and become directly reachable by path (`app.use(express.static(...))`), including `index.html`, `admin.html`, `youth-development.html`, `rewards.html`, `garvey.html`, `voc.html`, and many legacy/premium/fallback pages.
- Youth parent flow is primarily rendered server-side as HTML strings in `server/youthDevelopmentRoutes.js` and powered by JSON APIs in same file + TDE extension APIs in `server/youthDevelopmentTdeRoutes.js`.
- DB schema is mostly runtime-initialized via `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE IF NOT EXISTS` in `server/db.js`, with explicit migration registry for TDE extension in `server/youthDevelopmentTdeDb.js` and separate Tap-CRM migration flow in `server/tapCrmDb.js`.

## 2) Route + page inventory summary
### Mounted route families
- Mounted routers:
  - `/api/tap-crm` (conditional by `TAP_CRM_MODE`).
  - `/api/kanban`, `/api/structure`, `/api/foundation`, `/api/execution`, `/api/intelligence`, `/api/infrastructure`, `/api/routing`, `/api/stability`, `/api/evolution`.
  - `/api/archetype-engines`.
  - Youth routes mounted at root (via `app.use(createYouthDevelopmentRouter(...))`) so their declared paths are live.
  - `/api/youth-development/intake` and `/api/youth-development/tde`.

### Public / parent-facing surfaces
- Reachable pages:
  - `/index.html` (owner/customer entry shell).
  - `/youth-development.html` (redirect shim to `/youth-development/intake`).
  - `/youth-development/intake`, `/youth-development/parent-dashboard`, `/youth-development/program`, `/youth-development/intake/test`, `/youth-development/parent-dashboard/preview`.
  - `/dashboard.html` with auth and query gating logic.
  - `/rewards.html`, `/voc.html`, `/garvey.html`, `/admin.html`, plus many legacy HTML pages in `/public`.

### Admin / internal / operator surfaces
- `/dashboard/tap-crm`, `/tap-crm` + tap-crm console APIs.
- TDE operator/admin data APIs exist under `/api/youth-development/tde/admin/*` but no first-class dedicated operator page route found in `server/index.js` or `public/youth-development.html`.
- Internal test surface: `/youth-development/intake/test` (explicit test harness UI, not hidden by role).

### Reachability and drift status
- **Known good**: core youth parent pages and core youth APIs are mounted and exercised in tests.
- **Partial / drift**:
  - `public/youth-development.html` is only a redirect shim, not an operator console host.
  - `/api/stability` currently aliases `routingRoutes` (same implementation as `/api/routing`), suggesting naming drift.
  - some tests expect old mount pattern `createYouthDevelopmentRouter()` string in `index.js` and fail due refactor.
- **Potentially broken or policy-risky**:
  - internal test page `/youth-development/intake/test` reachable publicly if server is public.
  - many operator/admin APIs have no auth middleware beyond feature flag/email heuristics.

## 3) API inventory summary
### Youth v1 (core parent-facing)
- `GET /api/youth-development/questions`
  - Purpose: return authored 25-question parent intake bank and flow state.
  - Params: none.
  - Status: wired + tested.
- `POST /api/youth-development/assess`
  - Purpose: validate answers, score, build dashboard/page model, optional persistence.
  - Body: answers + optional tenant/email/child profile fields.
  - Status: wired + tested; returns ownership metadata when persisted.
- `GET /api/youth-development/parent-dashboard/latest`
  - Purpose: load latest saved youth result for tenant/email (+optional child scope).
  - Query: `tenant`, `email`, optional `child_id`.
  - Status: wired + tested.
- `GET /api/youth-development/children`
  - Purpose: list child scopes derived from prior youth submissions.
  - Query: `tenant`, `email`.
  - Status: wired + tested.
- Program bridge/execution endpoints:
  - `GET /api/youth-development/program/bridge`
  - `POST /api/youth-development/program/launch`
  - `GET /api/youth-development/program/week-content`
  - `POST /api/youth-development/program/week-execution`
  - `POST /api/youth-development/program/commitment`
  - `POST /api/youth-development/program/session-plan`
  - `POST /api/youth-development/program/session-complete`
  - Status: wired + tested; contract validation exists for week-execution payload.

### Youth intake extension (`/api/youth-development/intake/*`)
- `POST /task-session`, `POST /signals`, `GET /contracts/trait-mapping`.
- Status: wired + tested; explicit request validation + deterministic contract endpoint.

### TDE extension (`/api/youth-development/tde/*`)
- Contracts/content/voice/program/validation/admin/summary/intervention/checkin/insight/personalization/trajectory/coaching endpoints are present.
- Feature-gated by `TDE_EXTENSION_MODE`; default off.
- Status: mostly wired + broadly test-covered in youth-development test suite.
- Guarding: request-shape checks on childId and some payload validators, but no strong role-based auth enforcement for admin endpoints observed.

### Tap CRM + other platform APIs
- `/api/tap-crm/*` full console/public events/booking APIs (conditional mount).
- `/api/kanban`, `/api/structure`, `/api/foundation`, `/api/execution`, `/api/intelligence`, `/api/infrastructure`, `/api/routing`, `/api/evolution` present and mounted.
- Rewards/consent/spotlight/campaigns/archetypes/owner auth/verify APIs exist in monolith.
- Status: wired; coverage varies (tap-crm and some rewards have tests, but not exhaustive route-level integration coverage for all).

## 4) String/content audit summary
### String source of truth
- Youth parent flow strings are largely hardcoded in renderer/page templates in `server/youthDevelopmentRoutes.js` and `server/youthDevelopmentRenderer.js`.
- Weekly/session prompts and program content are authored in `youth-development/content/weeklyProgramContent.js` and related TDE content services.
- Contract and trust-content labels are embedded in TDE services/routes.

### Placeholder/demo/fallback indicators found
- Explicit preview/test-only fixtures and warnings exist in youth routes (deterministic preview payload labels, intake test fixtures).
- `public/youth-development.html` contains only loading/redirect copy, not functional dashboard/operator content.
- Several fallback labels remain user-visible (e.g., “Program bridge could not load…”, “Program status unavailable.”, “Child profile needed”).

### Inconsistency / confusion findings
- CTA wording drift in youth flow: "Start Program", "Start / Continue Program", "Continue Development Plan", "Resume / View Youth Results" are all used for adjacent states.
- Parent vs operator/internal labels are mixed in some surfaces (test and preview language exposed through reachable routes).
- Some strings indicate internal/testing context in production-reachable routes (`/youth-development/intake/test`, preview banners).

## 5) Capability matrix summary
- Assessment intake walkthrough: **exists** (parent-facing, tested).
- Child profile binding: **partial** (derived from assessment payload ownership; fallback synthesized IDs from names/history).
- Parent dashboard results: **exists** (parent-facing, tested).
- Start Program bridge: **exists** (parent-facing, tested).
- Weekly guided experience: **exists** (parent-facing, tested).
- Week execution persistence: **exists** (DB-backed, tested).
- Reflection/observation persistence: **exists** via week-execution contract/payload persistence.
- Next-week progression: **exists** with progression guards.
- Voice runtime: **partial** (feature-gated extension; fallback-focused and optional).
- Voice fallback: **exists** (explicit non-blocking fallback behavior in tests/services).
- Content registry/readability: **exists/partial** (contracts/inventory endpoints exist; UI wiring is mostly API-level not cohesive operator page).
- Admin/operator visibility: **partial** (admin endpoints exist; dedicated operator UI route appears drifted/missing vs test expectations).
- Validation ops + calibration ops: **exists** via TDE endpoints/services (extension-only, tested).
- Parent coaching/trajectory/personalization/insights: **exists** as extension APIs, largely tested.

## 6) Button/CTA audit summary
### Parent-facing youth CTAs
- Intake page:
  - Previous / Next / Submit assessment.
  - Post-submit links: Open Youth Parent Dashboard; Start Program.
- Parent dashboard page:
  - Start Program / View Saved Dashboard / Retake Assessment / Take Youth Assessment.
- Program page:
  - Start Program (launch), Back to Parent Dashboard.
  - Weekly controls: Previous week, Next week preview, Save Reflection, Save Observation, Start/Resume Week, Mark Step Complete, Continue to Next Step, Continue Next Week.
  - Planner controls: Set Commitment, Mark Next Session Complete.

### Operator/admin CTAs (sample)
- `public/admin.html` includes business/voc/archetype/rewards/garvey/dashboard launch buttons and direct API links for archetype data.
- `public/garvey.html` includes Tap-In hub and multiple phase action buttons tied to platform APIs.

### CTA drift findings
- Label-behavior mismatch risk: same transition endpoint/action represented with varying labels across youth pages.
- No-op/blocked patterns: many program buttons are hidden/disabled until bridge state loads; errors shown as generic text without remediation.
- Operator test expectation mismatch: tests expect `tdeOperatorConsole` marker in youth entry page, not present.

## 7) Data/model audit summary
### Current truth
- Parent account binding: tenant/email context (auth actor preferred, then query/body/header fallback).
- Child profile binding: persisted inside `assessment_submissions.raw_answers.ownership.child_profile`; child scope can be synthesized from older rows.
- Assessment persistence: youth results stored in `assessment_submissions` with payload snapshot in `raw_answers` JSONB.
- Program enrollment: `tde_program_enrollments` with payload JSONB.
- Weekly progress + execution: `tde_weekly_progress_records` payload includes execution state and planning snapshots.
- Reflection/observation notes: embedded in weekly execution payload and session evidence payloads.
- Voice readiness/content: served by TDE voice services/registry contracts; optional/feature-gated.
- Admin/validation/calibration: persisted via TDE tables (`tde_validation_export_logs`, calibration refs, etc.) and summary services.

### Contract posture
- First-class tables exist for most TDE flows.
- However, key youth artifacts remain payload-embedded snapshots (ownership/profile/execution/planning details inside JSONB), increasing schema drift and query fragility risk.
- Fallback/synthesized behaviors still active:
  - in-memory persistence fallback when no pool in TDE repository.
  - synthetic child IDs for legacy rows.
  - default/fallback copy and state guards in UI.

## 8) Migration/schema audit summary
- Core schema uses runtime create/alter logic in `server/db.js` (idempotent style, not strict linear migrations).
- TDE has explicit migration registry (`TDE_MIGRATIONS`) with apply + verify path in `server/youthDevelopmentTdeDb.js`.
- Startup execution calls include `applyTapCrmMigrations`, `verifyTapCrmSchema`, `applyTdeMigrations`, `verifyTdeSchema` through DB init pipeline.
- Drift risks:
  - mixed strategy (runtime ALTER-heavy core + migration registry extensions) can hide ordering assumptions.
  - many critical contracts are JSONB payload conventions, not strict relational columns/check constraints.

## 9) Test coverage audit summary
### Suites present
- Youth development: extensive test coverage (intake, routes, TDE phases, contracts, schema, operator/admin payload contracts).
- Tap CRM phased tests.
- Archetype engines and rewards/customer-return tests.

### Verified in this audit run
- Targeted youth/TDE tests: passing.
- Full `tests/youth-development/*.test.js`: 148 pass / 2 fail.

### Weak/remaining areas
- Not all monolith route families have route-level integration tests in the same depth as youth/TDE.
- UI/browser-level E2E for visible CTA click-paths is limited; most coverage is API/contract/unit and server-render string assertions.
- Failures indicate active drift between test expectations and runtime entry surfaces.

## 10) Critical gaps found (prioritized)
1. **Critical/runtime drift**
   - Youth test suite failures show route mount expectation drift and missing operator marker (`tdeOperatorConsole`) in `public/youth-development.html`.
2. **Parent-facing flow gaps**
   - CTA language inconsistency across intake/dashboard/program for similar transitions.
   - Some fallback/error states are generic and not actionable.
3. **Content/string cleanup gaps**
   - Internal/test labels/routes are publicly reachable and potentially confusing.
4. **Contract/schema gaps**
   - Heavy dependence on JSON snapshot payloads (ownership/planning/execution) rather than strict relational contracts.
5. **Admin/operator gaps**
   - Admin endpoints exist but robust role-based route guards are not consistently evident in TDE admin APIs.
6. **Polish/UX gaps**
   - Redirect-only `youth-development.html` conflicts with operator UI expectations in tests/documentation.

## 11) Recommended next actions
1. Decide canonical youth entry route strategy:
   - Either keep redirect-only `/youth-development.html` and update tests/docs, or restore operator-console marker/surface there.
2. Normalize parent CTA language/state machine copy:
   - define canonical labels for launch/resume/continue across intake/dashboard/program.
3. Lock down internal-only routes:
   - gate `/youth-development/intake/test` and preview surfaces by env or auth.
4. Harden admin endpoints:
   - add explicit role enforcement middleware for TDE admin endpoints.
5. Reduce JSONB contract drift risk:
   - promote key ownership/execution/planning fields to first-class columns or validated DB-side constraints.
6. Add route/UI smoke tests:
   - browser-level checks for top parent and operator CTA pathways.

## 12) Commands run
- `pwd && rg --files -g 'AGENTS.md'`
- `find .. -name AGENTS.md -print`
- `rg --files | head -200`
- `find . -maxdepth 2 -type d | sed 's#^./##' | head -200`
- `cat package.json`
- `find server -maxdepth 4 -type f | sed 's#^./##'`
- `sed -n '1,260p' server/index.js`
- `rg -n "app\.(get|post|put|delete|patch|use)\(" server/index.js`
- `find tests -maxdepth 3 -type f | sed 's#^./##'`
- `rg -n "router\.(get|post|put|delete|patch)\(" ...`
- `find youth-development -maxdepth 4 -type f ...`
- `find . -maxdepth 4 -type f \( -name '*.sql' -o -name '*migration*' -o -name '*schema*' \) ...`
- `sed -n` inspections for key files (`server/db.js`, `server/youthDevelopment*`, `server/youthDevelopmentTdeDb.js`, `youth-development/tde/persistenceRepository.js`, `public/*.html`).
- Route extraction script via python to inventory app/router endpoints.
- `node --test tests/youth-development/tde-routes.test.js tests/youth-development/intake-routes.test.js tests/youth-development/tde-schema.test.js`
- `node --test tests/youth-development/*.test.js`

## 13) Pass/fail totals
- Targeted youth/TDE tests: **17 passed / 0 failed**.
- Full youth-development suite run: **148 passed / 2 failed**.
- Combined observed totals from executed tests: **165 passed / 2 failed**.
