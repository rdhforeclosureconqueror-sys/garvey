# Tap CRM Phase 8 Runtime Verification (Request-level + DB-backed)

Date: 2026-04-10

Scope constraints honored:
- Phase 8 follow-up verification only.
- No work beyond Phase 8.
- `tap-crm` route namespace remains unchanged.
- No unrelated automation/messaging/platform redesign changes introduced in this follow-up.

Environment notes:
- Installed and started PostgreSQL 16 locally for DB-backed request verification.
- App verified with:
  - `TAP_CRM=on` on `PORT=3000`
  - `TAP_CRM=off` on `PORT=3001`
- Seeded tenants: `demoa`, `demob`.
- Seeded `demoa` business config includes Phase 8 overrides:
  - `add_on_overrides.waitlist_capture`
  - `custom_field_overrides.barber`

## 1) Add-on registry/runtime checks

### Commands
- `GET /api/tap-crm/console/add-ons/registry?tenant=demoa&role=business_owner`
- `GET /api/tap-crm/console/add-ons/runtime?tenant=demoa&role=business_owner`
- `GET /api/tap-crm/console/add-ons/runtime?tenant=demob&role=business_owner`

### Evidence
Registry returned expected add-ons:
- `waitlist_capture`
- `loyalty_snapshot`

`demoa` runtime reflected stored override values:
- `waitlist_capture.enabled: true`
- `waitlist_capture.config.headline: "Priority waitlist"`
- `waitlist_capture.config.cta_label: "Save my spot"`

`demob` runtime remained default:
- `waitlist_capture.enabled: false`
- `waitlist_capture.config.cta_label: "Join waitlist"`

Observed excerpt:
```json
{
  "tenant": "demoa",
  "waitlist": {
    "add_on_id": "waitlist_capture",
    "enabled": true,
    "config": {
      "headline": "Priority waitlist",
      "cta_label": "Save my spot"
    }
  }
}
```

## 2) Template clone runtime checks

### Commands
- `GET /api/tap-crm/console/template-clones/pet-grooming?tenant=demoa&role=business_owner&template=barber`
- `GET /api/tap-crm/console/templates/selector?tenant=demoa&role=business_owner`

### Evidence
Clone returned expected shape:
- `id: "pet-grooming_barber_clone"`
- `vertical: "pet-grooming"`
- `source_template_id: "barber"`
- `is_cloned_template: true`

Concrete difference from base barber template:
- Base template metadata remains `id: "barber"`, `vertical: "barber"`.
- Clone metadata changes to industry-specific id/vertical while preserving module set.

Observed excerpt:
```json
{
  "clone": {
    "id": "pet-grooming_barber_clone",
    "vertical": "pet-grooming",
    "source_template_id": "barber",
    "is_cloned_template": true
  }
}
```

## 3) Service custom fields runtime checks

### Commands
- `GET /api/tap-crm/console/custom-fields/barber?tenant=demoa&role=business_owner`
- `GET /api/tap-crm/console/custom-fields/unknown-service?tenant=demoa&role=business_owner`

### Evidence
For service type `barber`, expected field set returned, including override merge:
- `preferred_barber` label resolved to tenant override: `"Preferred artist"`
- `beard_service` returned with default definition

Unknown service type behavior:
- HTTP `200`
- returns empty `custom_fields: []`
- no crash / no 500

Observed excerpt:
```json
{
  "service_type": "unknown-service",
  "custom_fields": []
}
```

## 4) Admin override runtime checks

### Commands
- Non-admin GET deny:
  - `GET /api/tap-crm/console/admin/overrides?tenant=demoa&role=business_owner`
- Admin GET:
  - `GET /api/tap-crm/console/admin/overrides?tenant=demoa&role=admin`
- Admin PUT persist:
  - `PUT /api/tap-crm/console/admin/overrides?tenant=demoa&role=admin`
  - payload: `{"maintenance_mode":true,"banner":"phase8-admin-override"}`
- Follow-up admin GET confirm persisted value
- Non-admin PUT deny:
  - `PUT /api/tap-crm/console/admin/overrides?tenant=demoa&role=business_owner`

### Evidence
- Non-admin GET denied with HTTP `403` and `{"error":"admin_override_required"}`.
- Admin GET returned current override object.
- Admin PUT persisted override object.
- Follow-up admin GET returned the persisted object unchanged.
- Non-admin PUT denied with HTTP `403` and `{"error":"admin_override_required"}`.

## 5) Tenant isolation checks

### Commands
- Runtime/value isolation check via requests:
  - `GET /api/tap-crm/console/add-ons/runtime?tenant=demoa&role=business_owner`
  - `GET /api/tap-crm/console/add-ons/runtime?tenant=demob&role=business_owner`
- Cross-tenant access deny check using authenticated owner session (`owner-a`) and foreign tenant query:
  - `GET /api/tap-crm/console/add-ons/runtime?tenant=demob` with owner session cookie for `owner-a`

### Evidence
- Request-level runtime differs by tenant (`demoa` override present, `demob` default), confirming tenant-scoped state.
- Cross-tenant request with owner session denied:
  - HTTP `403`
  - `{"error":"forbidden","details":"cross-tenant access denied"}`

## 6) Feature flag OFF verification

### Commands (app running with `TAP_CRM=off`, `PORT=3001`)
- `GET /api/tap-crm/console/add-ons/registry?tenant=demoa&role=business_owner`
- `GET /api/tap-crm/console/add-ons/runtime?tenant=demoa&role=business_owner`
- `GET /api/tap-crm/console/template-clones/pet-grooming?tenant=demoa&role=business_owner&template=barber`
- `GET /api/tap-crm/console/custom-fields/barber?tenant=demoa&role=business_owner`
- `GET /api/tap-crm/console/admin/overrides?tenant=demoa&role=admin`

### Evidence
All returned HTTP `404` with `{"error":"Not found"}` while flag was OFF.

## 7) Scope verification

Confirmed in this follow-up:
- No new schema migrations were added.
- No unrelated automation/messaging/platform redesign work was introduced.
- Work was limited to request-level runtime verification + documentation evidence.
