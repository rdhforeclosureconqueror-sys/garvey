# GARVEY Platform Dossier (Reconstruction Binder)

Generated: 2026-03-31 UTC

This document maps GARVEY's canonical command-center platform (`public/garvey.html`) and the canonical Customer Return Engine analytics dashboard (`public/dashboard.html`), including route families, persistence model, and phase orchestration.

## Protected-Mode Alignment
- Follow `docs/PROTECTED_SYSTEM_MODE.md` directives: inspect-first, no unrelated refactors, preserve Kanban/rewards/intake/results/routing contracts.

## Canonical Frontend Surfaces
- `public/garvey.html`: canonical GARVEY command-center for Phases 1-7 + master dashboard.
- `public/dashboard.html`: canonical Customer Return Engine dashboard (legacy analytics surface backed by `dashboardnew/app.js`).
- `public/garvey_premium.html`, `public/rewards_premium.html`: text-only premium wrappers that route into live pages.

## Seven Phase Backends
1. Foundation: `server/foundationRoutes.js` -> `/api/foundation/*`
2. Structure: `server/structureRoutes.js` -> `/api/structure/*`
3. Execution: `server/executionRoutes.js` -> `/api/execution/*`
4. Intelligence: `server/intelligenceRoutes.js` -> `/api/intelligence/*`
5. Infrastructure: `server/infrastructureRoutes.js` -> `/api/infrastructure/*`
6. Routing & Stability: `server/routingRoutes.js` -> `/api/routing/*` and `/api/stability/*`
7. Evaluation/Evolution: `server/evolutionRoutes.js` -> `/api/evolution/*`

## Cross-Phase Engines
- Journey spine: `foundation_journeys.journey.events` receives append-only phase events.
- Readiness and gap detection: Intelligence computes readiness scores and persists gaps/actions.
- Resource recommendation: Infrastructure projects recommended actions into tool/resource suggestions.
- Stability escalation: issues -> routing tasks -> milestones/notifications with severity-driven escalation fields.
- Master dashboard rollup: `public/garvey.html` computes per-phase completion and global activity timeline from phase API payloads.

## Canonical DB Backbone
- Core tenancy: `tenants`, `users`, `tenant_config`, `tenant_sites`
- Campaign attribution: `campaigns`, `campaign_events`
- Assessment/intake/VOC: `questions`, `intake_*`, `voc_*`, `assessment_submissions`
- Rewards/actions: `visits`, `actions`, `reviews`, `referrals`, `wishlist`
- Kanban canonical: `kanban_boards`, `kanban_columns`, `kanban_cards`, `kanban_card_events`
- Phase state tables:
  - Foundation: `foundation_cards`, `foundation_journeys`
  - Structure: `structure_cards`, `structure_roles`, `structure_operator_assignments`
  - Execution: `execution_cards`, `execution_items`, `execution_recurring_instances`
  - Intelligence: `intelligence_cards`, `intelligence_kpis`, `readiness_scores`, `gap_records`, `recommended_actions`
  - Infrastructure: `infrastructure_cards`, `infrastructure_tools`, `infrastructure_resources`, `infrastructure_templates`, `infrastructure_links`
  - Stability: `stability_cards`, `issues`, `routing_tasks`, `milestone_logs`, `notification_logs`
  - Evolution: stored in `tenant_config.config.evolution` (JSONB state machine)

## Route Families in `server/index.js`
- Legacy + active owner/customer/rewards/campaign/site APIs remain in index.
- Phase routers mounted at `/api/foundation|structure|execution|intelligence|infrastructure|routing|stability|evolution`.
- Dashboard tenant analytics remain under `/t/:slug/*` and are consumed by `dashboardnew/app.js`.

## Rebuild Order (if repository vanished)
1. Recreate `server/db.js` schema + migrations and `server/kanbanDb.js` canonical Kanban.
2. Recreate `server/index.js` mounts and legacy route contracts.
3. Recreate seven phase route modules and journey-event appends.
4. Restore `public/garvey.html` phase UI and master rollup behavior.
5. Restore `public/dashboard.html` + `dashboardnew/app.js` analytics workflow.
6. Restore helper contracts (`public/js/api-contract.js`, tenant/config helpers).
7. Verify with `/health`, `/api/questions`, `/api/intake`, `/api/results/:email`, `/api/stability/verify`, and phase `/state` endpoints.

