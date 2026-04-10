# Tap CRM Architecture

## Phase 1 Scope (Domain Foundation + Isolation)

This document defines how Tap CRM is mounted inside Garvey without contaminating existing Garvey domain logic.

## Permanent Namespace Decision

Tap CRM uses the existing repo namespace convention established in Phase 0:

- Public mount (temporary placeholder): `/tap-crm`
- Dashboard mount (owner-facing placeholder): `/dashboard/tap-crm`
- Internal API namespace: `/api/tap-crm/*`

### Mapping to handoff-intended names

The handoff examples used `/api/tap/*` and `/dashboard/tap/*`. In this repo, the permanent namespace is `tap-crm` to avoid collisions with existing `/t/:slug/*` GARVEY campaign routes and to preserve additive-only safety.

| Intended | Chosen in repo | Reason |
|---|---|---|
| `/api/tap/*` | `/api/tap-crm/*` | Prevent route ambiguity with existing route families. |
| `/dashboard/tap/*` | `/dashboard/tap-crm` | Keeps dashboard surface isolated and explicit. |
| `/t/:tagCode` | Implemented as `/tap-crm/t/:tagCode` in Phase 3 | Avoids collision with existing `/t/:slug/*` GARVEY runtime routes while keeping Tap CRM namespace explicit. |

## Tenancy Strategy

- Tap CRM reuses existing Garvey tenant identity (`tenant.slug`) as tenant boundary.
- Tap CRM routes require tenant context via `tenant` query parameter in Phase 1 stubs.
- Cross-tenant access is blocked by shared `evaluatePolicy` checks.
- No duplicate tenant table or auth stack is introduced.

## Auth + Permission Strategy

Tap CRM reuses existing `deriveActor` and policy engine in `server/accessControl.js`.

Tap CRM action keys:

- `tap:view`
- `tap:manage`
- `tap:tags:manage`
- `tap:templates:manage`
- `tap:analytics:view`

Role mapping in Phase 1:

- `admin`: global override (unchanged existing behavior)
- `business_owner`: full Tap CRM action set
- `staff_operator`: read analytics/view only (`tap:view`, `tap:analytics:view`)
- `customer` and `anonymous`: no Tap CRM owner-surface permissions

## Dashboard Mount Isolation Strategy

- Tap CRM owner UI is mounted separately at `/dashboard/tap-crm`.
- No Tap CRM controls are injected into existing `dashboard.html` flows in Phase 1.
- Existing GARVEY dashboards remain unchanged.

## Domain Vocabulary

- **Tap Hub**: customer-facing destination after tap (Phase 4)
- **Tap Console**: owner-facing management area (Phase 5)
- **Tap Tags**: tag registry/resolution layer (Phase 3+)
- **Tap Templates**: business presets (Phase 6+)
- **Tap Modules**: reusable render/config blocks (Phase 6+)
- **Tap Engine**: backend resolution + rendering orchestration (Phase 3+)
