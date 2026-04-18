# Repo Mastery Report v2

## Index
- [Changelog (v1 -> v2)](#changelog-v1---v2)
- [1) System overview](#1-system-overview)
- [2) Source-of-truth architecture map](#2-source-of-truth-architecture-map)
- [3) Full route & API contract inventory (authoritative)](#3-full-route--api-contract-inventory-authoritative)
  - [3A) Backend HTTP routes](#3a-backend-http-routes)
  - [3B) Frontend pages + client routes](#3b-frontend-pages--client-routes)
  - [3C) Navigation + link map](#3c-navigation--link-map)
- [Questions Contract (business vs customer)](#questions-contract-business-vs-customer)
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
- New **Customer Reward UI entry flow** at `public/rewards.html` (tenant-aware page + stable API surface).
- New **contract drift checker** script: `scripts/contract-check.mjs`.
- New npm scripts:
  - `npm run contract:check`
  - `npm run smoke`
- New **Youth Development Phase 13 voice delivery layer** (provider adapter + optional section/prompt playback metadata endpoints under `/api/youth-development/tde/voice/*`).
- Phase 13 guarantees voice is optional/non-blocking, uses voice-ready text chunks, and keeps provider configuration abstracted.

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
3. **Customer reward actions**: reward entry buttons -> `rewards.html` -> `/api/rewards/*` wrappers (legacy preserved under `/t/:slug/*`).
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
| static | GET | `/dashboard.html` | none | html file response | n/a | none | `server/index.js` |
| health | GET | `/health` | none | `{status:"ok"}` | n/a | none | `server/index.js` |
| join | GET | `/join/:slug` | tenant must exist | redirect to `/intake.html?tenant=slug` | 404 error json | none | `server/index.js` |
| templates | GET | `/api/templates` | none | `{success:true,templates[]}` | 500 | read registry json | `server/index.js` |
| templates | POST | `/api/templates/select` | body `{tenant,template_id}` required; template id must exist | `{success:true,tenant,template_id}` | 400/500 | upsert tenant config | `server/index.js` |
| rewards wrapper | GET | `/api/rewards/status` | query `tenant` required; optional `email` | rewards summary JSON | 400/404/500 | DB reads | `server/index.js` |
| rewards wrapper | GET | `/api/rewards/history` | query `tenant` required; optional `email`,`limit` | rewards history JSON | 400/404/500 | DB reads | `server/index.js` |
| rewards wrapper | POST | `/api/rewards/checkin` | body `{tenant,email}` required | legacy checkin-shaped JSON | 400/404/500 | delegates to reward helper | `server/index.js` |
| rewards wrapper | POST | `/api/rewards/action` | body `{tenant,email,action_type}` required | legacy action-shaped JSON | 400/404/500 | delegates to reward helper | `server/index.js` |
| rewards wrapper | POST | `/api/rewards/review` | body `{tenant,email,text,media_type?}` required | legacy review-shaped JSON | 400/404/500 | delegates to reward helper | `server/index.js` |
| rewards wrapper | POST | `/api/rewards/referral` | body `{tenant,email,referred_email}` required | legacy referral-shaped JSON | 400/404/500 | delegates to reward helper | `server/index.js` |
| rewards wrapper | POST | `/api/rewards/wishlist` | body `{tenant,email,product_name}` required | legacy wishlist-shaped JSON | 400/404/500 | delegates to reward helper | `server/index.js` |
| questions | GET | `/api/questions` | query `assessment` in `business_owner|customer` | `{success,assessment,count,questions[]}` | 400/404/500 | DB read | `server/index.js` |
| intake | POST | `/api/intake` | body `{email,tenant,answers[]}` + strict validation | `{success,assessment_type:"business_owner",...}` | 400/500 | writes sessions + submissions | `server/index.js` |
| voc | POST | `/voc-intake` | body `{email,tenant,answers[]}` + strict validation | `{success,assessment_type:"customer",...}` | 400/500 | writes sessions + submissions | `server/index.js` |
| results | GET | `/api/results/:email` | `email` required; query `type` optional enum | `{success:true,result}` | 400/404/500 | DB read | `server/index.js` |
| admin | GET | `/api/admin/config/:tenant` | tenant must exist | `{tenant,config,updated_at}` | 404/500 | DB read | `server/index.js` |
| admin | POST | `/api/admin/config` | body `{tenant,config}`; tenant required | `{tenant,config}` | 400/500 | config upsert | `server/index.js` |
| verify | GET | `/api/verify/db` | none | `{status:"DB_OK"}` | 500 | DB ping | `server/index.js` |
| verify | GET | `/api/verify/questions` | none | summary JSON | 500 | in-memory checks | `server/index.js` |
| verify | GET | `/api/verify/scoring` | none | summary JSON | 500 | in-memory checks | `server/index.js` |
| verify | GET | `/api/verify/intelligence/:slug` | slug via tenant middleware | summary JSON | 500 | DB reads | `server/index.js` |
| tenant reward | POST | `/t/:slug/checkin` | body `{email}` | `{success,tenant,event,points_added,points}` | 400/500 | visit + points | `server/index.js` |
| tenant reward | POST | `/t/:slug/action` | body `{email,action_type}` | `{success,tenant,action_type,points_added,points}` | 400/500 | action + points | `server/index.js` |
| tenant reward | POST | `/t/:slug/review` | body `{email,text,media_type?}` | `{success,review,points_added,points}` | 400/500 | review + points | `server/index.js` |
| tenant reward | POST | `/t/:slug/referral` | body `{email,referred_email}` | `{success,points_awarded_each,users[]}` | 400/500 | referral tx + points | `server/index.js` |
| tenant reward | POST | `/t/:slug/wishlist` | body `{email,product_name}` | `{success,wishlist_entry}` | 400/500 | wishlist insert | `server/index.js` |
| tenant | GET | `/t/:slug/dashboard` | slug via middleware | aggregate metrics JSON | 500 | DB reads | `server/index.js` |
| tenant | GET | `/t/:slug/customers` | slug via middleware | rows JSON | 500 | DB reads | `server/index.js` |
| tenant | GET | `/t/:slug/analytics` | slug via middleware | metrics JSON | 500 | DB reads | `server/index.js` |
| tenant site | GET | `/t/:slug/site` | slug via middleware | rendered html | 404/500 | generate html | `server/index.js` |
| site gen | POST | `/api/site/generate` | body `tenant` required + site/features | `{success,tenant,version,preview,pages}` | 400/404/500 | config upsert + generation | `server/index.js` |
| kanban | POST | `/api/kanban/ensure` | `tenant` required | `{success,tenant,board}` | 400/500 | ensure board + columns | `server/kanbanRoutes.js` |
| kanban | GET | `/api/kanban/board` | `tenant` required | `{success,tenant,board,columns[]}` | 400/500 | DB read/ensure | `server/kanbanRoutes.js` |
| kanban | GET | `/api/kanban/cards` | `tenant` + phase | `{success,cards[]}` | 400/500 | DB read | `server/kanbanRoutes.js` |
| kanban | POST | `/api/kanban/cards` | body required | `{success,card}` | 400/500 | insert + event | `server/kanbanRoutes.js` |
| kanban | PUT | `/api/kanban/cards/:id` | numeric id | `{success,card}` | 400/404/500 | update + event | `server/kanbanRoutes.js` |
| kanban | POST | `/api/kanban/cards/:id/move` | numeric id + `to_column_id` | `{success,card}` | 400/404/500 | move + event | `server/kanbanRoutes.js` |
| kanban | GET | `/api/kanban/events` | `tenant` + phase | `{success,events[]}` | 400/500 | DB read | `server/kanbanRoutes.js` |

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
| `public/intake.html` | assessment renderer (business default) | GET `/api/questions`; POST `/api/intake` | `tenant`, `assessment` | `questions/answers/currentIndex` in-memory | inline `showError` + alert email |
| `public/voc.html` | customer VOC dedicated flow | GET `/api/questions?assessment=customer`; POST `/voc-intake` | `tenant` | in-memory question state | inline error text |
| `public/rewards.html` | customer reward actions | GET `/api/rewards/status`; POST `/api/rewards/checkin|action|review|referral|wishlist` | `tenant` required; `email` required for mutations | form/in-memory only | result + status panes with JSON errors |
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

## Questions Contract (business vs customer)

### Authoritative routes
- `GET /api/questions?assessment=business_owner`
- `GET /api/questions?assessment=customer`
- Backend validation requires `assessment ∈ {business_owner, customer}`.

### Question object shape used by FE rendering
```json
{
  "qid": "B01|CU1",
  "assessment_type": "business_owner|customer",
  "question_text": "string",
  "option_a": "string",
  "option_b": "string",
  "option_c": "string",
  "option_d": "string",
  "mapping_a": "json",
  "mapping_b": "json",
  "mapping_c": "json",
  "mapping_d": "json"
}