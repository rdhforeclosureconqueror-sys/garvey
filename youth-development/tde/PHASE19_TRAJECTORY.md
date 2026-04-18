# Phase 19 — Longitudinal Growth & Trajectory Layer (Extension-Only)

## What this phase adds
- Deterministic longitudinal trajectory modeling over milestone windows for all 7 pillars.
- Explainable trajectory states: `improving`, `stable`, `plateauing`, `inconsistent`, `regressing`, `insufficient_data`.
- Additive parent/operator surfacing for growth trajectory and milestone comparison.
- Additive recommendation integration where trajectory influences (but does not replace) rule-based recommendations.

## What trajectory is (and is not)
- **Is**: directional interpretation over time windows with confidence limits and traceability.
- **Is not**: diagnosis, destiny prediction, or a standalone verdict about child potential.
- **Is not**: a replacement for adherence/environment interpretation; those remain separate in outputs.

## Thresholds that remain calibration-variable
- Minimum points required for direction classification.
- Improvement/regression delta thresholds.
- Plateau/stable delta windows.
- Inconsistency volatility threshold.
- Adherence threshold that limits interpretation confidence.

## New additive endpoints
- `GET /api/youth-development/tde/growth-trajectory/:childId`
- `GET /api/youth-development/tde/milestone-comparison/:childId`

## Contract and safety notes
- Sparse data returns low-confidence/`insufficient_data` behavior.
- Missing milestone contracts are surfaced explicitly in `missing_contracts`.
- Live youth v1 routes/contracts remain untouched.
