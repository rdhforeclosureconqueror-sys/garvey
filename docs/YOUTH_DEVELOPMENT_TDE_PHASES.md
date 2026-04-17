# Youth Development TDE Extension Phases

## Phase 1 (already shipped)
- Added governance primitives (`evidence_status_tag`, `calibration_version`, `trace_ref`) to the additive intake overlay.
- Added deterministic trait-mapping contract endpoint for extension intake validation.
- Preserved live youth v1 scoring, intake flow, and parent dashboard contracts.

## Phase 2 (already shipped)
Phase 2 adds the first operational **extension-only** TDE scoring spine under `/api/youth-development/tde/*`.

### What Phase 2 adds
- Deterministic raw-evidence → normalized-signal extraction with rejection logging for unnormalizable evidence.
- Trait mapping contracts for 7 developmental levers with explicit required/optional signals, source constraints, exclusion/contamination rules, and missing-data policy.
- Extension-only deterministic trait scoring from normalized signals.
- Separate confidence computation from score computation.
- Enforced no reported trait score when source diversity is `< 2`.
- Traceability-gated report statement generation.
- Additive persistence artifacts for signals, trait traces, statement traces, calibration refs, and pipeline audit logs.

## Phase 3 (this pass)
Phase 3 adds the extension-only 36-week **program rail** behind `/api/youth-development/tde/program/*`.

### What Phase 3 adds
- Program-model contracts for:
  - `program_phase`, `program_week`, `checkpoint_type`
  - `baseline_checkpoint`, `reassessment_checkpoint`
  - `weekly_session_template`, `domain_focus`, `environment_focus`, `support_actions`
- Deterministic week-map covering all 36 weeks:
  - Phase 1 weeks `1-12`
  - Phase 2 weeks `13-24`
  - Phase 3 weeks `25-36`
- Deterministic checkpoint architecture with explicit checkpoints at weeks `1`, `12`, `24`, and `36`.
- Additive child/program progression structures and persistence tables for:
  - `child_profile_tde`, `program_enrollment`, `weekly_progress_record`
  - `checkpoint_record`, `session_record`, observer linkage
  - active domain interests + current trait/environment targets
- Extension-safe endpoints:
  - `GET /api/youth-development/tde/program/phases`
  - `GET /api/youth-development/tde/program/weeks`
  - `GET /api/youth-development/tde/program/weeks/:weekNumber`
  - `POST /api/youth-development/tde/program/enroll`
  - `POST /api/youth-development/tde/program/progress`
  - `GET /api/youth-development/tde/program/checkpoints`

### What remains extension-only
- Every route under `/api/youth-development/tde/*` remains feature-gated by `TDE_EXTENSION_MODE` (default `off`).
- Phase 3 program enroll/progress/checkpoint records are additive extension tables; live youth v1 does not depend on them.

### What is still not wired into live v1 UI/contracts
- No replacement of `/api/youth-development/assess`.
- No replacement of live intake UI routes.
- No replacement of live parent dashboard categories/rendering.
- No mutation of live youth v1 payload contracts.

### Calibration variables (explicitly non-final)
- Signal weighting profiles by trait (`*_default_v1` policy codes).
- Confidence formula weights.
- Statement band thresholds.
- Confidence label thresholds.
- Weekly activity intensity, support cadence, and checkpoint evidence sample targets.
- Environment-target prioritization heuristics.

### Structural (non-calibration) program design commitments
- 36-week rail with fixed phase boundaries.
- Checkpoints at weeks 1/12/24/36.
- Deterministic week definition format and endpoint contracts.
- Extension-only persistence and routing isolation.
