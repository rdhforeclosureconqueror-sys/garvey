"use strict";

const { PROGRAM_WEEKS } = require("../tde/programRail");

const STEP_SEQUENCE = Object.freeze([
  Object.freeze({ step_key: "core_activity", label: "Core Activity", completion_rule: "parent_marks_complete" }),
  Object.freeze({ step_key: "stretch_challenge", label: "Stretch Challenge", completion_rule: "parent_marks_complete" }),
  Object.freeze({ step_key: "reflection_checkin", label: "Reflection Check-In", completion_rule: "parent_marks_complete" }),
  Object.freeze({ step_key: "observation_support", label: "Observation + Support", completion_rule: "parent_marks_complete" }),
]);

const PHASE_CONTENT = Object.freeze({
  1: Object.freeze({
    title_prefix: "Foundation Routine",
    objective_template: "Establish a stable session rhythm and visible effort-to-adjustment habits.",
    week_purpose: "Build reliable parent-led routines so your child can start, persist, and adjust with support.",
    parent_guidance: Object.freeze([
      "Use the same day/time for at least two sessions this week.",
      "Name one trait target before each session and one effort signal after.",
      "Keep feedback specific: what was tried, what changed, and what improved.",
    ]),
    reflection_prompt: "What helped your child improve between attempts this week?",
    observation_prompt: "What support did your child need most, and when did they work more independently?",
  }),
  2: Object.freeze({
    title_prefix: "Expansion Transfer",
    objective_template: "Increase challenge and transfer skills across more than one context.",
    week_purpose: "Stretch routines into new contexts while preserving consistency and confidence.",
    parent_guidance: Object.freeze([
      "Keep one familiar core routine while adding one new challenge condition.",
      "Ask your child to explain why their strategy should work in a second context.",
      "Capture one observation about transfer success and one about needed support.",
    ]),
    reflection_prompt: "Where did your child transfer a strategy to a new context this week?",
    observation_prompt: "Which context showed stronger independence, and what support made the difference?",
  }),
  3: Object.freeze({
    title_prefix: "Leadership Autonomy",
    objective_template: "Support child-led planning, reflection, and next-step ownership.",
    week_purpose: "Shift toward autonomy while keeping parent scaffolding visible and intentional.",
    parent_guidance: Object.freeze([
      "Invite your child to choose one part of the session plan before starting.",
      "Use reflective prompts before giving direct solutions.",
      "Track how well your child plans next steps without prompting.",
    ]),
    reflection_prompt: "How did your child lead planning or revision decisions this week?",
    observation_prompt: "When did your child self-correct without prompting, and what scaffolding still mattered?",
  }),
});

function getPhaseContent(phaseNumber) {
  return PHASE_CONTENT[Number(phaseNumber)] || PHASE_CONTENT[1];
}

function getAuthoredWeekContent(weekNumber) {
  const week = PROGRAM_WEEKS.find((entry) => Number(entry.week_number) === Number(weekNumber));
  if (!week) return null;
  const phaseContent = getPhaseContent(week.phase_number);
  return {
    week_number: week.week_number,
    title: `Week ${week.week_number} · ${phaseContent.title_prefix}`,
    objective: phaseContent.objective_template,
    week_purpose: phaseContent.week_purpose,
    parent_guidance: phaseContent.parent_guidance,
    reflection_prompt: phaseContent.reflection_prompt,
    observation_prompt: phaseContent.observation_prompt,
    step_sequence: STEP_SEQUENCE,
    source_trace: {
      title: "authored_phase_content",
      objective: "authored_phase_content",
      week_purpose: "authored_phase_content",
      parent_guidance: "authored_phase_content",
      reflection_prompt: "authored_phase_content",
      observation_prompt: "authored_phase_content",
      step_sequence: "structured_rail_definition",
    },
  };
}

function auditWeeklyContentSources() {
  const authoredFields = ["title", "objective", "week_purpose", "parent_guidance", "reflection_prompt", "observation_prompt"];
  const structuralFields = ["phase_week_context", "progress_labels", "roadmap_labels", "step_status_labels"];
  return {
    ok: true,
    audited_at: "2026-04-19",
    sources: {
      authored_phase_content: "youth-development/content/weeklyProgramContent.js",
      program_weeks_rail: "youth-development/tde/programRail.js",
      activity_bank: "youth-development/tde/activityBankService.js",
      parent_reflection_bank: "youth-development/content/assessmentContentBanks.js",
    },
    classifications: {
      authored_valid_content: authoredFields,
      structural_label_only: structuralFields,
      placeholder_demo_filler_content: [],
      generated_but_not_bank_governed: [],
      unclear_origin: [],
    },
  };
}

module.exports = {
  STEP_SEQUENCE,
  getAuthoredWeekContent,
  auditWeeklyContentSources,
};
