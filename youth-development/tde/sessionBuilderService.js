"use strict";

const { deterministicId } = require("./constants");
const { COMPONENT_TYPES, ACTIVITY_BANK, validateActivity } = require("./activityBankService");

const DIFFICULTY_LEVELS = Object.freeze(["easy", "moderate", "challenging"]);
const SESSION_LENGTHS = Object.freeze([15, 30, 45]);
const ENERGY_TYPES = Object.freeze(["calm", "balanced", "high-energy"]);
const WEEKLY_FREQUENCIES = Object.freeze([2, 3, 5]);

function activityAllowedForPhase(activity, phaseNumber) {
  if (!Array.isArray(activity.optional_phase_restrictions) || activity.optional_phase_restrictions.length === 0) return true;
  return activity.optional_phase_restrictions.map((entry) => Number(entry)).includes(Number(phaseNumber));
}

function normalizeParentCustomization(payload = {}) {
  const source = payload.parent_customization || payload.commitment_plan?.parent_customization || payload.commitment_preferences || {};
  const difficulty = String(source.difficulty_level || payload.difficulty_level || "moderate").trim().toLowerCase();
  const sessionLength = Number(source.session_length || payload.session_length || payload.target_session_length || 30);
  const energyType = String(source.energy_type || payload.energy_type || "balanced").trim().toLowerCase();
  const weeklyFrequencyRaw = String(source.weekly_frequency || payload.weekly_frequency || "3x").trim().toLowerCase();
  const frequency = Number(weeklyFrequencyRaw.replace(/x/g, ""));

  return {
    difficulty_level: DIFFICULTY_LEVELS.includes(difficulty) ? difficulty : "moderate",
    session_length: SESSION_LENGTHS.includes(sessionLength) ? sessionLength : 30,
    energy_type: ENERGY_TYPES.includes(energyType) ? energyType : "balanced",
    weekly_frequency: WEEKLY_FREQUENCIES.includes(frequency) ? `${frequency}x` : "3x",
  };
}

function scoreActivityForCustomization(activity, customization) {
  const difficultyMap = { intro: "easy", core: "moderate", stretch: "challenging" };
  const targetDifficulty = difficultyMap[String(activity.difficulty_level || "core")] || "moderate";
  const difficultyScore = targetDifficulty === customization.difficulty_level ? 0 : 1;
  const durationScore = Math.abs(Number(activity.estimated_duration || 0) - Math.max(5, Math.round(customization.session_length / 4)));
  const energyScore = customization.energy_type === "high-energy" && activity.component_type === "CHALLENGE_SUSTAINED_FOCUS" ? -1 : 0;
  const calmScore = customization.energy_type === "calm" && activity.component_type === "ATTENTION_MINDFULNESS" ? -1 : 0;
  return difficultyScore * 100 + durationScore + energyScore + calmScore;
}

function pickVariation(activity, customization) {
  const variations = Array.isArray(activity?.variations) ? [...activity.variations] : [];
  if (!variations.length) return null;
  const preferredType = customization.energy_type === "high-energy" ? "movement" : customization.energy_type === "calm" ? "simplified" : "timed";
  const preferredLevel = customization.difficulty_level === "challenging" ? "advanced" : customization.difficulty_level;
  const sorted = variations.sort((a, b) => {
    const aScore = (a.variation_level === preferredLevel ? -2 : 0) + (a.variation_type === preferredType ? -1 : 0) + String(a.variation_id).localeCompare(String(b.variation_id));
    const bScore = (b.variation_level === preferredLevel ? -2 : 0) + (b.variation_type === preferredType ? -1 : 0);
    return aScore - bScore;
  });
  return sorted[0] || null;
}

function pickActivityGroup(componentType, context = {}, customization = normalizeParentCustomization()) {
  const phaseNumber = Number(context.phase_number || 0) || 0;
  const options = ACTIVITY_BANK
    .filter((activity) => activity.component_type === componentType)
    .filter((activity) => activity.enabled !== false)
    .filter((activity) => activityAllowedForPhase(activity, phaseNumber))
    .filter((activity) => validateActivity(activity).ok)
    .sort((a, b) => {
      const delta = scoreActivityForCustomization(a, customization) - scoreActivityForCustomization(b, customization);
      if (delta !== 0) return delta;
      return String(a.activity_id).localeCompare(String(b.activity_id));
    });

  if (!options.length) return null;
  return {
    selected_activity: options[0],
    available_alternatives: options.slice(1, 4),
  };
}

function buildSessionAdaptationHooks(payload = {}) {
  const modifiers = payload?.personalization_modifiers?.session_planning_modifiers || payload?.session_adaptation_hooks || null;
  if (!modifiers || typeof modifiers !== "object") {
    return {
      hooks_applied: false,
      adaptation: {
        preferred_challenge_level: "moderate",
        reflection_prompt_count: 1,
        deterministic_activity_bias: "core_sequence",
      },
      trace: {
        rule_path: "session_builder/adaptation_hooks/default/v1",
      },
    };
  }

  return {
    hooks_applied: true,
    adaptation: {
      preferred_challenge_level: String(modifiers.preferred_challenge_level || "moderate"),
      reflection_prompt_count: Number(modifiers.reflection_prompt_count || 1),
      deterministic_activity_bias: String(modifiers.deterministic_activity_bias || "core_sequence"),
    },
    trace: {
      rule_path: String(modifiers.rule_path || "session_builder/adaptation_hooks/personalized/v1"),
    },
  };
}

function buildSessionPlan(payload = {}) {
  const childId = String(payload.child_id || "").trim();
  const facilitatorRole = String(payload.facilitator_role || "parent").trim();
  const phaseNumber = Number(payload.phase_number || 1);
  const sessionDate = String(payload.session_date || new Date().toISOString().slice(0, 10));

  if (!childId) {
    return { ok: false, error: "child_id_required", deterministic: true };
  }

  const parentCustomization = normalizeParentCustomization(payload);
  const grouped = COMPONENT_TYPES.map((componentType) => ({ componentType, selection: pickActivityGroup(componentType, { phase_number: phaseNumber }, parentCustomization) }));

  if (grouped.some((entry) => !entry.selection?.selected_activity)) {
    return {
      ok: false,
      error: "activity_bank_missing_required_component",
      missing_components: grouped.filter((entry) => !entry.selection?.selected_activity).map((entry) => entry.componentType),
      deterministic: true,
    };
  }

  const selected = grouped.map((entry) => entry.selection.selected_activity);
  const selectedVariations = selected.map((activity) => pickVariation(activity, parentCustomization));

  const sessionId = deterministicId("session_plan", {
    child_id: childId,
    session_date: sessionDate,
    phase_number: phaseNumber,
    selected_activity_ids: selected.map((entry) => entry.activity_id),
    selected_variation_ids: selectedVariations.map((entry) => entry?.variation_id || null),
    parent_customization: parentCustomization,
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
      selected_variations: selectedVariations,
      selected_variation_ids: selectedVariations.map((entry) => entry?.variation_id || null),
      component_choices: Object.fromEntries(grouped.map((entry) => [entry.componentType, {
        selected_activity: entry.selection.selected_activity,
        available_alternatives: entry.selection.available_alternatives,
      }])),
      component_count: selected.length,
      parent_customization: parentCustomization,
      adaptation_hooks: buildSessionAdaptationHooks(payload),
      deterministic: true,
      extension_only: true,
    },
  };
}

module.exports = {
  DIFFICULTY_LEVELS,
  SESSION_LENGTHS,
  ENERGY_TYPES,
  WEEKLY_FREQUENCIES,
  buildSessionPlan,
  buildSessionAdaptationHooks,
  normalizeParentCustomization,
};
