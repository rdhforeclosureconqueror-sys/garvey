"use strict";

const { deterministicId } = require("./constants");
const { COMPONENT_TYPES, ACTIVITY_BANK, validateActivity } = require("./activityBankService");

function activityAllowedForPhase(activity, phaseNumber) {
  if (!Array.isArray(activity.optional_phase_restrictions) || activity.optional_phase_restrictions.length === 0) return true;
  return activity.optional_phase_restrictions.map((entry) => Number(entry)).includes(Number(phaseNumber));
}

function pickActivity(componentType, context = {}) {
  const phaseNumber = Number(context.phase_number || 0) || 0;
  const options = ACTIVITY_BANK
    .filter((activity) => activity.component_type === componentType)
    .filter((activity) => activity.enabled !== false)
    .filter((activity) => activityAllowedForPhase(activity, phaseNumber))
    .filter((activity) => validateActivity(activity).ok)
    .sort((a, b) => String(a.activity_id).localeCompare(String(b.activity_id)));

  if (!options.length) return null;
  return options[0];
}

function buildSessionPlan(payload = {}) {
  const childId = String(payload.child_id || "").trim();
  const facilitatorRole = String(payload.facilitator_role || "parent").trim();
  const phaseNumber = Number(payload.phase_number || 1);
  const sessionDate = String(payload.session_date || new Date().toISOString().slice(0, 10));

  if (!childId) {
    return { ok: false, error: "child_id_required", deterministic: true };
  }

  const selected = COMPONENT_TYPES.map((componentType) => pickActivity(componentType, { phase_number: phaseNumber }));
  if (selected.some((entry) => !entry)) {
    return {
      ok: false,
      error: "activity_bank_missing_required_component",
      missing_components: COMPONENT_TYPES.filter((_component, index) => !selected[index]),
      deterministic: true,
    };
  }

  const sessionId = deterministicId("session_plan", {
    child_id: childId,
    session_date: sessionDate,
    phase_number: phaseNumber,
    selected_activity_ids: selected.map((entry) => entry.activity_id),
  });

  return {
    ok: true,
    session_plan: {
      session_id: sessionId,
      child_id: childId,
      phase_number: phaseNumber,
      session_date: sessionDate,
      facilitator_role: facilitatorRole,
      required_components: COMPONENT_TYPES,
      selected_activities: selected,
      selected_activity_ids: selected.map((entry) => entry.activity_id),
      component_count: selected.length,
      deterministic: true,
      extension_only: true,
    },
  };
}

module.exports = {
  buildSessionPlan,
};
