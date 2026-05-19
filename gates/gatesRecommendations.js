"use strict";

const { GATES_ASSESSMENT_DISCLAIMER, GATES } = require("./gatesAssessmentQuestions");

const CATEGORIES = ["practice", "ritual", "story", "reflection"];

function safeText(value) {
  return String(value || "").trim();
}

function buildGateIndex() {
  return new Map(GATES.map((gate) => [gate.gate_key, gate]));
}

function stableRecommendationId(childId, gateKey, category, ageBand) {
  const base = `${safeText(childId)}|${gateKey}|${category}|${safeText(ageBand).toLowerCase()}`;
  return `gr_${Buffer.from(base).toString("hex")}`;
}

function buildRecommendation({ child_id, gate, category, age_band }) {
  const titleByCategory = {
    practice: `${gate.name} Practice Sprint`,
    ritual: `${gate.name} Daily Ritual`,
    story: `${gate.name} Story Prompt`,
    reflection: `${gate.name} Reflection Check-In`,
  };
  const descriptionByCategory = {
    practice: `Spend 5 minutes on one simple ${gate.name.toLowerCase()} routine and repeat with the same cue each day.`,
    ritual: `Anchor ${gate.name.toLowerCase()} in a predictable family rhythm at the same time each day.`,
    story: `Use a short family story that models ${gate.name.toLowerCase()} and invite your child to retell it.`,
    reflection: `Close the day by naming one ${gate.name.toLowerCase()} win and one next step for tomorrow.`,
  };
  return {
    recommendation_id: stableRecommendationId(child_id, gate.gate_key, category, age_band),
    gate_number: gate.gate_number,
    gate_key: gate.gate_key,
    category,
    title: titleByCategory[category],
    description: descriptionByCategory[category],
    rationale: `This supports steady growth in ${gate.name.toLowerCase()} through repeatable home routines.`,
    age_band: safeText(age_band) || "unspecified",
    estimated_duration_minutes: category === "story" ? 8 : 5,
    frequency: category === "reflection" ? "weekly" : "daily",
    non_diagnostic_disclaimer: GATES_ASSESSMENT_DISCLAIMER,
  };
}

function generateGatesRecommendations({ child_id, gates_profile = {}, gate_scores = [], current_growth_gate = null, child_age_band = null }) {
  const gateIndex = buildGateIndex();
  const scoreMap = new Map((Array.isArray(gate_scores) ? gate_scores : []).map((g) => [g.gate_key, g]));
  const primary = Array.isArray(gates_profile.primary_gates) ? gates_profile.primary_gates : [];

  const rankedSupport = [...GATES]
    .filter((gate) => gate.gate_key !== current_growth_gate && !primary.includes(gate.gate_key))
    .sort((a, b) => {
      const as = Number(scoreMap.get(a.gate_key)?.normalized_score || 0);
      const bs = Number(scoreMap.get(b.gate_key)?.normalized_score || 0);
      return as - bs || a.gate_number - b.gate_number;
    });

  const priorityKeys = [
    current_growth_gate,
    ...primary,
    ...rankedSupport.map((g) => g.gate_key),
  ].filter((key, idx, arr) => key && gateIndex.has(key) && arr.indexOf(key) === idx);

  const recommendations = [];
  const growthGate = gateIndex.get(current_growth_gate);
  if (growthGate) {
    for (const category of CATEGORIES) {
      recommendations.push(buildRecommendation({ child_id, gate: growthGate, category, age_band: child_age_band }));
    }
  }

  for (const key of priorityKeys) {
    if (key === current_growth_gate) continue;
    const gate = gateIndex.get(key);
    recommendations.push(buildRecommendation({ child_id, gate, category: "practice", age_band: child_age_band }));
  }

  return recommendations;
}

module.exports = { generateGatesRecommendations };
