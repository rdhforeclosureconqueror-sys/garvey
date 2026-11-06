# RDH Business Cloud — audit and private estimator plan

Audit date: 2026-11-06. Source reviewed: `server/tapCrmRoutes.js`, `server/tapCrmDb.js`, `server/tapCrmTemplates.js`, `server/accessControl.js`, `server/tenant.js`, `docs/WEBSITE_GENERATOR_AUDIT.md`, `docs/TAP_CRM_PHASE6_RUNTIME_VERIFICATION.md`, `docs/RDH_WEBSITES_OPERATING_HUB.md`.

## Findings

- Existing website generator and five layouts; owner-authenticated publish workflow is documented, but not newly production-certified.
- Tap CRM has contacts, pipelines, tags, business configs, tenant-scoped queries, template/module registries, booking status logic, and an owner console. Existing tests document tenant-state isolation in an earlier local environment, not a current production penetration test.
- Nicc Fades is a concept demo; real checkout, check-in and queue are not certified.
- RDH operations hub is a public navigation page, not a protected business dashboard.
- A complete production SMS/email automation service, client-facing request intake wired to internal quotes, and SaaS billing have not been established.

## Internal feature catalog

See `internal/rdh-business-cloud/feature-catalog.json`. The `min_level` is the lowest typical complexity level; colors represent levels, not pricing. Feature status is evidence-based. Do not publish this JSON to the static `public/` tree or return it from a public API. Do not expose estimates, markup, internal costs or implementation recommendations to prospective customers.

## Next acceptance gates

1. Read-only production inspection: deployment SHA, flags, API availability and health; no production writes.
2. Security: verified server-side owner session; tenant A cannot access tenant B by query/body/header spoofing; ensure contact/tag associations enforce tenant boundaries; check audit logging and data retention.
3. Private owner-only estimator: per-feature implementation type, hours, internal labor, external fees, monthly support, minimum margin, dependency rules, and human approval.
4. Public intake: customer feature choices, budget range and contact details; send notification and save a lead without returning internal classification or costs.
5. Pilot: one consenting business, real payment provider, safe test transactions, end-to-end one-click first-failure report, and offboarding/export test.

Do not copy the whole Garvey repo for each client. Prefer separate application boundaries and tenant-scoped services; scale compute and database independently. Keep youth learning data isolated.
