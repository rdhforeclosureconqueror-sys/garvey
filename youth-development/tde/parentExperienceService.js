"use strict";

const { PROGRAM_PHASES, PROGRAM_WEEKS, PROGRAM_CHECKPOINTS } = require("./programRail");
const { buildInterventionSummary } = require("./interventionSummaryService");

const PHASE_LABELS = Object.freeze({
  1: "Phase 1 · Foundation",
  2: "Phase 2 · Expansion",
  3: "Phase 3 · Leadership",
});

const LEVER_LABELS = Object.freeze({
  SR: "self-regulation routines",
  CQ: "curiosity and exploration",
  CR: "creative idea development",
  RS: "reasoning and pattern use",
  PS: "persistence through challenge",
  FB: "response to feedback",
  DE: "domain engagement",
});

const ENVIRONMENT_LABELS = Object.freeze({
  challenge_fit: "challenge-fit in daily tasks",
  consistency_of_structure: "consistency of structure",
  mentorship_access: "access to mentorship and coaching",
  resource_access: "resource access",
  emotional_climate: "supportive emotional climate",
  home_routine: "home routine stability",
  school_structure: "school structure support",
  mentor_feedback_loop: "mentor feedback loop",
  peer_collaboration: "peer collaboration setup",
});

const SUPPORT_ACTION_LIBRARY = Object.freeze([
  Object.freeze({
    action_id: "support_action_trait_sr_micro_routine",
    title: "Run a 10-minute start routine",
    why_this_matters: "Predictable starts help self-regulation and transition into focused work.",
    linked_trait_or_environment_factor: Object.freeze({ type: "trait", code: "SR" }),
    suggested_timing: "before the next two challenge sessions",
    effort_level: "low",
    rule_ref: "program_week:routine_reset_micro_plan",
    optional_home_example: "Set a short checklist: materials ready, one clear goal, then begin.",
  }),
  Object.freeze({
    action_id: "support_action_trait_ps_reflection",
    title: "Name one challenge strategy after effort",
    why_this_matters: "Noticing strategy use strengthens persistence for future hard tasks.",
    linked_trait_or_environment_factor: Object.freeze({ type: "trait", code: "PS" }),
    suggested_timing: "after one challenging task this week",
    effort_level: "low",
    rule_ref: "trace:trait_signal_summary:PS",
    optional_home_example: "Ask: 'What helped you keep going when it became difficult?'",
  }),
  Object.freeze({
    action_id: "support_action_trait_fb_feedback_loop",
    title: "Use one specific feedback cycle",
    why_this_matters: "A short feedback loop helps the child practice adjustment and improvement.",
    linked_trait_or_environment_factor: Object.freeze({ type: "trait", code: "FB" }),
    suggested_timing: "during the next project revision",
    effort_level: "medium",
    rule_ref: "trace:checkpoint_feedback_review",
    optional_home_example: "Choose one target, try again once, and compare first vs second attempt.",
  }),
  Object.freeze({
    action_id: "support_action_env_challenge_fit_adjust",
    title: "Adjust challenge level by one step",
    why_this_matters: "Right-sized challenge supports progress without overload or disengagement.",
    linked_trait_or_environment_factor: Object.freeze({ type: "environment", code: "challenge_fit" }),
    suggested_timing: "before the next weekly activity",
    effort_level: "medium",
    rule_ref: "environment_factor:challenge_fit",
    optional_home_example: "If frustration is high, reduce one complexity element and retry.",
  }),
  Object.freeze({
    action_id: "support_action_env_mentor_checkin",
    title: "Schedule one mentor check-in",
    why_this_matters: "A short coaching check-in increases clarity, confidence, and follow-through.",
    linked_trait_or_environment_factor: Object.freeze({ type: "environment", code: "mentorship_access" }),
    suggested_timing: "within the next 7 days",
    effort_level: "medium",
    rule_ref: "environment_factor:mentorship_access",
    optional_home_example: "Share one recent win and one current obstacle with the mentor.",
  }),
]);

const TRUST_CONTENT_CONTRACT = Object.freeze({
  ok: true,
  extension_only: true,
  deterministic: true,
  contract_version: "phase5-parent-trust-v1",
  trust_sections: Object.freeze({
    system_explanation: Object.freeze({
      title: "What this system is",
      content: "This is a developmental tracking layer that organizes observed learning patterns, support factors, and weekly program progress.",
    }),
    how_it_works: Object.freeze({
      title: "How the program works",
      content: "The model combines extension-only observation signals, weekly checkpoint records, and environment factors across a 36-week roadmap.",
    }),
    developmental_not_diagnostic_explanation: Object.freeze({
      title: "Developmental, not diagnostic",
      content: "This output does not diagnose conditions or assign fixed labels. It describes current developmental patterns to guide support actions.",
    }),
    pattern_over_time_explanation: Object.freeze({
      title: "Patterns over time",
      content: "Any single week can vary. More confidence comes from repeated patterns across weeks, checkpoints, and settings.",
    }),
    next_step_plan_explanation: Object.freeze({
      title: "What parents receive next",
      content: "Parents receive immediate support actions, upcoming checkpoint guidance, and a clear next-step plan tied to observed factors.",
    }),
    confidence_data_sufficiency_explanation: Object.freeze({
      title: "Confidence and data sufficiency",
      content: "Confidence describes signal consistency. Data sufficiency shows whether enough consented observations and environment evidence are present.",
    }),
    factor_separation_explanation: Object.freeze({
      title: "Child factors and environment factors stay separate",
      content: "Child developmental levers and environment supports are tracked independently so supports can target each area without conflation.",
    }),
  }),
  allowed_external_trust_statements: Object.freeze([
    "developmental_patterns_over_time",
    "non_diagnostic_language_only",
    "confidence_and_data_sufficiency_visible",
    "environment_child_factor_separation",
  ]),
});

function normalizeWeek(weekValue) {
  const parsed = Number(weekValue);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  if (parsed > 36) return 36;
  return parsed;
}

function byWeekAsc(a, b) {
  return Number(a.week_number) - Number(b.week_number);
}

function summarizeProgressTimeline(progressRecords) {
  const completedWeeks = progressRecords.filter((entry) => entry.completion_status === "complete").length;
  const checkpointCount = progressRecords.filter((entry) => Boolean(entry.checkpoint_record)).length;
  const earliestWeek = progressRecords[0]?.week_number || null;
  const latestWeek = progressRecords.at(-1)?.week_number || null;
  return {
    completed_week_count: completedWeeks,
    checkpoint_record_count: checkpointCount,
    observed_week_span: earliestWeek && latestWeek ? `${earliestWeek}-${latestWeek}` : "none",
    interpretation: progressRecords.length >= 4
      ? "Developmental pattern history is forming across multiple weeks."
      : "Progress history is early; continue weekly observations for stronger trend visibility.",
  };
}

function buildRoadmapViewModel(currentWeek) {
  const week = normalizeWeek(currentWeek);
  const currentWeekModel = PROGRAM_WEEKS.find((entry) => entry.week_number === week) || PROGRAM_WEEKS[0];
  const upcomingWeekModel = PROGRAM_WEEKS.find((entry) => entry.week_number > week) || null;

  return {
    ok: true,
    extension_only: true,
    deterministic: true,
    current_position: {
      phase_number: currentWeekModel.phase_number,
      phase_label: PHASE_LABELS[currentWeekModel.phase_number],
      week_number: week,
      week_label: `Week ${week}`,
    },
    phases: PROGRAM_PHASES.map((phase) => ({
      phase_number: phase.phase_number,
      phase_label: PHASE_LABELS[phase.phase_number],
      week_span_label: `Weeks ${phase.start_week}-${phase.end_week}`,
      completed: week > phase.end_week,
      active: week >= phase.start_week && week <= phase.end_week,
      upcoming: week < phase.start_week,
    })),
    weeks: PROGRAM_WEEKS.map((entry) => ({
      week_number: entry.week_number,
      week_label: `Week ${entry.week_number}`,
      phase_label: PHASE_LABELS[entry.phase_number],
      active_week: entry.week_number === week,
      checkpoint_marker: entry.checkpoint_flag,
      current_focus: entry.weekly_goal,
      completed: entry.week_number < week,
      upcoming: entry.week_number > week,
    })),
    checkpoints: PROGRAM_CHECKPOINTS.map((checkpoint) => ({
      checkpoint_id: checkpoint.checkpoint_id,
      week_number: checkpoint.week_number,
      week_label: `Week ${checkpoint.week_number}`,
      phase_label: PHASE_LABELS[checkpoint.phase_number],
      checkpoint_type: checkpoint.checkpoint_type,
      status: checkpoint.week_number < week ? "completed" : checkpoint.week_number === week ? "active" : "upcoming",
    })),
    focus: {
      current_focus: currentWeekModel.weekly_goal,
      upcoming_focus: upcomingWeekModel ? upcomingWeekModel.weekly_goal : "Final reflection and transition planning.",
    },
  };
}

function buildSupportActions(snapshot = {}, confidenceContext = {}, dataSufficiency = {}) {
  const enrollment = snapshot.enrollment || {};
  const traitTargets = Array.isArray(enrollment.current_trait_targets) ? enrollment.current_trait_targets : [];
  const environmentTargets = Array.isArray(enrollment.current_environment_targets) ? enrollment.current_environment_targets : [];

  const selected = [];
  for (const action of SUPPORT_ACTION_LIBRARY) {
    const link = action.linked_trait_or_environment_factor;
    if (link.type === "trait" && traitTargets.includes(link.code)) selected.push(action);
    if (link.type === "environment" && environmentTargets.includes(link.code)) selected.push(action);
  }

  const fallback = selected.length ? selected : SUPPORT_ACTION_LIBRARY.slice(0, 3);

  return {
    ok: true,
    extension_only: true,
    deterministic: true,
    confidence_context: confidenceContext,
    data_sufficiency_status: dataSufficiency,
    support_actions: fallback.slice(0, 5).map((action) => ({
      action_id: action.action_id,
      title: action.title,
      why_this_matters: action.why_this_matters,
      linked_trait_or_environment_factor: action.linked_trait_or_environment_factor,
      suggested_timing: action.suggested_timing,
      effort_level: action.effort_level,
      trace_ref: action.rule_ref.startsWith("trace:") ? action.rule_ref : undefined,
      rule_ref: action.rule_ref.startsWith("trace:") ? undefined : action.rule_ref,
      confidence_context: {
        confidence_label: confidenceContext.confidence_label || "early-signal",
        confidence_rationale: confidenceContext.rationale || "Confidence is based on current extension evidence only.",
      },
      optional_home_example: action.optional_home_example || undefined,
    })),
  };
}

function buildDataSufficiencyStatus(consents, hooks, progressRecords) {
  const grantedCount = consents.filter((entry) => entry.consent_status === "granted").length;
  const environmentCount = hooks.length;
  const checkpointCount = progressRecords.filter((entry) => entry.checkpoint_record).length;
  const status = grantedCount > 0 && environmentCount > 0 && checkpointCount > 0 ? "sufficient" : "limited";

  return {
    status,
    observer_consent_count: consents.length,
    granted_observer_consent_count: grantedCount,
    environment_event_count: environmentCount,
    checkpoint_count: checkpointCount,
    missing_contracts: [
      ...(grantedCount === 0 ? ["observer_consent_granted_required"] : []),
      ...(environmentCount === 0 ? ["environment_hooks_required"] : []),
      ...(checkpointCount === 0 ? ["checkpoint_records_required"] : []),
    ],
  };
}

function buildConfidenceContext(progressRecords, environmentHooks, observerConsents) {
  return {
    confidence_label: progressRecords.length >= 6 ? "moderate" : "early-signal",
    rationale: progressRecords.length >= 6
      ? "Repeated weekly observations and checkpoints support moderate developmental confidence."
      : "Current confidence is early and will improve as additional weekly observations are captured.",
    environment_signal_count: environmentHooks.length,
    observer_consent_count: observerConsents.length,
  };
}

function buildParentExperienceViewModel(childId, snapshot = {}) {
  const enrollment = snapshot.enrollment || null;
  const progressRecords = Array.isArray(snapshot.progress_records) ? [...snapshot.progress_records].sort(byWeekAsc) : [];
  const environmentHooks = Array.isArray(snapshot.environment_hooks) ? snapshot.environment_hooks : [];
  const observerConsents = Array.isArray(snapshot.observer_consents) ? snapshot.observer_consents : [];

  const currentWeek = normalizeWeek(enrollment?.current_week || progressRecords.at(-1)?.week_number || 1);
  const currentWeekModel = PROGRAM_WEEKS.find((entry) => entry.week_number === currentWeek) || PROGRAM_WEEKS[0];
  const completedCheckpoints = progressRecords.filter((entry) => Boolean(entry.checkpoint_record)).map((entry) => ({
    checkpoint_id: entry.checkpoint_record.checkpoint_id,
    week_number: entry.week_number,
    checkpoint_type: entry.checkpoint_record.checkpoint_type,
  }));

  const nextCheckpoint = PROGRAM_CHECKPOINTS.find((entry) => entry.week_number >= currentWeek) || PROGRAM_CHECKPOINTS.at(-1);
  const confidenceContext = buildConfidenceContext(progressRecords, environmentHooks, observerConsents);
  const dataSufficiency = buildDataSufficiencyStatus(observerConsents, environmentHooks, progressRecords);

  const strongestLevers = Array.isArray(enrollment?.active_domain_interests)
    ? enrollment.active_domain_interests.slice(0, 3)
    : [];
  const buildingLevers = Array.isArray(enrollment?.current_trait_targets)
    ? enrollment.current_trait_targets.map((code) => LEVER_LABELS[code] || `trait ${code}`)
    : [];

  const environmentFocusAreas = Array.isArray(enrollment?.current_environment_targets)
    ? enrollment.current_environment_targets.map((code) => ENVIRONMENT_LABELS[code] || code)
    : [];

  const supportActions = buildSupportActions(snapshot, confidenceContext, dataSufficiency);
  const interventionSessions = Array.isArray(snapshot.intervention_sessions) ? snapshot.intervention_sessions : [];
  const interventionSummary = buildInterventionSummary(childId, snapshot, snapshot.commitment_plan || null, interventionSessions);

  return {
    ok: true,
    extension_only: true,
    deterministic: true,
    child_id: childId,
    current_phase: {
      phase_number: currentWeekModel.phase_number,
      phase_label: PHASE_LABELS[currentWeekModel.phase_number],
    },
    current_week: {
      week_number: currentWeek,
      week_label: `Week ${currentWeek}`,
    },
    roadmap_position: {
      index: currentWeek,
      total_weeks: 36,
      completion_ratio: Number((currentWeek / 36).toFixed(4)),
    },
    completed_checkpoints: completedCheckpoints,
    next_checkpoint: {
      checkpoint_id: nextCheckpoint.checkpoint_id,
      week_number: nextCheckpoint.week_number,
      checkpoint_type: nextCheckpoint.checkpoint_type,
      objective: `Prepare evidence and reflection for Week ${nextCheckpoint.week_number} checkpoint.`,
    },
    strongest_current_developmental_levers: strongestLevers,
    levers_currently_building: buildingLevers,
    environment_focus_areas: environmentFocusAreas,
    support_actions_for_now: supportActions.support_actions,
    confidence_context: confidenceContext,
    data_sufficiency_context: dataSufficiency,
    progress_over_time_summary: summarizeProgressTimeline(progressRecords),
    next_step_plan: {
      now: "Continue weekly developmental observations using extension contracts.",
      next: `Prepare for ${nextCheckpoint.checkpoint_type} at Week ${nextCheckpoint.week_number}.`,
      after_next_checkpoint: "Review confidence and data sufficiency to refine supports.",
    },
    intervention_summary: interventionSummary,
    factor_separation: {
      child_development_factors: Array.isArray(enrollment?.current_trait_targets) ? enrollment.current_trait_targets : [],
      environment_factors: Array.isArray(enrollment?.current_environment_targets) ? enrollment.current_environment_targets : [],
      separation_guard: "child_and_environment_factors_reported_separately",
    },
  };
}

async function getParentExperience(childId, repository) {
  const snapshot = await repository.getProgramSnapshot(childId);
  return buildParentExperienceViewModel(childId, snapshot);
}

async function getRoadmapForChild(childId, repository) {
  const snapshot = await repository.getProgramSnapshot(childId);
  const week = snapshot?.enrollment?.current_week || snapshot?.progress_records?.at(-1)?.week_number || 1;
  return {
    child_id: childId,
    ...buildRoadmapViewModel(week),
  };
}

async function getSupportActionsForChild(childId, repository) {
  const snapshot = await repository.getProgramSnapshot(childId);
  const progressRecords = Array.isArray(snapshot.progress_records) ? snapshot.progress_records : [];
  const environmentHooks = Array.isArray(snapshot.environment_hooks) ? snapshot.environment_hooks : [];
  const observerConsents = Array.isArray(snapshot.observer_consents) ? snapshot.observer_consents : [];
  const confidenceContext = buildConfidenceContext(progressRecords, environmentHooks, observerConsents);
  const dataSufficiency = buildDataSufficiencyStatus(observerConsents, environmentHooks, progressRecords);

  return {
    child_id: childId,
    ...buildSupportActions(snapshot, confidenceContext, dataSufficiency),
  };
}

function getTrustContent() {
  return TRUST_CONTENT_CONTRACT;
}

module.exports = {
  TRUST_CONTENT_CONTRACT,
  buildParentExperienceViewModel,
  buildRoadmapViewModel,
  buildSupportActions,
  getParentExperience,
  getRoadmapForChild,
  getSupportActionsForChild,
  getTrustContent,
};
