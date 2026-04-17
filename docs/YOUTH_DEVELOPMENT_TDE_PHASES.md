# Youth Development TDE Extension Phases

## Phase 1 (already shipped)
- Added governance primitives (`evidence_status_tag`, `calibration_version`, `trace_ref`) to the additive intake overlay.
- Added deterministic trait-mapping contract endpoint for extension intake validation.
- Preserved live youth v1 scoring, intake flow, and parent dashboard contracts.

## Phase 2 (this pass)
Phase 2 adds the first operational **extension-only** TDE scoring spine under `/api/youth-development/tde/*`.

### What Phase 2 adds
- Deterministic raw-evidence → normalized-signal extraction with rejection logging for unnormalizable evidence.
- Trait mapping contracts for 7 developmental levers with explicit required/optional signals, source constraints, exclusion/contamination rules, and missing-data policy.
- Extension-only deterministic trait scoring from normalized signals.
- Separate confidence computation from score computation.
- Enforced no reported trait score when source diversity is `< 2`.
- Traceability-gated report statement generation.
- Additive persistence artifacts for signals, trait traces, statement traces, calibration refs, and pipeline audit logs.

### What remains extension-only
- `/api/youth-development/tde/signals/extract`
- `/api/youth-development/tde/score/traits`
- `/api/youth-development/tde/report/statements`
- `/api/youth-development/tde/pipeline/run`
- `/api/youth-development/tde/contracts/trait-mapping`
- Feature-gated by `TDE_EXTENSION_MODE` (`off` default).

### What is still not wired into live v1
- No replacement of `/api/youth-development/assess`.
- No replacement of live intake UI routes.
- No replacement of live parent dashboard categories or rendering.
- No mutation of live youth v1 payload contracts.

### Calibration variables (explicitly non-final)
- Signal weighting profiles by trait (`*_default_v1` policy codes).
- Confidence formula weights.
- Statement band thresholds.
- Confidence label thresholds.
- Any source reliability assumptions implied by confidence inputs.

### Extension-safe program structure placeholders (not live-wired)
Future-compatible extension payloads may carry:
- `program_phase`
- `program_week`
- baseline checkpoint marker
- reassessment checkpoints: weeks 1, 12, 24, 36

These remain extension-only and are not parent-dashboard surfaced in Phase 2.
