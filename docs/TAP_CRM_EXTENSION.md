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
