"use strict";

// Grade 5 pilot: an activity offers a chance to practice a Genius dimension;
// it does NOT prove that the child possesses it. Evidence needs an observed act.
// Keep academic correctness, child self-report and adult observation distinct.
const { GENIUS_DIMENSIONS } = require("./curriculumGeniusMap");
const VALID_CODES = Object.freeze(Object.keys(GENIUS_DIMENSIONS));

// Each entry is a real Grade 5 Skill World package ID. Additional IDs remain
// unmapped until their prompts and event instrumentation are reviewed.
const LESSONS = Object.freeze({
  G5M_FR_001: Object.freeze({
    academic_skill: "Add and subtract fractions with unlike denominators",
    opportunities: ["RS", "SR", "FB"],
    activation: Object.freeze([
      { id: "compare_methods", prompt: "Can you show a second way and tell when each way works?", codes: ["RS", "CR"] },
      { id: "test_pattern", prompt: "What stayed the same when the fractions changed? Test your idea.", codes: ["RS", "CQ"] },
      { id: "explain_example", prompt: "Explain why a step in the example works, then try a fresh problem.", codes: ["FB", "RS"] },
    ]),
  }),
  G5M_OA_001: Object.freeze({
    academic_skill: "Expressions, patterns and coordinate reasoning",
    opportunities: ["RS", "SR"],
    activation: Object.freeze([
      { id: "test_pattern", prompt: "What rule do you notice? Try to find when it would not work.", codes: ["RS", "CQ"] },
      { id: "compare_methods", prompt: "Can you represent the same rule in a different way?", codes: ["RS", "CR"] },
    ]),
  }),
  G5M_GM_001: Object.freeze({
    academic_skill: "Grade 5 geometry",
    opportunities: ["RS", "SR"],
    activation: Object.freeze([
      { id: "design_application", prompt: "Can you use this geometry to sketch part of a project you care about?", codes: ["CR", "DE", "RS"] },
    ]),
  }),
  G5E_RC_001: Object.freeze({
    academic_skill: "Grade 5 reading comprehension",
    opportunities: ["RS", "SR", "FB"],
    activation: Object.freeze([
      { id: "ask_why", prompt: "What unanswered question would you investigate after reading?", codes: ["CQ", "RS"] },
      { id: "explain_example", prompt: "Which detail supports your explanation? Revise it if new evidence changes your mind.", codes: ["FB", "RS"] },
    ]),
  }),
  G5E_WR_001: Object.freeze({
    academic_skill: "Opinion writing with reasons and evidence",
    opportunities: ["RS", "SR", "FB"],
    activation: Object.freeze([
      { id: "design_application", prompt: "Choose a real issue you care about and write to an audience who could help.", codes: ["DE", "CR", "RS"] },
      { id: "revise_after_feedback", prompt: "Use one specific suggestion to improve your next draft.", codes: ["FB", "PS"] },
    ]),
  }),
  G5E_VOC_001: Object.freeze({
    academic_skill: "Grade 5 vocabulary",
    opportunities: ["RS", "SR"],
    activation: Object.freeze([
      { id: "ask_why", prompt: "Where else have you seen this word or idea? Find a new example.", codes: ["CQ", "RS"] },
    ]),
  }),
});

function getGeniusLesson(skillId) {
  return Object.prototype.hasOwnProperty.call(LESSONS, skillId) ? LESSONS[skillId] : null;
}

// Validated response types: no inference from screen time, generic retries,
// raw correctness, or number of clicks. Caller must actually capture this
// behavior, and must not fabricate event records for unanswered prompts.
const SIGNAL_CODES = Object.freeze({
  compared_methods_with_reason: ["RS", "CR"],
  tested_pattern_on_new_item: ["RS", "CQ"],
  explained_worked_step: ["FB", "RS"],
  asked_followup_and_investigated: ["CQ"],
  generated_alternative_solution: ["CR"],
  independently_planned_steps: ["SR"],
  revised_strategy_after_error: ["PS", "FB"],
  applied_feedback_to_fresh_item: ["FB"],
  linked_skill_to_chosen_project: ["DE", "CR"],
});

function evaluateGeniusEvidence({ skill_id, activation_id, signal, source = "student_work", observed = false, evidence_id = null, difficulty = null, content_version = null } = {}) {
  const lesson = getGeniusLesson(skill_id);
  if (!lesson || !observed || !evidence_id || !Object.prototype.hasOwnProperty.call(SIGNAL_CODES, signal)) return null;
  if (!["student_work", "child_reflection", "parent_observation"].includes(source)) return null;
  const activation = lesson.activation.find((entry) => entry.id === activation_id);
  if (!activation) return null;
  const dimension_codes = SIGNAL_CODES[signal].filter((code) => activation.codes.includes(code));
  if (!dimension_codes.length || !dimension_codes.every((code) => VALID_CODES.includes(code))) return null;
  return {
    schema_version: "genius-evidence.v1",
    skill_id, activation_id, signal, evidence_id, source,
    dimension_codes,
    combination_observed: dimension_codes.length > 1,
    difficulty, content_version,
    // Evidence is an observation, NOT a numerical trait score.
    interpretation: "observed_in_this_activity",
  };
}

module.exports = { LESSONS, SIGNAL_CODES, getGeniusLesson, evaluateGeniusEvidence };
