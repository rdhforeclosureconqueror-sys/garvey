"use strict";

const WEEKLY_EXECUTION_ACTIONS = Object.freeze([
  "start_week",
  "resume_week",
  "save_reflection",
  "save_observation",
  "mark_step_complete",
  "continue_to_next_step",
  "continue_next_week",
]);

const DEPRECATED_ACTION_ALIASES = Object.freeze({
  continue_next_step: "continue_to_next_step",
});

const UNCONTRACTED_PASS_THROUGH_ACTIONS = Object.freeze([
  "create_case_profile",
  "route_external_support",
  "record_onboarding_touchpoint",
]);

const STEP_SEQUENCE = Object.freeze([
  "core_activity",
  "stretch_challenge",
  "reflection_checkin",
  "observation_support",
]);

const WEEKLY_EXECUTION_STATES = Object.freeze([
  "not_started",
  "in_progress",
  "blocked",
  "ready_for_next_week",
  "completed",
]);

const ACTION_CONTRACT = Object.freeze({
  start_week: Object.freeze({ required_fields: [] }),
  resume_week: Object.freeze({ required_fields: [] }),
  save_reflection: Object.freeze({ required_fields: ["note"] }),
  save_observation: Object.freeze({ required_fields: ["note"] }),
  mark_step_complete: Object.freeze({ required_fields: ["step_key"] }),
  continue_to_next_step: Object.freeze({ required_fields: [] }),
  continue_next_week: Object.freeze({ required_fields: [] }),
});

const ACTION_RISK_FACTORS = Object.freeze({
  start_week: Object.freeze({
    onboarding_criticality: "high",
    profile_case_creation: "none",
    external_routing: "none",
    downstream_side_effects: "medium",
    known_failure_history: "low",
  }),
  resume_week: Object.freeze({
    onboarding_criticality: "medium",
    profile_case_creation: "none",
    external_routing: "none",
    downstream_side_effects: "low",
    known_failure_history: "low",
  }),
  save_reflection: Object.freeze({
    onboarding_criticality: "high",
    profile_case_creation: "none",
    external_routing: "none",
    downstream_side_effects: "medium",
    known_failure_history: "medium",
  }),
  save_observation: Object.freeze({
    onboarding_criticality: "high",
    profile_case_creation: "none",
    external_routing: "none",
    downstream_side_effects: "medium",
    known_failure_history: "medium",
  }),
  mark_step_complete: Object.freeze({
    onboarding_criticality: "high",
    profile_case_creation: "none",
    external_routing: "none",
    downstream_side_effects: "high",
    known_failure_history: "medium",
  }),
  continue_to_next_step: Object.freeze({
    onboarding_criticality: "high",
    profile_case_creation: "none",
    external_routing: "none",
    downstream_side_effects: "high",
    known_failure_history: "medium",
  }),
  continue_next_week: Object.freeze({
    onboarding_criticality: "high",
    profile_case_creation: "none",
    external_routing: "none",
    downstream_side_effects: "high",
    known_failure_history: "high",
  }),
  create_case_profile: Object.freeze({
    onboarding_criticality: "high",
    profile_case_creation: "high",
    external_routing: "low",
    downstream_side_effects: "high",
    known_failure_history: "unknown",
  }),
  route_external_support: Object.freeze({
    onboarding_criticality: "medium",
    profile_case_creation: "medium",
    external_routing: "high",
    downstream_side_effects: "high",
    known_failure_history: "unknown",
  }),
  record_onboarding_touchpoint: Object.freeze({
    onboarding_criticality: "high",
    profile_case_creation: "medium",
    external_routing: "none",
    downstream_side_effects: "medium",
    known_failure_history: "unknown",
  }),
});

function defaultExecutionState() {
  return {
    week_status: "not_started",
    completed_step_keys: [],
    active_step_index: 0,
    reflection_note: "",
    observation_note: "",
    reflection_saved: false,
    observation_saved: false,
    resume_ready: false,
    next_week_available: false,
    blocked_reason: "",
    invalid_action_count: 0,
    last_action: null,
  };
}

function normalizeWeekStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  if (WEEKLY_EXECUTION_STATES.includes(status)) return status;
  if (status === "complete") return "completed";
  return "not_started";
}

function normalizeExecutionState(input, weekNumber = 1) {
  const base = { ...defaultExecutionState(), ...(input || {}) };
  base.week_status = normalizeWeekStatus(base.week_status);
  base.completed_step_keys = [...new Set((Array.isArray(base.completed_step_keys) ? base.completed_step_keys : []).filter((step) => STEP_SEQUENCE.includes(step)))];
  base.active_step_index = Math.max(0, Math.min(STEP_SEQUENCE.length - 1, Number(base.active_step_index || 0)));
  base.reflection_note = String(base.reflection_note || "").trim().slice(0, 2000);
  base.observation_note = String(base.observation_note || "").trim().slice(0, 2000);
  base.reflection_saved = base.reflection_note.length > 0 || base.reflection_saved === true;
  base.observation_saved = base.observation_note.length > 0 || base.observation_saved === true;

  const completionEligible = isWeekCompletionEligible(base);
  if (completionEligible && base.week_status !== "completed") {
    base.week_status = Number(weekNumber || 1) >= 36 ? "completed" : "ready_for_next_week";
  }
  base.next_week_available = base.week_status === "ready_for_next_week" && Number(weekNumber || 1) < 36;
  base.resume_ready = ["in_progress", "blocked", "ready_for_next_week", "completed"].includes(base.week_status);
  return base;
}

function isWeekCompletionEligible(state) {
  const completed = Array.isArray(state.completed_step_keys) ? state.completed_step_keys : [];
  return STEP_SEQUENCE.every((step) => completed.includes(step))
    && state.reflection_saved === true
    && state.observation_saved === true;
}

function resolveWeeklyExecutionActionType(actionTypeRaw) {
  const input = String(actionTypeRaw || "").trim().toLowerCase();
  if (!input) {
    return {
      input,
      resolved_action_type: "",
      classification: "unknown_or_unresolved",
      deprecated_alias_for: null,
    };
  }
  if (WEEKLY_EXECUTION_ACTIONS.includes(input)) {
    return {
      input,
      resolved_action_type: input,
      classification: "contracted_and_validated",
      deprecated_alias_for: null,
    };
  }
  const aliasTarget = DEPRECATED_ACTION_ALIASES[input];
  if (aliasTarget) {
    return {
      input,
      resolved_action_type: aliasTarget,
      classification: "deprecated_alias",
      deprecated_alias_for: aliasTarget,
    };
  }
  if (UNCONTRACTED_PASS_THROUGH_ACTIONS.includes(input)) {
    return {
      input,
      resolved_action_type: input,
      classification: "uncontracted_pass_through",
      deprecated_alias_for: null,
    };
  }
  return {
    input,
    resolved_action_type: input,
    classification: "unknown_or_unresolved",
    deprecated_alias_for: null,
  };
}

function buildWeeklyExecutionActionInventory({ observedActions = [] } = {}) {
  const inventory = [];
  for (const actionType of WEEKLY_EXECUTION_ACTIONS) {
    inventory.push({
      action_type: actionType,
      classification: "contracted_and_validated",
      resolved_action_type: actionType,
      deprecated_alias_for: null,
      risk: ACTION_RISK_FACTORS[actionType] || null,
    });
  }
  for (const [alias, canonical] of Object.entries(DEPRECATED_ACTION_ALIASES)) {
    inventory.push({
      action_type: alias,
      classification: "deprecated_alias",
      resolved_action_type: canonical,
      deprecated_alias_for: canonical,
      risk: ACTION_RISK_FACTORS[canonical] || null,
    });
  }
  for (const actionType of UNCONTRACTED_PASS_THROUGH_ACTIONS) {
    inventory.push({
      action_type: actionType,
      classification: "uncontracted_pass_through",
      resolved_action_type: actionType,
      deprecated_alias_for: null,
      risk: ACTION_RISK_FACTORS[actionType] || null,
    });
  }

  const known = new Set(inventory.map((entry) => entry.action_type));
  for (const observed of Array.isArray(observedActions) ? observedActions : []) {
    const resolved = resolveWeeklyExecutionActionType(observed);
    if (known.has(resolved.input)) continue;
    inventory.push({
      action_type: resolved.input,
      classification: resolved.classification,
      resolved_action_type: resolved.resolved_action_type,
      deprecated_alias_for: resolved.deprecated_alias_for,
      risk: ACTION_RISK_FACTORS[resolved.input] || null,
    });
  }
  return inventory.sort((a, b) => a.action_type.localeCompare(b.action_type));
}

function riskWeight(value) {
  if (value === "high") return 3;
  if (value === "medium") return 2;
  if (value === "low") return 1;
  return 0;
}

function computeActionRiskScore(risk = {}) {
  return riskWeight(risk.onboarding_criticality)
    + riskWeight(risk.profile_case_creation)
    + riskWeight(risk.external_routing)
    + riskWeight(risk.downstream_side_effects)
    + riskWeight(risk.known_failure_history);
}

function buildWeeklyExecutionCoverageReport({ observedActions = [] } = {}) {
  const inventory = buildWeeklyExecutionActionInventory({ observedActions });
  const byClassification = inventory.reduce((acc, entry) => {
    acc[entry.classification] = (acc[entry.classification] || 0) + 1;
    return acc;
  }, {});
  const highestRiskRemainingGaps = inventory
    .filter((entry) => ["uncontracted_pass_through", "unknown_or_unresolved"].includes(entry.classification))
    .map((entry) => ({
      ...entry,
      risk_score: computeActionRiskScore(entry.risk || {}),
    }))
    .sort((a, b) => b.risk_score - a.risk_score || a.action_type.localeCompare(b.action_type));

  return {
    total_actions: inventory.length,
    contracted_count: byClassification.contracted_and_validated || 0,
    uncontracted_count: (byClassification.uncontracted_pass_through || 0) + (byClassification.unknown_or_unresolved || 0),
    aliases_count: byClassification.deprecated_alias || 0,
    by_classification: {
      contracted_and_validated: byClassification.contracted_and_validated || 0,
      uncontracted_pass_through: byClassification.uncontracted_pass_through || 0,
      deprecated_alias: byClassification.deprecated_alias || 0,
      unknown_or_unresolved: byClassification.unknown_or_unresolved || 0,
    },
    highest_risk_remaining_gaps: highestRiskRemainingGaps,
    inventory,
  };
}

function validateWeeklyExecutionActionPayload(payload = {}, options = {}) {
  const errors = [];
  const allowUncontractedPassThrough = options.allowUncontractedPassThrough === true;
  const tenant = String(payload.tenant || "").trim().toLowerCase();
  const email = String(payload.email || "").trim().toLowerCase();
  const childId = String(payload.child_id || payload.childId || "").trim();
  const weekNumber = Number(payload.week_number || payload.weekNumber || 0);
  const actionResolution = resolveWeeklyExecutionActionType(payload.action_type || payload.actionType);
  const actionType = actionResolution.resolved_action_type;
  const stepKey = String(payload.step_key || payload.stepKey || "").trim();
  const note = String(payload.note || "").trim();

  if (!tenant) errors.push("tenant is required");
  if (!email) errors.push("email is required");
  if (!childId) errors.push("child_id is required");
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 36) errors.push("week_number must be an integer between 1 and 36");
  if (
    !["contracted_and_validated", "deprecated_alias"].includes(actionResolution.classification)
    && !(allowUncontractedPassThrough && actionResolution.classification === "uncontracted_pass_through")
  ) {
    errors.push("action_type is invalid");
  }

  const actionContract = ACTION_CONTRACT[actionType];
  if (actionContract?.required_fields.includes("note") && !note) errors.push("note is required");
  if (actionContract?.required_fields.includes("step_key") && !STEP_SEQUENCE.includes(stepKey)) {
    errors.push("step_key must be one of core_activity, stretch_challenge, reflection_checkin, observation_support");
  }

  return {
    ok: errors.length === 0,
    errors,
    normalized: {
      tenant,
      email,
      child_id: childId,
      week_number: weekNumber,
      action_type: actionType,
      action_type_input: actionResolution.input,
      action_classification: actionResolution.classification,
      pass_through: allowUncontractedPassThrough && actionResolution.classification === "uncontracted_pass_through",
      step_key: stepKey,
      note,
    },
  };
}

function expectedStepForIndex(state) {
  const idx = Math.max(0, Math.min(STEP_SEQUENCE.length - 1, Number(state.active_step_index || 0)));
  return STEP_SEQUENCE[idx];
}

function applyWeeklyExecutionAction({ currentState, actionType, stepKey, note, weekNumber }) {
  const state = normalizeExecutionState(currentState, weekNumber);
  const action = String(actionType || "").trim().toLowerCase();
  const result = {
    ok: true,
    state: { ...state, last_action: action },
    invalid_action: null,
    transition: `${state.week_status} -> ${state.week_status}`,
  };

  if (!WEEKLY_EXECUTION_ACTIONS.includes(action)) {
    result.ok = false;
    result.invalid_action = "invalid_action_type";
    result.state.invalid_action_count += 1;
    result.state.blocked_reason = "Unknown action type.";
    return result;
  }

  const fromStatus = result.state.week_status;
  const next = { ...result.state, blocked_reason: "" };

  if (action === "start_week") {
    if (next.week_status === "not_started") next.week_status = "in_progress";
  } else if (action === "resume_week") {
    if (["in_progress", "blocked"].includes(next.week_status)) next.week_status = "in_progress";
  } else if (action === "save_reflection") {
    next.reflection_note = String(note || "").trim().slice(0, 2000);
    next.reflection_saved = next.reflection_note.length > 0;
    if (next.week_status === "not_started") next.week_status = "in_progress";
  } else if (action === "save_observation") {
    next.observation_note = String(note || "").trim().slice(0, 2000);
    next.observation_saved = next.observation_note.length > 0;
    if (next.week_status === "not_started") next.week_status = "in_progress";
  } else if (action === "mark_step_complete") {
    const expected = expectedStepForIndex(next);
    const requested = STEP_SEQUENCE.includes(stepKey) ? stepKey : expected;
    if (requested !== expected) {
      next.week_status = "blocked";
      next.blocked_reason = `Expected ${expected} before ${requested}.`;
    } else {
      next.completed_step_keys = [...new Set([...(next.completed_step_keys || []), requested])];
      next.active_step_index = Math.min(STEP_SEQUENCE.length - 1, next.active_step_index + 1);
      if (next.week_status === "not_started" || next.week_status === "blocked") next.week_status = "in_progress";
    }
  } else if (action === "continue_to_next_step") {
    const expected = expectedStepForIndex(next);
    if (!(next.completed_step_keys || []).includes(expected)) {
      next.week_status = "blocked";
      next.blocked_reason = `Cannot continue. Complete ${expected} first.`;
    } else {
      next.active_step_index = Math.min(STEP_SEQUENCE.length - 1, next.active_step_index + 1);
      if (next.week_status === "blocked") next.week_status = "in_progress";
    }
  } else if (action === "continue_next_week") {
    if (next.week_status !== "ready_for_next_week") {
      result.ok = false;
      result.invalid_action = "progression_guard_failed";
      next.week_status = "blocked";
      next.blocked_reason = "Week is not ready to advance yet.";
    } else if (Number(weekNumber || 1) >= 36) {
      result.ok = false;
      result.invalid_action = "max_week_reached";
      next.week_status = "completed";
      next.blocked_reason = "Program is already at the final week.";
    } else {
      next.week_status = "completed";
    }
  }

  const normalizedNext = normalizeExecutionState(next, weekNumber);
  result.state = normalizedNext;
  result.transition = `${fromStatus} -> ${normalizedNext.week_status}`;
  return result;
}

module.exports = {
  WEEKLY_EXECUTION_ACTIONS,
  WEEKLY_EXECUTION_STATES,
  STEP_SEQUENCE,
  ACTION_CONTRACT,
  DEPRECATED_ACTION_ALIASES,
  UNCONTRACTED_PASS_THROUGH_ACTIONS,
  defaultExecutionState,
  normalizeExecutionState,
  resolveWeeklyExecutionActionType,
  buildWeeklyExecutionActionInventory,
  buildWeeklyExecutionCoverageReport,
  validateWeeklyExecutionActionPayload,
  applyWeeklyExecutionAction,
  isWeekCompletionEligible,
};
