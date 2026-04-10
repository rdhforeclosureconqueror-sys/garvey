# Tap CRM Phase 8 Verification (Extension Architecture Only)

Date: 2026-04-10

Scope guardrails (enforced):
- Phase 8 only.
- No work past Phase 8.
- No unrelated automation, messaging, or platform redesign.
- Existing namespace decision preserved: `tap-crm` (`/api/tap-crm/*`, `/tap-crm/t/:tagCode`).

## Built in Phase 8

1. **Add-on architecture**
   - Added add-on registry + runtime resolver with tenant JSON overrides (`add_on_overrides`).
   - Added owner-console add-on registry/runtime endpoints under existing namespace.

2. **Template cloning strategy**
   - Added clone helper to derive industry-specific template clones from existing templates.
   - Added owner-console clone preview endpoint for controlled industry extensions.

3. **Admin-only overrides**
   - Added explicit admin-only guard helper for override operations.
   - Added admin override GET/PUT endpoints; non-admin users are denied.

4. **Service-specific custom field extension pattern**
   - Added service custom field registry and tenant override merge resolver.
   - Added owner-console custom field runtime endpoint by service type.

5. **Future extension documentation**
   - Documented how to add new industries and modules safely.

## Verification commands and results

```bash
node --test tests/tap-crm-phase1.test.js tests/tap-crm-phase2-schema.test.js tests/tap-crm-phase3-routing.test.js tests/tap-crm-phase4-hub-rendering.test.js tests/tap-crm-phase5-owner-console.test.js tests/tap-crm-phase6-template-modules.test.js
```

Result:
- PASS for Phase 1–8 covered unit suite (with Phase 8 assertions added into phase5/phase6 test files).

## Regression notes

- Tap CRM API namespace unchanged: `/api/tap-crm/*`.
- Public tap route namespace unchanged: `/tap-crm/t/:tagCode`.
- No `/api/tap/*` alias introduced.
- No changes to GARVEY legacy `/t/:slug/*` route family.
- No schema migrations added in Phase 8; all extension state remains JSON in `tap_crm_business_config.config`.

## Rollback notes

- Route rollback:
  - Remove Phase 8 endpoints from `server/tapCrmRoutes.js`:
    - `/console/add-ons/registry`
    - `/console/add-ons/runtime`
    - `/console/template-clones/:industryId`
    - `/console/custom-fields/:serviceType`
    - `/console/admin/overrides` (GET/PUT)
- Engine rollback:
  - Remove Phase 8 helpers/registries in `server/tapCrmTemplates.js`:
    - `ADD_ON_REGISTRY`
    - `SERVICE_CUSTOM_FIELD_REGISTRY`
    - `cloneTemplateForIndustry`
    - `listAddOns`
    - `resolveAddOnRuntime`
    - `resolveServiceCustomFields`
- Data rollback:
  - Remove JSON keys from tenant config if present:
    - `add_on_overrides`
    - `custom_field_overrides`
    - `admin_overrides`
  - No database schema rollback required.

## Shared-area touches

- `server/tapCrmTemplates.js` (Phase 8 extension registries/resolvers)
- `server/tapCrmRoutes.js` (Phase 8 extension endpoints + admin gate helper)
- `tests/tap-crm-phase5-owner-console.test.js` (screen inventory + admin gate tests)
- `tests/tap-crm-phase6-template-modules.test.js` (clone/add-on/custom-field tests)
- `tapcrm/index.html` (owner-console informational surface update)
- `docs/TAP_CRM_EXTENSION.md` (future extension guidance)
