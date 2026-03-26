# Repo Mastery Report

## Index
- [1) System overview](#1-system-overview)
- [2) Source-of-truth architecture map](#2-source-of-truth-architecture-map)
- [3) Full route & API contract inventory (authoritative)](#3-full-route--api-contract-inventory-authoritative)
  - [3A) Backend HTTP routes](#3a-backend-http-routes)
  - [3B) Frontend pages + client routes](#3b-frontend-pages--client-routes)
  - [3C) Navigation + link map](#3c-navigation--link-map)
- [4) Data model and lifecycle](#4-data-model-and-lifecycle)
- [5) Critical flows (text sequence diagrams)](#5-critical-flows-text-sequence-diagrams)
- [6) Safety notes: how not to break this repo](#6-safety-notes-how-not-to-break-this-repo)
- [7) Observability & debugging playbook](#7-observability--debugging-playbook)
- [8) Testing strategy (current + recommended)](#8-testing-strategy-current--recommended)
- [9) TODOs + roadmap](#9-todos--roadmap)

---

## 1) System overview

### What this app is
A multi-tenant “Garvey Experience Engine” web app built as:
- **Express backend** with PostgreSQL persistence.
- **Static HTML/JS frontend** served directly by Express.
- **Primary feature families**:
  - Assessment engine (business-owner intake + customer VOC intake).
  - Tenant engagement endpoints (`/t/:slug/*`) for check-ins, actions, reviews, referrals, wishlist, analytics.
  - Tenant site generation + template selection.
  - GARVEY kanban workflow board (G/A/R/V/E/Y phases).

Key entrypoint: `server/index.js` (`app` construction + all route registrations). Key handlers/functions include `tenantMiddleware`, `findTenantUser`, `sanitizeConfig`, and mounted `kanbanRoutes(...)`.

### Core user journeys
1. **Business owner journey**
   - Admin/landing button -> `intake.html?assessment=business_owner` -> `/api/questions` -> `/api/intake` -> dashboard and tenant config-driven experience.
2. **Voice of Customer journey**
   - VOC button -> `voc.html` -> `/api/questions?assessment=customer` -> `/voc-intake` -> dashboard intelligence updates.
3. **Tenant engagement journey**
   - Frontend flows calling `/t/:slug/checkin|action|review|referral|wishlist`, then owner sees rollups in `/t/:slug/dashboard|customers|analytics`.
4. **Site + template journey**
   - Template browser (`templates.html`) + site intake (`site_intake.html`) -> `/api/templates/select` + `/api/site/generate` -> generated tenant site `/t/:slug/site`.
5. **GARVEY execution journey**
   - GARVEY hub and phase pages -> kanban APIs under `/api/kanban/*`.

### Runtime topology
- **Static serving**: `app.use(express.static(.../public))` (all `public/*.html`, css, js, assets).
- **Dashboard override**: `/dashboard.html` explicitly serves `dashboardnew/index.html`, while `/dashboardnew` static serves bundled assets.
- **JSON API**: routes in `server/index.js`, plus mounted router `server/kanbanRoutes.js` at `/api/kanban`.
- **Data store**: PostgreSQL via `pg` pool (`server/db.js`).
- **No explicit auth**: no middleware enforcing user auth tokens. Most APIs are open, tenant-scoped by slug/body/query fields.
- **CORS**: permissive (`*`) with common methods/headers.
- **External integrations**: no third-party SaaS API integration found; only DB + optional hosted frontend/backend hostnames in browser-side base URL logic.

### Environments / deployment assumptions
- Package scripts provide only `npm start` -> `node server/index.js`.
- Env defaults imply local Postgres (`PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE`) if `DATABASE_URL` missing.
- Browser-side API base often resolves to empty string (same-origin) unless hostname contains `garveyfrontend`, then uses `https://garveybackend.onrender.com`.
- Startup bootstraps DB schema and kanban schema, then starts adaptive cycle interval.

---

## 2) Source-of-truth architecture map

### Folder responsibilities

| Path | Responsibility | Key files |
|---|---|---|
| `server/` | Backend runtime, route contracts, DB init, engines, tenant config, kanban router/schema | `index.js`, `kanbanRoutes.js`, `db.js`, `tenant.js`, `intelligenceEngine.js`, `siteGenerator.js`, `kanbanDb.js` |
| `public/` | Frontend static entry pages + plain JS modules + templates/assets | `index.html`, `admin.html`, `intake.html`, `voc.html`, `dashboard.html`, `site_intake.html`, `templates.html`, `templates.js`, `garvey-kanban.js`, `js/api-contract.js` |
| `dashboardnew/` | Dashboard UI shell + JS app (served at `/dashboard.html`) | `index.html`, `app.js` |
| `scripts/` | Smoke/util verification scripts | `garvey-smoke.mjs` |
| root config | Runtime/dependency setup | `package.json` |

### Contract sources (authoritative) vs consumers

**Authoritative contract sources** (define runtime API behavior):
- `server/index.js` route handlers (`app.get/post/...`).
- `server/kanbanRoutes.js` router handlers.
- Validation/scoring semantics in `server/intelligenceEngine.js` (`validateAnswers`, `scoreSubmission`).
- Tenant/config semantics in `server/tenant.js` and helper logic in `server/index.js` (`sanitizeConfig`).

**Frontend/API consumers**:
- `public/intake.html`, `public/voc.html`, `public/site_intake.html`, `public/templates.js`, `dashboardnew/app.js`, `public/garvey-kanban.js`.
- Linking/flow dispatch pages: `public/index.html`, `public/admin.html`, `public/garvey*.html`.
- Smoke consumer: `scripts/garvey-smoke.mjs`.

---

## 3) Full route & API contract inventory (authoritative)

## 3A) Backend HTTP routes

> **Auth**: no explicit auth middleware/guards found on these routes.

### Global middleware / static / non-API behavior
- `express.json({limit:"1mb"})` enabled.
- CORS headers allow all origins and methods; OPTIONS short-circuits with 200.
- Static files served from `public/`.
- `/dashboardnew` serves `dashboardnew/` static assets.
- `/dashboard.html` sends `dashboardnew/index.html`.

### Health / join

| Method | Path | Request validation | Success response | Failure | Side effects | Handler location |
|---|---|---|---|---|---|---|
| GET | `/health` | none | `{status:"ok"}` | n/a | none | `server/index.js` `app.get("/health")` |
| GET | `/join/:slug` | `slug` must exist tenant | `302` redirect to `/intake.html?tenant=<slug>` | `404 {error:"Tenant not found"}` | none | `server/index.js` `app.get("/join/:slug")` |

### Templates subsystem

| Method | Path | Request | Success | Failure | Side effects |
|---|---|---|---|---|---|
| GET | `/api/templates` | none | `{success:true, templates:[...]}` | `500 {success:false,error:...}` | reads `public/templates/registry.json` |
| POST | `/api/templates/select` | body: `{tenant, template_id}`; both required; template must exist in registry | `{success:true, tenant, template_id}` | `400` missing/unknown template; `500` server error | upserts `tenant_config.config.site.template_id` |

### Questions subsystem

| Method | Path | Request validation | Success | Failure | Side effects |
|---|---|---|---|---|---|
| GET | `/api/questions` | query `assessment` must be `business_owner` or `customer` (default `business_owner`) | `{success, assessment, count, questions:[{qid,assessment_type,question_text,option_a..d,mapping_a..d}]}` | `400 invalid assessment`; `404 no questions`; `500` | DB read from `questions` |

### Intake + VOC intake

| Method | Path | Request validation | Success | Failure | Side effects |
|---|---|---|---|---|---|
| POST | `/api/intake` | body requires `{email, tenant, answers[]}`; `validateAnswers("business_owner", answers)` strict count + qid + answer validity | `{success:true, assessment_type:"business_owner", session_id, primary, secondary, weakness, archetype_counts, archetype_definition}` | `400` validation; `500 {error:"api intake failed",details}` | Creates tenant/user/session + inserts assessment submission |
| POST | `/voc-intake` | body requires `{email, tenant, answers[]}`; structure requires each answer `{qid,answer}`; `validateAnswers("customer",answers)` | `{success:true, assessment_type:"customer", session_id, primary/secondary/weakness, personality_* , archetype_counts, personality_counts}` | `400` validation; `500 {error:"voc intake failed",details}` | Creates tenant/user/session + inserts customer assessment submission |

### Results subsystem

| Method | Path | Request validation | Success | Failure | Side effects |
|---|---|---|---|---|---|
| GET | `/api/results/:email` | path `email` required (normalized); optional query `type` must be `business_owner|customer` | `{success:true, result:<latest submission row>}` | `400 invalid`; `404 not found`; `500` | DB read only |

### Admin/config + verify subsystem

| Method | Path | Request validation | Success | Failure | Side effects |
|---|---|---|---|---|---|
| GET | `/api/admin/config/:tenant` | tenant slug must exist | `{tenant, config, updated_at}` | `404 tenant not found`; `500` | DB read |
| POST | `/api/admin/config` | body `{tenant, config}` with tenant required; config sanitized by allowed keys | `{tenant, config}` | `400 tenant required`; `500` | upsert `tenant_config` |
| GET | `/api/verify/db` | none | `{status:"DB_OK"}` | `500 {status:"DB_FAIL"}` | DB ping |
| GET | `/api/verify/questions` | none | question mapping integrity summary | `500 {status:"QUESTIONS_FAIL"}` | in-memory checks |
| GET | `/api/verify/scoring` | none | scoring integrity summary | `500 {status:"SCORING_FAIL"}` | in-memory checks |
| GET | `/api/verify/intelligence/:slug` | tenant middleware validates slug | `{status:"INTELLIGENCE_VERIFY_OK", checks, counts}` | `500 ...` | DB counts |

### Tenant-scoped platform endpoints (`/t/:slug/*`)

All routes below require `tenantMiddleware` (`slug` lookup + attached tenant config).

| Method | Path | Request | Success highlights | Failure | Side effects |
|---|---|---|---|---|---|
| POST | `/t/:slug/checkin` | body `{email}` required | `{success, tenant, event:"checkin", points_added, points}` | `400/500` | create/find user, insert visit, increment points |
| POST | `/t/:slug/action` | body `{email, action_type}` required | `{success, tenant, action_type, points_added, points}` | `400/500` | insert action, increment points |
| POST | `/t/:slug/review` | body `{email,text,media_type?}` | `{success, tenant, review, points_added, points}` | `400/500` | insert review, increment points |
| POST | `/t/:slug/referral` | body `{email,referred_email}` | `{success, tenant, points_awarded_each, users:[email,points]}` | `400/500` | transaction; upsert users, insert referral, add points |
| POST | `/t/:slug/wishlist` | body `{email,product_name}` | `{success, tenant, wishlist_entry}` | `400/500` | insert wishlist row |
| GET | `/t/:slug/dashboard` | none | aggregate metrics for users/visits/actions/points/top_actions/etc | `500` | read aggregates |
| GET | `/t/:slug/customers` | none | `{tenant, customers:[{user_id,email,archetype,visits,last_activity,status}]}` | `500` | read + shape joined activity/archetype data |
| GET | `/t/:slug/analytics` | none | visits/growth/archetypes + owner/customer latest assessment | `500` | read aggregates |
| GET | `/t/:slug/site` | none | rendered HTML page from site generator | `404` if siteGenerator missing; `500` render fail | reads tenant config + generates HTML |

### Site generation endpoint

| Method | Path | Request | Success | Failure | Side effects |
|---|---|---|---|---|---|
| POST | `/api/site/generate` | body `{tenant, site?, features?}` tenant required | `{success:true, tenant, version, preview, pages}` | `404 siteGenerator missing`, `400 tenant required`, `500` | upsert tenant config; generate site output |

### Kanban subsystem (`/api/kanban/*`)

Router mounted in `server/index.js`; implementation in `server/kanbanRoutes.js`.

| Method | Path | Request validation | Success | Failure | Side effects |
|---|---|---|---|---|---|
| POST | `/api/kanban/ensure` | `tenant` required (query or body) | `{success:true, tenant, board}` | `400/500` | ensures tenant + board + default phase columns |
| GET | `/api/kanban/board` | `tenant` required | `{success:true, tenant, board, columns[]}` | `400/500` | ensure/read board |
| GET | `/api/kanban/cards` | `tenant` required; `phase` must be one of `G,A,R,V,E,Y` | `{success:true, cards[]}` | `400/500` | ensure/read cards |
| POST | `/api/kanban/cards` | `tenant`,`phase`,`title`,`column_id` required | `{success:true, card}` | `400/500` | insert card + event |
| PUT | `/api/kanban/cards/:id` | numeric card id; optional fields title/description/priority/due_date/status/assigned_to | `{success:true, card}` | `400/404/500` | update card + event |
| POST | `/api/kanban/cards/:id/move` | numeric id + body `to_column_id` required | `{success:true, card}` | `400/404/500` | move card + move event |
| GET | `/api/kanban/events` | `tenant` and valid `phase` required | `{success:true, events[]}` | `400/500` | read card events |

### Non-obvious behavior / serving rules
- `/dashboard.html` is **not** served from `public/dashboard.html`; it serves `dashboardnew/index.html`. This can mask edits to `public/dashboard.html` in runtime behavior.
- `/join/:slug` always redirects to intake page (business flow entry), not VOC.
- `tenantMiddleware` uses slug path param only; tenant query/body values are ignored for `/t/:slug/*`.

---

## 3B) Frontend pages + client routes

Below are principal page entry points and their API consumption.

### `public/index.html`
- **Purpose**: tenant landing/navigation hub.
- **Params**: `tenant` (optional, default `test-business`).
- **State**: URL param -> in-memory link wiring.
- **APIs called**: none directly; links route users to other pages.
- **Error handling**: none (link-only page).

### `public/admin.html`
- **Purpose**: quick admin launcher for assessment/VOC/actions/dashboard.
- **Params**: `tenant` (default `test-business`).
- **APIs called**: none directly; defines critical links:
  - Business: `/intake.html?tenant=<slug>&assessment=business_owner`
  - VOC: `/voc.html?tenant=<slug>`

### `public/intake.html`
- **Purpose**: shared assessment renderer for business (and optionally customer if `assessment=customer`).
- **Params**: `tenant`, `assessment`.
- **APIs**:
  - GET questions: `/api/questions?assessment=<business_owner|customer>&ts=...`
  - POST submit: `/api/intake` for business, `/voc-intake` for customer.
- **State**: in-memory arrays (`questions`, `answers`), `currentIndex`; URL params for tenant/assessment.
- **Error UX**: sets question text to `❌ <message>`; alerts on missing email.

### `public/voc.html`
- **Purpose**: dedicated VOC page (customer-only question source).
- **Params**: `tenant`.
- **APIs**:
  - GET `/api/questions?assessment=customer`
  - POST `/voc-intake`
- **State**: in-memory `questions`, `answers`, `currentIndex`.
- **Error UX**: inline `❌` message.

### `public/site_intake.html`
- **Purpose**: collect website spec and feature flags, generate tenant site.
- **Params**: `tenant`, `email` (prefill convenience).
- **API**: POST `/api/site/generate` with `{tenant, site, features}`.
- **State**: form fields + checkbox values; no localStorage.
- **Error UX**: status line with `.err` class.

### `public/templates.html` + `public/templates.js`
- **Purpose**: template registry browser + template selection.
- **Params**: `tenant` required for selection workflow.
- **APIs**:
  - fetch static `/templates/registry.json`
  - POST `/api/templates/select` with `{tenant, template_id}`.

### `dashboardnew/index.html` + `dashboardnew/app.js`
- **Purpose**: owner dashboard with metrics/tables/charts.
- **Params**: `tenant` required.
- **APIs**:
  - GET `/t/:slug/dashboard`
  - GET `/t/:slug/customers`
  - GET `/t/:slug/analytics`
- **State**: in-memory render state only.
- **Error UX**: top error banner.

### GARVEY pages (`public/garvey*.html` + `public/garvey-kanban.js`)
- **Purpose**: phase navigation and kanban execution.
- **Params**: `tenant`.
- **APIs (via module)**:
  - `/api/kanban/ensure`, `/board`, `/cards`, `/cards` POST, `/cards/:id/move`.

---

## 3C) Navigation + link map

### Critical flow link verification

| Source page/button | Destination | Contract intent |
|---|---|---|
| `admin.html` `#businessBtn` | `/intake.html?tenant=<enc>&assessment=business_owner` | business-owner question flow |
| `admin.html` `#vocBtn` | `/voc.html?tenant=<enc>` | customer/VOC-only flow |
| `index.html` `#intakeLink` | `/intake.html?tenant=<enc>&assessment=business_owner` | explicit business-owner default |
| `index.html` `#vocLink` | `/voc.html?tenant=<enc>` | VOC flow entry |
| `join/:slug` redirect | `/intake.html?tenant=<slug>` | business journey default |

### Other notable links
- Template and GARVEY hubs: `/templates.html`, `/garvey.html`.
- Tenant-generated site: `/t/:slug/site`.
- Dashboard: `/dashboard.html?tenant=<slug>` (served from `dashboardnew/index.html`).

### Dead-link / mismatch notes
- No obvious dead links in main flows.
- **Subtle risk**: `public/garvey-a.html` still links `intakeBtn` without explicit `assessment=business_owner` (backend default currently covers this, but explicit is safer).

---

## 4) Data model and lifecycle

> DB initialization exists in two layers: broad bootstrap (`server/db.js`) and stronger kanban schema (`server/kanbanDb.js`). Runtime kanban behavior matches `kanbanDb.js` + `kanbanRoutes.js`.

### Primary entities

| Entity | Create/update/read paths | Fields (runtime-relevant) | Storage |
|---|---|---|---|
| Tenant | `ensureTenant`, `getTenantBySlug` | `id`, `slug` | `tenants` |
| Tenant config | `/api/admin/config`, `/api/templates/select`, `/api/site/generate`, `/t/:slug/site` | JSON config keys allowlisted (`reward_system`, `site`, `features`, etc.) | `tenant_config` |
| Questions | `/api/questions`, seed path | `qid`, `assessment_type`, `question_text`, `option_a..d`, `mapping_a..d` | `questions` |
| Assessment submissions | `/api/intake`, `/voc-intake`, `/api/results/:email`, analytics endpoints | `assessment_type`, archetype/personality outputs, `raw_answers` | `assessment_submissions` |
| Intake sessions | `/api/intake` | `tenant_id`, `email`, `mode` | `intake_sessions` |
| VOC sessions | `/voc-intake` | `tenant_id`, `email` | `voc_sessions` |
| User engagement | `/t/:slug/checkin|action|review|referral|wishlist` | user email + activity payload + points | `users`, `visits`, `actions`, `reviews`, `referrals`, `wishlist` |
| Kanban board | `/api/kanban/*` | board/columns/cards/events with phase and positions | `kanban_boards`, `kanban_columns`, `kanban_cards`, `kanban_card_events` |
| Templates registry | `/api/templates` and frontend fetch | `templates[]` static JSON | `public/templates/registry.json` |

### Lifecycle highlights
- **Tenant creation** is lazy (created when first needed via `ensureTenant` in multiple APIs).
- **Latest assessment logic** for results and analytics uses descending `created_at, id` and `LIMIT 1`.
- **Points awarding** depends on tenant config (`reward_system !== false`).
- **Config writes** pass through allowlist sanitizer in backend.

### Assessment-type representation (important invariant)

| Layer | Field name/value |
|---|---|
| Questions query param | `assessment=business_owner|customer` |
| Results query param filter | `type=business_owner|customer` |
| Persisted submission column | `assessment_type` |
| Intake response | `assessment_type: "business_owner"` |
| VOC response | `assessment_type: "customer"` |

**Do not mix**:
- `assessment` (query) vs `type` (results query) vs `assessment_type` (stored/returned field).
- Legacy `mode` query is not part of authoritative runtime contract.

---

## 5) Critical flows (text sequence diagrams)

### A) Business Intake flow
1. User clicks business assessment button (`admin.html` or `index.html`) -> `/intake.html?...&assessment=business_owner`.
2. `intake.html` reads URL params (`tenant`, `assessment`) and normalizes assessment.
3. FE GETs `/api/questions?assessment=business_owner`.
4. User answers all questions; FE builds `answers: [{qid,answer}]`.
5. FE POSTs `/api/intake` with `{email, tenant, answers}`.
6. Backend validates strict answer count/shape (`validateAnswers`) and scores submission.
7. Backend writes session + assessment submission and returns archetype results.
8. FE renders result cards and allows dashboard navigation.

### B) Voice of the Customer flow
1. User clicks VOC button -> `/voc.html?tenant=<slug>`.
2. `voc.html` loads customer-only question set via `/api/questions?assessment=customer`.
3. User answers all; FE POSTs `/voc-intake` `{email, tenant, answers}`.
4. Backend validates structure + strict answer set and writes customer submission.
5. Response includes archetype + personality outputs; FE renders JSON completion block.

### C) Tenant join flow
1. External link hits `/join/:slug`.
2. Backend resolves tenant by slug.
3. If found -> redirect `/intake.html?tenant=<slug>`; else 404.
4. Tenant propagation continues via query param through subsequent FE/API calls.

### D) Admin/config flow
1. Frontend/admin utility or script reads `/api/admin/config/:tenant`.
2. Update path POST `/api/admin/config` with `{tenant, config}`.
3. Backend merges config with defaults and persists sanitized keys.
4. Downstream points behavior and site generation consume updated config.

### E) Kanban flow
1. FE/module ensures board via `POST /api/kanban/ensure {tenant}`.
2. FE loads board columns via `GET /api/kanban/board?tenant=...`.
3. For phase views, FE reads cards `GET /api/kanban/cards?tenant=...&phase=...`.
4. FE creates cards via `POST /api/kanban/cards`.
5. FE moves cards via `POST /api/kanban/cards/:id/move`.
6. Events queryable via `GET /api/kanban/events?tenant=...&phase=...`.

### F) Tenant platform endpoints (`/t/:slug/*`)
1. All calls pass through `tenantMiddleware` (slug -> tenant + tenant config).
2. Mutations write engagement data + user points.
3. Dashboard/customers/analytics aggregate these datasets plus latest assessment submissions.
4. Optional site route renders HTML from current tenant `site/features` config.

---

## 6) Safety notes: how not to break this repo

### Invariants that must remain true
1. Backend route contracts in `server/index.js` and `server/kanbanRoutes.js` are source of truth.
2. `assessment` query must be only `business_owner|customer` for `/api/questions`.
3. Submission payload format must remain `{email, tenant, answers:[{qid,answer}]}`.
4. Tenant slug propagation (`?tenant=` and `/t/:slug`) must be preserved end-to-end.
5. Frontend should parse backend error shape `{error: string}` when `!res.ok`.
6. Dashboard runtime route `/dashboard.html` maps to `dashboardnew/index.html`.
7. Kanban `phase` must be one of `G,A,R,V,E,Y`.
8. Config writes must pass allowlist (`sanitizeConfig`) to avoid unintended keys.
9. `reward_system=false` disables awarded points.
10. Avoid reintroducing legacy `mode` questions contract.

### Top 10 break points (symptom -> diagnosis -> safe fix)

1. **Base URL drift**
   - Symptom: FE works locally but fails in hosted split deployment.
   - Diagnose: inspect `API_BASE` logic in `public/js/api-contract.js`, `site_intake.html`, `index.html`.
   - Fix: centralize all pages on shared API base module; avoid duplicate literals.

2. **Endpoint string duplication**
   - Symptom: one page posts old path while others work.
   - Diagnose: `rg -n "api/|voc-intake|intake" public/`.
   - Fix: route through `public/js/api-contract.js` and update consumers.

3. **Assessment param mismatch**
   - Symptom: questions 400/404 or wrong set loaded.
   - Diagnose: Network tab query string (`assessment=...`).
   - Fix: force explicit `business_owner` or `customer` in links and parser normalization.

4. **Tenant param loss**
   - Symptom: writes/reads to wrong tenant, missing data in dashboard.
   - Diagnose: inspect URL query + request body `tenant` + `/t/:slug` path.
   - Fix: preserve tenant in every navigation and API payload.

5. **Response shape assumptions**
   - Symptom: FE expects nonexistent keys (`primary_role`, etc.).
   - Diagnose: compare with route implementation tables above.
   - Fix: update renderers/tests to current response keys.

6. **CORS/proxy assumptions**
   - Symptom: browser preflight failures cross-origin.
   - Diagnose: inspect OPTIONS response from backend and FE origin.
   - Fix: maintain CORS middleware or serve same-origin.

7. **Static route shadowing**
   - Symptom: editing `public/dashboard.html` has no runtime effect.
   - Diagnose: note explicit route override for `/dashboard.html`.
   - Fix: edit `dashboardnew/index.html`/`dashboardnew/app.js` or remove override intentionally.

8. **Legacy verification scripts**
   - Symptom: verification falsely fails despite healthy app.
   - Diagnose: check for `mode=25` or old response checks in scripts.
   - Fix: align scripts to current backend contracts.

9. **Schema drift between `db.js` and runtime usage**
   - Symptom: SQL runtime errors on missing/changed columns.
   - Diagnose: compare writes in `server/index.js` with actual DB schema/migrations.
   - Fix: add explicit migration scripts and keep schema source unified.

10. **Optional module absence (`siteGenerator`)**
   - Symptom: `/t/:slug/site` or `/api/site/generate` returns 404.
   - Diagnose: startup logs + optional require path.
   - Fix: ensure `server/siteGenerator.js` exists/loads in deployed artifact.

---

## 7) Observability & debugging playbook

### Local run (end-to-end)
1. Install deps: `npm install`
2. Ensure PostgreSQL running and env set (`DATABASE_URL` or PG* vars).
3. Start server: `npm start`
4. Open:
   - `http://localhost:3000/index.html?tenant=test-business`
   - `http://localhost:3000/admin.html?tenant=test-business`

### Key curl checks
- Health: `curl -s http://localhost:3000/health`
- Business questions: `curl -s "http://localhost:3000/api/questions?assessment=business_owner"`
- Customer questions: `curl -s "http://localhost:3000/api/questions?assessment=customer"`
- Intake submit:
  - build full valid answer set from fetched qids.
  - POST JSON to `/api/intake`.
- VOC submit: same pattern to `/voc-intake`.
- Tenant dashboard: `curl -s "http://localhost:3000/t/test-business/dashboard"`
- Kanban board: `curl -s "http://localhost:3000/api/kanban/board?tenant=test-business"`

### Existing scripts and coverage
- `scripts/garvey-smoke.mjs` covers:
  - health,
  - kanban ensure/board/create/move,
  - business intake flow,
  - VOC flow,
  - key page availability,
  - admin link mapping checks.
- `server/verify.js` exists but currently reflects older contracts (`mode` paths etc.); treat as non-authoritative until updated.

### Logging locations
- Backend logs via `console.log/error` in route handlers.
- Helpful breadcrumbs already present:
  - Questions fetch log (`📊 QUESTIONS FETCH`),
  - Intake/VOC incoming payload logs.
- Browser errors visible in DevTools console for FE pages.

### Debug checklist

**“Questions not loading”**
- Confirm URL has correct `assessment` value.
- Check GET `/api/questions` response status + error body.
- Verify questions table has records for assessment type.

**“Submit fails”**
- Validate payload shape includes `email`, `tenant`, full `answers[]`.
- Check backend validation errors (`expected N answers`, `invalid qid`, etc.).

**“Results missing”**
- Confirm `/api/results/:email` uses normalized email and optional valid `type`.
- Ensure submissions were committed (no DB rollback).

**“Wrong question set shown”**
- Inspect link source (`assessment=business_owner` vs VOC page).
- Verify FE endpoint query at request time.

**“Tenant mismatch”**
- Check current URL `tenant` and payload `tenant` values.
- For `/t/:slug/*`, ensure path slug matches expected tenant.

---

## 8) Testing strategy (current + recommended)

### Current
- No unit/integration test runner configured in `package.json` beyond start.
- Main runnable test is `scripts/garvey-smoke.mjs`.
- Some verify endpoints provide runtime checks (`/api/verify/*`).

### Recommended minimal high-value additions
1. **Contract test script (Node)**
   - Parse `server/index.js` route registrations (method/path list) and assert FE endpoint constants/usage are subset of real routes.
2. **Boot-and-smoke one-command**
   - Add script that starts server in test mode (with isolated DB) then runs `garvey-smoke.mjs`.
3. **Schema/type guard tests**
   - Add thin assertions for `/api/questions`, `/api/intake`, `/voc-intake` response key presence.
4. **Deprecate or update `server/verify.js`**
   - Replace legacy `mode` assumptions with `assessment` contract.

### Suggested single command
- Add `npm run smoke` -> launches server + waits for health + runs `node scripts/garvey-smoke.mjs`.

---

## 9) TODOs + roadmap

### High-risk / high-impact priorities
1. **Unify verification scripts with real contracts**
   - `server/verify.js` still checks legacy `mode` and old result fields; update to current API contract.
2. **Schema source cleanup**
   - Consolidate migration strategy; current `db.js` and runtime SQL imply drift risk.
3. **Centralize API base usage across all frontend pages**
   - `site_intake.html` and some pages still maintain local API_BASE logic.
4. **Make business assessment link explicit everywhere**
   - e.g., `garvey-a.html` intake link currently omits explicit `assessment=business_owner`.

### Medium priorities
5. Add explicit auth/tenant authorization model if multi-tenant isolation is security-critical.
6. Add structured logger (request ID, tenant slug, route).
7. Add API contract doc generation from route tables (this report can be source).

### Low priorities
8. Normalize naming consistency (`question_text` vs `question`, etc.) in frontend display adapters.
9. Add front-end type hints (JSDoc or TS migration) for response models.
10. Add retry/backoff UX for transient fetch failures.

### Next safest refactor plan (optional, low-risk)
1. Keep backend untouched.
2. Move remaining FE pages to use `public/js/api-contract.js`.
3. Introduce one shared `jsonFetch` helper with `!res.ok => throw error` behavior.
4. Update `server/verify.js` to match authoritative contracts.

---

## Appendix: Key contract anchors (jump list)
- `server/index.js`: app bootstrap, middleware, all non-kanban routes.
- `server/kanbanRoutes.js`: all `/api/kanban/*` contracts.
- `server/intelligenceEngine.js`: answer validation and scoring semantics.
- `server/tenant.js`: tenant defaults/config merge behavior.
- `dashboardnew/app.js`: dashboard consumer contract.
- `public/intake.html`, `public/voc.html`: assessment frontends.
- `public/admin.html`, `public/index.html`: canonical navigation wiring.
- `scripts/garvey-smoke.mjs`: current smoke assertions and supported runtime checks.
