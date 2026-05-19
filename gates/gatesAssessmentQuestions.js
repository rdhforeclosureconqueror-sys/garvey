"use strict";

const GATES_ASSESSMENT_VERSION = "gates_parent_observation_v1";
const GATES_ASSESSMENT_TITLE = "Child Genius / Developmental Observation";
const GATES_ASSESSMENT_INSTRUCTIONS = "Answer based on what you observe most often, not on one exceptional day.";
const GATES_ASSESSMENT_DISCLAIMER = "This observation tool is non-diagnostic and is intended for family reflection only. It does not provide medical, psychological, or clinical conclusions.";

const GATES = Object.freeze([
  { gate_number: 1, gate_key: "attention", name: "Attention" },
  { gate_number: 2, gate_key: "emotion", name: "Emotion" },
  { gate_number: 3, gate_key: "choice", name: "Choice" },
  { gate_number: 4, gate_key: "body", name: "Body" },
  { gate_number: 5, gate_key: "discipline", name: "Discipline" },
  { gate_number: 6, gate_key: "truth", name: "Truth" },
  { gate_number: 7, gate_key: "repair", name: "Repair" },
  { gate_number: 8, gate_key: "creation", name: "Creation" },
  { gate_number: 9, gate_key: "community", name: "Community" },
  { gate_number: 10, gate_key: "legacy", name: "Legacy" },
]);

const OPTIONS = Object.freeze([
  { option_id: "rarely", label: "Rarely", future_weight_hint: 1 },
  { option_id: "sometimes", label: "Sometimes", future_weight_hint: 2 },
  { option_id: "often", label: "Often", future_weight_hint: 3 },
  { option_id: "consistently", label: "Consistently", future_weight_hint: 4 },
]);

const QUESTIONS = Object.freeze([
  { question_id: "g1_q1_notices_details", gate_number: 1, prompt: "How often does your child stay focused long enough to notice small details in tasks or conversations?", options: OPTIONS },
  { question_id: "g1_q2_returns_to_task", gate_number: 1, prompt: "When distracted, how often does your child return to the original activity with gentle support?", options: OPTIONS },
  { question_id: "g2_q1_names_feelings", gate_number: 2, prompt: "How often does your child express feelings using words, gestures, or other clear signals?", options: OPTIONS },
  { question_id: "g2_q2_recovers_upset", gate_number: 2, prompt: "After becoming upset, how often does your child regain calm with your regular family routines?", options: OPTIONS },
  { question_id: "g3_q1_simple_choices", gate_number: 3, prompt: "How often does your child make age-appropriate choices between two or more acceptable options?", options: OPTIONS },
  { question_id: "g3_q2_owns_decisions", gate_number: 3, prompt: "How often does your child acknowledge the outcome of a choice and continue forward?", options: OPTIONS },
  { question_id: "g4_q1_energy_routines", gate_number: 4, prompt: "How often does your child keep steady energy through daily routines such as play, meals, and rest transitions?", options: OPTIONS },
  { question_id: "g4_q2_body_signals", gate_number: 4, prompt: "How often does your child notice and communicate basic body signals like hunger, tiredness, or discomfort?", options: OPTIONS },
  { question_id: "g5_q1_follows_steps", gate_number: 5, prompt: "How often does your child follow through on a short sequence of expected steps with reminders?", options: OPTIONS },
  { question_id: "g5_q2_waits_turn", gate_number: 5, prompt: "How often does your child wait for a turn during shared activities at home or school?", options: OPTIONS },
  { question_id: "g6_q1_honest_reporting", gate_number: 6, prompt: "How often does your child describe what happened in a situation as clearly and honestly as they can?", options: OPTIONS },
  { question_id: "g6_q2_asks_clarify", gate_number: 6, prompt: "How often does your child ask questions to clarify what is true when they are unsure?", options: OPTIONS },
  { question_id: "g7_q1_apologizes", gate_number: 7, prompt: "How often does your child attempt to make things right after hurting someone or making a mistake?", options: OPTIONS },
  { question_id: "g7_q2_accepts_repair", gate_number: 7, prompt: "How often does your child accept help to repair conflicts and rejoin activities?", options: OPTIONS },
  { question_id: "g8_q1_tries_new_ideas", gate_number: 8, prompt: "How often does your child explore new ideas through drawing, building, storytelling, or problem-solving?", options: OPTIONS },
  { question_id: "g8_q2_finishes_creative", gate_number: 8, prompt: "How often does your child carry a creative idea toward a simple finished result?", options: OPTIONS },
  { question_id: "g9_q1_includes_others", gate_number: 9, prompt: "How often does your child include others in group play, teamwork, or shared responsibilities?", options: OPTIONS },
  { question_id: "g9_q2_respects_boundaries", gate_number: 9, prompt: "How often does your child respect household or classroom boundaries while participating with others?", options: OPTIONS },
  { question_id: "g10_q1_reflects_growth", gate_number: 10, prompt: "How often does your child reflect on what they learned from an experience and apply it later?", options: OPTIONS },
  { question_id: "g10_q2_helps_younger", gate_number: 10, prompt: "How often does your child pass on a helpful habit or lesson to a sibling, peer, or younger child?", options: OPTIONS },
]);

module.exports = {
  GATES_ASSESSMENT_VERSION,
  GATES_ASSESSMENT_TITLE,
  GATES_ASSESSMENT_INSTRUCTIONS,
  GATES_ASSESSMENT_DISCLAIMER,
  GATES,
  QUESTIONS,
};
