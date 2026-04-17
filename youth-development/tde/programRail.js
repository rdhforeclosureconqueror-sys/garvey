"use strict";

const { deterministicId } = require("./constants");

const CHECKPOINT_TYPES = Object.freeze({
  BASELINE: "baseline_checkpoint",
  REASSESSMENT: "reassessment_checkpoint",
  FINAL_REASSESSMENT: "final_reassessment_checkpoint",
});

const PROGRAM_PHASES = Object.freeze([
  Object.freeze({ phase_number: 1, phase_name: "Foundation", start_week: 1, end_week: 12, theme: "build routines and baseline confidence" }),
  Object.freeze({ phase_number: 2, phase_name: "Expansion", start_week: 13, end_week: 24, theme: "broaden challenge and transfer across contexts" }),
  Object.freeze({ phase_number: 3, phase_name: "Leadership", start_week: 25, end_week: 36, theme: "stabilize autonomy and long-range planning" }),
]);

const DOMAIN_FOCUS = Object.freeze([
  "literacy_expression",
  "quant_reasoning",
  "creative_problem_solving",
  "systems_thinking",
  "collaboration",
  "self_management",
]);

const ENVIRONMENT_FOCUS = Object.freeze([
  "home_routine",
  "school_structure",
  "mentor_feedback_loop",
  "peer_collaboration",
  "resource_access",
]);

const SUPPORT_ACTIONS = Object.freeze([
  "family_reflection_prompt",
  "teacher_alignment_note",
  "mentor_checkin",
  "routine_reset_micro_plan",
  "resource_scaffold_pack",
]);

const CORE_ACTIVITY_TYPES = Object.freeze([
  "guided_skill_practice",
  "scenario_decision_lab",
  "project_build_cycle",
  "peer_feedback_exchange",
]);

const STRETCH_CHALLENGE_TYPES = Object.freeze([
  "complexity_increase",
  "time_constraint_variant",
  "novel_domain_transfer",
  "leadership_micro_role",
]);

const REFLECTION_LOOP_TYPES = Object.freeze([
  "self_explanation_journal",
  "mentor_dialogue_prompt",
  "goal_adjustment_review",
]);

const OBSERVATION_ENTRY_TYPES = Object.freeze([
  "task_event_observation",
  "teacher_observation_note",
  "parent_observation_note",
  "self_report_observation",
]);

const PHASE_TARGET_TRAIT_SETS = Object.freeze({
  1: Object.freeze([
    ["SR", "PS"],
    ["CQ", "SR"],
    ["PS", "FB"],
  ]),
  2: Object.freeze([
    ["CQ", "CR"],
    ["RS", "FB"],
    ["DE", "PS"],
  ]),
  3: Object.freeze([
    ["DE", "RS"],
    ["CR", "FB"],
    ["SR", "DE"],
  ]),
});

const CHECKPOINT_WEEK_TO_TYPE = Object.freeze({
  1: CHECKPOINT_TYPES.BASELINE,
  12: CHECKPOINT_TYPES.REASSESSMENT,
  24: CHECKPOINT_TYPES.REASSESSMENT,
  36: CHECKPOINT_TYPES.FINAL_REASSESSMENT,
});

const PROGRAM_MODEL_CONTRACTS = Object.freeze({
  program_phase: Object.freeze({ required_fields: Object.freeze(["phase_number", "phase_name", "start_week", "end_week", "theme"]) }),
  program_week: Object.freeze({ required_fields: Object.freeze(["week_number", "phase_number", "phase_name", "weekly_goal", "target_traits", "core_activity_type", "stretch_challenge_type", "reflection_loop_type", "observation_entry_type", "optional_support_action", "checkpoint_flag"]) }),
  checkpoint_type: Object.freeze({ enum: Object.values(CHECKPOINT_TYPES) }),
  baseline_checkpoint: Object.freeze({ week_number: 1, checkpoint_type: CHECKPOINT_TYPES.BASELINE }),
  reassessment_checkpoint: Object.freeze({ week_numbers: Object.freeze([12, 24]), checkpoint_type: CHECKPOINT_TYPES.REASSESSMENT }),
  weekly_session_template: Object.freeze({ required_fields: Object.freeze(["core_activity_type", "stretch_challenge_type", "reflection_loop_type", "observation_entry_type"]) }),
  domain_focus: Object.freeze({ enum: DOMAIN_FOCUS }),
  environment_focus: Object.freeze({ enum: ENVIRONMENT_FOCUS }),
  support_actions: Object.freeze({ enum: SUPPORT_ACTIONS }),
  child_profile_tde: Object.freeze({ required_fields: Object.freeze(["child_id", "profile_version", "active_domain_interests", "current_trait_targets", "current_environment_targets"]) }),
  program_enrollment: Object.freeze({ required_fields: Object.freeze(["enrollment_id", "child_id", "program_start_date", "current_week", "program_status"]) }),
  weekly_progress_record: Object.freeze({ required_fields: Object.freeze(["progress_id", "enrollment_id", "child_id", "week_number", "completion_status", "trait_signal_summary"]) }),
  checkpoint_record: Object.freeze({ required_fields: Object.freeze(["checkpoint_id", "enrollment_id", "child_id", "week_number", "checkpoint_type", "evidence_collection_plan", "traceability_references"]) }),
  session_record: Object.freeze({ required_fields: Object.freeze(["session_id", "progress_id", "week_number", "session_template_type", "observation_entry_type"]) }),
  observer_record_linkage: Object.freeze({ required_fields: Object.freeze(["observer_record_id", "observer_type", "observer_reference", "linked_entity_type", "linked_entity_id"]) }),
  active_domain_interests: Object.freeze({ required_fields: Object.freeze(["child_id", "domains", "updated_at"]) }),
  current_trait_targets: Object.freeze({ required_fields: Object.freeze(["child_id", "trait_targets", "updated_at"]) }),
  current_environment_targets: Object.freeze({ required_fields: Object.freeze(["child_id", "environment_targets", "updated_at"]) }),
});

function resolvePhase(weekNumber) {
  return PROGRAM_PHASES.find((phase) => weekNumber >= phase.start_week && weekNumber <= phase.end_week) || PROGRAM_PHASES[PROGRAM_PHASES.length - 1];
}

function buildWeeklyGoal(weekNumber, phase) {
  return `Week ${weekNumber}: ${phase.phase_name.toLowerCase()} focus to ${phase.theme}.`;
}

function buildProgramWeek(weekNumber) {
  const phase = resolvePhase(weekNumber);
  const phaseIndex = (weekNumber - phase.start_week) % 3;
  const rotationIndex = (weekNumber - 1) % 4;
  const supportIndex = (weekNumber - 1) % SUPPORT_ACTIONS.length;
  return Object.freeze({
    week_number: weekNumber,
    phase_number: phase.phase_number,
    phase_name: phase.phase_name,
    weekly_goal: buildWeeklyGoal(weekNumber, phase),
    target_traits: Object.freeze(PHASE_TARGET_TRAIT_SETS[phase.phase_number][phaseIndex]),
    core_activity_type: CORE_ACTIVITY_TYPES[rotationIndex],
    stretch_challenge_type: STRETCH_CHALLENGE_TYPES[rotationIndex],
    reflection_loop_type: REFLECTION_LOOP_TYPES[(weekNumber - 1) % REFLECTION_LOOP_TYPES.length],
    observation_entry_type: OBSERVATION_ENTRY_TYPES[(weekNumber - 1) % OBSERVATION_ENTRY_TYPES.length],
    optional_support_action: weekNumber % 2 === 0 ? SUPPORT_ACTIONS[supportIndex] : null,
    checkpoint_flag: Object.prototype.hasOwnProperty.call(CHECKPOINT_WEEK_TO_TYPE, weekNumber),
  });
}

const PROGRAM_WEEKS = Object.freeze(Array.from({ length: 36 }, (_, index) => buildProgramWeek(index + 1)));

function buildCheckpoint(weekNumber) {
  const checkpointType = CHECKPOINT_WEEK_TO_TYPE[weekNumber];
  const week = PROGRAM_WEEKS.find((entry) => entry.week_number === weekNumber);
  const targetTraits = week ? week.target_traits : ["SR", "PS"];
  return Object.freeze({
    checkpoint_id: deterministicId("chk", { week_number: weekNumber, checkpoint_type: checkpointType }),
    week_number: weekNumber,
    phase_number: week ? week.phase_number : resolvePhase(weekNumber).phase_number,
    checkpoint_type: checkpointType,
    evidence_collection_plan: Object.freeze({
      minimum_sources: Object.freeze(["task_event", "observation"]),
      session_sample_target: 3,
      observer_sample_target: 2,
      note: "Extension-only checkpoint evidence plan; calibration-variable thresholds remain separate.",
    }),
    target_traits: Object.freeze([...targetTraits]),
    environment_review_flag: true,
    confidence_review_flag: true,
    traceability_references: Object.freeze([
      `program_week:${weekNumber}`,
      `checkpoint_type:${checkpointType}`,
    ]),
  });
}

const PROGRAM_CHECKPOINTS = Object.freeze(Object.keys(CHECKPOINT_WEEK_TO_TYPE).map((week) => buildCheckpoint(Number(week))));

module.exports = {
  PROGRAM_PHASES,
  PROGRAM_WEEKS,
  PROGRAM_CHECKPOINTS,
  PROGRAM_MODEL_CONTRACTS,
  CHECKPOINT_TYPES,
  DOMAIN_FOCUS,
  ENVIRONMENT_FOCUS,
  SUPPORT_ACTIONS,
};
