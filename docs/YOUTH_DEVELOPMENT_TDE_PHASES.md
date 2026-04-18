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

## Phase 4 (this pass)
Phase 4 closes governance gaps and adds the first extension-safe parent-facing summary read model under `/api/youth-development/tde/*`.

### What Phase 4 adds
- Observer consent/provenance contracts with explicit required fields:
  - `observer_id`, `observer_role`, `relationship_duration`, `consent_status`, `consent_captured_at`, `consent_source`
  - `provenance_source_type`, `provenance_source_ref`, `submission_context`, `tenant_id`, optional `user_id`, `audit_ref`
- Deterministic environment hook event taxonomy with explicit categories:
  - `challenge_fit`, `autonomy_level`, `feedback_clarity`, `enrichment_access`, `mentorship_access`, `boredom_friction_mismatch`, `strength_use_alignment`
- Additive validation export framework for:
  - inter-rater reliability, test-retest, cross-task consistency, age-band slices, observer-role slices, language/access bias review slices
- First extension-only parent summary read model for TDE progress:
  - current phase/week, checkpoints, developmental levers, traits building, environment focus, support actions, confidence context, data sufficiency status
- Additive persistence for:
  - observer consent/provenance records
  - environment hook events
  - validation export logs

### Phase 4 extension endpoints
- `GET /api/youth-development/tde/observer/contracts`
- `POST /api/youth-development/tde/observer/consent`
- `GET /api/youth-development/tde/environment/contracts`
- `POST /api/youth-development/tde/environment/hooks`
- `GET /api/youth-development/tde/summary/:childId`
- `GET /api/youth-development/tde/exports/validation-schema`
- `POST /api/youth-development/tde/exports/validation-data`

### Governance gaps closed in Phase 4
- Missing observer consent/provenance now returns explicit contract-gap validation errors; never silently dropped.
- Environment hooks are represented as environment-only signals with auditable deterministic taxonomy.
- Parent extension summaries include explicit confidence context and data sufficiency status instead of overclaim narratives.

### Still not surfaced in live v1 UI
- Live intake remains unchanged.
- Live parent dashboard remains unchanged.
- No live youth v1 route/scoring/payload contract replacement.

### Calibration variables (explicitly non-final, Phase 4 additions)
- Consent policy requirement strictness by tenant/context (e.g., `requireGrantedConsent` behavior).
- Validation export selection windows and inclusion thresholds.
- Parent summary confidence labeling thresholds and sufficiency cutoffs.
- Environment hook normalization defaults and confidence-weight interpretations.

## Phase 5 (this pass)
Phase 5 adds the first extension-safe parent-facing TDE experience layer as a **parallel read model** under `/api/youth-development/tde/*`.

### What Phase 5 adds
- Parent experience view model with explicit developmental fields:
  - current phase/week and 36-week roadmap position
  - completed checkpoints and next checkpoint
  - strongest developmental levers, levers currently building, and environment focus areas
  - concrete support actions for now with trait/environment linkage
  - confidence context and data sufficiency context shown separately
  - progress-over-time summary and next-step plan
- Trust-layer content contract for parent communication that explicitly covers:
  - what the system is
  - what it is not (developmental, not diagnostic)
  - how the program works
  - why to interpret results as patterns over time
  - what parents receive next
  - how child and environment factors stay separate
- 36-week roadmap presentation model:
  - phase labels, week labels, active week, checkpoint markers
  - current focus and upcoming focus
  - completed vs upcoming status
- Parent support-actions contract with required fields:
  - `action_id`, `title`, `why_this_matters`, `linked_trait_or_environment_factor`, `suggested_timing`, `effort_level`, `trace_ref|rule_ref`, `confidence_context`, optional home example

### Phase 5 extension endpoints
- `GET /api/youth-development/tde/parent-experience/:childId`
- `GET /api/youth-development/tde/roadmap/:childId`
- `GET /api/youth-development/tde/support-actions/:childId`
- `GET /api/youth-development/tde/trust-content`

### What remains extension-only
- All Phase 5 endpoints are behind `TDE_EXTENSION_MODE` and remain extension-safe/read-only.
- No replacement of live youth v1 routes, scoring, intake payloads, or parent dashboard rendering.

### Structural vs calibration-variable boundaries (Phase 5)
- **Structural commitments**:
  - confidence context and data sufficiency remain explicit and separate.
  - child developmental factors and environment factors remain explicitly separated.
  - roadmap remains 3 phases over 36 weeks with deterministic checkpoint markers.
  - support actions remain trace/rule linked to trait or environment logic.
- **Calibration variables**:
  - confidence label thresholds (`early-signal` vs `moderate`).
  - action-selection prioritization for trait/environment targets.
  - wording variants for trust copy and support examples.
  - sufficiency thresholds for missing-contract lists.

### External trust statements allowed
- developmental patterns over time (not one-shot conclusions).
- non-diagnostic developmental interpretation only.
- confidence and data sufficiency shown with every parent experience response.
- environment and child factors reported separately.
