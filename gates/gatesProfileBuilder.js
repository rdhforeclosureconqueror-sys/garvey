"use strict";

const { GATES_ASSESSMENT_DISCLAIMER, GATES } = require("./gatesAssessmentQuestions");

function buildGatesProfile({ gate_scores = [], primary_gates = [], current_growth_gate = null, confidence_summary = {} } = {}) {
  const gateByKey = new Map(Array.isArray(gate_scores) ? gate_scores.map((gate) => [gate.gate_key, gate]) : []);
  const gateMap = GATES.map((gate) => {
    const score = gateByKey.get(gate.gate_key);
    return {
      gate_number: gate.gate_number,
      gate_key: gate.gate_key,
      name: gate.name,
      status: score?.status || "not_started",
      normalized_score: Number(score?.normalized_score || 0),
    };
  });

  const safePrimary = primary_gates.filter((key) => gateByKey.has(key)).slice(0, 3);
  const growth = gateByKey.get(current_growth_gate) || gateMap[0] || null;

  const strengths = safePrimary.map((key) => {
    const gate = gateByKey.get(key);
    return `${gate.name}: showing consistent momentum in observed routines.`;
  });
  const supportNeeds = growth ? [`${growth.name}: strongest near-term growth opportunity for daily practice.`] : [];

  return {
    summary: `This profile reflects current parent observations across all 10 Gates and highlights practical next focus areas for family support.`,
    primary_gates: safePrimary,
    current_growth_gate: growth ? { gate_key: growth.gate_key, name: growth.name, status: growth.status } : null,
    strengths,
    support_needs: supportNeeds,
    gate_map: gateMap,
    non_diagnostic_disclaimer: GATES_ASSESSMENT_DISCLAIMER,
    confidence_summary,
  };
}

module.exports = { buildGatesProfile };
