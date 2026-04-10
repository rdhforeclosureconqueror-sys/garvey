# Tap CRM Phase 6 Runtime Verification (DB-backed)

Date: 2026-04-10

Scope constraints honored:
- Phase 6 only (no Phase 7 work)
- Route namespace unchanged (`tap-crm` family)

Environment notes:
- PostgreSQL 16 local instance started for DB-backed verification.
- App runtime verified with `TAP_CRM=on` on port `3000` and `TAP_CRM=off` on port `3001`.

## 1) Template loader runtime checks

### Commands
- `GET /api/tap-crm/console/templates/selector?tenant=demoa&role=business_owner`
- `PUT /api/tap-crm/console/templates/selector?tenant=demoa&role=business_owner` with `barber`, then follow-up GET
- `PUT ... selected_template_id=salon`
- `PUT ... selected_template_id=fitness`

### Evidence
- Selector GET returns `available_templates`, `selected_template_id`, and `effective_template`.
- PUT persists selection; follow-up GET reflects persisted value.

Observed response excerpt (after selecting `barber`):
```json
{
  "template_selector": {
    "selected_template_id": "barber",
    "available_templates": [
      { "id": "default" },
      { "id": "barber" },
      { "id": "salon" },
      { "id": "fitness" }
    ],
    "effective_template": {
      "selected_template_id": "barber",
      "vertical": "barber"
    }
  }
}
```

## 2) Module registry runtime checks

### Commands
- `GET /api/tap-crm/console/modules/registry?tenant=demoa&role=business_owner`
- `GET /api/tap-crm/console/modules/social_links?tenant=demoa&role=business_owner`
- `PUT /api/tap-crm/console/modules/social_links?...` with `{ "enabled": false }`
- Follow-up `GET /console/modules/social_links?...`

### Evidence
- Registry/read returned expected module set:
  - `hero`, `primary_cta`, `services`, `social_links`, `business_info`
- Disable persisted (`social_links.enabled: false`) and follow-up GET reflected it.

Observed response excerpt:
```json
{
  "module": {
    "module_id": "social_links",
    "enabled": false,
    "config": { "links": [] }
  }
}
```

## 3) Runtime merge behavior

### Commands
- `PUT /api/tap-crm/console/modules/primary_cta?...` with:
  - `{"enabled":true,"config":{"label":"Reserve chair now","url":"/book-priority"}}`
- `GET /api/tap-crm/console/modules/registry?...`

### Evidence (default + template + override precedence)
Concrete example: `primary_cta.label`
1. Default: `Book now`
2. Fitness template value: `Start trial`
3. Per-business override: `Reserve chair now` (final effective runtime value)

Observed excerpt after override:
```json
{
  "module_id": "primary_cta",
  "enabled": true,
  "config": {
    "label": "Reserve chair now",
    "url": "/book-priority"
  }
}
```

## 4) Public Tap Hub effect

### Commands
- `GET /tap-crm/t/phase6-demoa` after selecting each template (`barber`, `salon`, `fitness`)
- `PUT /console/modules/social_links` disabled, then `GET /tap-crm/t/phase6-demoa`

### Evidence
Different templates produced different rendered customer-facing output:
- Barber render includes:
  - `<h1>Fresh cuts, no wait</h1>`
  - `Haircut`, `Beard trim`
- Salon render includes:
  - `<h1>Style for every occasion</h1>`
  - `Color`, `Blowout`
- Fitness render includes:
  - `<h1>Train with purpose</h1>`
  - `Group class`, `Personal training`

Disabling module suppresses section:
- After `social_links.enabled=false`, rendered page no longer contains `<h2>Social & brand</h2>`.

## 5) Safe fallback behavior

### Commands
- `GET /tap-crm/t/phase6-demob` for tenant/tag with partial config (no explicit template/module overrides)

### Evidence
Fallback-safe render observed:
- `<h1>Welcome</h1>`
- subheadline `Tap to get started`
- `Featured services` shows empty-state message (`No featured services configured.`)
- social/business zones render safe empty-state text instead of crashing.

## 6) Tenant isolation / validation

### Commands
- Tenant A updates made on `demoa` via selector/module endpoints.
- DB check:
  - `SELECT t.slug, bc.config->>'selected_template_id', bc.config->'module_overrides'->'social_links'->>'enabled' ... WHERE slug IN ('demoa','demob')`
- Invalid template update test.
- Invalid module id update/read test.

### Evidence
Tenant isolation (state-level) observed:
- `demoa|fitness|false`
- `demob||`

This shows tenant `demob` did not inherit `demoa` selections/overrides.

Validation observed:
- Invalid template selection rejected:
  - HTTP `400`
  - `{ "error": "unknown_template_id" }`
- Invalid module id rejected:
  - HTTP `404`
  - `{ "error": "module_not_found" }`

## 7) Feature flag OFF verification

### Commands
- Started app with `TAP_CRM=off PORT=3001`.
- Requested:
  - `/api/tap-crm/console/templates/selector?...`
  - `/api/tap-crm/console/modules/registry?...`
  - `/tap-crm/t/phase6-demoa`
  - `/tap-crm`
  - `/dashboard/tap-crm`

### Evidence
All Tap CRM routes returned `404` while feature was off:
- API endpoints: `{ "error":"Not found" }`
- Owner/public mounts: `Not found`

## Conclusion

- Phase 6 runtime behavior verified against running app + real PostgreSQL state.
- Verification confirms template selection persistence, module persistence, runtime merge precedence, customer-facing render impact, fallback safety, tenant-scoped state isolation, validation behavior, and feature-flag-off route hiding.
- No Phase 7 work performed.
