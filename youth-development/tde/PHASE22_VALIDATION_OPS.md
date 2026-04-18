# Phase 22 – Validation and Calibration Operations Layer

## What Phase 22 adds

Phase 22 adds additive, extension-only operations surfaces for reliability review and calibration transparency. It does **not** replace live youth v1, and it does **not** modify core intake or scoring contracts.

Added operator surfaces:

- `GET /api/youth-development/tde/validation/summary/:childId`
- `GET /api/youth-development/tde/evidence-quality/:childId`
- `GET /api/youth-development/tde/calibration/summary`

These endpoints are feature-gated by the existing TDE extension mode and remain deterministic for the same snapshot inputs.

## Validation-readiness surfacing

Validation readiness now includes explicit, separable evidence-quality dimensions:

- source sufficiency
- source diversity
- sparse-data flags
- observer disagreement (when checkin evidence exists)
- traceability completeness
- missing-contract burden

The summaries include an explicit distinction guard:

- `validation_readiness_describes_evidence_not_child_ability`
- `evidence_quality_not_child_ability`

This is intended to prevent operator over-interpretation of low-evidence states as low child ability.

## Calibration summary interpretation

Calibration summaries are metadata for review and audit operations. They expose:

- active calibration versions
- major threshold groups
- impacted modules and rule groups
- outputs that rely on calibration variables

No hidden tuning behavior is introduced. The summaries include:

- `hidden_tuning_behavior: "none"`
- transparency note that calibration metadata is explicit and non-silent.

## Assumptions vs validated findings

The Phase 22 evidence-quality outputs separate currently validated facts from assumptions:

Validated from available evidence:

- source sufficiency/diversity
- sparse-data detection
- traceability completeness

Still assumptions pending stronger validation datasets:

- cross-setting stability without complete observer coverage
- causal interpretation of environment effects

## Missing contracts surfaced explicitly

Missing-contract burden is intentionally explicit and additive, including examples such as:

- observer consent records required
- environment hook events required
- development checkin evidence required
- milestone progress trait summaries required
- traceability ratio below minimum

These are surfaced as operational readiness blockers, not child performance findings.
