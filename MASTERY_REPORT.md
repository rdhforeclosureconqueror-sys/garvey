# Repo Mastery Report v2

## Index
- [Changelog (v1 -> v2)](#changelog-v1---v2)
- [1) System overview](#1-system-overview)
- [2) Source-of-truth architecture map](#2-source-of-truth-architecture-map)
- [3) Full route & API contract inventory (authoritative)](#3-full-route--api-contract-inventory-authoritative)
  - [3A) Backend HTTP routes](#3a-backend-http-routes)
  - [3B) Frontend pages + client routes](#3b-frontend-pages--client-routes)
  - [3C) Navigation + link map](#3c-navigation--link-map)
- [4) Data model and lifecycle](#4-data-model-and-lifecycle)
- [5) Critical flows (sequence diagrams in text)](#5-critical-flows-sequence-diagrams-in-text)
- [6) Safety notes: how not to break this repo](#6-safety-notes-how-not-to-break-this-repo)
- [7) Observability & debugging playbook](#7-observability--debugging-playbook)
- [8) Testing strategy (current + recommended)](#8-testing-strategy-current--recommended)
- [9) Completeness proof (programmatic)](#9-completeness-proof-programmatic)
- [10) Customer Reward (discover, contract, fix, verify)](#10-customer-reward-discover-contract-fix-verify)
- [11) Drift-proof automation](#11-drift-proof-automation)
- [12) TODOs + roadmap](#12-todos--roadmap)

---

## Changelog (v1 -> v2)

### Added
- New **Customer Reward UI entry flow** at `public/rewards.html` (tenant-aware page that calls reward-related backend endpoints under `/t/:slug/*`).
- New **contract drift checker** script: `scripts/contract-check.mjs`.
- New npm scripts:
  - `npm run contract:check`
  - `npm run smoke`

### Fixed
- Rewired reward-oriented buttons/links to route to reachable reward page:
  - kept actions semantics intact (`actionsLink/actionsBtn` remain home/actions routing),
  - added dedicated rewards entrypoints (`rewardsLink/rewardsBtn` -> `/rewards.html?tenant=...`).
- Added rewards CTA in generated site output (`server/siteGenerator.js`).
- Extended smoke flow to validate reward endpoints and reward-link mapping (`scripts/garvey-smoke.mjs`).

### Strengthened
- Added programmatic “completeness proof” and route/frontend contract checking output to avoid silent drift.

### Before vs after mapping (reward reattachment)
| Area | Before | After |
|---|---|---|
| UI entrypoint | Rewards capability implicit and easy to miss | Canonical `rewards.html?tenant=...` with dedicated IDs |
| Route surface | Legacy tenant mutations only (`/t/:slug/*`) | Legacy preserved + `/api/rewards/*` wrappers + status/history |
| FE integration | Mixed direct calls and routing ambiguity | Tenant-aware wrapper calls with stable JSON |
| Drift detection | Manual review | `contract-check` asserts route/call/link consistency |

---

## 1) System overview

### What this app is
A multi-tenant customer-experience + business-intelligence platform with:
- Assessment intake (`business_owner`) and VOC intake (`customer`) flows.
- Tenant engagement actions that award points (check-in/actions/reviews/referrals/wishlist).
- Owner analytics/dashboard.
- Template-based tenant site generation.
- GARVEY kanban workflow.

### Core capabilities and user journeys
1. **Business intake**: entry buttons -> `intake.html` -> `/api/questions?assessment=business_owner` -> `/api/intake`.
2. **VOC intake**: VOC buttons -> `voc.html` -> `/api/questions?assessment=customer` -> `/voc-intake`.
3. **Customer reward actions**: reward entry buttons -> `rewards.html` -> `/t/:slug/checkin|action|review|referral|wishlist`.
4. **Owner insights**: dashboard page -> `/t/:slug/dashboard|customers|analytics`.
5. **Site/template management**: `templates.html` + `site_intake.html` -> `/api/templates/select` + `/api/site/generate` -> `/t/:slug/site`.
6. **Execution planning**: GARVEY pages + kanban APIs under `/api/kanban/*`.

### Runtime topology
- **Backend**: Express (`server/index.js`) with mounted kanban router (`server/kanbanRoutes.js`).
- **Static frontend**: served from `public/`.
- **Dashboard override**: `/dashboard.html` serves `dashboardnew/index.html`.
- **Data store**: PostgreSQL through `pg` pool (`server/db.js`).
- **CORS**: permissive (`*`) headers configured in middleware.
- **Auth**: no explicit auth middleware found; tenant slug/params drive tenancy.

### Environment assumptions / deploy
- `npm start` runs `node server/index.js`.
- DB via `DATABASE_URL` or fallback PG* env vars.
- Client-side API base is same-origin by default; hosted split uses hostname detection (`garveyfrontend` -> render backend host).

---

## 2) Source-of-truth architecture map

### Folder map

| Folder | Responsibility | Key sources |
|---|---|---|
| `server/` | Route contracts, middleware, engines, DB schema bootstrap, tenant logic | `index.js`, `kanbanRoutes.js`, `db.js`, `tenant.js`, `intelligenceEngine.js`, `kanbanDb.js`, `siteGenerator.js` |
| `public/` | Browser entry pages and thin UI logic | `index.html`, `admin.html`, `intake.html`, `voc.html`, `rewards.html`, `site_intake.html`, `templates.html`, `templates.js`, `garvey-kanban.js`, `js/api-contract.js` |
| `dashboardnew/` | Runtime dashboard UI for `/dashboard.html` | `index.html`, `app.js` |
| `scripts/` | Verification and drift tooling | `garvey-smoke.mjs`, `contract-check.mjs` |
| root config | startup scripts/deps | `package.json` |

### Contract sources vs consumers
- **Authoritative contract sources**:
  - HTTP: `server/index.js`, `server/kanbanRoutes.js`.
  - validation/scoring: `server/intelligenceEngine.js` (`validateAnswers`, `scoreSubmission`).
  - config allowlist: `server/index.js` (`sanitizeConfig`, `ALLOWED_CONFIG_KEYS`).
- **Contract consumers**:
  - FE API callers in `public/*.html`, `public/*.js`, `dashboardnew/app.js`.
  - automation callers in `scripts/garvey-smoke.mjs` and `scripts/contract-check.mjs`.

---

## 3) Full route & API contract inventory (authoritative)

## 3A) Backend HTTP routes

> Auth requirements: none explicitly implemented.

### Global/static behavior
- Middleware: JSON parser + CORS headers + OPTIONS short-circuit.
- Static serving: `public/`, plus `/dashboardnew` static mount.
- Runtime override: `GET /dashboard.html` serves dashboardnew app.

### Route table (all discovered runtime routes)

| Subsystem | Method | Path | Request + validation | Success shape | Failure shape | Side effects | Anchor |
|---|---|---|---|---|---|---|---|
| static | GET | `/dashboard.html` | none | html file response | n/a | none | `server/index.js` `app.get('/dashboard.html'...)` |
| health | GET | `/health` | none | `{status:"ok"}` | n/a | none | `server/index.js` `app.get("/health")` |
| join | GET | `/join/:slug` | tenant must exist | redirect to `/intake.html?tenant=slug` | 404 error json | none | `server/index.js` `app.get("/join/:slug")` |
| templates | GET | `/api/templates` | none | `{success:true,templates[]}` | 500 | read registry json | `server/index.js` `app.get("/api/templates")` |
| templates | POST | `/api/templates/select` | body `{tenant,template_id}` required; template id must exist in registry | `{success:true,tenant,template_id}` | 400/500 | upsert tenant config | `server/index.js` `app.post("/api/templates/select")` |
| rewards wrapper | GET | `/api/rewards/status` | query `tenant` required; optional `email` | user or tenant rewards summary JSON | 400/404/500 | DB reads | `server/index.js` `app.get("/api/rewards/status")` |
| rewards wrapper | GET | `/api/rewards/history` | query `tenant` required; optional `email`,`limit` | history JSON (or limitation note if no email) | 400/404/500 | DB reads | `server/index.js` `app.get("/api/rewards/history")` |
| rewards wrapper | POST | `/api/rewards/checkin` | body `{tenant,email}` required | same shape as legacy checkin | 400/404/500 | delegates to reward service helper |
| rewards wrapper | POST | `/api/rewards/action` | body `{tenant,email,action_type}` required | same shape as legacy action | 400/404/500 | delegates to reward service helper |
| rewards wrapper | POST | `/api/rewards/review` | body `{tenant,email,text,media_type?}` required | same shape as legacy review | 400/404/500 | delegates to reward service helper |
| rewards wrapper | POST | `/api/rewards/referral` | body `{tenant,email,referred_email}` required | same shape as legacy referral | 400/404/500 | delegates to reward service helper |
| rewards wrapper | POST | `/api/rewards/wishlist` | body `{tenant,email,product_name}` required | same shape as legacy wishlist | 400/404/500 | delegates to reward service helper |
| questions | GET | `/api/questions` | query `assessment` in `business_owner|customer` | `{success,assessment,count,questions[]}` | 400/404/500 | DB read | `server/index.js` `app.get("/api/questions")` |
| intake | POST | `/api/intake` | body `{email,tenant,answers[]}` + strict `validateAnswers("business_owner")` | `{success,assessment_type:"business_owner",session_id,primary,secondary,weakness,...}` | 400/500 | writes sessions + submissions | `server/index.js` `app.post("/api/intake")` |
| voc | POST | `/voc-intake` | body `{email,tenant,answers[]}` + structure + strict customer validation | `{success,assessment_type:"customer",...}` | 400/500 | writes voc sessions + submissions | `server/index.js` `app.post("/voc-intake")` |
| results | GET | `/api/results/:email` | `email` required; query `type` optional with strict enum | `{success:true,result}` | 400/404/500 | DB read | `server/index.js` `app.get("/api/results/:email")` |
| admin | GET | `/api/admin/config/:tenant` | tenant must exist | `{tenant,config,updated_at}` | 404/500 | DB read | `server/index.js` `app.get("/api/admin/config/:tenant")` |
| admin | POST | `/api/admin/config` | body `{tenant,config}`; tenant required | `{tenant,config}` | 400/500 | config upsert | `server/index.js` `app.post("/api/admin/config")` |
| verify | GET | `/api/verify/db` | none | `{status:"DB_OK"}` | 500 DB_FAIL | DB ping | `server/index.js` `app.get("/api/verify/db")` |
| verify | GET | `/api/verify/questions` | none | question integrity summary | 500 | in-memory checks | `server/index.js` `app.get("/api/verify/questions")` |
| verify | GET | `/api/verify/scoring` | none | scoring integrity summary | 500 | in-memory checks | `server/index.js` `app.get("/api/verify/scoring")` |
| verify | GET | `/api/verify/intelligence/:slug` | slug via tenant middleware | verify counts/checks | 500 | DB reads | `server/index.js` `app.get("/api/verify/intelligence/:slug")` |
| tenant platform / reward | POST | `/t/:slug/checkin` | body `email` required | `{success,tenant,event,points_added,points}` | 400/500 | visit insert + points update | `server/index.js` `app.post("/t/:slug/checkin")` |
| tenant platform / reward | POST | `/t/:slug/action` | body `email`,`action_type` required | `{success,tenant,action_type,points_added,points}` | 400/500 | action insert + points update | `server/index.js` `app.post("/t/:slug/action")` |
| tenant platform / reward | POST | `/t/:slug/review` | body `email`,`text` required; optional `media_type` | `{success,review,points_added,points}` | 400/500 | review insert + points update | `server/index.js` `app.post("/t/:slug/review")` |
| tenant platform / reward | POST | `/t/:slug/referral` | body `email`,`referred_email` required | `{success,points_awarded_each,users[]}` | 400/500 | referral tx + points updates | `server/index.js` `app.post("/t/:slug/referral")` |
| tenant platform / reward | POST | `/t/:slug/wishlist` | body `email`,`product_name` required | `{success,wishlist_entry}` | 400/500 | wishlist insert | `server/index.js` `app.post("/t/:slug/wishlist")` |
| tenant platform | GET | `/t/:slug/dashboard` | slug via middleware | aggregate metrics incl total_points | 500 | DB reads | `server/index.js` `app.get("/t/:slug/dashboard")` |
| tenant platform | GET | `/t/:slug/customers` | slug via middleware | customer table rows | 500 | DB reads | `server/index.js` `app.get("/t/:slug/customers")` |
| tenant platform | GET | `/t/:slug/analytics` | slug via middleware | visits/growth/archetypes + latest assessments | 500 | DB reads | `server/index.js` `app.get("/t/:slug/analytics")` |
| tenant site | GET | `/t/:slug/site` | slug via middleware | rendered html | 404/500 | generate html from config | `server/index.js` `app.get("/t/:slug/site")` |
| site gen | POST | `/api/site/generate` | body `tenant` required + optional site/features | `{success,tenant,version,preview,pages}` | 400/404/500 | config upsert + generation | `server/index.js` `app.post("/api/site/generate")` |
| kanban | POST | `/api/kanban/ensure` | `tenant` required | `{success,tenant,board}` | 400/500 | ensure board + columns | `server/kanbanRoutes.js` `router.post("/ensure")` |
| kanban | GET | `/api/kanban/board` | `tenant` required | `{success,tenant,board,columns[]}` | 400/500 | DB read/ensure | `server/kanbanRoutes.js` `router.get("/board")` |
| kanban | GET | `/api/kanban/cards` | `tenant` + `phase in G,A,R,V,E,Y` | `{success,cards[]}` | 400/500 | DB read | `server/kanbanRoutes.js` `router.get("/cards")` |
| kanban | POST | `/api/kanban/cards` | body `tenant,phase,title,column_id` required | `{success,card}` | 400/500 | insert card + event | `server/kanbanRoutes.js` `router.post("/cards")` |
| kanban | PUT | `/api/kanban/cards/:id` | numeric `id`; optional fields | `{success,card}` | 400/404/500 | update + event | `server/kanbanRoutes.js` `router.put("/cards/:id")` |
| kanban | POST | `/api/kanban/cards/:id/move` | numeric id + `to_column_id` | `{success,card}` | 400/404/500 | move + event | `server/kanbanRoutes.js` `router.post("/cards/:id/move")` |
| kanban | GET | `/api/kanban/events` | `tenant` + valid phase | `{success,events[]}` | 400/500 | DB read | `server/kanbanRoutes.js` `router.get("/events")` |

### Non-obvious route behavior
- `/dashboard.html` route handler masks static `public/dashboard.html`.
- `/join/:slug` hard-routes to business intake path.
- `/t/:slug/*` tenancy comes from path slug (not body/query tenant).

---

## 3B) Frontend pages + client routes

| Page/module | Purpose | API calls | Required params | State | Error handling |
|---|---|---|---|---|---|
| `public/index.html` | tenant landing/nav | none direct | `tenant` optional | URL -> in-memory link wiring | none |
| `public/admin.html` | launcher for core flows | none direct | `tenant` optional | URL -> links | none |
| `public/intake.html` | assessment renderer (business default) | GET `/api/questions`; POST `/api/intake` or `/voc-intake` based on normalized assessment | `tenant`, `assessment` | `questions/answers/currentIndex` in-memory | inline `showError` + alert email |
| `public/voc.html` | customer VOC dedicated flow | GET `/api/questions?assessment=customer`; POST `/voc-intake` | `tenant` | in-memory question state | inline error text |
| `public/rewards.html` | customer reward actions (newly wired) | GET `/api/rewards/status`; POST `/api/rewards/checkin|action|review|referral|wishlist` | `tenant` required; `email` required for mutations | form/in-memory only | result + status panes with JSON errors |
| `public/site_intake.html` | site config intake | POST `/api/site/generate` | `tenant` required | form fields | status message with err/ok |
| `public/templates.html` + `public/templates.js` | template browse/select | fetch `/templates/registry.json`, POST `/api/templates/select` | `tenant` for select | in-memory render | status/alert |
| `dashboardnew/app.js` | owner analytics dashboard runtime | GET `/t/:slug/dashboard|customers|analytics` | `tenant` required | in-memory render datasets | top banner error |
| `public/garvey-kanban.js` | kanban client module | `/api/kanban/*` methods | `tenant`, `phase` | in-memory DOM state | caller-handled |

---

## 3C) Navigation + link map

### Key flow links

| Source | Control | Destination |
|---|---|---|
| `public/admin.html` | `#businessBtn` | `/intake.html?tenant=<enc>&assessment=business_owner` |
| `public/admin.html` | `#vocBtn` | `/voc.html?tenant=<enc>` |
| `public/admin.html` | `#actionsBtn` | `/index.html?tenant=<enc>` |
| `public/admin.html` | `#rewardsBtn` | `/rewards.html?tenant=<enc>` |
| `public/index.html` | `#intakeLink` | `/intake.html?tenant=<enc>&assessment=business_owner` |
| `public/index.html` | `#vocLink` | `/voc.html?tenant=<enc>` |
| `public/index.html` | `#actionsLink` | `/index.html?tenant=<enc>` |
| `public/index.html` | `#rewardsLink` | `/rewards.html?tenant=<enc>` |
| backend redirect | `/join/:slug` | `/intake.html?tenant=<slug>` |
| `server/siteGenerator.js` | generated “🎁 Rewards” button | `/rewards.html?tenant=<slug>` |

### Dead-link/reachability findings
- Fixed previously weak reward reachability by introducing concrete destination `rewards.html` and wiring both admin/index entry points.
- No unknown API call targets detected by `contract-check` script.

---

## 4) Data model and lifecycle

### Primary entities
- **tenants**: created lazily via `ensureTenant`.
- **users**: tenant-scoped emails + points accumulation from reward actions.
- **questions**: assessment question bank (`assessment_type`, options/mappings).
- **assessment_submissions**: normalized store for both intake and VOC results.
- **tenant_config**: feature toggles + site config + reward settings (`reward_system`, multipliers).
- **kanban_* tables**: board/column/card/event.
- **reward activity tables**: `visits`, `actions`, `reviews`, `referrals`, `wishlist`.

### Create/read/update summary
- Intake/VOC writes sessions + `assessment_submissions`.
- Reward endpoints mutate user points and activity tables.
- Dashboard/analytics read aggregates and latest submissions.
- Config writes are sanitized allowlist merges.

### Retention / ordering rules
- Results lookup and analytics "latest" semantics: `ORDER BY created_at DESC, id DESC LIMIT 1`.
- Kanban events ordered by recent created_at desc.

### Assessment-type naming map (must not mix)
- Query: `assessment` on `/api/questions`.
- Query: `type` on `/api/results/:email` filter.
- Stored/response field: `assessment_type`.

---

## 5) Critical flows (sequence diagrams in text)

### Business Intake flow
1. User enters from admin/index link with `assessment=business_owner`.
2. `intake.html` GETs `/api/questions?assessment=business_owner`.
3. User answers all qids.
4. FE POSTs `/api/intake` with `{email,tenant,answers[]}`.
5. Backend validates answers strictly and writes submission/session.
6. FE renders primary/secondary/weakness response.

### Voice of the Customer flow
1. User opens `/voc.html?tenant=...`.
2. FE GETs `/api/questions?assessment=customer`.
3. FE POSTs `/voc-intake` with strict `{qid,answer}` list.
4. Backend scores archetype + personality and persists submission.

### Tenant join flow
1. External route `/join/:slug`.
2. If tenant exists, backend redirects to `/intake.html?tenant=:slug`.

### Admin/config flow
1. FE/tool calls GET `/api/admin/config/:tenant`.
2. POST `/api/admin/config` updates allowed config keys.
3. Tenant-scoped endpoints consume merged config at runtime.

### Kanban flow
1. FE ensures board (`POST /api/kanban/ensure`).
2. Reads columns/cards (`GET /board`, `GET /cards`).
3. Creates/moves cards (`POST /cards`, `POST /cards/:id/move`).
4. Reviews events (`GET /events`).

### Tenant platform endpoints flow (`/t/:slug/*`)
1. Middleware validates slug and loads config.
2. Mutations store activity + point awards.
3. Dashboard/analytics summarize activity and assessment insights.

### Customer Reward flow (newly surfaced)
1. User clicks rewards entry in index/admin/generated site.
2. Opens `rewards.html?tenant=...`.
3. Provides customer email; action buttons call tenant reward endpoints:
   - check-in -> `/t/:slug/checkin`
   - quick action -> `/t/:slug/action`
   - review/referral/wishlist -> dedicated endpoints.
4. Page renders backend JSON response with points fields.

---

## 6) Safety notes: how not to break this repo

### Invariants
1. Backend route signatures are authoritative.
2. `assessment` values only `business_owner|customer`.
3. Reward endpoints require tenant scoping (slug path for legacy routes; tenant query/body on wrappers).
4. Tenant query propagation must be preserved across links.
5. CORS middleware must remain for split-host setup.
6. `/dashboard.html` override behavior must be understood before editing dashboard files.

### Top 15 break points (symptom / cause / fix)
1. Wrong question set -> wrong `assessment` query -> normalize links/parsing in intake page.
2. Intake submit 400 -> missing full answers -> send exact question count and unique qids.
3. VOC submit 400 -> bad answer shape -> ensure `{qid,answer}` for each answer.
4. Results not found -> email mismatch/normalization -> use same normalized email path.
5. Reward points zero unexpectedly -> `reward_system` disabled in config -> inspect `/api/admin/config/:tenant`.
6. Reward flow unreachable -> broken links -> check `index/admin/siteGenerator` reward href wiring.
7. Dashboard edits not visible -> editing wrong file -> edit `dashboardnew/*` not `public/dashboard.html`.
8. FE unknown endpoint -> string drift -> run `npm run contract:check` and update FE call path.
9. Cross-origin failures -> base URL mismatch -> use shared API base module or same origin.
10. Kanban phase errors -> invalid phase -> enforce enum `G,A,R,V,E,Y` in callers.
11. Tenant mismatch -> missing tenant in URL/body -> ensure link carries tenant and payload includes tenant where required.
12. Config keys dropped -> not in allowlist -> extend `ALLOWED_CONFIG_KEYS` intentionally.
13. Site route 404 -> optional generator missing -> ensure `server/siteGenerator.js` loads in deployment.
14. Smoke false negatives -> backend not running/DB unavailable -> start server + DB first.
15. Verification drift -> report outdated vs code -> regenerate via contract-check and update docs.

---

## 7) Observability & debugging playbook

### Local run
1. `npm install`
2. Configure Postgres env (`DATABASE_URL` or PG* vars).
3. `npm start`
4. Open:
   - `http://localhost:3000/index.html?tenant=test-business`
   - `http://localhost:3000/admin.html?tenant=test-business`
   - `http://localhost:3000/rewards.html?tenant=test-business`

### Curl checks
- Health: `curl -s http://localhost:3000/health`
- Questions: `curl -s "http://localhost:3000/api/questions?assessment=business_owner"`
- VOC questions: `curl -s "http://localhost:3000/api/questions?assessment=customer"`
- Reward checkin:
  ```bash
  curl -s -X POST "http://localhost:3000/t/test-business/checkin" \
    -H "Content-Type: application/json" \
    -d '{"email":"user@example.com"}'