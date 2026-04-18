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

## Phase 8 (this pass)
Phase 8 hardens intervention contracts and integrates intervention evidence into the TDE signal pipeline without replacing live youth v1 behavior.

### What Phase 8 hardens
- Formal standalone intervention contracts:
  - `commitmentPlanContract` for commitment planning payloads.
  - `sessionEvidenceContract` for bounded-autonomy session evidence payloads.
  - `interventionEnvironmentContract` for environment-only adherence outputs.
- Contract-driven session evidence normalization via dedicated intervention signal integration service.
- Explicit exactly-4 component enforcement with one-per-required-category and no skipped categories.
- Explicit intervention evidence validity statuses and traceability references.

### How intervention evidence enters the signal pipeline
- Session evidence is first validated by `sessionEvidenceContract`.
- Valid evidence is transformed deterministically into intervention signal evidence (`INTERVENTION_SESSION_LOG`) by the intervention signal integration service.
- The standard extraction and scoring pipeline consumes these signals additively.
- Intervention-session-only signals are explicitly blocked from becoming reported trait scores.

### Confidence interpretation extension (with adherence)
- Low adherence reduces interpretive confidence.
- Missing planned sessions reduce interpretive confidence.
- Confidence context now carries adherence quality and adherence-adjustment rationale.
- Weak adherence is explicitly guarded from being interpreted as child limitation.

### Phase 8 extension endpoints
- `GET /api/youth-development/tde/contracts/intervention`
- `POST /api/youth-development/tde/session/validate`

### What remains calibration-variable
- Adherence confidence multipliers and thresholds.
- Challenge and coaching quality interpretation bins.
- Session evidence-to-signal weighting and confidence blending constants.

### Non-negotiable preservation in Phase 8
- Live youth v1 intake, scoring, and dashboard contracts remain unchanged.
- Existing TDE endpoints remain additive and feature-gated.
- Environment extension outputs remain separate from child trait outputs.

## Phase 9 (this pass)
Phase 9 integrates intervention consistency into the extension-only parent experience, recommendation logic, and readiness/rollout bridge behavior.

### What Phase 9 adds
- Parent experience integration now includes intervention implementation context:
  - commitment plan summary
  - planned vs completed sessions
  - adherence percentage
  - full-session completion rate
  - consistency status
  - intervention quality context
  - adherence-aware confidence interpretation
  - explicit distinction between child developmental signals, environment factors, and implementation consistency
- Extension-only rule-based recommendation engine with traceable, configurable operational rules.
- Intervention-aware readiness states and rollout bridge decisions:
  - `ready`, `partially_ready`, `not_ready`
  - explicit reasons for each status
  - fallback-safe rollout behavior when minimum intervention readiness is not met

### Phase 9 extension endpoints
- `GET /api/youth-development/tde/recommendations/:childId`
- `GET /api/youth-development/tde/intervention-summary/:childId`
- `GET /api/youth-development/tde/readiness/:childId`
- `GET /api/youth-development/tde/rollout/:childId`

### Recommendation generation notes
- Recommendations are produced by a non-clinical **rule-based operational logic** service.
- Rules are traceable and include matched inputs and rule IDs.
- Recommendation outputs are not validated truth claims.

### Intervention-quality impact notes
- Confidence interpretation remains visible and can be lowered when adherence is weak.
- Data sufficiency remains visible alongside confidence context.
- Weak adherence is framed as implementation-context information, not child blame.

### Calibration variables (Phase 9)
- Readiness thresholds for adherence sufficiency and session-completion sufficiency.
- Rule trigger thresholds (e.g., completion-rate cutoffs, trait-movement bins, schedule-review conditions).
- Confidence/sufficiency boundary values used by recommendation and readiness contexts.

### What remains unchanged
- Live youth v1 intake, assess, persistence, and parent dashboard contracts remain unchanged.
- Phase 9 routes remain additive and feature-gated under `/api/youth-development/tde/*`.

## Phase 11 (this pass)
Phase 11 integrates developmental check-ins into the extension-only parent-facing TDE behavior, recommendation flow, and readiness logic.

### What Phase 11 adds
- Parent experience integration now includes a developmental check-in context:
  - next expected check-in week
  - latest check-in summary
  - change-since-prior interpretation
  - check-in contribution to confidence context
  - explicit check-in evidence sufficiency and missing contracts
  - explicit distinction between session/intervention evidence, developmental check-in evidence, and parent observation evidence
- Extension-only check-in summary endpoint:
  - `GET /api/youth-development/tde/checkin-summary/:childId`
- Recommendation engine integration with developmental check-ins:
  - weak transfer check-in patterns trigger easier transfer-task recommendations
  - improving reflection patterns trigger gradual autonomy recommendations
  - cross-source disagreement triggers observation-consistency recommendations
  - sparse check-in evidence triggers routine-continuation recommendations before stronger conclusions
- Readiness integration now includes developmental check-in sufficiency dimensions:
  - check-in history presence
  - check-in consistency sufficiency
  - traceability completeness
  - cross-source agreement status
  - readiness still returns `ready`, `partially_ready`, or `not_ready` with explicit reasons

### Calibration-variable thresholds (Phase 11)
- Minimum check-in history count for sufficiency.
- Minimum check-in traceability ratio.
- Weak transfer cutoff.
- Reflection-improvement delta threshold.
- Cross-source disagreement threshold.
- Check-in consistency ratio threshold.

### Non-negotiable constraints preserved
- Live youth v1 intake, assess, persistence, and parent dashboard flows remain unchanged.
- Developmental check-ins remain developmental snapshots (not quiz framing).
- Check-in evidence is additive and never used as a single-source trait override.
- Recommendation/readiness logic remains rule-based, traceable, configurable, and non-clinical.
