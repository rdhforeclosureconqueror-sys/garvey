"use strict";

const BUSINESS_ARCHETYPES = ["Builder", "Architect", "Operator", "Connector", "Resource", "Protector", "Nurturer", "Educator"];
const CUSTOMER_ARCHETYPES = ["Value", "Loyal", "Convenience", "Experience", "Social", "Intentional", "Trend"];
const PERSONALITIES = ["Practical", "Relational", "Analytical", "Expressive", "Emotional", "Strategic", "Exploratory"];

const BUSINESS_QUESTION_TOPICS = [
  "When something needs to get done",
  "Priority",
  "When slow",
  "Strength",
  "Weakness",
  "Decision making",
  "Leadership",
  "Risk",
  "Focus",
  "Energy",
  "Time management",
  "Delegation",
  "Pricing",
  "Stress response",
  "Scaling",
  "Customer handling",
  "Growth mindset",
  "Innovation",
  "Stability",
  "Opportunity",
  "Control",
  "Flexibility",
  "Systems",
  "Learning",
  "Execution vs planning"
];

const BUSINESS_MAPPING = [
  { A: ["Builder", "Resource"], B: ["Architect", "Operator"], C: ["Connector", "Nurturer"], D: ["Protector", "Educator"] },
  { A: ["Resource", "Builder"], B: ["Architect", "Operator"], C: ["Nurturer", "Educator"], D: ["Connector", "Nurturer"] },
  { A: ["Resource", "Builder"], B: ["Architect", "Protector"], C: ["Connector", "Nurturer"], D: ["Educator", "Architect"] },
  { A: ["Builder", "Resource"], B: ["Architect", "Operator"], C: ["Connector", "Nurturer"], D: ["Educator", "Nurturer"] },
  { A: ["Builder", "Connector"], B: ["Architect", "Protector"], C: ["Nurturer", "Educator"], D: ["Resource", "Connector"] },
  { A: ["Builder", "Resource"], B: ["Architect", "Protector"], C: ["Connector", "Nurturer"], D: ["Educator", "Operator"] },
  { A: ["Builder", "Resource"], B: ["Architect", "Operator"], C: ["Connector", "Nurturer"], D: ["Educator", "Nurturer"] },
  { A: ["Builder", "Resource"], B: ["Architect", "Protector"], C: ["Connector", "Protector"], D: ["Protector", "Operator"] },
  { A: ["Builder", "Resource"], B: ["Architect", "Operator"], C: ["Connector", "Nurturer"], D: ["Educator", "Architect"] },
  { A: ["Builder", "Resource"], B: ["Architect", "Operator"], C: ["Connector", "Nurturer"], D: ["Educator", "Architect"] },
  { A: ["Builder", "Resource"], B: ["Architect", "Operator"], C: ["Connector", "Nurturer"], D: ["Educator", "Operator"] },
  { A: ["Builder", "Connector"], B: ["Architect", "Operator"], C: ["Connector", "Nurturer"], D: ["Educator", "Nurturer"] },
  { A: ["Resource", "Builder"], B: ["Architect", "Operator"], C: ["Nurturer", "Connector"], D: ["Educator", "Nurturer"] },
  { A: ["Builder", "Resource"], B: ["Architect", "Protector"], C: ["Connector", "Nurturer"], D: ["Educator", "Protector"] },
  { A: ["Builder", "Resource"], B: ["Architect", "Operator"], C: ["Connector", "Resource"], D: ["Educator", "Architect"] },
  { A: ["Builder", "Connector"], B: ["Architect", "Operator"], C: ["Connector", "Nurturer"], D: ["Educator", "Nurturer"] },
  { A: ["Builder", "Resource"], B: ["Architect", "Educator"], C: ["Connector", "Nurturer"], D: ["Educator", "Architect"] },
  { A: ["Builder", "Resource"], B: ["Architect", "Educator"], C: ["Connector", "Resource"], D: ["Educator", "Architect"] },
  { A: ["Operator", "Protector"], B: ["Architect", "Operator"], C: ["Nurturer", "Protector"], D: ["Educator", "Operator"] },
  { A: ["Resource", "Builder"], B: ["Architect", "Resource"], C: ["Connector", "Resource"], D: ["Educator", "Resource"] },
  { A: ["Operator", "Protector"], B: ["Architect", "Operator"], C: ["Connector", "Protector"], D: ["Educator", "Operator"] },
  { A: ["Builder", "Connector"], B: ["Architect", "Educator"], C: ["Connector", "Nurturer"], D: ["Educator", "Connector"] },
  { A: ["Operator", "Architect"], B: ["Architect", "Operator"], C: ["Connector", "Operator"], D: ["Educator", "Architect"] },
  { A: ["Educator", "Architect"], B: ["Architect", "Educator"], C: ["Connector", "Educator"], D: ["Educator", "Nurturer"] },
  { A: ["Builder", "Resource"], B: ["Architect", "Operator"], C: ["Connector", "Nurturer"], D: ["Educator", "Architect"] }
];

const CUSTOMER_MAPPING = [
  { A: ["Value", "Practical"], B: ["Loyal", "Relational"], C: ["Experience", "Emotional"], D: ["Social", "Expressive"] },
  { A: ["Value", "Practical"], B: ["Loyal", "Relational"], C: ["Experience", "Strategic"], D: ["Trend", "Expressive"] },
  { A: ["Convenience", "Practical"], B: ["Loyal", "Relational"], C: ["Intentional", "Analytical"], D: ["Social", "Expressive"] },
  { A: ["Value", "Practical"], B: ["Loyal", "Relational"], C: ["Experience", "Emotional"], D: ["Social", "Expressive"] },
  { A: ["Value", "Practical"], B: ["Loyal", "Relational"], C: ["Experience", "Emotional"], D: ["Social", "Expressive"] },
  { A: ["Convenience", "Practical"], B: ["Loyal", "Relational"], C: ["Intentional", "Analytical"], D: ["Social", "Expressive"] },
  { A: ["Value", "Practical"], B: ["Loyal", "Relational"], C: ["Experience", "Emotional"], D: ["Trend", "Expressive"] },
  { A: ["Convenience", "Practical"], B: ["Loyal", "Relational"], C: ["Intentional", "Strategic"], D: ["Social", "Expressive"] },
  { A: ["Value", "Practical"], B: ["Loyal", "Relational"], C: ["Experience", "Emotional"], D: ["Social", "Expressive"] },
  { A: ["Value", "Practical"], B: ["Loyal", "Relational"], C: ["Experience", "Strategic"], D: ["Trend", "Expressive"] },
  { A: ["Convenience", "Practical"], B: ["Loyal", "Relational"], C: ["Intentional", "Analytical"], D: ["Social", "Expressive"] },
  { A: ["Value", "Practical"], B: ["Loyal", "Relational"], C: ["Experience", "Emotional"], D: ["Social", "Expressive"] },
  { A: ["Value", "Practical"], B: ["Loyal", "Relational"], C: ["Experience", "Emotional"], D: ["Trend", "Expressive"] },
  { A: ["Convenience", "Practical"], B: ["Loyal", "Relational"], C: ["Intentional", "Strategic"], D: ["Social", "Expressive"] },
  { A: ["Value", "Practical"], B: ["Loyal", "Relational"], C: ["Experience", "Emotional"], D: ["Social", "Expressive"] },
  { A: ["Value", "Practical"], B: ["Loyal", "Relational"], C: ["Experience", "Strategic"], D: ["Trend", "Expressive"] },
  { A: ["Convenience", "Practical"], B: ["Loyal", "Relational"], C: ["Intentional", "Analytical"], D: ["Social", "Expressive"] },
  { A: ["Value", "Practical"], B: ["Loyal", "Relational"], C: ["Experience", "Emotional"], D: ["Social", "Expressive"] },
  { A: ["Value", "Practical"], B: ["Loyal", "Relational"], C: ["Experience", "Emotional"], D: ["Trend", "Expressive"] },
  { A: ["Convenience", "Practical"], B: ["Loyal", "Relational"], C: ["Intentional", "Strategic"], D: ["Social", "Expressive"] }
];

const ARCHETYPE_DEFINITIONS = {
  Builder: { traits: "action-oriented", strength: "execution", weakness: "inconsistency", improve: "implement routines + tracking" },
  Architect: { traits: "strategic", strength: "systems", weakness: "overthinking", improve: "force execution deadlines" },
  Operator: { traits: "structured", strength: "stability", weakness: "rigidity", improve: "introduce flexibility" },
  Connector: { traits: "social", strength: "relationships", weakness: "no systems", improve: "track interactions" },
  Resource: { traits: "opportunity-driven", strength: "revenue", weakness: "retention", improve: "build repeat systems" },
  Protector: { traits: "cautious", strength: "risk control", weakness: "fear", improve: "test low-risk actions" },
  Nurturer: { traits: "caring", strength: "loyalty", weakness: "underpricing", improve: "enforce pricing boundaries" },
  Educator: { traits: "teaching", strength: "trust", weakness: "low monetization", improve: "package knowledge" }
};

function buildBusinessQuestions() {
  return BUSINESS_MAPPING.map((maps, index) => ({
    qid: `BO${index + 1}`,
    type: "business_owner",
    question: BUSINESS_QUESTION_TOPICS[index],
    options: ["A", "B", "C", "D"].map((key) => ({ text: `Option ${key}`, maps: maps[key] }))
  }));
}

function buildCustomerQuestions() {
  return CUSTOMER_MAPPING.map((maps, index) => ({
    qid: `CU${index + 1}`,
    type: "customer",
    question: `Customer Question ${index + 1}`,
    options: ["A", "B", "C", "D"].map((key) => ({ text: `Option ${key}`, maps: maps[key] }))
  }));
}

const BUSINESS_QUESTIONS = buildBusinessQuestions();
const CUSTOMER_QUESTIONS = buildCustomerQuestions();

function getQuestions(assessmentType) {
  if (assessmentType === "business_owner") return BUSINESS_QUESTIONS;
  if (assessmentType === "customer") return CUSTOMER_QUESTIONS;
  return [];
}

function createCounter(keys) {
  return keys.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

function rankCounts(counts) {
  const entries = Object.entries(counts || {}).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });
  const low = [...entries].sort((a, b) => {
    if (a[1] !== b[1]) return a[1] - b[1];
    return a[0].localeCompare(b[0]);
  });
  return {
    primary: entries[0]?.[0] || null,
    secondary: entries[1]?.[0] || null,
    weakness: low[0]?.[0] || null,
  };
}

function scoreSubmission(assessmentType, answers) {
  const questions = getQuestions(assessmentType);
  const map = new Map(questions.map((q) => [q.qid, q]));

  if (assessmentType === "business_owner") {
    const archetypeCounts = createCounter(BUSINESS_ARCHETYPES);
    for (const answer of answers) {
      const q = map.get(answer.qid);
      if (!q) continue;
      const option = q.options.find((opt) => opt.text.endsWith(answer.answer.toUpperCase()) || opt.text === answer.answer);
      const resolved = option || q.options["ABCD".indexOf(String(answer.answer).toUpperCase())];
      if (!resolved) continue;
      resolved.maps.forEach((archetype) => { archetypeCounts[archetype] += 1; });
    }
    const ranked = rankCounts(archetypeCounts);
    return {
      assessment_type: "business_owner",
      archetype_counts: archetypeCounts,
      primary: ranked.primary,
      secondary: ranked.secondary,
      weakness: ranked.weakness,
      personality_counts: null,
      personality_primary: null,
      personality_secondary: null,
      personality_weakness: null,
      definition: ranked.primary ? ARCHETYPE_DEFINITIONS[ranked.primary] : null,
    };
  }

  const archetypeCounts = createCounter(CUSTOMER_ARCHETYPES);
  const personalityCounts = createCounter(PERSONALITIES);
  for (const answer of answers) {
    const q = map.get(answer.qid);
    if (!q) continue;
    const option = q.options["ABCD".indexOf(String(answer.answer).toUpperCase())];
    if (!option) continue;
    archetypeCounts[option.maps[0]] += 1;
    personalityCounts[option.maps[1]] += 1;
  }
  const archetypeRank = rankCounts(archetypeCounts);
  const personalityRank = rankCounts(personalityCounts);
  return {
    assessment_type: "customer",
    archetype_counts: archetypeCounts,
    primary: archetypeRank.primary,
    secondary: archetypeRank.secondary,
    weakness: archetypeRank.weakness,
    personality_counts: personalityCounts,
    personality_primary: personalityRank.primary,
    personality_secondary: personalityRank.secondary,
    personality_weakness: personalityRank.weakness,
    definition: null,
  };
}

function validateAnswers(assessmentType, answers) {
  const questions = getQuestions(assessmentType);
  if (!Array.isArray(answers)) return { ok: false, error: "answers must be an array" };
  if (answers.length !== questions.length) {
    return { ok: false, error: `expected ${questions.length} answers for ${assessmentType}` };
  }
  const validQids = new Set(questions.map((q) => q.qid));
  const seen = new Set();
  for (const item of answers) {
    if (!item || !item.qid || !item.answer) return { ok: false, error: "each answer requires qid + answer" };
    if (!validQids.has(item.qid)) return { ok: false, error: `invalid qid ${item.qid}` };
    if (seen.has(item.qid)) return { ok: false, error: `duplicate qid ${item.qid}` };
    if (!["A", "B", "C", "D"].includes(String(item.answer).toUpperCase())) {
      return { ok: false, error: `invalid answer for ${item.qid}` };
    }
    seen.add(item.qid);
  }
  return { ok: true };
}

module.exports = {
  BUSINESS_ARCHETYPES,
  CUSTOMER_ARCHETYPES,
  PERSONALITIES,
  ARCHETYPE_DEFINITIONS,
  getQuestions,
  scoreSubmission,
  validateAnswers,
};
