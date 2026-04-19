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
  Object.freeze({
    activity_id: "rbr_focus_cue_02",
    component_type: "RULE_BASED_REGULATION",
    title: "Focus Cue Card Launch",
    description: "Child selects one cue card rule before beginning and keeps it visible through work.",
    age_band: "7-13",
    difficulty_level: "core",
    estimated_duration: 9,
    materials_needed: ["cue cards", "pencil"],
    facilitation_instructions: "Offer 3 cue cards (start, pause, reset) and have child pick one to self-monitor.",
    target_traits: ["SR", "DE"],
    evidence_tag: "ISL_RULE_REGULATION",
    enabled: true,
    optional_phase_restrictions: [],
  }),
  Object.freeze({
    activity_id: "attn_anchor_breath_02",
    component_type: "ATTENTION_MINDFULNESS",
    title: "Anchor Breath + Start Signal",
    description: "Child practices a two-breath anchor and names the first action aloud.",
    age_band: "6-14",
    difficulty_level: "core",
    estimated_duration: 7,
    materials_needed: [],
    facilitation_instructions: "Prompt two slow breaths, then ask for one sentence: 'My first step is…'.",
    target_traits: ["SR", "PS"],
    evidence_tag: "ISL_ATTENTION_MINDFULNESS",
    enabled: true,
    optional_phase_restrictions: [],
  }),
  Object.freeze({
    activity_id: "chal_transfer_map_02",
    component_type: "CHALLENGE_SUSTAINED_FOCUS",
    title: "Transfer Map Sprint",
    description: "Child applies one strategy from core activity to a novel mini-task under time pressure.",
    age_band: "8-14",
    difficulty_level: "stretch",
    estimated_duration: 14,
    materials_needed: ["index cards", "timer"],
    facilitation_instructions: "Use one familiar strategy, one new task, and one debrief question on transfer quality.",
    target_traits: ["RS", "FB", "CR"],
    evidence_tag: "ISL_CHALLENGE_FOCUS",
    enabled: true,
    optional_phase_restrictions: [],
  }),
  Object.freeze({
    activity_id: "chal_choice_complexity_03",
    component_type: "CHALLENGE_SUSTAINED_FOCUS",
    title: "Choice + Complexity Ramp",
    description: "Child chooses between two challenge paths and completes the harder path in round two.",
    age_band: "8-16",
    difficulty_level: "stretch",
    estimated_duration: 16,
    materials_needed: ["challenge sheet"],
    facilitation_instructions: "Round one uses preferred path; round two adds complexity and requires strategy revision.",
    target_traits: ["PS", "DE", "FB"],
    evidence_tag: "ISL_CHALLENGE_FOCUS",
    enabled: true,
    optional_phase_restrictions: [],
  }),
  Object.freeze({
    activity_id: "refl_growth_loop_02",
    component_type: "REFLECTION_COACHING",
    title: "Growth Loop Reflection",
    description: "Parent coaches child through try, adjust, retry, and transfer prompts.",
    age_band: "7-16",
    difficulty_level: "core",
    estimated_duration: 11,
    materials_needed: ["reflection card"],
    facilitation_instructions: "Ask four prompts in order: attempt, adjustment, evidence, and next-context transfer.",
    target_traits: ["FB", "CR", "DE"],
    evidence_tag: "ISL_REFLECTION_COACHING",
    enabled: true,
    optional_phase_restrictions: [],
  }),
  Object.freeze({
    activity_id: "open_intention_check_01",
    component_type: "OPENING_ROUTINE",
    title: "Intention Check-In",
    description: "Parent and child co-name one focus intention and one success signal before session start.",
    age_band: "6-16",
    difficulty_level: "intro",
    estimated_duration: 4,
    materials_needed: ["notecard"],
    facilitation_instructions: "Keep to two prompts: focus intention and what success will look like in this session.",
    target_traits: ["SR", "DE"],
    evidence_tag: "ISL_OPENING_ROUTINE",
    enabled: true,
    optional_phase_restrictions: [],
  }),
  Object.freeze({
    activity_id: "trans_reset_01",
    component_type: "TRANSITION_ROUTINE",
    title: "90-Second Reset Transition",
    description: "Short transition to reset energy between segments and prevent drop-off.",
    age_band: "6-16",
    difficulty_level: "core",
    estimated_duration: 2,
    materials_needed: ["timer"],
    facilitation_instructions: "Stand, stretch, sip water, and restate next-step objective in one sentence.",
    target_traits: ["SR", "RS"],
    evidence_tag: "ISL_TRANSITION_ROUTINE",
    enabled: true,
    optional_phase_restrictions: [],
  }),
  Object.freeze({
    activity_id: "close_observation_exit_01",
    component_type: "CLOSING_ROUTINE",
    title: "Observation Exit Ticket",
    description: "Close session with one child reflection and one parent observation/support action.",
    age_band: "6-16",
    difficulty_level: "core",
    estimated_duration: 5,
    materials_needed: ["exit ticket"],
    facilitation_instructions: "Capture one effort signal, one barrier, and one support move for next session.",
    target_traits: ["FB", "PS"],
    evidence_tag: "ISL_CLOSING_ROUTINE",
    enabled: true,
    optional_phase_restrictions: [],
  }),
  Object.freeze({
    activity_id: "obs_support_track_01",
    component_type: "OBSERVATION_SUPPORT",
    title: "Support Action Tracker",
    description: "Parent logs observed pattern and commits one concrete support adjustment before next session.",
    age_band: "6-16",
    difficulty_level: "core",
    estimated_duration: 4,
    materials_needed: ["support tracker"],
    facilitation_instructions: "Document behavior pattern, likely trigger, and one support action with timing.",
    target_traits: ["PS", "SR"],
    evidence_tag: "ISL_OBSERVATION_SUPPORT",
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
  if (!ALL_COMPONENT_TYPES.includes(String(activity.component_type || ""))) errors.push("component_type_invalid");
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
    ok: ALL_COMPONENT_TYPES.includes(normalized),
    component_type: normalized,
    activities: filtered,
    required_components: COMPONENT_TYPES,
    planner_components: PLANNER_COMPONENT_TYPES,
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
  ACTIVITY_BANK,
  validateActivity,
  listActivitiesByComponent,
  getComponentTypeByActivityId,
};
