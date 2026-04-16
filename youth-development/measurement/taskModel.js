"use strict";

const YOUTH_DEVELOPMENT_TASK_MODEL = Object.freeze({
  model_code: "YOUTH_DEVELOPMENT_TASK_MODEL",
  model_name: "Youth Development Task Model",
  model_version: "1.0.0-phase-2",
  compatibility: Object.freeze({
    trait_model_dependency: "YOUTH_DEVELOPMENT_TRAIT_MODEL",
    scoring_model_status: "ready_for_future_integration",
    deterministic_output: true,
  }),
  task_classes: Object.freeze({
    OBS: Object.freeze({
      task_class_code: "OBS",
      task_class_name: "Observation Input",
      purpose:
        "Capture structured observer-rated behavior frequencies and quality markers in natural or assessment contexts.",
      allowed_evidence_sources: Object.freeze([
        "parent_observation",
        "teacher_observation",
        "assessor_observation",
      ]),
      scoring_type: Object.freeze(["frequency", "rubric"]),
      lifecycle_mode: "repeatable",
      difficulty_scaling_rules: Object.freeze([
        "Increase observation specificity from broad behavior tags to trait-specific indicator anchors.",
        "Increase contextual complexity (low demand to high demand settings) before increasing threshold strictness.",
        "Require cross-context consistency at advanced levels.",
      ]),
      output_signal_types: Object.freeze([
        "behavior_frequency",
        "strategy_use_presence",
        "context_consistency",
        "observer_rubric_score",
      ]),
    }),
    SCT: Object.freeze({
      task_class_code: "SCT",
      task_class_name: "Scenario Task",
      purpose:
        "Elicit decision-making, inquiry, explanation, and option-generation under controlled hypothetical conditions.",
      allowed_evidence_sources: Object.freeze(["child_scenario", "assessor_observation"]),
      scoring_type: Object.freeze(["rubric", "analytic"]),
      lifecycle_mode: "repeatable",
      difficulty_scaling_rules: Object.freeze([
        "Increase ambiguity and competing constraints while preserving age-appropriate comprehension.",
        "Increase requirement for multi-step justification or multi-option generation.",
        "Increase transfer demands by shifting scenario surface details while preserving underlying structure.",
      ]),
      output_signal_types: Object.freeze([
        "decision_quality",
        "justification_quality",
        "inquiry_depth",
        "option_diversity",
      ]),
    }),
    PRF: Object.freeze({
      task_class_code: "PRF",
      task_class_name: "Performance Task",
      purpose:
        "Measure direct execution quality, process behaviors, and artifact outputs under explicit task constraints.",
      allowed_evidence_sources: Object.freeze(["child_task", "assessor_observation"]),
      scoring_type: Object.freeze(["analytic", "rubric", "frequency"]),
      lifecycle_mode: "repeatable",
      difficulty_scaling_rules: Object.freeze([
        "Increase novelty, load, and precision requirements in calibrated steps.",
        "Increase time, sequencing, or multi-rule constraints only after baseline competency is observed.",
        "Maintain comparable core construct demands across levels to preserve longitudinal interpretability.",
      ]),
      output_signal_types: Object.freeze([
        "execution_accuracy",
        "completion_quality",
        "process_efficiency",
        "rule_adherence",
        "artifact_quality",
      ]),
    }),
    RET: Object.freeze({
      task_class_code: "RET",
      task_class_name: "Retry Task",
      purpose:
        "Measure adaptation, persistence, and feedback integration by comparing subsequent attempts to prior attempts.",
      allowed_evidence_sources: Object.freeze(["child_retry", "assessor_observation"]),
      scoring_type: Object.freeze(["delta", "analytic", "frequency"]),
      lifecycle_mode: "longitudinal",
      difficulty_scaling_rules: Object.freeze([
        "Hold core task demand constant during immediate retry windows to isolate adaptation effects.",
        "Increase coaching complexity from single-point feedback to multi-point feedback as competency grows.",
        "Increase transfer distance between first attempt and retry context at advanced levels.",
      ]),
      output_signal_types: Object.freeze([
        "improvement_delta",
        "error_reduction",
        "strategy_shift_detected",
        "attempt_quality_change",
        "reengagement_latency",
      ]),
    }),
    REF: Object.freeze({
      task_class_code: "REF",
      task_class_name: "Reflection Task",
      purpose:
        "Capture metacognitive interpretation of effort, strategy, progress, and domain commitment over time.",
      allowed_evidence_sources: Object.freeze([
        "child_scenario",
        "teacher_observation",
        "assessor_observation",
      ]),
      scoring_type: Object.freeze(["rubric", "analytic"]),
      lifecycle_mode: "longitudinal",
      difficulty_scaling_rules: Object.freeze([
        "Increase reflection depth from recall to evidence-linked self-explanation.",
        "Increase temporal span from single-session reflection to multi-window growth narratives.",
        "Increase requirement to connect reflection claims with observable task evidence.",
      ]),
      output_signal_types: Object.freeze([
        "goal_link_clarity",
        "strategy_awareness",
        "progress_attribution_quality",
        "domain_commitment_language",
      ]),
    }),
  }),
  scoring_signal_schema: Object.freeze({
    required_fields: Object.freeze([
      "raw_signal",
      "normalized_signal",
      "confidence_weight",
      "evidence_source",
      "timestamp",
    ]),
    field_definitions: Object.freeze({
      raw_signal: Object.freeze({
        type: "number | object",
        description: "Untransformed measurement emitted by a task scorer.",
      }),
      normalized_signal: Object.freeze({
        type: "number",
        range: "0.0_to_1.0",
        description: "Scale-normalized signal compatible with cross-task aggregation.",
      }),
      confidence_weight: Object.freeze({
        type: "number",
        range: "0.0_to_1.0",
        description: "Reliability weight derived from evidence quality, consistency, and rater calibration.",
      }),
      evidence_source: Object.freeze({
        type: "string",
        allowed_values_reference: "traitModel.evidence_sources",
        description: "Atomic source code indicating where the signal was obtained.",
      }),
      timestamp: Object.freeze({
        type: "iso_8601_datetime",
        description: "Signal capture time for sequence ordering and longitudinal windows.",
      }),
    }),
  }),
  trait_task_mapping: Object.freeze({
    SR: Object.freeze({
      allowed_task_classes: Object.freeze(["OBS", "PRF", "RET"]),
      minimum_evidence_mix: Object.freeze({
        required_task_classes: Object.freeze(["PRF", "OBS"]),
        optional_task_classes: Object.freeze(["RET"]),
        minimum_total_signals_per_window: 2,
      }),
      invalid_task_combinations: Object.freeze([
        "SCT-only evidence set is invalid for SR scoring.",
        "PS-labeled sustained-attempt signals without regulation-behavior markers cannot be used for SR.",
      ]),
    }),
    CQ: Object.freeze({
      allowed_task_classes: Object.freeze(["SCT", "PRF", "OBS"]),
      minimum_evidence_mix: Object.freeze({
        required_task_classes: Object.freeze(["SCT"]),
        optional_task_classes: Object.freeze(["PRF", "OBS"]),
        minimum_total_signals_per_window: 2,
      }),
      invalid_task_combinations: Object.freeze([
        "CR-only ideation artifacts without inquiry signals are invalid for CQ scoring.",
        "OBS-only enthusiasm/talkativeness observations are invalid without inquiry-linked SCT or PRF evidence.",
      ]),
    }),
    CR: Object.freeze({
      allowed_task_classes: Object.freeze(["PRF", "SCT", "RET", "OBS"]),
      minimum_evidence_mix: Object.freeze({
        required_task_classes: Object.freeze(["PRF", "SCT"]),
        optional_task_classes: Object.freeze(["RET", "OBS"]),
        minimum_total_signals_per_window: 2,
      }),
      invalid_task_combinations: Object.freeze([
        "CQ-only question-rate signals without generated output are invalid for CR scoring.",
        "Single-correctness analytic scoring without originality/usefulness rubric dimensions is invalid.",
      ]),
    }),
    RS: Object.freeze({
      allowed_task_classes: Object.freeze(["SCT", "PRF", "RET", "OBS"]),
      minimum_evidence_mix: Object.freeze({
        required_task_classes: Object.freeze(["SCT", "PRF"]),
        optional_task_classes: Object.freeze(["RET", "OBS"]),
        minimum_total_signals_per_window: 2,
      }),
      invalid_task_combinations: Object.freeze([
        "Final-answer correctness-only evidence is invalid without justification-quality data.",
        "CR-labeled novelty ratings without logic coherence anchors are invalid for RS scoring.",
      ]),
    }),
    PS: Object.freeze({
      allowed_task_classes: Object.freeze(["PRF", "RET", "OBS"]),
      minimum_evidence_mix: Object.freeze({
        required_task_classes: Object.freeze(["PRF", "RET"]),
        optional_task_classes: Object.freeze(["OBS"]),
        minimum_total_signals_per_window: 2,
      }),
      invalid_task_combinations: Object.freeze([
        "SR-only recovery/regulation signals without constructive-attempt continuity markers are invalid for PS.",
        "Pure time-on-task duration without attempt-quality or reengagement evidence is invalid.",
      ]),
    }),
    FB: Object.freeze({
      allowed_task_classes: Object.freeze(["PRF", "RET", "OBS"]),
      minimum_evidence_mix: Object.freeze({
        required_task_classes: Object.freeze(["PRF", "RET"]),
        optional_task_classes: Object.freeze(["OBS"]),
        minimum_total_signals_per_window: 2,
      }),
      invalid_task_combinations: Object.freeze([
        "PRF-only performance snapshots without retry-linked delta are invalid for FB.",
        "OBS-only compliance/politeness observations are invalid without measured post-feedback change.",
      ]),
    }),
    DE: Object.freeze({
      allowed_task_classes: Object.freeze(["PRF", "RET", "REF", "OBS", "SCT"]),
      minimum_evidence_mix: Object.freeze({
        required_task_classes: Object.freeze(["PRF", "REF"]),
        optional_task_classes: Object.freeze(["RET", "OBS", "SCT"]),
        minimum_total_signals_per_window: 2,
        minimum_longitudinal_windows: 2,
      }),
      invalid_task_combinations: Object.freeze([
        "Single-window evidence is invalid for DE scoring.",
        "CQ-only broad inquiry signals without repeated domain return markers are invalid for DE.",
      ]),
    }),
  }),
  anti_contamination_enforcement: Object.freeze({
    SR_vs_PS_separation: Object.freeze({
      rule:
        "Signals used for SR must include regulation strategy and recovery indicators; signals used for PS must include constructive effort continuity and reengagement indicators.",
      disallowed_shortcut:
        "Do not treat effort duration alone as valid for either SR or PS differentiation.",
    }),
    CQ_vs_CR_separation: Object.freeze({
      rule:
        "CQ scoring requires information-seeking/inquiry signals, while CR scoring requires generated output novelty-plus-usefulness signals.",
      disallowed_shortcut:
        "Question volume cannot stand in for idea-generation quality, and idea count cannot stand in for inquiry behavior.",
    }),
    FB_retry_delta_requirement: Object.freeze({
      rule: "FB scoring requires at least one RET task signal with non-null improvement_delta.",
      disallowed_shortcut: "Do not score FB from demeanor, compliance, or repeated unchanged attempts.",
    }),
    DE_longitudinal_requirement: Object.freeze({
      rule:
        "DE scoring requires repeat evidence across at least two measurement windows, including one longitudinal task class (RET or REF).",
      disallowed_shortcut:
        "Single-session engagement intensity cannot be treated as DE evidence.",
    }),
  }),
});

module.exports = {
  YOUTH_DEVELOPMENT_TASK_MODEL,
};
