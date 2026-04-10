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
