# Repo Report — Assumed Merged State (2026-04-16)

## 1) Current engine/domain status

- **Love**
  - Assessment flow is live and consent-gated before question start.
  - Love card rendering remains on dual variant model (`masculine`/`feminine`) and is unchanged.
- **Loyalty**
  - Assessment flow now follows the same consent-first gate behavior before question start.
  - Loyalty archetype cards/results now resolve to live loyalty image assets from `/public/archetype-card/loyalty/*` using deterministic code mapping.
- **Leadership**
  - Assessment flow now follows the same consent-first gate behavior before question start.
  - Leadership rendering structure remains unchanged.
- **Youth development**
  - Existing preview + intake API routes remain mounted and available.
  - Internal intake test page now has a required permission step before test actions are enabled.

## 2) Current youth route/access surface

Confirmed live routes:

- `GET /youth-development/parent-dashboard/preview`
- `GET /youth-development/intake/test`
- `GET /api/youth-development/parent-dashboard/preview`
- `POST /api/youth-development/intake/task-session`
- `POST /api/youth-development/intake/signals`

## 3) Current known gaps

- Youth permission gate is UI-level for the internal test runner; intake APIs remain intentionally ungated for isolated/local test automation.
- No new persistence/wiring was introduced for youth consent (deferred by scope).
- Loyalty image mapping is filename-driven and deterministic, but no CMS/admin override exists for runtime remapping.

## 4) Current verification truth

- Archetype engine start now enforces `consent_required_before_assessment` across Love, Loyalty, and Leadership when missing consent.
- Archetype engine start succeeds for all three engines after valid consent submission.
- Youth preview/test routes still resolve with deterministic preview output and intake endpoint wiring intact.

## 5) Repo green status

- Test targets for archetype engines and youth-development intake page pass with this change set.
- No dashboardnew files were touched.
- No DB/storage migrations or storage wiring were introduced.

## 6) Remaining deferred work

- If product requires strict server-side permission enforcement for youth intake APIs, add a scoped middleware contract later (not included in this pass).
- Optional follow-up: centralize consent UI copy between VOC, archetype engines, and youth internal pages for single-source consistency.
