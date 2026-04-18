# Phase 18 — TDE Adaptive Personalization Layer

## What Phase 18 adds
- Adds a deterministic personalization engine (`personalizationService`) that combines:
  - phase-17 insights
  - historical progress/session/check-in signals
- Adds additive endpoints:
  - `GET /api/youth-development/tde/personalization/:childId`
  - `GET /api/youth-development/tde/pattern-history/:childId`
  - `GET /api/youth-development/tde/recommendations/:childId/explanation`
- Extends recommendation outputs with transparent adaptive adjustment metadata.
- Adds optional deterministic session adaptation hooks in `sessionBuilderService`.

## Signals used by personalization
1. Insight layer outputs (`insight_schema_version`, confidence, missing contracts)
2. Weekly progress trajectory (`progress_records[*].trait_signal_summary`)
3. Session adherence behavior (`intervention_sessions[*].full_session_completed`)
4. Development check-in transfer deltas (`development_checkins[*].summary.transfer_attempt_quality`)

## Adaptive vs fixed behavior

### Adaptive (Phase 18)
- Recommendation modifiers:
  - intensity (`reduced`, `baseline`, `increased`)
  - frequency (`baseline`, `higher_touchpoint_frequency`)
  - intervention type bias
- Session adaptation hooks:
  - preferred challenge level
  - reflection prompt count
  - deterministic activity bias
- Parent guidance modifiers:
  - tone
  - emphasis
  - confidence language framing

### Fixed (still deterministic baseline)
- Rule engine remains explicit rule-based operational logic.
- Existing TDE route contracts remain additive.
- Existing live youth v1 routes remain untouched.

## Pattern tracking semantics
The pattern history read model tracks:
- `improving_trend`
- `stagnation_pattern`
- `inconsistency_pattern`
- `regression_signal`

Each pattern includes threshold values, traceability fields, and explicit `rule_path`.

## Confidence handling
- Confidence is explicitly surfaced (`low`, `moderate`, `high`) and based on available historical signal streams.
- Low-confidence states force conservative adaptation and early-signal language.
- Missing data degrades outputs via `missing_contracts` and `contracts_status=incomplete`; no black-box inference is used.

## Calibration variables (Phase 18)
`CALIBRATION_VARIABLES.personalization_layer`:
- `improving_delta_min`
- `stagnation_delta_abs_max`
- `regression_delta_max`
- `inconsistency_completion_gap`
