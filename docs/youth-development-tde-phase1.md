# Youth Development TDE Phase 1 (Extension-First)

## What phase 1 does

- Adds extension-only governance contracts under `/api/youth-development/tde/*`.
- Adds additive DB persistence for calibration versions, signal events, trace rows, and audit events.
- Adds deterministic validation helpers for bounded signal fields, trace requirements, and minimum source diversity handling.
- Enforces the phase-1 default for source diversity `< 2`: no reported trait score; internal partial rows are preserved with `insufficient_source_diversity`.

## What phase 1 intentionally does **not** change

- Does **not** replace or modify live youth v1 assess output contracts.
- Does **not** alter existing `/api/youth-development/intake/*` payload shapes.
- Does **not** reroute or rename any existing youth endpoints.

## Live baseline routes that remain unchanged

- `/api/youth-development/questions`
- `/api/youth-development/assess`
- `/api/youth-development/parent-dashboard/*`
- `/api/youth-development/intake/*`

## Calibration variables and non-overclaim guardrails

These remain calibration variables in phase 1 and should not be presented as settled science:

- Trait weighting policies.
- Source reliability weighting coefficients.
- Thresholds beyond the explicit contract minimums.
- Any future provisional-score behavior when source diversity is below threshold.
