"use strict";

const COMPONENT_TYPES = Object.freeze([
  "RULE_BASED_REGULATION",
  "ATTENTION_MINDFULNESS",
  "CHALLENGE_SUSTAINED_FOCUS",
  "REFLECTION_COACHING",
]);

const ACTIVITY_BANK = Object.freeze([
  Object.freeze({
    activity_id: "rbr_breathe_count_01",
    component_type: "RULE_BASED_REGULATION",
    title: "Breathe and Count Reset",
    description: "Child follows a simple inhale/exhale count rule before starting tasks.",
    age_band: "6-9",
    difficulty_level: "intro",
    estimated_duration: 8,
    materials_needed: ["timer"],
    facilitation_instructions: "Set a 60-second timer for 4 rounds and coach child to keep count without skipping.",
    target_traits: ["SR", "PS"],
    evidence_tag: "ISL_RULE_REGULATION",
    enabled: true,
    optional_phase_restrictions: [],
  }),
  Object.freeze({
    activity_id: "attn_body_scan_01",
    component_type: "ATTENTION_MINDFULNESS",
    title: "One-Minute Body Scan",
    description: "Child scans body sensations and reports one calm cue.",
    age_band: "6-12",
    difficulty_level: "intro",
    estimated_duration: 6,
    materials_needed: [],
    facilitation_instructions: "Guide from head to toe and ask child to name one sensation and one breathing choice.",
    target_traits: ["SR", "CQ"],
    evidence_tag: "ISL_ATTENTION_MINDFULNESS",
    enabled: true,
    optional_phase_restrictions: [],
  }),
  Object.freeze({
    activity_id: "chal_focus_ladder_01",
    component_type: "CHALLENGE_SUSTAINED_FOCUS",
    title: "Focus Ladder Challenge",
    description: "Child completes timed challenge with increasing complexity.",
    age_band: "7-13",
    difficulty_level: "core",
    estimated_duration: 12,
    materials_needed: ["challenge sheet", "pencil"],
    facilitation_instructions: "Run three timed rounds and prompt strategy shift between rounds.",
    target_traits: ["PS", "RS", "FB"],
    evidence_tag: "ISL_CHALLENGE_FOCUS",
    enabled: true,
    optional_phase_restrictions: [],
  }),
  Object.freeze({
    activity_id: "refl_coach_prompt_01",
    component_type: "REFLECTION_COACHING",
    title: "Coach Debrief Prompt",
    description: "Parent and child discuss what worked, what was hard, and next-step plan.",
    age_band: "6-14",
    difficulty_level: "core",
    estimated_duration: 10,
    materials_needed: ["reflection card"],
    facilitation_instructions: "Use 3 prompts: effort, frustration recovery, and one plan for tomorrow.",
    target_traits: ["FB", "DE", "SR"],
    evidence_tag: "ISL_REFLECTION_COACHING",
    enabled: true,
    optional_phase_restrictions: [],
  }),
]);

function validateActivity(activity = {}) {
  const errors = [];
  const required = [
    "activity_id",
    "component_type",
    "title",
    "description",
    "age_band",
    "difficulty_level",
    "estimated_duration",
    "materials_needed",
    "facilitation_instructions",
    "target_traits",
    "evidence_tag",
    "enabled",
    "optional_phase_restrictions",
  ];
  for (const field of required) {
    if (activity[field] === undefined || activity[field] === null) errors.push(`missing_${field}`);
  }
  if (!COMPONENT_TYPES.includes(String(activity.component_type || ""))) errors.push("component_type_invalid");
  if (!Array.isArray(activity.target_traits)) errors.push("target_traits_array_required");
  if (!Array.isArray(activity.materials_needed)) errors.push("materials_needed_array_required");
  if (!Array.isArray(activity.optional_phase_restrictions)) errors.push("optional_phase_restrictions_array_required");
  if (!Number.isFinite(Number(activity.estimated_duration)) || Number(activity.estimated_duration) <= 0) errors.push("estimated_duration_invalid");
  return { ok: errors.length === 0, errors };
}

function listActivitiesByComponent(componentType) {
  const normalized = String(componentType || "").trim();
  const filtered = ACTIVITY_BANK.filter((activity) => activity.component_type === normalized && activity.enabled !== false);
  return {
    ok: COMPONENT_TYPES.includes(normalized),
    component_type: normalized,
    activities: filtered,
    required_components: COMPONENT_TYPES,
    deterministic: true,
  };
}

function getComponentTypeByActivityId(activityId) {
  const target = String(activityId || "").trim();
  if (!target) return null;
  const match = ACTIVITY_BANK.find((activity) => activity.activity_id === target && activity.enabled !== false);
  return match ? match.component_type : null;
}

module.exports = {
  COMPONENT_TYPES,
  ACTIVITY_BANK,
  validateActivity,
  listActivitiesByComponent,
  getComponentTypeByActivityId,
};
