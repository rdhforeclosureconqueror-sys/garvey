"use strict";

const COMPONENT_TYPES = Object.freeze([
  "RULE_BASED_REGULATION",
  "ATTENTION_MINDFULNESS",
  "CHALLENGE_SUSTAINED_FOCUS",
  "REFLECTION_COACHING",
]);

const PLANNER_COMPONENT_TYPES = Object.freeze([
  "OPENING_ROUTINE",
  "TRANSITION_ROUTINE",
  "CLOSING_ROUTINE",
  "OBSERVATION_SUPPORT",
]);

const ALL_COMPONENT_TYPES = Object.freeze([...COMPONENT_TYPES, ...PLANNER_COMPONENT_TYPES]);

const ACTIVITY_CATEGORIES = Object.freeze({
  core_activities: Object.freeze(["focus_control", "emotional_regulation", "task_initiation", "problem_solving", "working_memory", "cognitive_flexibility"]),
  stretch_activities: Object.freeze(["complexity_increase", "time_pressure", "multi_step_challenge", "distraction_resistance", "transfer_challenge"]),
  reflection: Object.freeze(["verbal_reflection", "visual_reflection", "guided_questions", "self_rating", "story_reflection"]),
  opening_routine: Object.freeze(["calm_entry", "energy_activation", "attention_reset", "routine_anchor"]),
  transition_routine: Object.freeze(["reset_refocus", "movement_transition", "countdown_transition"]),
  closing_observation: Object.freeze(["parent_observation", "child_summary", "reinforcement", "habit_anchor"]),
});

function toVariation(variation = {}) {
  return Object.freeze({
    variation_id: String(variation.variation_id || "").trim(),
    variation_level: String(variation.variation_level || "moderate").trim().toLowerCase(),
    variation_type: String(variation.variation_type || "visual").trim().toLowerCase(),
    instructions: String(variation.instructions || "").trim(),
    duration: Number(variation.duration || 0),
    materials: Array.isArray(variation.materials) ? variation.materials.map((m) => String(m || "").trim()).filter(Boolean) : [],
  });
}

function withVariations(activity, variations) {
  const available = Array.isArray(variations) ? variations.map((entry) => toVariation(entry)).filter((entry) => entry.variation_id) : [];
  return Object.freeze({
    ...activity,
    category: String(activity.category || "").trim() || "core_activities",
    subcategory: String(activity.subcategory || "").trim() || "focus_control",
    variations: Object.freeze(available),
    available_variations: Object.freeze(available),
  });
}

const LEGACY_ACTIVITY_BANK = [
  {
    activity_id: "rbr_breathe_count_01", component_type: "RULE_BASED_REGULATION", category: "core_activities", subcategory: "emotional_regulation", title: "Breathe and Count Reset", description: "Child follows a simple inhale/exhale count rule before starting tasks.", age_band: "6-9", difficulty_level: "intro", estimated_duration: 8, materials_needed: ["timer"], facilitation_instructions: "Set a 60-second timer for 4 rounds and coach child to keep count without skipping.", target_traits: ["SR", "PS"], evidence_tag: "ISL_RULE_REGULATION", enabled: true, optional_phase_restrictions: [],
  },
  {
    activity_id: "attn_body_scan_01", component_type: "ATTENTION_MINDFULNESS", category: "core_activities", subcategory: "focus_control", title: "One-Minute Body Scan", description: "Child scans body sensations and reports one calm cue.", age_band: "6-12", difficulty_level: "intro", estimated_duration: 6, materials_needed: [], facilitation_instructions: "Guide from head to toe and ask child to name one sensation and one breathing choice.", target_traits: ["SR", "CQ"], evidence_tag: "ISL_ATTENTION_MINDFULNESS", enabled: true, optional_phase_restrictions: [],
  },
  {
    activity_id: "chal_focus_ladder_01", component_type: "CHALLENGE_SUSTAINED_FOCUS", category: "stretch_activities", subcategory: "complexity_increase", title: "Focus Ladder Challenge", description: "Child completes timed challenge with increasing complexity.", age_band: "7-13", difficulty_level: "core", estimated_duration: 12, materials_needed: ["challenge sheet", "pencil"], facilitation_instructions: "Run three timed rounds and prompt strategy shift between rounds.", target_traits: ["PS", "RS", "FB"], evidence_tag: "ISL_CHALLENGE_FOCUS", enabled: true, optional_phase_restrictions: [],
  },
  {
    activity_id: "refl_coach_prompt_01", component_type: "REFLECTION_COACHING", category: "reflection", subcategory: "guided_questions", title: "Coach Debrief Prompt", description: "Parent and child discuss what worked, what was hard, and next-step plan.", age_band: "6-14", difficulty_level: "core", estimated_duration: 10, materials_needed: ["reflection card"], facilitation_instructions: "Use 3 prompts: effort, frustration recovery, and one plan for tomorrow.", target_traits: ["FB", "DE", "SR"], evidence_tag: "ISL_REFLECTION_COACHING", enabled: true, optional_phase_restrictions: [],
  },
  {
    activity_id: "rbr_focus_cue_02", component_type: "RULE_BASED_REGULATION", category: "core_activities", subcategory: "task_initiation", title: "Focus Cue Card Launch", description: "Child selects one cue card rule before beginning and keeps it visible through work.", age_band: "7-13", difficulty_level: "core", estimated_duration: 9, materials_needed: ["cue cards", "pencil"], facilitation_instructions: "Offer 3 cue cards (start, pause, reset) and have child pick one to self-monitor.", target_traits: ["SR", "DE"], evidence_tag: "ISL_RULE_REGULATION", enabled: true, optional_phase_restrictions: [],
  },
  {
    activity_id: "attn_anchor_breath_02", component_type: "ATTENTION_MINDFULNESS", category: "core_activities", subcategory: "focus_control", title: "Anchor Breath + Start Signal", description: "Child practices a two-breath anchor and names the first action aloud.", age_band: "6-14", difficulty_level: "core", estimated_duration: 7, materials_needed: [], facilitation_instructions: "Prompt two slow breaths, then ask for one sentence: 'My first step is…'.", target_traits: ["SR", "PS"], evidence_tag: "ISL_ATTENTION_MINDFULNESS", enabled: true, optional_phase_restrictions: [],
  },
  {
    activity_id: "chal_transfer_map_02", component_type: "CHALLENGE_SUSTAINED_FOCUS", category: "stretch_activities", subcategory: "transfer_challenge", title: "Transfer Map Sprint", description: "Child applies one strategy from core activity to a novel mini-task under time pressure.", age_band: "8-14", difficulty_level: "stretch", estimated_duration: 14, materials_needed: ["index cards", "timer"], facilitation_instructions: "Use one familiar strategy, one new task, and one debrief question on transfer quality.", target_traits: ["RS", "FB", "CR"], evidence_tag: "ISL_CHALLENGE_FOCUS", enabled: true, optional_phase_restrictions: [],
  },
  {
    activity_id: "chal_choice_complexity_03", component_type: "CHALLENGE_SUSTAINED_FOCUS", category: "stretch_activities", subcategory: "complexity_increase", title: "Choice + Complexity Ramp", description: "Child chooses between two challenge paths and completes the harder path in round two.", age_band: "8-16", difficulty_level: "stretch", estimated_duration: 16, materials_needed: ["challenge sheet"], facilitation_instructions: "Round one uses preferred path; round two adds complexity and requires strategy revision.", target_traits: ["PS", "DE", "FB"], evidence_tag: "ISL_CHALLENGE_FOCUS", enabled: true, optional_phase_restrictions: [],
  },
  {
    activity_id: "refl_growth_loop_02", component_type: "REFLECTION_COACHING", category: "reflection", subcategory: "guided_questions", title: "Growth Loop Reflection", description: "Parent coaches child through try, adjust, retry, and transfer prompts.", age_band: "7-16", difficulty_level: "core", estimated_duration: 11, materials_needed: ["reflection card"], facilitation_instructions: "Ask four prompts in order: attempt, adjustment, evidence, and next-context transfer.", target_traits: ["FB", "CR", "DE"], evidence_tag: "ISL_REFLECTION_COACHING", enabled: true, optional_phase_restrictions: [],
  },
  {
    activity_id: "open_intention_check_01", component_type: "OPENING_ROUTINE", category: "opening_routine", subcategory: "routine_anchor", title: "Intention Check-In", description: "Parent and child co-name one focus intention and one success signal before session start.", age_band: "6-16", difficulty_level: "intro", estimated_duration: 4, materials_needed: ["notecard"], facilitation_instructions: "Keep to two prompts: focus intention and what success will look like in this session.", target_traits: ["SR", "DE"], evidence_tag: "ISL_OPENING_ROUTINE", enabled: true, optional_phase_restrictions: [],
  },
  {
    activity_id: "trans_reset_01", component_type: "TRANSITION_ROUTINE", category: "transition_routine", subcategory: "reset_refocus", title: "90-Second Reset Transition", description: "Short transition to reset energy between segments and prevent drop-off.", age_band: "6-16", difficulty_level: "core", estimated_duration: 2, materials_needed: ["timer"], facilitation_instructions: "Stand, stretch, sip water, and restate next-step objective in one sentence.", target_traits: ["SR", "RS"], evidence_tag: "ISL_TRANSITION_ROUTINE", enabled: true, optional_phase_restrictions: [],
  },
  {
    activity_id: "close_observation_exit_01", component_type: "CLOSING_ROUTINE", category: "closing_observation", subcategory: "child_summary", title: "Observation Exit Ticket", description: "Close session with one child reflection and one parent observation/support action.", age_band: "6-16", difficulty_level: "core", estimated_duration: 5, materials_needed: ["exit ticket"], facilitation_instructions: "Capture one effort signal, one barrier, and one support move for next session.", target_traits: ["FB", "PS"], evidence_tag: "ISL_CLOSING_ROUTINE", enabled: true, optional_phase_restrictions: [],
  },
  {
    activity_id: "obs_support_track_01", component_type: "OBSERVATION_SUPPORT", category: "closing_observation", subcategory: "parent_observation", title: "Support Action Tracker", description: "Parent logs observed pattern and commits one concrete support adjustment before next session.", age_band: "6-16", difficulty_level: "core", estimated_duration: 4, materials_needed: ["support tracker"], facilitation_instructions: "Document behavior pattern, likely trigger, and one support action with timing.", target_traits: ["PS", "SR"], evidence_tag: "ISL_OBSERVATION_SUPPORT", enabled: true, optional_phase_restrictions: [],
  },
];

function defaultVariationsForActivity(activity) {
  const base = String(activity.activity_id || "activity");
  const baseMaterials = Array.isArray(activity.materials_needed) ? activity.materials_needed : [];
  return [
    {
      variation_id: `${base}_var_easy_visual`,
      variation_level: "easy",
      variation_type: "visual",
      instructions: `Use a visual cue card version of ${activity.title} with one-step prompts and parent modeling for each step.`,
      duration: Math.max(3, Number(activity.estimated_duration || 0) - 2),
      materials: baseMaterials,
    },
    {
      variation_id: `${base}_var_moderate_timed`,
      variation_level: "moderate",
      variation_type: "timed",
      instructions: `Run ${activity.title} at normal pace with short timed rounds and one verbal check-in after completion.`,
      duration: Math.max(4, Number(activity.estimated_duration || 0)),
      materials: baseMaterials,
    },
    {
      variation_id: `${base}_var_advanced_challenge`,
      variation_level: "advanced",
      variation_type: "challenge",
      instructions: `Add one adaptive challenge layer to ${activity.title} and ask the child to explain strategy shifts aloud.`,
      duration: Math.max(5, Number(activity.estimated_duration || 0) + 2),
      materials: baseMaterials,
    },
  ];
}

const SUBCATEGORY_COMPONENT_MAP = Object.freeze({
  focus_control: "ATTENTION_MINDFULNESS",
  emotional_regulation: "RULE_BASED_REGULATION",
  task_initiation: "RULE_BASED_REGULATION",
  problem_solving: "CHALLENGE_SUSTAINED_FOCUS",
  working_memory: "ATTENTION_MINDFULNESS",
  cognitive_flexibility: "CHALLENGE_SUSTAINED_FOCUS",
  complexity_increase: "CHALLENGE_SUSTAINED_FOCUS",
  time_pressure: "CHALLENGE_SUSTAINED_FOCUS",
  multi_step_challenge: "CHALLENGE_SUSTAINED_FOCUS",
  distraction_resistance: "CHALLENGE_SUSTAINED_FOCUS",
  transfer_challenge: "CHALLENGE_SUSTAINED_FOCUS",
  verbal_reflection: "REFLECTION_COACHING",
  visual_reflection: "REFLECTION_COACHING",
  guided_questions: "REFLECTION_COACHING",
  self_rating: "REFLECTION_COACHING",
  story_reflection: "REFLECTION_COACHING",
  calm_entry: "OPENING_ROUTINE",
  energy_activation: "OPENING_ROUTINE",
  attention_reset: "OPENING_ROUTINE",
  routine_anchor: "OPENING_ROUTINE",
  reset_refocus: "TRANSITION_ROUTINE",
  movement_transition: "TRANSITION_ROUTINE",
  countdown_transition: "TRANSITION_ROUTINE",
  parent_observation: "OBSERVATION_SUPPORT",
  child_summary: "CLOSING_ROUTINE",
  reinforcement: "CLOSING_ROUTINE",
  habit_anchor: "OBSERVATION_SUPPORT",
});

function generateExpandedActivities() {
  const generated = [];
  for (const [category, subcategories] of Object.entries(ACTIVITY_CATEGORIES)) {
    for (const subcategory of subcategories) {
      const component = SUBCATEGORY_COMPONENT_MAP[subcategory] || "REFLECTION_COACHING";
      for (let idx = 1; idx <= 5; idx += 1) {
        const id = `zz_${subcategory}_${String(idx).padStart(2, "0")}`;
        const title = `${subcategory.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ")} Practice ${idx}`;
        const activity = {
          activity_id: id,
          component_type: component,
          category,
          subcategory,
          title,
          description: `Parent-guided ${subcategory.replace(/_/g, " ")} routine with child choice points to maintain engagement and repeatability.`,
          age_band: "6-16",
          difficulty_level: idx <= 2 ? "intro" : idx === 3 ? "core" : "stretch",
          estimated_duration: 5 + idx,
          materials_needed: idx % 2 === 0 ? ["timer", "notecard"] : ["notecard"],
          facilitation_instructions: `Use clear start cue, run the ${title.toLowerCase()} flow, and close with one evidence-based reflection question.`,
          target_traits: component === "REFLECTION_COACHING" ? ["FB", "DE"] : component === "CHALLENGE_SUSTAINED_FOCUS" ? ["PS", "RS"] : ["SR", "PS"],
          evidence_tag: `ISL_${component}`,
          enabled: true,
          optional_phase_restrictions: [],
        };
        generated.push(withVariations(activity, defaultVariationsForActivity(activity).slice(0, 2)));
      }
    }
  }
  return generated;
}

const ACTIVITY_BANK = Object.freeze([
  ...LEGACY_ACTIVITY_BANK.map((activity) => withVariations(activity, defaultVariationsForActivity(activity))),
  ...generateExpandedActivities(),
]);

function validateActivity(activity = {}) {
  const errors = [];
  const required = [
    "activity_id", "component_type", "title", "description", "age_band", "difficulty_level", "estimated_duration", "materials_needed", "facilitation_instructions", "target_traits", "evidence_tag", "enabled", "optional_phase_restrictions", "category", "subcategory", "variations",
  ];
  for (const field of required) {
    if (activity[field] === undefined || activity[field] === null) errors.push(`missing_${field}`);
  }
  if (!ALL_COMPONENT_TYPES.includes(String(activity.component_type || ""))) errors.push("component_type_invalid");
  if (!Array.isArray(activity.target_traits)) errors.push("target_traits_array_required");
  if (!Array.isArray(activity.materials_needed)) errors.push("materials_needed_array_required");
  if (!Array.isArray(activity.optional_phase_restrictions)) errors.push("optional_phase_restrictions_array_required");
  if (!Number.isFinite(Number(activity.estimated_duration)) || Number(activity.estimated_duration) <= 0) errors.push("estimated_duration_invalid");
  if (!Array.isArray(activity.variations) || activity.variations.length < 2) errors.push("variations_minimum_not_met");
  for (const variation of Array.isArray(activity.variations) ? activity.variations : []) {
    if (!variation.variation_id) errors.push("variation_id_required");
    if (!variation.instructions) errors.push("variation_instructions_required");
    if (!Number.isFinite(Number(variation.duration)) || Number(variation.duration) <= 0) errors.push("variation_duration_invalid");
  }
  return { ok: errors.length === 0, errors };
}

function listActivitiesByComponent(componentType) {
  const normalized = String(componentType || "").trim();
  const filtered = ACTIVITY_BANK
    .filter((activity) => activity.component_type === normalized && activity.enabled !== false)
    .sort((a, b) => String(a.activity_id).localeCompare(String(b.activity_id)));
  return {
    ok: ALL_COMPONENT_TYPES.includes(normalized),
    component_type: normalized,
    activities: filtered,
    required_components: COMPONENT_TYPES,
    planner_components: PLANNER_COMPONENT_TYPES,
    categories: ACTIVITY_CATEGORIES,
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
  PLANNER_COMPONENT_TYPES,
  ALL_COMPONENT_TYPES,
  ACTIVITY_CATEGORIES,
  ACTIVITY_BANK,
  validateActivity,
  listActivitiesByComponent,
  getComponentTypeByActivityId,
};
