# GARVEY Repo Update + Executive Rebuild Guide
_Date: 2026-03-27_

## 1) Executive Overview (1-page)

### What the product does end-to-end
- **Business owner journey:** a tenant owner runs intake (`/api/intake`) to get archetype scoring, lands on owner results, then opens a tenant dashboard and GARVEY Kanban workflow while generating campaign links and optional tenant site/template selection. The owner can monitor customer actions, campaign attribution, and segment analytics in one dashboard surface. 
- **Customer journey:** customer enters from campaign links (`/voc.html?tenant=...&cid=...` or `/rewards.html?...`), completes VOC (`/voc-intake`), gets customer results (`/results_customer.html`), claims rewards via reward APIs, and can send their result attribution back to the business owner (`/api/customer/share-result`).
- **Data model:** multi-tenant by `tenants.slug`; events, assessments, rewards, and campaigns are persisted and keyed by `tenant_id` and optionally `campaign_id`/`campaign_slug` for attribution.

### What is working now (major flows)
- Intake + VOC APIs validate answers, score with the intelligence engine, write sessions/submissions, and return normalized result contracts. 
- Rewards APIs support check-in/action/review/referral/wishlist; wrappers exist under both `/t/:slug/*` and `/api/rewards/*` paths.
- Dashboard APIs aggregate customers, analytics, segments, and campaign summaries.
- Campaign creation/list/QR are implemented and return share links (`voc`, `rewards`, `landing`).
- Kanban board APIs are mounted under `/api/kanban` with board/column/card/event support and onboarding seed cards.

### Intentional “text-only premium” vs template-driven
- **Text-only premium shells are intentional now:** `garvey_premium.html` and `rewards_premium.html` are lightweight wrappers that explicitly state text-only mode and link into functional non-premium pages.
- **Template-driven site generation exists separately:** template registry/select (`/api/templates*`) + site generation (`/api/site/generate`) + tenant site runtime (`/t/:slug/site`).
- This split keeps premium UX deployable without binary assets while preserving template-driven website generation as a backend-powered capability.

### Top 3 priorities next
1. **Contract lock + smoke tests:** codify redirect/query-param contracts (tenant/email/cid) and critical API payloads to prevent routing drift.
2. **Kanban schema hardening cleanup:** resolve legacy-vs-canonical column overlap (e.g., `event` vs `event_type`, `content` vs `title/description`) with a single canonical migration policy.
3. **Host-awareness standardization:** make all premium/hub pages use a shared host resolver (`GarveyApi.API_BASE`) to avoid split-host 404/regression.

---

## 2) Authoritative Source-of-Truth Map

### Backend route contracts and where they live
- **Primary backend contract file:** `server/index.js` (all platform, intake/VOC, rewards, campaigns, templates, verify, site routes).
- **Kanban route module:** `server/kanbanRoutes.js`, mounted at `app.use('/api/kanban', ...)` in `server/index.js`.
- **DB bootstrap + migrations:** `server/db.js` (`initializeDatabase`) and canonical Kanban schema in `server/kanbanDb.js`.
- **Tenant defaults/lookup:** `server/tenant.js` (`DEFAULT_TENANT_CONFIG`, `ensureTenant`, `getTenantConfig`).
- **Frontend API-base contract shim:** `public/js/api-contract.js` (frontend host uses backend base URL when needed).

### Frontend entry pages and API calls
- `public/index.html`: tenant launcher links to intake/VOC/rewards/dashboard/garvey/templates.
- `public/intake.html`: calls `/api/questions`, submits `/api/intake` (owner) or `/voc-intake` (customer), then redirects to results pages.
- `public/voc.html`: customer-only VOC path (`/api/questions?assessment=customer` → `/voc-intake` → results).
- `public/results_owner.html`: reads `/api/results/:email?type=business_owner&tenant=...`.
- `public/results_customer.html`: reads `/api/results/:email?type=customer&tenant=...` and posts `/api/customer/share-result`.
- `public/rewards.html`: uses `/api/rewards/status|history|checkin|action|review|referral|wishlist`.
- `public/dashboard.html` + `dashboardnew/app.js`: calls tenant analytics APIs (`/t/:slug/dashboard|customers|analytics|segments|campaigns/summary`) and campaign APIs.
- `public/templates.html` + `public/templates.js`: reads template registry and selects via `/api/templates/select`.
- `public/site_intake.html`: posts `/api/site/generate`, links to `/t/:slug/site`.

### Tenancy + campaign attribution rules (tenant + cid propagation)
- **Tenant source of truth:** query param `tenant` on frontend; backend resolves `tenants.slug` via `ensureTenant/getTenantBySlug`.
- **Campaign source of truth:** query/body `cid`, resolved to campaign via `campaigns.slug` per tenant (`resolveCampaignForTenant`).
- **Persistence propagation:** `campaign_id` + `campaign_slug` written into sessions/submissions/rewards tables and campaign events.
- **Attribution events:** `campaign_events` tracks `event_type`, optional customer identifiers, plus JSON `meta`.

---

## 3) Activation Pathway Trace (Most Important)

### Business owner pathway
1. **Intake page load:** `/intake.html?tenant={tenant}[&cid={cid}]` (default assessment `business_owner`).
2. **Question contract:** `GET /api/questions?assessment=business_owner`.
3. **Submission:** `POST /api/intake` body requires `{ email, tenant, answers[] }` and accepts `{ name, cid }`.
4. **Result redirect:** frontend sends owner to `/results_owner.html?tenant={tenant}&email={email}&cid={cid}`.
5. **Owner result fetch:** `GET /api/results/{email}?type=business_owner&tenant={tenant}`.
6. **Dashboard activation link:** owner CTA points to `/dashboard.html?tenant={tenant}&email={email}[&cid={cid}]`.
7. **Campaign creation in dashboard:** `POST /api/campaigns/create` → returns share links with tenant+cid.
8. **GARVEY workflow:** owner CTA points to `/garvey_premium.html?tenant={tenant}` → `/garvey.html?tenant={tenant}` and Kanban APIs under `/api/kanban/*`.

### Customer pathway
1. **Campaign entry link:** typically `/voc.html?tenant={tenant}&cid={cid}` or `/rewards.html?tenant={tenant}&cid={cid}`.
2. **VOC question contract:** `GET /api/questions?assessment=customer`.
3. **VOC submit:** `POST /voc-intake` requires `{ email, tenant, answers[] }`, accepts `{ name, cid }`.
4. **Customer result redirect:** `/results_customer.html?tenant={tenant}&email={email}&cid={cid}`.
5. **Customer result fetch:** `GET /api/results/{email}?type=customer&tenant={tenant}`.
6. **Rewards CTA:** `/rewards_premium.html?tenant={tenant}&email={email}&cid={cid}` then to `/rewards.html` with same params.
7. **Owner attribution send:** `POST /api/customer/share-result` body `{ tenant, customer_email, customer_name, cid, result_id }` records `customer_share_result` in `campaign_events`.

### Redirect URLs + required query params
- `/join/:slug` → redirects to `/intake.html?tenant={slug}`.
- `/intake.html` expects `tenant`; optional `assessment`, `cid`.
- `/voc.html` expects `tenant`; optional `cid`.
- `/results_owner.html` requires `tenant` + `email`; optional `cid` for dashboard carry-forward.
- `/results_customer.html` requires `tenant` + `email`; optional `cid`.
- `/rewards.html` requires `tenant`; optional `email`, `cid`.
- `/rewards_premium.html` forwards `tenant` + optional `email` (currently drops `cid` in its suffix construction, but CTA from customer results includes `cid`).
- `/dashboard.html` requires `tenant`; optional `email`, `cid`.
- `/garvey_premium.html` expects `tenant` to build GARVEY/site links.
- `/t/:slug/site` requires path slug only.

---

## 4) DB Schema Reality Check

### Runtime-required tables/columns (by active routes)
- **Tenant/core:** `tenants(id, slug, name)`, `users(id, tenant_id, email, points)`, `tenant_config(tenant_id, config, updated_at)`.
- **Campaigns:** `campaigns(tenant_id, slug, label, source, medium)`, `campaign_events(tenant_id, campaign_id, event_type, customer_email, customer_name, meta)`.
- **Questions/assessment:** `questions(assessment_type, question_text, option_a..d, mapping_a..d, qid)`, `assessment_submissions(... assessment_type, archetype/personality fields, raw_answers, campaign_id, campaign_slug)`.
- **Session tables:** `intake_sessions(... email,name,mode,campaign_id,campaign_slug,source,medium)`, `voc_sessions(... email,name,campaign_id,campaign_slug,source,medium)`.
- **Rewards/action tables:** `visits`, `actions`, `reviews`, `referrals`, `wishlist` with campaign columns + points fields used by reward APIs/dashboard.
- **Kanban:** `kanban_boards`, `kanban_columns`, `kanban_cards`, `kanban_card_events`.

### Duplicated/conflicting DDL definitions (notably Kanban)
- Kanban canonical creation is in `server/kanbanDb.js`, but `server/db.js` also performs broad Kanban `ALTER TABLE` upgrades and index creation; this dual ownership is intentional for backfill but is drift-prone if changed independently.
- Legacy compatibility columns still exist (`kanban_cards.content`, `kanban_card_events.event`) while runtime uses `title/description` and `event_type`; this is safe now but creates schema ambiguity.
- `initializeKanbanSchema()` is invoked inside `initializeDatabase()` and again at server startup in `server/index.js` (safe due to IF NOT EXISTS, but duplicate work).

### Migration safety confirmation + risky spots
- **Safe patterns used broadly:** `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, conflict-safe upserts.
- **Mostly safe startup:** repeated bootstrap calls are idempotent.
- **Risky spots to watch:**
  - Data backfill updates in Kanban upgrade block are large and run on startup; on very large datasets this could affect startup time.
  - Dual schema ownership (`db.js` + `kanbanDb.js`) can silently diverge.
  - `tenant_config` upserts depend on `updated_at` existence (created via migration), so dropping/renaming this column would break config writes.

---

## 5) Split-Host Deployment Notes (Render)

### Why frontend vs backend host causes 404s
- Frontend static host (`garveyfrontend`) cannot serve backend-only routes (`/api/*`, `/t/:slug/*`, `/dashboardnew/*`) unless explicitly proxied.
- To mitigate this, pages use host checks and/or `GarveyApi.API_BASE` to route API calls to `https://garveybackend.onrender.com` when loaded from frontend host.

### Pages/routes that must always resolve on backend host
- `/dashboard.html` (immediately redirects from frontend host to backend host).
- `/dashboardnew/*` static assets.
- `/t/:slug/*` tenant runtime (dashboard APIs + site route).
- `/api/*` and `/voc-intake` backend endpoints.
- Campaign QR endpoint (`/api/campaigns/qr`) because image generation is backend-side.

### Premium pages/hubs host-aware behavior
- `garvey_premium.html` explicitly redirects to backend host when loaded on `garveyfrontend.onrender.com`.
- `rewards_premium.html` is a text-only shell and relies on downstream rewards page/API host logic; safer long-term to add the same explicit backend redirect or shared resolver.
- `api-contract.js` should remain the single resolver for API base selection to avoid per-page drift.

---

## 6) Drift Risks + Guardrails

### Where drift has happened / is likely
- **Templates vs premium shells:** premium pages intentionally text-only while templates system is functional; teams may conflate these tracks and accidentally add binary dependencies.
- **Kanban schema drift:** canonical schema in `kanbanDb.js` plus compatibility DDL in `db.js` can diverge over time.
- **Routing/host drift:** some pages do explicit backend redirects, others only rely on API_BASE, causing inconsistent behavior in split-host deployment.

### Recommended guard scripts/tests
- **Route contract smoke script:** curl checks for critical endpoints + status codes + required fields (`/api/questions`, `/api/intake`, `/voc-intake`, `/api/results/:email`, `/api/campaigns/*`, `/api/kanban/*`, `/t/:slug/*`).
- **Redirect/query-param test matrix:** playwright or lightweight Node script validating `tenant/email/cid` propagation across intake/results/rewards/dashboard paths.
- **Schema contract assertion script:** verify required tables/columns/indexes exist and that legacy Kanban columns are non-authoritative.
- **Single-source map doc check:** CI job to compare route list (`rg app.get/app.post`) against documented contracts.

### Minimal diff plan

#### Must-fix now
- Add one shared helper (or enforce `api-contract.js`) for **all** premium/entry pages to preserve `tenant/email/cid` and backend host routing consistently.
- Add a CI/startup contract check script for required query params and endpoint responses.
- Add a schema assertion for Kanban canonical columns (`event_type`, `title`, `description`, `phase`, `position`) to detect accidental regressions.

#### Later
- Consolidate Kanban migrations into a single owner module (either keep canonical in `kanbanDb.js` and move upgrade SQL there, or vice versa).
- Decide a formal deprecation path for legacy columns (`content`, `event`) after migration confidence.
- Add structured OpenAPI/JSON schema contracts for frontend-consumed payloads.

---

## If I had to rebuild tomorrow (checklist)

1. Stand up Postgres + set `DATABASE_URL`.
2. Boot backend (`server/index.js`) and verify `/health`, `/api/verify/db`, `/api/questions?assessment=business_owner`.
3. Seed/verify questions (`seed()` runs at startup).
4. Open `/index.html?tenant=test-business` and confirm launcher links resolve.
5. Run owner intake flow end-to-end: intake → results_owner → dashboard.
6. In dashboard create campaign and verify generated share links contain `tenant` + `cid`.
7. Run customer VOC flow from campaign link: voc → results_customer → rewards.
8. Click “Send to Business Owner” and verify `customer_share_result` event.
9. Validate Kanban board ensure + default cards (`/api/kanban/ensure`).
10. Validate `/t/:slug/site` with a selected template.
11. Confirm split-host behavior (frontend host redirects or API_BASE fallbacks).
12. Run schema/route smoke tests before release.
