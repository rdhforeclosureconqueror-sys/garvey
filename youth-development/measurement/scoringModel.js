"use strict";

const TRAIT_CODES = Object.freeze(["SR", "CQ", "CR", "RS", "PS", "FB", "DE"]);

const YOUTH_DEVELOPMENT_SCORING_MODEL = Object.freeze({
  model_code: "YOUTH_DEVELOPMENT_SCORING_MODEL",
  model_name: "Youth Development Scoring Model",
  model_version: "1.0.0-phase-3",
  domain: Object.freeze({
    domain_code: "YOUTH_DEVELOPMENT",
    domain_name: "Youth Talent Development Measurement",
    scoring_orientation: "dimension_first",
    output_scale: Object.freeze({
      trait_score_range: "0_to_100",
      confidence_range: "0_to_100",
      quality_layer_range: "0_to_100",
      signal_normalized_input_range: "0.0_to_1.0",
    }),
    output_layers: Object.freeze([
      "trait_level",
      "task_aggregation",
      "detection_quality",
      "development_quality",
      "environment_quality",
    ]),
    non_goals: Object.freeze([
      "No archetype labels are produced by this model.",
      "No deterministic future predictions are produced by this model.",
      "Scores represent present/observed developmental signals and measured change windows only.",
    ]),
  }),

  compatibility: Object.freeze({
    trait_model_dependency: "YOUTH_DEVELOPMENT_TRAIT_MODEL",
    task_model_dependency: "YOUTH_DEVELOPMENT_TASK_MODEL",
    scoring_signal_schema_dependency: "taskModel.scoring_signal_schema.required_fields",
    required_signal_fields: Object.freeze([
      "raw_signal",
      "normalized_signal",
      "confidence_weight",
      "evidence_source",
      "timestamp",
    ]),
  }),

  trait_scope: Object.freeze({
    supported_traits: TRAIT_CODES,
    trait_level_outputs: Object.freeze([
      "baseline_score",
      "current_score",
      "change_score",
      "confidence_consistency_score",
      "evidence_mix_score",
    ]),
  }),

  signal_weighting_rules: Object.freeze({
    base_component_weights: Object.freeze({
      performance_signals: 0.55,
      longitudinal_delta_signals: 0.25,
      observer_signals: 0.20,
    }),
    signal_to_score_transform: Object.freeze({
      normalized_signal_to_points: "normalized_signal * 100",
      weighted_signal_points: "normalized_signal * confidence_weight * source_weight * 100",
      bounded_score_rule: "All aggregate scores are clamped to 0..100.",
    }),
    low_reliability_dampening: Object.freeze({
      enabled: true,
      trigger: "window_average_confidence_weight < 0.40",
      score_multiplier: 0.85,
      note: "Prevents overstatement when low-quality signals dominate.",
    }),
  }),

  evidence_source_weighting_rules: Object.freeze({
    source_weights: Object.freeze({
      child_task: 1.0,
      child_scenario: 0.95,
      child_retry: 1.1,
      parent_observation: 0.75,
      teacher_observation: 0.85,
      assessor_observation: 0.90,
    }),
    source_diversity_bonus: Object.freeze({
      unique_sources_2_plus: 1.03,
      unique_sources_3_plus: 1.06,
      cap_multiplier: 1.08,
    }),
    single_source_penalty: Object.freeze({
      enabled: true,
      evidence_mix_multiplier: 0.75,
      confidence_multiplier: 0.70,
      applies_when: "all_scored_signals_from_one_evidence_source",
    }),
  }),

  confidence_calculation_rules: Object.freeze({
    confidence_components: Object.freeze({
      reliability_component: 0.40,
      consistency_component: 0.30,
      evidence_mix_component: 0.20,
      longitudinal_coverage_component: 0.10,
    }),
    reliability_component_rule:
      "Average confidence_weight across included signals, mapped to 0..100.",
    consistency_component_rule:
      "Inverse dispersion score across comparable signals in same window and task class.",
    evidence_mix_component_rule:
      "Measures source diversity and task-class diversity; reduced for single-source dominance.",
    longitudinal_component_rule:
      "Measures whether evidence spans required windows for trait and change claims.",
    minimum_confidence_for_change_claim: 45,
  }),

  scoring_readiness_rules: Object.freeze({
    minimum_signals_per_trait_window: 2,
    minimum_unique_evidence_sources_per_window: 2,
    minimum_task_classes_per_window: 2,
    trait_specific_minimums: Object.freeze({
      SR: Object.freeze({ minimum_windows: 1, required_task_classes: Object.freeze(["PRF", "OBS"]) }),
      CQ: Object.freeze({ minimum_windows: 1, required_task_classes: Object.freeze(["SCT"]) }),
      CR: Object.freeze({ minimum_windows: 1, required_task_classes: Object.freeze(["PRF", "SCT"]) }),
      RS: Object.freeze({ minimum_windows: 1, required_task_classes: Object.freeze(["SCT", "PRF"]) }),
      PS: Object.freeze({ minimum_windows: 1, required_task_classes: Object.freeze(["PRF", "RET"]) }),
      FB: Object.freeze({
        minimum_windows: 1,
        required_task_classes: Object.freeze(["PRF", "RET"]),
        requires_retry_linked_improvement: true,
      }),
      DE: Object.freeze({
        minimum_windows: 2,
        required_task_classes: Object.freeze(["PRF", "REF"]),
        requires_longitudinal_repeat_evidence: true,
      }),
    }),
    readiness_states: Object.freeze({
      READY: "Meets minimum evidence and construct requirements.",
      PARTIAL: "Can compute provisional current score only; baseline/change and confidence are constrained.",
      NOT_READY: "Insufficient evidence; do not emit trait score claims.",
    }),
  }),

  longitudinal_delta_rules: Object.freeze({
    default_windowing: Object.freeze({
      baseline_window: "first qualifying window",
      current_window: "latest qualifying window",
      intermediate_windows_allowed: true,
    }),
    change_score_formula:
      "change_score = clamp(current_score - baseline_score, -100, 100)",
    retry_delta_formula:
      "retry_delta = retry_attempt_score - prior_attempt_score (same construct demand)",
    growth_trend_support: Object.freeze({
      method: "slope_and_direction_summary",
      minimum_windows_for_trend: 3,
      output_fields: Object.freeze(["trend_direction", "trend_strength", "trend_confidence"]),
    }),
    stability_guardrails: Object.freeze({
      require_comparable_task_demand: true,
      exclude_non_comparable_deltas: true,
      max_time_gap_days_without_bridge_window: 180,
    }),
  }),

  trait_aggregation_rules: Object.freeze({
    traits: Object.freeze({
      SR: Object.freeze({
        primary_signals: Object.freeze([
          "behavior_frequency",
          "strategy_use_presence",
          "context_consistency",
          "completion_quality",
          "reengagement_latency",
        ]),
        scoring_notes: "Requires regulation indicators beyond effort duration.",
      }),
      CQ: Object.freeze({
        primary_signals: Object.freeze([
          "inquiry_depth",
          "option_diversity",
          "decision_quality",
          "strategy_use_presence",
        ]),
        scoring_notes: "Requires information-seeking behavior, not enthusiasm alone.",
      }),
      CR: Object.freeze({
        primary_signals: Object.freeze([
          "option_diversity",
          "artifact_quality",
          "completion_quality",
          "attempt_quality_change",
        ]),
        scoring_notes: "Balances novelty/variety with usefulness and fit.",
      }),
      RS: Object.freeze({
        primary_signals: Object.freeze([
          "justification_quality",
          "decision_quality",
          "execution_accuracy",
          "rule_adherence",
          "error_reduction",
        ]),
        scoring_notes: "Explanation quality is required; final correctness alone is insufficient.",
      }),
      PS: Object.freeze({
        primary_signals: Object.freeze([
          "reengagement_latency",
          "attempt_quality_change",
          "completion_quality",
          "behavior_frequency",
        ]),
        scoring_notes: "Measures constructive sustained effort and return-to-task behavior.",
      }),
      FB: Object.freeze({
        primary_signals: Object.freeze([
          "improvement_delta",
          "error_reduction",
          "strategy_shift_detected",
          "attempt_quality_change",
        ]),
        hard_constraint: "At least one valid RET-linked improvement_delta is required.",
        scoring_notes: "Scored from measured post-feedback improvement, not compliance demeanor.",
      }),
      DE: Object.freeze({
        primary_signals: Object.freeze([
          "domain_commitment_language",
          "goal_link_clarity",
          "progress_attribution_quality",
          "reengagement_latency",
          "behavior_frequency",
        ]),
        hard_constraint: "Requires repeated evidence across >=2 longitudinal windows.",
        scoring_notes: "Represents sustained domain return and commitment over time.",
      }),
    }),
    output_formulas: Object.freeze({
      baseline_score:
        "weighted_mean(points from baseline window signals after readiness checks)",
      current_score:
        "weighted_mean(points from most recent qualifying window signals)",
      change_score:
        "current_score - baseline_score when both windows qualify",
      confidence_consistency_score:
        "composite confidence score from confidence_calculation_rules",
      evidence_mix_score:
        "source and task-class diversity score with single-source penalties",
    }),
  }),

  task_level_aggregation_rules: Object.freeze({
    single_task_scoring: Object.freeze({
      rule:
        "Compute task_score = normalized_signal * confidence_weight * evidence_source_weight * 100 for each eligible signal.",
      suitability: "Supports current_score inputs only; insufficient for robust change inference.",
    }),
    repeated_task_scoring: Object.freeze({
      rule:
        "Aggregate same-task-class attempts within window using confidence-weighted mean; preserve attempt sequence metadata.",
      consistency_requirement: "At least 2 comparable attempts for stability estimate.",
    }),
    retry_delta_scoring: Object.freeze({
      rule:
        "For RET tasks, compute per-attempt delta against immediate prior comparable attempt; aggregate positive/negative deltas separately before net delta.",
      anti_noise_rule: "Ignore deltas when task demand changed beyond comparability tolerance.",
    }),
    feedback_use_improvement_scoring: Object.freeze({
      rule:
        "FB improvement index = weighted mean(improvement_delta, error_reduction, strategy_shift_detected) with RET linkage required.",
      fb_dependency_enforcement: "If RET linkage absent, FB score state becomes NOT_READY.",
    }),
    observation_agreement_scoring: Object.freeze({
      rule:
        "Agreement score is computed from parent/teacher/assessor concordance on overlapping indicators.",
      weighting: Object.freeze({
        assessor_teacher_alignment: 0.45,
        parent_teacher_alignment: 0.30,
        parent_assessor_alignment: 0.25,
      }),
    }),
  }),

  quality_layers: Object.freeze({
    DETECTION_QUALITY: Object.freeze({
      inter_rater_agreement: Object.freeze({
        formula: "scaled_agreement_index across observer pairs",
        weight: 0.30,
      }),
      retest_stability: Object.freeze({
        formula: "score_stability_on_repeated_equivalent_tasks",
        weight: 0.25,
      }),
      task_consistency: Object.freeze({
        formula: "cross-task-class convergence on same trait construct",
        weight: 0.20,
      }),
      observation_performance_convergence: Object.freeze({
        formula: "alignment_between_observer_reports_and_task_performance",
        weight: 0.25,
      }),
    }),
    DEVELOPMENT_QUALITY: Object.freeze({
      trait_score_change: Object.freeze({
        formula: "normalized absolute and directional change across windows",
        weight: 0.35,
      }),
      retry_improvement: Object.freeze({
        formula: "aggregate RET positive delta strength",
        weight: 0.25,
      }),
      persistence_increase: Object.freeze({
        formula: "change in reengagement and sustained attempt continuity",
        weight: 0.20,
      }),
      complexity_depth_increase: Object.freeze({
        formula: "improvement retained under higher complexity demands",
        weight: 0.20,
      }),
    }),
    ENVIRONMENT_QUALITY: Object.freeze({
      challenge_fit: Object.freeze({
        formula: "fit between challenge level and demonstrated competence trend",
        weight: 0.22,
      }),
      support_fit: Object.freeze({
        formula: "fit between scaffold intensity and resulting improvement quality",
        weight: 0.22,
      }),
      mentor_exposure: Object.freeze({
        formula: "coverage and regularity of effective mentor/coach interaction evidence",
        weight: 0.18,
      }),
      boredom_frustration_mismatch_change: Object.freeze({
        formula: "reduction in mismatch indicators across windows",
        weight: 0.18,
      }),
      domain_engagement_increase: Object.freeze({
        formula: "increase in repeated voluntary return and commitment language",
        weight: 0.20,
      }),
    }),
  }),

  anti_overclaim_language_rules: Object.freeze({
    required_reporting_phrases: Object.freeze([
      "Observed score pattern reflects current measurable behavior within sampled contexts.",
      "Confidence is reported separately from trait score and may limit interpretation strength.",
      "Change scores reflect measured windows, not guaranteed future trajectories.",
    ]),
    prohibited_claim_patterns: Object.freeze([
      "Deterministic statements about lifelong ability or destiny.",
      "Archetype or fixed-identity labeling language.",
      "Future performance guarantees from single-window or single-source evidence.",
    ]),
    low_confidence_disclosure_threshold: 45,
    low_confidence_disclosure_text:
      "Interpret with caution: evidence mix and/or consistency is currently limited.",
  }),
});

module.exports = {
  YOUTH_DEVELOPMENT_SCORING_MODEL,
};
