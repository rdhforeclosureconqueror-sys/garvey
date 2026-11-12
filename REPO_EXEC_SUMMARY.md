# REPO Executive Summary (Full System Baseline)

_Last audited: 2026-03-28 (UTC). Scope: full repo (`public`, `dashboardnew`, `server`, `scripts`, `tests`)._

---

## 1) One-page executive overview

### What the system is
GARVEY is a **multi-tenant customer-return + business-intelligence platform** combining:
- public-facing intake/rewards/journey pages,
- an assessment + scoring backend,
- campaign tracking + QR distribution,
- a GARVEY phase board (Kanban) workflow,
- and an owner dashboard for analytics and operational follow-up.

Primary product loop:
1. Business owner and customer take assessments.
2. System scores archetypes and stores result artifacts.
3. Customer actions (check-in/review/referral/etc.) accumulate points and event history.
4. Campaign attribution (CID) is tracked across events.
5. Owner dashboard consolidates customer, segment, campaign, and trend metrics.

Core implementation anchors:
- Backend API/router: `server/index.js`.
- Tenant/context + config defaults: `server/tenant.js`.
- Rewards orchestration helpers: `processCheckinReward`, `processActionReward`, `processReviewReward`, `processReferralReward`, `processWishlistReward` in `server/index.js`.
- Dashboard app shell: `dashboardnew/index.html` + `dashboardnew/app.js`.
- Frontend context glue: `public/garvey_ui.js`.
- Customer Return Engine client module: `public/engine/customer-return-engine.js`.

### What it currently does end-to-end (capabilities)
- Public entry (`/index.html`) propagates tenant context and drives users to owner intake, VOC, rewards, GARVEY, templates, dashboard.
- Owner intake (`/api/intake`) and customer VOC (`/voc-intake`) both validate answers, score archetypes, persist sessions + submissions, and return result payloads.
- Rewards actions support check-in/action/review/referral/wishlist with points and per-user history/status APIs.
- Campaign tooling supports create/list/qr and records campaign events across assessment/reward/share lifecycle.
- GARVEY phase pages (`garvey-g/a/r/v/e/y`) run tenant-scoped Kanban operations.
- Dashboard displays metrics, customer list, segment distribution, campaign summary, owner/customer result snapshots, customer lookup, and campaign link generation.
- Tenant site generation exists via `/api/site/generate`, template selection (`/api/templates/select`), and optional `/t/:slug/site` render path.

### Environments/hosts assumed
- **Single Node/Express server** serves static + API in one process (`express.static(...)`, `/dashboardnew` static mount).
- Optional split-host logic exists:
  - frontend on `garveyfrontend...` redirects API/static actions to `https://garveybackend.onrender.com` in multiple pages/scripts (`public/dashboard.html`, `public/garvey_premium.html`, `public/js/api-contract.js`, GARVEY phase pages).
- DB is PostgreSQL via `pg` with local defaults or `DATABASE_URL`.

### Readiness status
#### Ready now
- Core routes all present and contract-checked (47/47 documented in `scripts/contract-check.mjs`).
- Rewards workflow and client engine tests pass.
- Question fetching, intake scoring, VOC scoring, campaign creation/list/qr, dashboard analytics, kanban APIs are implemented.

#### Prototype/partial
- Premium pages are intentionally text-shell wrappers (`rewards_premium.html`, `garvey_premium.html`).
- Tenant site rendering depends on optional `siteGenerator` module (`/t/:slug/site` can 404 with “siteGenerator not installed”).
- Admin and auth model are email/allowlist heuristic, not hardened identity.

#### Missing / not production-hardened
- No robust auth/session/JWT/OAuth; many sensitive APIs are open beyond weak query/header-based checks.
- No CI pipeline shown in repo.
- No end-to-end browser automation in-repo; smoke exists but external server+DB dependent.
- Missing hero image asset (`/aurora/assets/images/hero.jpg`) causes visual fallback/404 risk.

---

## 2) Architecture map (high-level)

### Major subsystems/modules
1. **Public UX pages (`public/*.html`)**
   - Landing and flow pages (`index`, `intake`, `voc`, `results_*`, `rewards*`, `garvey*`, `templates`, `site_intake`, `admin`).
2. **Dashboard app (`dashboardnew`)**
   - Data-rich owner console (`dashboardnew/index.html` + `dashboardnew/app.js`) mounted via `/dashboard.html` and `/dashboardnew` static.
3. **Server API (`server/index.js`)**
   - Main route hub for assessments, rewards, campaigns, tenant dashboard APIs, template/site tooling, admin config, verify endpoints.
4. **GARVEY context utilities (`public/garvey_ui.js`, `public/aurora/aurora.js`)**
   - Query/localStorage context propagation and link rewriting.
5. **Customer Return Engine module (`public/engine/customer-return-engine.js`)**
   - Client-side orchestration/persistence for reward actions and status/ledger fetching.
6. **Scoring & result engines (`server/intelligenceEngine.js`, `server/resultEngine.js`)**
   - Question set use, answer validation, role derivation, percent normalization, guidance text.
7. **Data + schema (`server/db.js`, `server/kanbanDb.js`)**
   - Bootstraps core tenant/reward/intake/campaign/kanban schema.
8. **Adaptive engine (`server/adaptiveEngine.js`)**
   - Periodic tenant config tuning based on usage metrics.

### Data flow for ctx (tenant/email/cid/rid/crid/owner_*)
1. **Entry**: query params + GARVEY ctx helpers (`ctx()`, `withCtx()`, `setLoginCtx()`) merge URL and storage context.
2. **Assessment actions**:
   - Owner intake sends `{ tenant, email, cid, answers }` to `/api/intake`.
   - Customer VOC sends `{ tenant, email, cid, answers }` to `/voc-intake`.
3. **Result identity propagation**:
   - Result IDs (`rid` / `crid`) are persisted in URL and localStorage keys like `garvey_owner_rid:<tenant>:<email>` and `garvey_customer_rid:<tenant>:<email>`.
4. **Rewards actions**:
   - Engine maps ctx into `/api/rewards/*` payloads including tenant/email/cid/result_id.
5. **Share-to-owner**:
   - `/api/customer/share-result` stores campaign event meta with `owner_email`, `owner_rid`, returns dashboard URL.
6. **Dashboard consumption**:
   - `dashboardnew/app.js` calls `/t/:slug/*` analytics routes + `/api/results/:email` + campaign APIs using tenant/email context.

### Where state lives
- **Postgres tables**: tenants/users/visits/actions/reviews/referrals/wishlist/intake_sessions/voc_sessions/assessment_submissions/campaigns/campaign_events/tenant_config/questions/kanban_* and legacy compatibility tables.
- **localStorage keys**:
  - `garvey_ctx_v1`
  - `garvey_login_ctx_v1`
  - `garvey_customer_return_engine_v1`
  - `garvey_owner_rid:<tenant>:<email>`
  - `garvey_customer_rid:<tenant>:<email>`
- **Engine persisted keys**: `ctx`, `status`, `ledger`, `lastEvent`, `persistedAt` in `garvey_customer_return_engine_v1`.

---

## 3) Full route inventory (Pages + APIs)

## A) Pages (public/*.html + dashboardnew)

| Path | Purpose | Required ctx | Links to / calls | Implementing files |
|---|---|---|---|---|
| `/index.html` | Main landing + navigation shell | tenant optional | intake/voc/rewards/garvey/templates/dashboard | `public/index.html`, `public/aurora/aurora.js`, `public/garvey_ui.js` |
| `/intake.html` | Owner/customer assessment UI | tenant required for tenancy; cid optional | `/api/questions`, `/api/intake` or `/voc-intake`, `/api/kanban/ensure`, result pages | `public/intake.html` |
| `/voc.html` | Customer VOC assessment page | tenant required; cid optional | `/api/questions?assessment=customer`, `/voc-intake`, `results_customer` | `public/voc.html` |
| `/results_owner.html` | Owner result view + archetype links + CTAs | tenant+email required; cid/rid optional | `/api/results/:email`, owner archetype, dashboard, GARVEY | `public/results_owner.html` |
| `/results_customer.html` | Customer results + share-to-owner + rewards CTA | tenant+email required; cid/crid optional | `/api/results/:email`, `/api/customer/share-result`, `/api/tenant/lookup`, rewards | `public/results_customer.html` |
| `/rewards.html` | Operational rewards action console | tenant required; email for per-user actions | `/api/rewards/status/history/*` via engine | `public/rewards.html`, `public/engine/customer-return-engine.js` |
| `/rewards_premium.html` | Premium wrapper to start rewards flow | tenant optional | redirects/starts `rewards.html` flow | `public/rewards_premium.html` |
| `/garvey_premium.html` | Premium wrapper to GARVEY hub | tenant optional | `/garvey.html`, `/t/:slug/site` | `public/garvey_premium.html` |
| `/garvey.html` | GARVEY phase hub | tenant required for site/kanban usefulness | `/garvey-g/a/r/v/e/y.html`, `/t/:slug/site` | `public/garvey.html` |
| `/garvey-g.html` | GARVEY Gather Kanban | tenant required | `/api/kanban/ensure/board/cards`, create/move card | `public/garvey-g.html`, `public/garvey-kanban.js` |
| `/garvey-a.html` | GARVEY Assess Kanban + assessment shortcut | tenant required | same kanban APIs, `/intake.html`, `/t/:slug/site` | `public/garvey-a.html`, `public/garvey-kanban.js` |
| `/garvey-r.html` | GARVEY Route Kanban | tenant required | same kanban APIs | `public/garvey-r.html`, `public/garvey-kanban.js` |
| `/garvey-v.html` | GARVEY Value Kanban + completion buttons | tenant required | same kanban APIs, `/admin.html`, `/t/:slug/site` | `public/garvey-v.html`, `public/garvey-kanban.js` |
| `/garvey-e.html` | GARVEY Evaluate Kanban + readiness confirmations | tenant required | same kanban APIs | `public/garvey-e.html`, `public/garvey-kanban.js` |
| `/garvey-y.html` | GARVEY Yield Kanban + completion confirmations | tenant required | same kanban APIs | `public/garvey-y.html`, `public/garvey-kanban.js` |
| `/dashboard.html` | Dashboard entry route (served dashboardnew) | tenant+email required unless admin allowlisted | dashboard API suite | `server/index.js` route + `dashboardnew/index.html` + `dashboardnew/app.js`; legacy wrapper `public/dashboard.html` |
| `/dashboardnew/index.html` | Actual dashboard UI | same as above | `/t/:slug/*`, `/api/results`, `/api/campaigns/*` | `dashboardnew/index.html`, `dashboardnew/app.js` |
| `/owner_archetype.html` | Owner archetype deep dive | tenant required; type slug expected | static archetype JSON + path/dashboard links | `public/owner_archetype.html`, `public/garvey_owner_archetypes.json` |
| `/customer_archetype.html` | Customer/buyer archetype deep dive | tenant required; type slug expected | static archetype JSON + results/rewards/dashboard links | `public/customer_archetype.html`, `public/garvey_customer_archetypes.json` |
| `/templates.html` | Template chooser UI | tenant required for select | `/templates/registry.json`, `/api/templates/select`, `/t/:slug/site` | `public/templates.html`, `public/templates.js` |
| `/site_intake.html` | Site config intake + generator trigger | tenant required | `/api/site/generate`, `/t/:slug/site` | `public/site_intake.html` |
| `/admin.html` | Legacy navigation launchpad (not secure admin panel) | tenant optional | links to intake/voc/rewards/garvey/dashboard | `public/admin.html` |
| `/templates/*/index.html` | Static template preview pages | none | static only | `public/templates/.../index.html` |

## B) APIs (server routes)

| Method + path | Purpose | Required params/body | DB tables touched (read/write) | Called by | Auth/guard |
|---|---|---|---|---|---|
| `GET /health` | Liveness | none | none | ops/manual | none |
| `GET /join/:slug` | tenant join redirect | slug | tenants (read) | external/share links | none |
| `GET /api/templates` | template registry read | none | none (filesystem) | templates UI | none |
| `POST /api/templates/select` | persist selected template | tenant, template_id | tenants, tenant_config (R/W) | `templates.js` | none |
| `POST /api/campaigns/create` | create campaign | tenant, label (+slug/source/medium) | tenants, campaigns (R/W) | dashboard campaign creator | none |
| `GET /api/campaigns/list` | list campaigns + counters | tenant | tenants, campaigns, campaign_events (read) | dashboard | none |
| `GET /api/campaigns/qr` | QR image for campaign target | tenant,cid,target,format | campaigns (indirect read through URL semantics only) | dashboard QR preview | none |
| `POST /api/kanban/ensure` | ensure board/columns/defaults | tenant (+include_defaults) | tenants, kanban_boards/columns/cards (R/W) | intake, GARVEY pages | none |
| `GET /api/kanban/board` | board + columns | tenant | tenants, kanban_boards, kanban_columns (R/W due ensure) | GARVEY pages | none |
| `GET /api/kanban/cards` | cards by phase | tenant, phase | tenants, kanban_boards/cards (R/W due ensure) | GARVEY pages | none |
| `POST /api/kanban/cards` | create card | tenant,phase,column_id,title | tenants, kanban_cards, kanban_card_events (W) | GARVEY pages | none |
| `PUT /api/kanban/cards/:id` | update card attrs | card id + fields | kanban_cards, kanban_card_events (W) | available API (not wired in UI) | none |
| `POST /api/kanban/cards/:id/move` | move card column | card id, to_column_id | kanban_cards, kanban_card_events (W) | GARVEY pages | none |
| `GET /api/kanban/events` | card event history | tenant (+limit) | tenants, kanban_boards, kanban_card_events (R) | available API | none |
| `POST /t/:slug/checkin` | tenant-native checkin | email (+cid) | tenants/users/visits/campaigns/campaign_events (R/W) | wrapper equivalent | tenantMiddleware only |
| `POST /t/:slug/action` | tenant-native action | email,action_type (+cid) | tenants/users/actions/campaigns/campaign_events (R/W) | wrapper equivalent | tenantMiddleware only |
| `POST /t/:slug/review` | tenant-native review | email,text (+media/cid) | tenants/users/reviews/campaigns/campaign_events (R/W) | wrapper equivalent | tenantMiddleware only |
| `POST /t/:slug/referral` | tenant-native referral | email,referred_email (+cid) | tenants/users/referrals/campaigns/campaign_events (R/W) | wrapper equivalent | tenantMiddleware only |
| `POST /t/:slug/wishlist` | tenant-native wishlist | email,product_name (+cid) | tenants/users/wishlist/campaigns/campaign_events (R/W) | wrapper equivalent | tenantMiddleware only |
| `GET /api/rewards/status` | points/status snapshot | tenant (+email optional) | tenants/users/visits/actions/reviews/wishlist (R/W if user auto-created) | rewards engine/page | none |
| `GET /api/rewards/history` | reward ledger/history | tenant,email | tenants/users/visits/actions/reviews/wishlist (R/W if user auto-created) | rewards engine/page | none |
| `POST /api/rewards/checkin` | checkin reward | tenant,email (+cid/result_id) | users,visits,campaigns,campaign_events (R/W) | rewards engine | none |
| `POST /api/rewards/action` | action reward | tenant,email,action_type | users,actions,campaigns,campaign_events (R/W) | rewards engine | none |
| `POST /api/rewards/review` | review reward | tenant,email,text | users,reviews,campaigns,campaign_events (R/W) | rewards engine | none |
| `POST /api/rewards/referral` | referral reward | tenant,email,referred_email | users,referrals,campaigns,campaign_events (R/W) | rewards engine | none |
| `POST /api/rewards/wishlist` | wishlist reward | tenant,email,product_name | users,wishlist,campaigns,campaign_events (R/W) | rewards engine | none |
| `GET /t/:slug/dashboard` | top metrics | slug (+email if non-admin) | users/visits/actions/reviews/referrals (R) | dashboard app | tenantMiddleware + email guard for non-admin |
| `GET /t/:slug/customers` | customer list | slug (+email if non-admin) | users/visits/actions/reviews/wishlist/assessment_submissions (R) | dashboard app | same guard |
| `GET /t/:slug/segments` | customer segment stats | slug (+email if non-admin) | assessment_submissions/users (R) | dashboard app | same guard |
| `GET /t/:slug/campaigns/summary` | campaign summary | slug (+email if non-admin) | campaigns/campaign_events (R) | dashboard app | same guard |
| `GET /t/:slug/analytics` | trend/insight data | slug (+email if non-admin) | visits/users/assessment_submissions (R) | dashboard app | same guard |
| `GET /t/:slug/site` | generated tenant site | slug | tenant_config (+optional siteGenerator) | GARVEY/templates/site intake | tenantMiddleware only |
| `POST /api/site/generate` | generate/persist site config | tenant,template_type (+site/features) | tenants,tenant_config (R/W) + template materializer | site intake | none |
| `POST /api/system/activate-full` | activation orchestration | tenant,email,roles,business_type | tenants,kanban tables (W) + site generation | available API | none |
| `GET /api/questions` | fetch questions by assessment | assessment | questions (R) | intake/voc pages | none |
| `POST /api/intake` | owner intake submission | tenant,email,name,answers(+cid) | tenants/users/intake_sessions/assessment_submissions/campaign_events (R/W) | intake page | none |
| `POST /voc-intake` | customer VOC submission | tenant,email,name,answers(+cid) | tenants/users/voc_sessions/assessment_submissions/campaign_events (R/W) | intake/voc pages | none |
| `GET /api/results/:email` | latest result lookup | email (+type,tenant filters) | assessment_submissions/users/tenants (R) | results pages, dashboard | none |
| `POST /api/customer/share-result` | emit share event + dashboard URL | tenant,customer_email (+cid,result_id,owner_*) | campaigns/campaign_events/tenants (R/W) | results_customer | none |
| `GET /api/tenant/lookup` | owner lookup candidates | tenant,q | users,intake_sessions,tenants (R) | results_customer share flow | none |
| `GET /api/admin/config/:tenant` | fetch tenant config | tenant slug | tenants,tenant_config (R) | admin tooling/ops | **no admin enforcement** |
| `POST /api/admin/config` | update tenant config | tenant,config | tenants,tenant_config (R/W) | admin tooling/ops | **no admin enforcement** |
| `GET /api/verify/db` | DB ping | none | none (SELECT 1) | verification scripts/manual | none |
| `GET /api/verify/questions` | question contract check | none | in-memory catalog only | verification | none |
| `GET /api/verify/scoring` | scoring sanity check | none | in-memory scoring | verification | none |
| `GET /api/verify/intelligence/:slug` | intelligence verification | tenant slug | assessment_submissions (R) | verification | tenantMiddleware only |

## C) Tenant slug routes under `/t/:slug/*`

| Route | Serves | Called by |
|---|---|---|
| `/t/:slug/checkin` | tenant-native reward checkin | parity path for wrapper APIs / external callers |
| `/t/:slug/action` | tenant-native reward action | parity path / external callers |
| `/t/:slug/review` | tenant-native reward review | parity path / external callers |
| `/t/:slug/referral` | tenant-native reward referral | parity path / external callers |
| `/t/:slug/wishlist` | tenant-native reward wishlist | parity path / external callers |
| `/t/:slug/dashboard` | dashboard KPI summary | `dashboardnew/app.js` |
| `/t/:slug/customers` | customer table payload | `dashboardnew/app.js` |
| `/t/:slug/segments` | segment distribution payload | `dashboardnew/app.js` |
| `/t/:slug/campaigns/summary` | campaign aggregate counts | `dashboardnew/app.js` + campaign creator refresh |
| `/t/:slug/analytics` | trend/archetype/insight payload | `dashboardnew/app.js` |
| `/t/:slug/site` | generated tenant site HTML | GARVEY pages, templates, site intake |

---

## 4) Feature capability matrix (what exists)

| Feature area | Status | Evidence | How to verify |
|---|---|---|---|
| Customer entry / landing / ctx propagation | ✅ working | `ctx()/withCtx()/setLoginCtx()` in `public/garvey_ui.js`; link wiring in `public/aurora/aurora.js` | Open `/index.html?tenant=x&email=y`; inspect links keep tenant/email |
| Assessment / VOC intake + results | ✅ working | `/api/questions`, `/api/intake`, `/voc-intake`, `/api/results/:email`; scoring in `scoreSubmission()` | Submit owner/customer intake and confirm results pages populate |
| Rewards actions + points/ledger | ✅ working | reward helper functions in `server/index.js`; engine mapping in `eventToRequest()`; tests pass | Use `/rewards.html?tenant=x&email=y`; run checkin/action/review/referral/wishlist then status/history |
| Customer Return Engine orchestration module | ✅ working | `createEngine`, `awardReward`, `getStatus`, `getLedger`, `startEarnFlow`; tested in `tests/customer-return-engine.test.js` | `node --test tests/customer-return-engine.test.js` |
| Dashboard analytics + customers + campaign summaries | ✅ working | `/t/:slug/dashboard|customers|analytics|segments|campaigns/summary`; renderers in `dashboardnew/app.js` | Open `/dashboard.html?tenant=x&email=y` |
| Campaign tooling (QR/list/share links) | ✅ working | `/api/campaigns/create|list|qr`, `buildCampaignShareLinks()`, QR preview in dashboard | Create campaign in dashboard; check QR image endpoint |
| Admin / owner tools | ⚠ partial | `/api/admin/config*` exists; `admin.html` is navigation page not secure admin console | Hit `/api/admin/config/:tenant`; note no auth enforcement |
| Session controls (clear session/logout) | ✅ working | `clearSessionAndRedirect()` in `dashboardnew/app.js`; button in dashboardnew | Click “Clear session” in dashboard navbar |
| Contract checking/testing scripts | ✅ working | `scripts/contract-check.mjs`, `scripts/garvey-smoke.mjs`, engine tests | Run `npm run contract:check`; optional smoke against running server |

---

## 5) “Connected-to-what” dependency map (critical)

### Pages → APIs
- `intake.html` → `GET /api/questions`, `POST /api/intake` or `POST /voc-intake`, `POST /api/kanban/ensure`.
- `voc.html` → `GET /api/questions?assessment=customer`, `POST /voc-intake`.
- `results_owner.html` → `GET /api/results/:email`.
- `results_customer.html` → `GET /api/results/:email`, `POST /api/customer/share-result`, `GET /api/tenant/lookup`.
- `rewards.html` (+ engine) → `/api/rewards/status|history|checkin|action|review|referral|wishlist`.
- `dashboardnew/app.js` → `/t/:slug/dashboard|customers|analytics|segments|campaigns/summary`, `/api/campaigns/create|list|qr`, `/api/results/:email`.
- `templates.js` → `POST /api/templates/select` (+ static `/templates/registry.json`).
- GARVEY phase pages + `garvey-kanban.js` → `/api/kanban/ensure|board|cards|cards/:id/move`.
- `site_intake.html` → `POST /api/site/generate`.

### APIs → processors/helpers
- Rewards wrappers and `/t/:slug/*` reward routes → `process*Reward()` helpers.
- Assessment routes (`/api/intake`, `/voc-intake`) → `parseAnswersInput()`, `sanitizeAnswers()`, `validateAnswers()`, `scoreSubmission()`, `buildAssessmentResultPayload()`.
- Campaign APIs → `buildCampaignShareLinks()`, `resolveCampaignForTenant()`, `recordCampaignEvent()`.
- Dashboard URL response in share route → `buildDashboardUrl()`.
- Site generation routes → `generateSite()` and optional `siteGenerator.generateTenantSite()`.
- Adaptive cycle background job → `runAdaptiveCycle()` interval in server startup.

### DB tables by feature
- Rewards: `users`, `visits`, `actions`, `reviews`, `referrals`, `wishlist`, `campaigns`, `campaign_events`.
- Assessment/VOC: `questions`, `intake_sessions`/`voc_sessions`, `assessment_submissions`, `users`, `tenants`, `campaign_events`.
- Dashboard analytics: reads from rewards + submissions + campaign tables.
- Kanban: `kanban_boards`, `kanban_columns`, `kanban_cards`, `kanban_card_events`.
- Tenant/site/template/admin config: `tenant_config`, `tenants`.

### Duplicated route patterns & consistency
- **Rewards duplication exists by design**:
  - canonical wrapper APIs: `/api/rewards/*`
  - tenant-native variants: `/t/:slug/checkin|action|review|referral|wishlist`
  - Both call same helper functions (`process*Reward`), so behavior is mostly consistent.
- **Dashboard access has two entry files**:
  - legacy `public/dashboard.html` wrapper (frontend-host redirect logic)
  - server-owned `/dashboard.html` route serving `dashboardnew/index.html`.

---

## 6) Data model summary

| Table | Role | Row creators | Row readers |
|---|---|---|---|
| `tenants` | tenant registry | `ensureTenant()` and startup flows | nearly all tenant-resolving routes |
| `users` | tenant-scoped user identity + points | `findTenantUser()` from intake/rewards/history/status | rewards, dashboard, lookup |
| `tenant_config` | feature toggles/site config/adaptive params | `/api/admin/config`, `/api/templates/select`, `/api/site/generate`, adaptive engine | tenant middleware + site/template/admin/dashboard contexts |
| `visits` | check-in events + points | `processCheckinReward()` | dashboard, rewards history/status |
| `actions` | action events + points | `processActionReward()` | dashboard, rewards history/status |
| `reviews` | review events + media metadata + points | `processReviewReward()` | dashboard, rewards history/status |
| `referrals` | referral pairs + points | `processReferralReward()` | dashboard analytics |
| `wishlist` | saved customer wishlist items | `processWishlistReward()` | rewards history/status, customer list activity |
| `campaigns` | tenant campaign definitions | `/api/campaigns/create` | campaign list/summary, event attribution |
| `campaign_events` | attributed events across lifecycle | `recordCampaignEvent()` from intake/rewards/share | campaign list/summary analytics |
| `questions` | assessment question bank | `seed(pool)` / seed scripts | `/api/questions`, verify routes |
| `intake_sessions` | owner intake submissions context | `/api/intake` | lookup route (name/email candidates) |
| `voc_sessions` | VOC session context | `/voc-intake` | mostly audit/debug |
| `assessment_submissions` | scored result records for owner/customer | `/api/intake`, `/voc-intake` | results lookup, dashboard segments/analytics/customers |
| `kanban_boards` | tenant GARVEY board | `ensureGarveyBoard()` | kanban APIs |
| `kanban_columns` | board columns per phase | `ensureGarveyBoard()` | kanban APIs |
| `kanban_cards` | tasks + status | kanban create/update/move + onboarding seed | kanban APIs |
| `kanban_card_events` | card event audit log | kanban create/update/move | `/api/kanban/events` |
| `tenant_sites` / `intake_responses` / `intake_results` / `results` / `voc_responses` / `voc_results` | legacy/compatibility storage | DB bootstrap only (not heavily used by main routes) | currently minimal direct reads in current API |

---

## 7) Known issues / risks (candid)

1. **Auth/security weakness (high risk)**
   - Most APIs are open without robust authentication.
   - “Admin” behavior is email allowlist in query/header (`x-user-email`) and not enforced on admin config endpoints.
   - `/api/admin/config*` can be called without `req.isAdmin` gate.

2. **Tenant read guard is soft**
   - `/t/:slug/dashboard|customers|segments|campaigns/summary|analytics` only require an email for non-admin, but do not validate ownership of that tenant email.

3. **Optional site generator dependency**
   - `/t/:slug/site` returns 404 if `siteGenerator` module unavailable; experience differs by deployment.

4. **Asset gap / UI polish risk**
   - `public/aurora/aurora.css` references `/aurora/assets/images/hero.jpg`, but asset folder/file is absent in repo.

5. **Route duplication + drift risk**
   - Duplicate entry patterns (`/api/rewards/*` and `/t/:slug/*` wrappers) require discipline to avoid divergence.

6. **Fragile DOM wiring risk**
   - Multiple pages wire links/ctx manually and rely on many query parameters (`tenant/email/rid/cid/crid/owner_*`).
   - Small naming mismatch can break deep-link continuity.

7. **Infra dependency risk for full verification**
   - Smoke script assumes running server + reachable DB and mutable tenant data.
   - In isolated environments, only static checks/unit tests are practical.

8. **CI/test coverage gap**
   - No explicit CI config observed.
   - Tests exist for engine module only; server integration coverage is script/manual oriented.

---

## 8) Verification / proof section (runbook)

### Commands that should pass (in a working dev setup)
1. `npm run contract:check`
   - Validates backend route inventory and frontend API references.
2. `node --check server/index.js`
   - Syntax validation for main server.
3. `node --test tests/customer-return-engine.test.js`
   - Validates customer return engine persistence + reward orchestration behavior.
4. `npm run smoke` (or `BASE_URL=... node scripts/garvey-smoke.mjs`)
   - Full-stack API/flow smoke (requires running server + DB).

### Manual smoke tests
1. **Landing/context**: `GET /index.html?tenant=test-business&cid=launch1`
   - Expect tenant/cid visible and nav links carrying ctx.
2. **Owner intake**: open `/intake.html?tenant=test-business&assessment=business_owner`
   - Complete answers; expect redirect to `/results_owner.html?...` and data present.
3. **Customer VOC**: open `/voc.html?tenant=test-business&cid=launch1`
   - Complete answers; expect redirect to `/results_customer.html?...&crid=...`.
4. **Rewards**: open `/rewards.html?tenant=test-business&email=user@example.com`
   - Trigger check-in/review/referral/wishlist and see status/ledger updates.
5. **Dashboard**: open `/dashboard.html?tenant=test-business&email=owner@example.com`
   - Expect charts/metrics/customer table and campaign widgets.
6. **Campaign QR**: call `/api/campaigns/qr?tenant=test-business&cid=<slug>&target=voc&format=png`
   - Expect PNG response.

### Known failing or environment-dependent checks
- `npm run smoke` is environment-dependent and likely fails without a running API + DB + seeded questions.
- `/t/:slug/site` may 404 when optional `siteGenerator` dependency is absent.

---

## 9) Investor-facing summary appendix

### What can be demoed today (5–8)
- Multi-tenant onboarding with owner + customer assessments producing scored archetype results.
- End-to-end customer return loop: check-in → action/review/referral/wishlist → points/status history.
- Campaign creation and share-link generation with QR output and attribution into campaign analytics.
- Owner dashboard with customer list, segment distribution, campaign summary, and trend charts.
- GARVEY phase workflow with interactive Kanban board per tenant and per phase.
- Context-preserving deep-linking across public pages, results, rewards, and dashboard.
- Template selection + site config generation endpoints for tenant website rollout.

### What’s next (3–5)
- Harden authn/authz (tenant-bound identity, signed sessions/JWT, admin RBAC).
- Consolidate duplicated wrappers and strengthen contract tests around route parity.
- Expand automated integration tests (server + DB fixtures) and add CI enforcement.
- Improve frontend resilience/UX polish (asset completeness, stricter ctx schema, route-state diagnostics).
- Formalize production observability (structured logs, endpoint health probes, error budgets).

### Why this is defensible (system-level)
- Unified loop ties **acquisition, behavior, rewards, segmentation, and campaign attribution** into one tenant data model.
- Context and event architecture already tracks funnel provenance (`cid`, `result_id`, owner linkage) across multiple user journeys.
- Modular architecture (engines + wrappers + tenant-config + kanban + dashboard) enables rapid product iteration without full rewrites.

---

## Unknowns / explicit audit limits
- No deployment manifests (Docker/infra/CI pipelines) were found in scanned scope, so production topology beyond Render-style host split is inferred from frontend redirect logic.
- No formal API auth middleware beyond email/admin allowlist heuristics was found.
- Some legacy tables are present but not strongly exercised by current routes; operational dependency is uncertain.

