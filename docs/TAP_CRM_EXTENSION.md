# Tap CRM Extension (Feature-Flagged)

Tap CRM is isolated behind a dedicated feature flag.

## Flag

- `TAP_CRM_MODE=off|internal|on`
- `TAP_CRM=off|internal|on` (fallback alias)

Default is `off`.

## Exposure Rules

When `off`:

- `GET /tap-crm` returns 404.
- `/api/tap-crm/*` returns 404.

When `internal` or `on`:

- `GET /tap-crm` serves the Tap CRM mount page.
- `GET /api/tap-crm/health` returns domain health payload.
- `GET /api/tap-crm/dashboard?tenant=<slug>` returns placeholder CRM dashboard payload.

## Scope and Isolation

- Tap CRM route family is namespaced to `/api/tap-crm`.
- No existing GARVEY domain contracts are modified.
- No existing dashboard routes are changed.

## Phase 8 Extension Pattern (Add-on + Clone + Admin Override)

Phase 8 keeps the same namespace and expands only extension-safe patterns:

- Add-ons are config-driven and isolated under business config JSON (`add_on_overrides`).
- Template cloning is generated from existing template definitions (no duplicate route surface).
- Admin-only overrides are stored under `admin_overrides` and gated by admin actor checks.
- Service-specific custom fields are defined per service type with tenant-level overrides (`custom_field_overrides`).

### Route surfaces (all under existing namespace)

- `GET /api/tap-crm/console/add-ons/registry`
- `GET /api/tap-crm/console/add-ons/runtime`
- `GET /api/tap-crm/console/template-clones/:industryId?template=<templateId>`
- `GET /api/tap-crm/console/custom-fields/:serviceType`
- `GET|PUT /api/tap-crm/console/admin/overrides` (admin only)

### How to add a new industry later

1. Add a new template in `TEMPLATE_REGISTRY` with module defaults.
2. Add any service-specific custom fields in `SERVICE_CUSTOM_FIELD_REGISTRY`.
3. Use clone endpoint to generate industry-specific derivative template metadata.
4. Keep module and add-on behavior in config JSON only; avoid new route namespaces.

### How to add a new module later

1. Add module metadata + default config in `MODULE_REGISTRY`.
2. Reference module in template `modules` where enabled by default.
3. Verify runtime merge behavior via `resolveTemplateRuntime`.
4. Add unit coverage to keep module key order and runtime precedence stable.
