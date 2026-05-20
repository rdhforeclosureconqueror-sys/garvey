"use strict";
const { GATES_ASSESSMENT_DISCLAIMER } = require("./gatesAssessmentQuestions");
const { BLUEPRINT_BY_KEY } = require("./firstGenerationBlueprint");

function stableRecommendationId(childId, gateKey, category) {
  return `gr_${Buffer.from(`${childId}|${gateKey}|${category}`).toString("hex")}`;
}

function rec(childId, gate, category, title, description){
  return { recommendation_id: stableRecommendationId(childId, gate.gate_key, category), gate_number: gate.gate_number, gate_key: gate.gate_key, category, title, description, non_diagnostic_disclaimer: GATES_ASSESSMENT_DISCLAIMER };
}

function generateGatesRecommendations({ child_id, current_growth_gate = null }) {
  const gate = BLUEPRINT_BY_KEY.get(current_growth_gate) || BLUEPRINT_BY_KEY.values().next().value;
  if (!gate) return [];
  const recommendations = [
    rec(child_id, gate, "reflection", `Reflection: ${gate.reflection_questions[0]}`, gate.reflection_questions[0]),
    rec(child_id, gate, "journal", `Journal: ${gate.journal_prompts[0]}`, gate.journal_prompts[0]),
    rec(child_id, gate, "observation", `Observation: ${gate.developing_signs[0]}`, gate.developing_signs[0]),
    rec(child_id, gate, "practice", `Practice: ${gate.parent_guidance.split('.')[0]}`, gate.parent_guidance),
    rec(child_id, gate, "ceremony", `Ceremony: ${gate.ceremony.split(':')[0]}`, gate.ceremony),
  ];
  return recommendations;
}

module.exports = { generateGatesRecommendations };
