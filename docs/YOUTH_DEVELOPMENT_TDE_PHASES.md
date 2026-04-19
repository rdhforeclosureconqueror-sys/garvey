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

## Phase 14 (this pass)
Phase 14 connects TDE voice playback to an external provider-facing gateway while keeping voice optional, additive, and non-blocking.

### What Phase 14 adds
- TDE voice runtime now calls an **external voice gateway repo** instead of direct provider calls.
- Gateway-backed runtime endpoints used by TDE:
  - `POST /internal/voice/checkin-prompt`
  - `POST /internal/voice/report-section`
- Lightweight TDE diagnostics visibility via voice config connectivity probe:
  - `GET /internal/voice/health` (gateway side)
- Normalized playback metadata returned in TDE voice responses for both child prompts and parent sections:
  - `status`
  - `provider_name`
  - `playable_text`
  - `audio_url`
  - `asset_ref`
  - `replay_token`
  - `chunk_index`
  - `expires_at`

### Fallback behavior (non-blocking by contract)
- If gateway is unavailable, times out, or returns a request error, TDE keeps core flows running.
- Voice responses return fallback metadata with `playable_text` and explicit status such as:
  - `fallback`
  - `provider_unavailable`
  - `invalid_request`
- Voice remains optional and is never required for child/parent completion.

### Runtime scope constraints preserved
- Child check-ins: prompt-by-prompt, replayable, age-band aware, `voice_text`-based.
- Parent report: section-by-section only (`summary`, `strengths`, `growth`, `still_building`, `environment`, `next_steps`).
- Full-report single-audio blob remains blocked.

### Environment/config variables (Phase 14)
- `VOICE_GATEWAY_BASE_URL` (required for active gateway mode)
- `VOICE_GATEWAY_MODE` (default: `external_gateway`)
- `VOICE_GATEWAY_TIMEOUT_MS` (default: `5000`)
- `VOICE_GATEWAY_TOKEN` (optional, future-ready auth)

### Provider boundary guarantees
- TDE does **not** directly call OpenAI.
- Provider integration remains outside TDE and is owned by the external voice gateway.
- TDE keeps provider-agnostic contracts and additive extension behavior under `/api/youth-development/tde/*`.

## Phase 15 (this pass)
Phase 15 adds TDE operational surfacing for real voice-enabled parent/child experience while preserving non-blocking core flows.

### What Phase 15 adds
- Child weekly check-in voice view model now includes:
  - `prompt_id`
  - `playable_status`
  - `fallback_status`
  - `replay_available`
  - `provider_status`
  - `chunk_metadata`
  - `playable_text_fallback`
  - `age_band_voice_supported`
- Parent report section voice view model now includes:
  - `section_key`
  - `playable_status`
  - `fallback_status`
  - `replay_available`
  - `provider_status`
  - `audio_reference_metadata`
  - `playable_text_fallback`
- Required section coverage preserved for:
  - `summary`
  - `strengths`
  - `growth`
  - `still_building`
  - `environment`
  - `next_steps`

### Availability and status surfacing
- `GET /api/youth-development/tde/voice/config` now exposes high-level voice availability state:
  - `voice_available`
  - `voice_fallback_active`
  - `voice_temporarily_unavailable`
- New additive status endpoint:
  - `GET /api/youth-development/tde/voice/status/:childId`
- Status endpoint surfaces:
  - check-in prompt readiness for playback
  - parent section readiness for playback
  - provider/fallback visibility for pilot operations

### Contract tightening and malformed-success handling
- Gateway success payload contract tightened in TDE adapter:
  - if `status=ok`/success but both `audio_url` and `asset_ref` are missing, payload is downgraded to safe fallback.
- Provider status is explicit (`available`, `fallback_active`, `temporarily_unavailable`).
- Malformed gateway success payloads never break check-in/report experiences.

### Operational diagnostics (lightweight)
- TDE voice payloads include pilot-safe diagnostics fields:
  - `last_gateway_health_status`
  - `last_fallback_reason`
  - `missing_playable_asset_indicators`
- These diagnostics are additive and non-blocking.

### User-visible state model
- **Voice available**: playable audio asset exists for at least one current chunk/section.
- **Fallback active**: flow remains usable with `playable_text_fallback`, while playable asset is unavailable for one or more chunks/sections.
- **Voice temporarily unavailable**: gateway/provider connectivity unavailable; voice remains optional and completion is unaffected.

### Pilot/operator checks
- Confirm `voice_status.checkin_prompt_ready_for_playback` and `voice_status.parent_section_ready_for_playback` for target child IDs.
- Review diagnostics for repeated `missing_playable_asset_indicators` and `last_fallback_reason` patterns.
- Keep rollout in extension-only mode; live youth v1 routes remain unchanged.

## Phase 16 (this pass)
Phase 16 adds pilot rollout controls + analytics for TDE voice usage, and introduces the first universal readability/voice registration hook for new TDE content blocks.

### What Phase 16 adds
- Lightweight additive voice analytics events:
  - `child_checkin_playback_requested`
  - `child_replay_requested`
  - `parent_section_playback_requested`
  - `fallback_used`
  - `provider_unavailable`
  - `malformed_gateway_downgrade_used`
  - `voice_not_shown_unavailable_or_unsupported`
- Pilot visibility decision layer for child and parent voice surfacing using:
  - gateway availability
  - age-band support
  - voice-ready content registration presence
  - preview/rollout mode
  - feature-flag visibility
- Rollout bridge now carries additive voice rollout state (`enabled`, `hidden`, `fallback_only`, `preview_only`) while keeping voice optional.

### Universal readability/voice registration hook
- Added shared registration helper for newly generated TDE content blocks:
  - `section_key`
  - `text_content`
  - `voice_ready`
  - `voice_text`
  - `voice_chunk_id`
  - `playback_optional`
  - `age_band` (when relevant)
- New TDE generated content (check-in prompts and parent report sections) now uses this helper instead of one-off field wiring.
- Voice visibility checks prefer this shared registration signal (`voice_ready_content_present`) where available.

### Additive diagnostics endpoints
- `GET /api/youth-development/tde/voice/analytics/summary`
- `GET /api/youth-development/tde/voice/pilot-status/:childId`
- `GET /api/youth-development/tde/voice/eligibility/:childId`

### Pilot operator monitoring guidance
- Track rising `fallback_used` + `provider_unavailable` totals for gateway risk.
- Track `malformed_gateway_downgrade_used` for payload contract violations from the gateway.
- Track `voice_not_shown_unavailable_or_unsupported` to distinguish rollout gating from provider outages.
- Voice analytics are non-blocking and cannot block playback or progression.

### Optionality and safety preserved
- Voice remains optional and never required for core intake/assess/program progression.
- Full-report single audio playback is still blocked.
- Live youth v1 intake, assess, persistence, and parent dashboard behavior remains unchanged.

## Phase 18 (this pass)
Phase 18 adds deterministic adaptive personalization on top of insights + historical patterns while preserving extension-only safety.

### What Phase 18 adds
- Personalization engine outputs child-specific modifiers for:
  - recommendations
  - session planning
  - parent guidance
- Historical pattern tracking for:
  - improving trends
  - stagnation
  - inconsistency
  - regression
- Additive endpoints:
  - `GET /api/youth-development/tde/personalization/:childId`
  - `GET /api/youth-development/tde/pattern-history/:childId`
  - `GET /api/youth-development/tde/recommendations/:childId/explanation`
- Recommendation outputs now include additive adaptive adjustment traces (`adaptive_adjustments`) without removing existing fields.
- Session planner now accepts optional personalization/session adaptation hooks and remains deterministic.

### Signals used
- phase-17 insight layer output (`insightService`)
- weekly progress records (`trait_signal_summary` trend)
- intervention session completion consistency
- developmental check-in transfer trend deltas

### Confidence + missing-contract behavior
- Personalization confidence is surfaced and rule-based (`low`, `moderate`, `high`).
- Missing historical contracts degrade output (`missing_contracts`, `contracts_status=incomplete`) rather than infer hidden conclusions.
- Adaptation remains explainable via `rule_path` and pattern traceability fields.

### Calibration variables (Phase 18)
- `CALIBRATION_VARIABLES.personalization_layer.improving_delta_min`
- `CALIBRATION_VARIABLES.personalization_layer.stagnation_delta_abs_max`
- `CALIBRATION_VARIABLES.personalization_layer.regression_delta_max`
- `CALIBRATION_VARIABLES.personalization_layer.inconsistency_completion_gap`

### Safety constraints preserved
- Live youth v1 behavior remains unchanged.
- Existing TDE contracts remain non-breaking and additive.
- Personalization is deterministic, traceable, and non-clinical.

## Phase 19 (this pass)
Phase 19 adds an extension-only longitudinal growth trajectory layer so directional change over time can be interpreted across all 7 pillars.

### What Phase 19 adds
- Deterministic trajectory modeling over longer windows, not only current snapshot state.
- Milestone-to-milestone comparison summary for all pillars.
- Explainable trajectory states:
  - `improving`, `stable`, `plateauing`, `inconsistent`, `regressing`, `insufficient_data`
- Pillar-level trajectory summaries with:
  - recent direction
  - medium-window direction
  - confidence limits
  - environment/context contribution interpretation
  - adherence-limitation interpretation kept separate from child-growth interpretation
- Additive parent/operator endpoints:
  - `GET /api/youth-development/tde/growth-trajectory/:childId`
  - `GET /api/youth-development/tde/milestone-comparison/:childId`
- Additive recommendation integration using trajectory state as one input (never sole determinant).

### What trajectory means vs existing layers
- Score layer: point-in-time trait scoring from normalized evidence.
- Insight layer: cross-source interpretation and consistency framing.
- Personalization layer: adaptive modifiers and pattern history for plan tuning.
- **Trajectory layer (Phase 19):** longer-window directional interpretation anchored to milestones/checkpoints.

### What trajectory states do not mean
- They are non-clinical and non-diagnostic.
- They are not destiny/predictive claims.
- They are bounded by data sufficiency, adherence consistency, and context traceability.

### Calibration variables (Phase 19)
- Minimum points required for directional classification.
- Improvement/regression threshold deltas.
- Stable/plateau windows.
- Inconsistency volatility threshold.
- Adherence threshold used to limit interpretation confidence.

### What remains unchanged
- Live youth v1 routes, scoring, and contracts remain unchanged.
- Existing TDE extension contracts remain additive and backward-safe.

## Phase 23 (this pass)
Phase 23 adds extension-only admin/operator console visibility surfaces for pilot management.

### What Phase 23 adds
- Operator summary service layer covering rollout status, feature-flag state, calibration state, validation-readiness state, evidence-quality state, and missing-contract burden.
- Additive extension-safe admin endpoints:
  - `GET /api/youth-development/tde/admin/overview`
  - `GET /api/youth-development/tde/admin/rollout-status`
  - `GET /api/youth-development/tde/admin/feature-flags`
  - `GET /api/youth-development/tde/admin/validation-status`
  - `GET /api/youth-development/tde/admin/evidence-quality-overview`
- Explicit rollout visibility for:
  - current rollout mode
  - preview-only/fallback-only/enabled/hidden surfaces
  - voice availability status
  - pilot eligibility summaries
- Calibration visibility for:
  - active calibration groups + versions
  - key threshold families
  - modules/output areas depending on calibration variables
- Evidence-quality overview for:
  - sufficiency burden
  - missing-contract burden
  - traceability burden
  - source-diversity weakness
  - sparse-data prevalence

### View-only vs controllable
- View-only: readiness, validation, evidence-quality, rollout, and calibration summaries.
- Controllable through explicit env configuration (not hidden runtime mutation):
  - `TDE_EXTENSION_MODE`
  - `TDE_VOICE_FEATURE_ENABLED`
  - `TDE_VOICE_PREVIEW_MODE`
  - `TDE_VOICE_ROLLOUT_MODE`

### What remains unchanged
- Live youth v1 assess/intake/scoring/contracts are unchanged.
- No hidden rollout behavior.
- No silent calibration-setting mutation.

## Phase 25 (this pass)
Phase 25 normalizes additive UI-facing display contracts for the internal TDE operator console so pilot rendering can rely on stable fields rather than tolerant ad hoc field guessing.

### What Phase 25 normalizes
- Recommendations now include normalized display fields in payload and per-item rows:
  - `display_title`
  - `display_label`
  - `display_status`
  - `display_summary`
  - `display_items[]`
- Insights now expose normalized display fields plus additive flattened `insights[]` rows for UI rendering safety.
- Recommendation explanation payloads now include normalized additive display fields and additive `explanations[]` rows.
- Check-in summary payload now includes additive display contract fields for predictable panel-level rendering.
- Voice endpoints now expose normalized status/display fields for operator readability:
  - `content_registry_status`
  - `readability_status`
  - `voice_readiness_status`
  - plus panel-level display fields (`display_*`).

### UI-facing contract guidance
- **Use normalized display fields first** in dashboard/operator surfaces:
  - panel title/label/status/summary from `display_*`
  - list rows from `display_items[]`
  - voice panel status from `voice_readiness_status`, `content_registry_status`, `readability_status`
- **Legacy/raw fields remain available** and are not removed in this phase:
  - recommendations: `recommendations[]`, `recommendation_engine`, traces
  - insights: `pillar_insights[]`, `cross_source_insight_summary`
  - explanation: `recommendation_deltas[]`, `modifiers_applied`
  - voice: `voice_state`, `readability_registration`, diagnostics/provider metadata

### Backward-safety constraints preserved
- No breaking endpoint contract changes; only additive fields.
- No live youth v1 route changes.
- No dashboard/public route removals.
- Missing contracts remain explicit and surfaced (not hidden).
