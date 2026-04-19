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

function validateWeeklyExecutionActionPayload(payload = {}) {
  const errors = [];
  const tenant = String(payload.tenant || "").trim().toLowerCase();
  const email = String(payload.email || "").trim().toLowerCase();
  const childId = String(payload.child_id || payload.childId || "").trim();
  const weekNumber = Number(payload.week_number || payload.weekNumber || 0);
  const actionType = String(payload.action_type || payload.actionType || "").trim().toLowerCase();
  const stepKey = String(payload.step_key || payload.stepKey || "").trim();
  const note = String(payload.note || "").trim();

  if (!tenant) errors.push("tenant is required");
  if (!email) errors.push("email is required");
  if (!childId) errors.push("child_id is required");
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 36) errors.push("week_number must be an integer between 1 and 36");
  if (!WEEKLY_EXECUTION_ACTIONS.includes(actionType)) errors.push("action_type is invalid");

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
  defaultExecutionState,
  normalizeExecutionState,
  validateWeeklyExecutionActionPayload,
  applyWeeklyExecutionAction,
  isWeekCompletionEligible,
};
