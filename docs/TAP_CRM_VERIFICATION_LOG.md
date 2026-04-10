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
