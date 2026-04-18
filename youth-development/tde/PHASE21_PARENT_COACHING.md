# Phase 21 — Parent Coaching Intelligence Layer (Extension-Only)

## What this phase adds
- Deterministic parent facilitation-state interpretation based on session history, coaching style, adherence, reflection signal movement, child response patterns, trajectory context, and environment/context signals.
- Additive parent coaching summary and parent guidance endpoints.
- Explicit separation between child developmental pattern, environment/context pattern, and parent facilitation pattern.
- Traceable facilitation guidance with reason codes and rule-path references.

## Facilitation states
- `supportive_and_effective`
- `overly_directive`
- `inconsistent_support`
- `low_engagement`
- `reflection_support_needed`
- `challenge_calibration_support_needed`
- `insufficient_data`

## What facilitation states mean
- They describe current **implementation support patterns** and coaching-adjustment opportunities.
- They are confidence-aware and downgrade to `insufficient_data` when history is sparse.
- They are additive to existing trajectory/insight layers and do not replace child-facing interpretation.

## What facilitation states do not mean
- They are **not** diagnostic labels.
- They are **not** blame statements toward parents/caregivers.
- They are **not** claims of child weakness when implementation or environment is the primary limiter.

## How parent guidance is generated
- Builds separated pattern blocks first:
  1. child developmental pattern
  2. environment/context pattern
  3. parent facilitation pattern
- Applies deterministic parent facilitation-state rules.
- Generates parent-facing coaching guidance with:
  - what is working,
  - what may be limiting progress,
  - challenge-fit interpretation,
  - reflection prompt use interpretation,
  - adherence/scheduling vs child-need interpretation,
  - one next coaching adjustment.

## Thresholds that remain calibration-variable
- Minimum session history for state classification.
- Directive-rate threshold for `overly_directive`.
- Adherence thresholds for `low_engagement` and broader support limits.
- Session-consistency threshold for `inconsistent_support`.
- Reflection delta floor for `reflection_support_needed`.
- Challenge-fit thresholds for `challenge_calibration_support_needed`.

## New additive endpoints
- `GET /api/youth-development/tde/parent-coaching/:childId`
- `GET /api/youth-development/tde/parent-guidance/:childId`

## Contract and safety notes
- Sparse data yields low-confidence `insufficient_data` interpretation.
- Missing contracts are surfaced in `missing_contracts`.
- Live youth v1 routes/contracts remain untouched.
