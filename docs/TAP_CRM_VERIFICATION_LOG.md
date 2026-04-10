# Tap CRM Verification Log

## Phase 1 — Domain Foundation + Isolation Strategy

Date: 2026-04-10

### Built

- Added Tap CRM permission actions to shared access policy.
- Added Tap CRM route-level access checks for dashboard APIs.
- Added isolated dashboard mount route placeholder.
- Added architecture/scope/pilot docs for Tap CRM phase tracking.

### Verification

- Added policy/action unit tests for Tap CRM permissions.
- Added Tap CRM route access tests for allow/deny/missing-tenant behavior.
- Ran Node test suite.

### Result

- PASS (Phase 1 scope only)

### Deferred

- Data schema/migrations (Phase 2)
- `/t/:tagCode` dynamic resolution (Phase 3)
- Tap Hub UI and owner console functional screens (Phases 4-5)

## Phase 2 — Isolated Data Model + Reversible Migrations

Date: 2026-04-10

### Built

- Added isolated Tap CRM schema module at `server/tapCrmDb.js`.
- Added reversible migration manifest (`up` + `down`) for Tap CRM-only tables:
  - `tap_crm_contacts`
  - `tap_crm_tags`
  - `tap_crm_contact_tags`
  - `tap_crm_pipeline_items`
  - `tap_crm_schema_migrations`
- Wired Tap CRM migration application + schema verification into database initialization.

### Verification

- Added Phase 2 schema unit tests for migration isolation and reversibility metadata.
- Added schema verification test asserting required Tap CRM tables/indexes.
- Ran `node --test tests/tap-crm-phase1.test.js tests/tap-crm-phase2-schema.test.js`.

### Result

- PASS (Phase 2 scope only)

### Regression Notes

- Existing Tap CRM route namespace remains unchanged: `/api/tap-crm/*`.
- No route behavior changes were introduced in Phase 2.
- No modifications were made to shared GARVEY domain routes.

### Rollback Notes

- Rollback path is defined by `down` statements in `TAP_CRM_MIGRATIONS` (drop Tap CRM-only tables in dependency-safe reverse order).
- Migration tracking is isolated in `tap_crm_schema_migrations`.
- If rollback is required, apply matching `down` SQL for `tap_crm_001_init` in reverse release workflow.

### Shared-Area Touches

- `server/db.js` was touched only to invoke Tap CRM migration + verification hooks.
- No shared-domain schema/table definitions were altered.

### Deferred

- `/t/:tagCode` dynamic resolution (Phase 3)
- Tap Hub UI and owner console functional screens (Phases 4-5)

## Phase 3 — Public Tap Route Resolution + Tag Status Controls

Date: 2026-04-10

### Built

- Added Phase 3 migration (`tap_crm_002_public_tap_resolution`) for:
  - `tap_crm_business_config` (tenant-level Tap Hub status/config lookup)
  - `tap_crm_tap_events` (tap event logging for accepted/rejected resolutions)
  - Tag resolution columns on `tap_crm_tags` (`tag_code`, `status`, `destination_path`, `last_tap_at`, `disabled_reason`)
- Added dynamic tag resolution logic with:
  - tag lookup by `tag_code`
  - business config lookup
  - tag status validation (`active` vs `inactive`/`disabled`)
  - invalid/inactive/disabled responses with explicit machine-readable error codes
  - `last_tap_at` update on successful resolution
  - tap event logging for all outcomes
- Added public route resolution endpoints while preserving namespace strategy:
  - Public route: `GET /tap-crm/t/:tagCode`
  - API mirror: `GET /api/tap-crm/public/tags/:tagCode/resolve`

### Verification

- Added Phase 3 unit tests for tag normalization, status validation, dynamic tag resolution, event logging, and `last_tap_at` update behavior.
- Updated Tap CRM schema verification test expectations for Phase 3 migration artifacts.
- Ran:
  - `node --test tests/tap-crm-phase1.test.js tests/tap-crm-phase2-schema.test.js tests/tap-crm-phase3-routing.test.js`

### Result

- PASS (Phase 3 scope only)

### Regression Notes

- Existing Tap CRM owner/API namespace remains unchanged (`/api/tap-crm/*`).
- No legacy GARVEY `/t/:slug/*` routes were modified.
- Public tap resolution was added under `/tap-crm/t/:tagCode` to avoid collision with existing `/t/:slug/*` runtime paths.

### Rollback Notes

- Roll back by applying `down` for `tap_crm_002_public_tap_resolution`:
  - Drops `tap_crm_tap_events` and `tap_crm_business_config`.
  - Removes added Phase 3 columns/indexes from `tap_crm_tags`.
- Public resolution routes (`/tap-crm/t/:tagCode`, `/api/tap-crm/public/tags/:tagCode/resolve`) can be removed safely after DB rollback.

### Shared-Area Touches

- `server/index.js` touched only to mount the new public Tap CRM resolution route.
- `server/tapCrmRoutes.js` expanded with Phase 3 resolution logic while preserving existing owner API behavior.
- `server/tapCrmDb.js` expanded with additive, Tap CRM-isolated migration objects only.

## Phase 4 — Customer-Facing Tap Hub Rendering (Mobile + Config-Driven)

Date: 2026-04-10

### Built

- Added Tap Hub customer-facing HTML renderer for `/tap-crm/t/:tagCode` successful resolutions.
- Implemented mobile-first Tap Hub layout with strict zone coverage:
  - primary action zone
  - secondary action zone
  - social/brand zone
  - business info zone
- Added config-driven rendering model sourced from `business_config` payload returned by Phase 3 resolver.
- Added safe fallback behavior for incomplete/missing config values:
  - fallback headline/subheadline
  - fallback primary action from `destination_path`
  - empty-state messaging for missing secondary/social/business data
- Added customer-facing invalid tag page and inactive/disabled tag page handling at the public tap route.
- Kept route namespace strategy unchanged (`tap-crm` and `/tap-crm/t/:tagCode`).
- Explicitly deferred owner-facing Tap Console behavior to Phase 5 (no owner console logic introduced in this phase).

### Verification

- Added Phase 4 renderer unit tests covering:
  - fallback rendering with incomplete config
  - presence of required customer-facing zones
  - invalid/inactive page rendering outputs
- Ran:
  - `node --test tests/tap-crm-phase1.test.js tests/tap-crm-phase2-schema.test.js tests/tap-crm-phase3-routing.test.js tests/tap-crm-phase4-hub-rendering.test.js`

### Result

- PASS (Phase 4 scope only)

### Regression Notes

- Existing Tap CRM API namespace remains unchanged (`/api/tap-crm/*`).
- Existing public tap route namespace remains unchanged (`/tap-crm/t/:tagCode`).
- API mirror resolution endpoint behavior remains JSON (`/api/tap-crm/public/tags/:tagCode/resolve`).
- No owner dashboard route behavior changes were made (`/dashboard/tap-crm` still placeholder scope).
- No existing GARVEY `/t/:slug/*` routes were modified.

### Rollback Notes

- Route-level rollback: remove Tap Hub HTML rendering in `server/index.js` and revert `/tap-crm/t/:tagCode` to JSON passthrough if required.
- Renderer rollback: remove `server/tapHubRenderer.js` and associated tests.
- No schema/migration rollback is required for Phase 4 since this phase introduced no DB schema changes.

### Shared-Area Touches

- `server/index.js` touched to switch public Tap route from raw JSON output to customer-facing HTML rendering flow.
- Added isolated renderer helper in `server/tapHubRenderer.js` to keep phase logic out of shared domain handlers.
- Added Phase 4 test coverage in `tests/tap-crm-phase4-hub-rendering.test.js` only.

## Phase 5 — Owner-Facing Tap Console Screens (Scoped API + Landing)

Date: 2026-04-10

### Built

- Added Phase 5 owner-facing Tap Console API surfaces (no Phase 6 template/module engine work):
  - dashboard landing data: `GET /api/tap-crm/dashboard`
  - console landing descriptor: `GET /api/tap-crm/console/landing`
  - business setup editor: `GET|PUT /api/tap-crm/console/business-setup`
  - primary action editor: `GET|PUT /api/tap-crm/console/actions/primary`
  - secondary action editor: `GET|PUT /api/tap-crm/console/actions/secondary`
  - tag manager list view: `GET /api/tap-crm/console/tags`
  - analytics summary view: `GET /api/tap-crm/console/analytics/summary`
  - template selector: `GET|PUT /api/tap-crm/console/templates/selector`
- Added tenant-scoped business config helpers for owner-console payload persistence in `tap_crm_business_config.config`.
- Updated Tap Console mount page (`/tap-crm` and `/dashboard/tap-crm`) to explicitly present only the approved Phase 5 owner-facing screens.

### Verification

- Added Phase 5 unit tests for owner-console payload and action-editor normalization.
- Ran:
  - `node --test tests/tap-crm-phase1.test.js tests/tap-crm-phase2-schema.test.js tests/tap-crm-phase3-routing.test.js tests/tap-crm-phase4-hub-rendering.test.js tests/tap-crm-phase5-owner-console.test.js`

### Result

- PASS (Phase 5 scope only)

### Regression Notes

- Existing Tap CRM API namespace remains unchanged (`/api/tap-crm/*`).
- Existing public tap route namespace remains unchanged (`/tap-crm/t/:tagCode`).
- Existing owner dashboard mount remains unchanged (`/dashboard/tap-crm`), now populated with Phase 5 screen references.
- No existing GARVEY `/t/:slug/*` routes were modified.
- No Phase 6 template/module engine behavior was introduced.

### Rollback Notes

- Route rollback: remove Phase 5 owner-console routes from `server/tapCrmRoutes.js`.
- UI rollback: revert `tapcrm/index.html` to the prior placeholder view.
- Data rollback: no schema rollback required (Phase 5 reused existing `tap_crm_business_config.config` JSON payload only).

### Shared-Area Touches

- `server/tapCrmRoutes.js` expanded with Phase 5 owner-console endpoints and tenant-config helper utilities.
- `tapcrm/index.html` updated to reflect owner-facing Tap Console Phase 5 scope.
- Added `tests/tap-crm-phase5-owner-console.test.js` for Phase 5 behavior verification.

## Phase 6 — Template Loader + Module Registry + Per-Business Module Config

Date: 2026-04-10

### Built

- Added isolated Tap CRM template/module engine utilities in `server/tapCrmTemplates.js`:
  - template loader with strict fallback to `default`
  - template registry entries for `default`, `barber`, `salon`, and `fitness`
  - module registry for reusable zones (`hero`, `primary_cta`, `services`, `social_links`, `business_info`)
  - runtime resolver that merges default module config + template module config + per-business override config
- Expanded Phase 5 template selector behavior in `server/tapCrmRoutes.js`:
  - `GET /api/tap-crm/console/templates/selector` now returns dynamic `available_templates` plus `effective_template`
  - `PUT /api/tap-crm/console/templates/selector` now validates template id and returns the resolved effective template payload
- Added per-business module enable/disable + module config APIs in `server/tapCrmRoutes.js`:
  - `GET /api/tap-crm/console/modules/registry`
  - `GET /api/tap-crm/console/modules/:moduleId`
  - `PUT /api/tap-crm/console/modules/:moduleId`
- Added template runtime attachment to public resolution payload (`template_runtime`) to support template-driven reuse across barber/salon/fitness without route-surface changes.
- Extended owner-console payload screen inventory to include `module_registry` and `module_config_editor` surfaces.

### Verification

- Added Phase 6 unit tests in `tests/tap-crm-phase6-template-modules.test.js` for:
  - template id normalization
  - default/fallback template loader behavior
  - module runtime merge precedence
  - template reuse coverage across barber/salon/fitness
  - module registry stability
  - owner-console screen inventory updates for Phase 6
- Updated existing owner console payload assertions in `tests/tap-crm-phase5-owner-console.test.js`.
- Ran:
  - `node --test tests/tap-crm-phase1.test.js tests/tap-crm-phase2-schema.test.js tests/tap-crm-phase3-routing.test.js tests/tap-crm-phase4-hub-rendering.test.js tests/tap-crm-phase5-owner-console.test.js tests/tap-crm-phase6-template-modules.test.js`

### Result

- PASS (Phase 6 scope only)

### Regression Notes

- Existing Tap CRM API namespace remains unchanged (`/api/tap-crm/*`).
- Existing public tap route namespace remains unchanged (`/tap-crm/t/:tagCode`).
- Existing owner dashboard mount remains unchanged (`/dashboard/tap-crm`).
- Existing TAP namespace decision (`tap-crm`) remains unchanged and no route alias was introduced.
- No existing GARVEY `/t/:slug/*` routes were modified.

### Rollback Notes

- Route rollback: remove Phase 6 module endpoints from `server/tapCrmRoutes.js`.
- Engine rollback: remove `server/tapCrmTemplates.js` and restore static template selector payload behavior.
- Data rollback: no schema rollback required; Phase 6 persists only JSON config under existing `tap_crm_business_config.config` (`selected_template_id`, `module_overrides`).

### Shared-Area Touches

- `server/tapCrmRoutes.js` updated for Phase 6 API behavior and public resolution payload enrichment.
- Added isolated helper module `server/tapCrmTemplates.js` to keep template/module logic out of unrelated route families.
- Updated tests in `tests/tap-crm-phase5-owner-console.test.js` and added `tests/tap-crm-phase6-template-modules.test.js`.

## Phase 6 Follow-up — Runtime Request-Level Verification (Running App + DB)

Date: 2026-04-10

- Performed request-level runtime verification against live app/server with PostgreSQL-backed state for:
  - template selection GET/PUT persistence
  - module registry/read/update persistence
  - runtime merge precedence
  - customer-facing Tap Hub output differences across barber/salon/fitness
  - module-disable section suppression
  - fallback-safe rendering for partially configured tenant
  - tenant state isolation + validation responses
  - feature-flag OFF route hiding
- Detailed evidence (commands + observed outputs) captured in:
  - `docs/TAP_CRM_PHASE6_RUNTIME_VERIFICATION.md`

Result:
- PASS (Phase 6 follow-up runtime verification)

## Phase 7 — Barber Pilot Readiness + First-Business Bootstrap

Date: 2026-04-10

### Built

- Added barber pilot baseline configuration helper in `server/tapCrmTemplates.js`:
  - `buildBarberPilotBaselineConfig(existingConfig)` to safely apply default barber-oriented values while preserving tenant overrides.
  - baseline includes pilot onboarding metadata for first-business readiness (`onboarding.pilot_ready`, `onboarding.first_business_setup_complete`, checklist fields).
- Extended owner console route inventory in `server/tapCrmRoutes.js` with pilot-facing screens:
  - `pilot_readiness`
  - `pilot_bootstrap`
- Added barber pilot readiness and bootstrap APIs under existing namespace:
  - `GET /api/tap-crm/console/pilot/readiness`
  - `POST /api/tap-crm/console/pilot/bootstrap`
- `pilot/bootstrap` supports minimal pilot setup by:
  - setting/keeping `selected_template_id: barber`
  - applying safe barber baseline config for first-business onboarding
  - optionally seeding one default active tag (`<tenant>-welcome`) when no tags exist
- Updated owner Tap Console page (`tapcrm/index.html`) for Phase 7 screen visibility and pilot endpoint examples.

### Verification

- Updated screen inventory assertions in:
  - `tests/tap-crm-phase5-owner-console.test.js`
  - `tests/tap-crm-phase6-template-modules.test.js`
- Added baseline config behavior coverage in:
  - `tests/tap-crm-phase6-template-modules.test.js`
- Ran:
  - `node --test tests/tap-crm-phase1.test.js tests/tap-crm-phase2-schema.test.js tests/tap-crm-phase3-routing.test.js tests/tap-crm-phase4-hub-rendering.test.js tests/tap-crm-phase5-owner-console.test.js tests/tap-crm-phase6-template-modules.test.js`

### Result

- PASS (Phase 7 scope only)

### Regression Notes

- Existing Tap CRM API namespace remains unchanged (`/api/tap-crm/*`).
- Existing public tap route namespace remains unchanged (`/tap-crm/t/:tagCode`).
- Existing owner dashboard mount remains unchanged (`/dashboard/tap-crm`).
- Existing TAP namespace decision (`tap-crm`) remains unchanged; no `/api/tap/*` alias introduced.
- No Phase 8 scaling or automation surfaces were introduced.

### Rollback Notes

- Route rollback: remove `GET /console/pilot/readiness` and `POST /console/pilot/bootstrap` handlers from `server/tapCrmRoutes.js`.
- Config rollback: remove `buildBarberPilotBaselineConfig` helper usage and restore prior template-only selection behavior.
- Data rollback:
  - optional default seeded tag can be removed from `tap_crm_tags` by `tag_code = '<tenant>-welcome'`.
  - onboarding metadata is JSON-only (`tap_crm_business_config.config`) and can be unset without schema rollback.

### Shared-Area Touches

- `server/tapCrmTemplates.js` (barber baseline + onboarding metadata defaults)
- `server/tapCrmRoutes.js` (pilot readiness/bootstrap API additions, owner console screen inventory updates)
- `tests/tap-crm-phase5-owner-console.test.js` (owner screen inventory regression assertions)
- `tests/tap-crm-phase6-template-modules.test.js` (baseline config + screen inventory assertions)
- `tapcrm/index.html` (Phase 7 owner-console informational updates)
- `docs/TAP_CRM_PILOT_CHECKLIST.md` (Phase 7 status checklist section)

## Phase 7 Follow-up — Afrocentric Futuristic UX + Guided Helper

Date: 2026-04-10

- Refined Tap Hub customer-facing renderer to Afrocentric futuristic visual direction:
  - red/black/green palette treatment
  - gold accent/outline styling
  - stronger high-contrast premium card presentation
- Added built-in guided helper block ("Virtual Guide") with interactive reveal behavior and structured steps/CTA.
- Added `guide_assistant` module support in template/module engine so guide content stays configurable through existing module config pathways.
- Added/updated tests for:
  - module registry inclusion of `guide_assistant`
  - runtime HTML verification for guide block and required visual tokens
- Full follow-up verification evidence captured in:
  - `docs/TAP_CRM_PHASE7_FOLLOWUP_VERIFICATION.md`

Result:
- PASS (Phase 7 follow-up refinement only)

## Phase 8 — Extension Architecture (Add-ons + Clone Strategy + Admin Overrides)

Date: 2026-04-10

### Built

- Added Phase 8 extension architecture in `server/tapCrmTemplates.js`:
  - add-on registry (`ADD_ON_REGISTRY`) + runtime merge resolver (`resolveAddOnRuntime`)
  - template clone helper (`cloneTemplateForIndustry`) to support industry-specific derivatives from existing templates
  - service-specific custom field registry (`SERVICE_CUSTOM_FIELD_REGISTRY`) + resolver (`resolveServiceCustomFields`)
- Added Phase 8 owner-console endpoints in `server/tapCrmRoutes.js` under existing namespace:
  - `GET /api/tap-crm/console/add-ons/registry`
  - `GET /api/tap-crm/console/add-ons/runtime`
  - `GET /api/tap-crm/console/template-clones/:industryId`
  - `GET /api/tap-crm/console/custom-fields/:serviceType`
  - `GET|PUT /api/tap-crm/console/admin/overrides` (admin-only)
- Expanded owner-console payload screen inventory for:
  - `add_on_registry`
  - `custom_fields_editor`
  - `admin_overrides`
- Updated Tap Console mount page references to Phase 8 extension surfaces.
- Added extension guidance documentation for adding industries/modules later in `docs/TAP_CRM_EXTENSION.md`.

### Verification

- Updated/added assertions in:
  - `tests/tap-crm-phase5-owner-console.test.js`
  - `tests/tap-crm-phase6-template-modules.test.js`
- Ran:
  - `node --test tests/tap-crm-phase1.test.js tests/tap-crm-phase2-schema.test.js tests/tap-crm-phase3-routing.test.js tests/tap-crm-phase4-hub-rendering.test.js tests/tap-crm-phase5-owner-console.test.js tests/tap-crm-phase6-template-modules.test.js`

### Result

- PASS (Phase 8 scope only)

### Regression Notes

- Existing Tap CRM API namespace remains unchanged (`/api/tap-crm/*`).
- Existing public tap route namespace remains unchanged (`/tap-crm/t/:tagCode`).
- Existing TAP namespace decision (`tap-crm`) remains unchanged; no `/api/tap/*` alias introduced.
- No existing GARVEY `/t/:slug/*` routes were modified.
- No schema/migration changes were introduced in Phase 8.

### Rollback Notes

- Route rollback: remove Phase 8 extension endpoints from `server/tapCrmRoutes.js`.
- Engine rollback: remove Phase 8 registries/resolvers from `server/tapCrmTemplates.js`.
- Data rollback: unset `add_on_overrides`, `custom_field_overrides`, and `admin_overrides` from `tap_crm_business_config.config` as needed.
- No schema rollback required.

### Shared-Area Touches

- `server/tapCrmTemplates.js`
- `server/tapCrmRoutes.js`
- `tests/tap-crm-phase5-owner-console.test.js`
- `tests/tap-crm-phase6-template-modules.test.js`
- `tapcrm/index.html`
- `docs/TAP_CRM_EXTENSION.md`
- `docs/TAP_CRM_PHASE8_VERIFICATION.md`

## Phase 8 Follow-up — Runtime Request-Level Verification (Extensions)

Date: 2026-04-10

- Performed request-level runtime verification against running app + PostgreSQL-backed state for Phase 8 extension surfaces:
  - add-on registry/runtime and override reflection
  - template clone runtime shape and base-vs-clone difference
  - service custom fields runtime (valid + unknown service type)
  - admin override deny/allow/persist/confirm flows
  - tenant state isolation + cross-tenant deny behavior
  - feature-flag OFF route hiding for all new Phase 8 endpoints
- Detailed evidence (commands + observed outputs) captured in:
  - `docs/TAP_CRM_PHASE8_RUNTIME_VERIFICATION.md`

Result:
- PASS (Phase 8 follow-up runtime verification)

Scope confirmation:
- No schema migrations added in this follow-up.
- No unrelated automation, messaging, or platform redesign work introduced.
