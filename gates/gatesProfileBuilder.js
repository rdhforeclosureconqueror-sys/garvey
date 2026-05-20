"use strict";

const { GATES_ASSESSMENT_DISCLAIMER, GATES } = require("./gatesAssessmentQuestions");
const { BLUEPRINT_BY_KEY } = require("./firstGenerationBlueprint");

function toStage(score){ if(score>=0.85) return "integrated"; if(score>=0.65) return "integrating"; if(score>=0.4) return "practicing"; return "emerging"; }

function buildGatesProfile({ gate_scores = [], primary_gates = [], current_growth_gate = null, confidence_summary = {} } = {}) {
  const gateByKey = new Map(Array.isArray(gate_scores) ? gate_scores.map((gate) => [gate.gate_key, gate]) : []);
  const gateMap = GATES.map((gate) => {
    const score = gateByKey.get(gate.gate_key);
    const normalized = Number(score?.normalized_score || 0);
    const blueprint = BLUEPRINT_BY_KEY.get(gate.gate_key) || {};
    return { gate_number: gate.gate_number, gate_key: gate.gate_key, name: gate.name, status: score?.status || "not_started", normalized_score: normalized, current_stage: toStage(normalized), parent_facing_summary: blueprint.core_lesson || `${gate.name} is built through steady family practice.` };
  });
  const safePrimary = primary_gates.filter((key) => gateByKey.has(key)).slice(0, 3);
  const growth = gateMap.find((g)=>g.gate_key===current_growth_gate) || gateMap[0] || null;
  const strongest = gateMap.filter((g)=>safePrimary.includes(g.gate_key)).map((g)=>g.name);
  const growthBlueprint = BLUEPRINT_BY_KEY.get(growth?.gate_key || "") || {};
  return {
    summary: `Current Gates Profile: stage-based parent observations across the 10 Gates.`,
    primary_gates: safePrimary,
    strongest_gates: strongest,
    growth_gate: growth ? { gate_key: growth.gate_key, name: growth.name, current_stage: growth.current_stage } : null,
    current_growth_gate: growth ? { gate_key: growth.gate_key, name: growth.name, status: growth.status } : null,
    reflection_focus: growthBlueprint.reflection_questions?.[0] || "What did you notice this week?",
    observation_focus: growthBlueprint.developing_signs?.[0] || "Observe daily routines for small shifts.",
    suggested_next_practice: growthBlueprint.parent_guidance || "Practice one small repeatable family rhythm.",
    ceremony_readiness_hint: growthBlueprint.ceremony || "Name one milestone before holding a family ceremony.",
    gate_map: gateMap,
    non_diagnostic_disclaimer: GATES_ASSESSMENT_DISCLAIMER,
    confidence_summary,
  };
}
module.exports = { buildGatesProfile };