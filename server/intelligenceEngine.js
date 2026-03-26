"use strict";

const {
  BUSINESS_ARCHETYPES,
  CUSTOMER_ARCHETYPES,
  BUSINESS_QUESTIONS,
  CUSTOMER_QUESTIONS,
} = require("./questionCatalog");

const PERSONALITIES = CUSTOMER_ARCHETYPES;

const ARCHETYPE_DEFINITIONS = {
  Builder: { traits: "action-oriented", strength: "execution", weakness: "inconsistency", improve: "implement routines + tracking" },
  Architect: { traits: "strategic", strength: "systems", weakness: "overthinking", improve: "force execution deadlines" },
  Operator: { traits: "structured", strength: "stability", weakness: "rigidity", improve: "introduce flexibility" },
  Connector: { traits: "social", strength: "relationships", weakness: "no systems", improve: "track interactions" },
  "Resource Generator": { traits: "opportunity-driven", strength: "revenue", weakness: "retention", improve: "build repeat systems" },
  Protector: { traits: "cautious", strength: "risk control", weakness: "fear", improve: "test low-risk actions" },
  Nurturer: { traits: "caring", strength: "loyalty", weakness: "underpricing", improve: "enforce pricing boundaries" },
  Educator: { traits: "teaching", strength: "trust", weakness: "low monetization", improve: "package knowledge" },
};

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

function normalizeAnswerKey(answer, question) {
  const raw = String(answer?.answer ?? answer?.option ?? answer?.value ?? "").trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (["A", "B", "C", "D"].includes(upper)) return upper;

  const matched = (question?.options || []).find((opt) => String(opt.text || "").trim() === raw);
  return matched?.key || null;
}

function scoreSubmission(assessmentType, answers) {
  const questions = getQuestions(assessmentType);
  const map = new Map(questions.map((q) => [q.qid, q]));

  if (assessmentType === "business_owner") {
    const archetypeCounts = createCounter(BUSINESS_ARCHETYPES);
    for (const answer of answers) {
      const q = map.get(answer.qid);
      if (!q) continue;
      const answerKey = normalizeAnswerKey(answer, q);
      if (!answerKey) continue;
      const option = q.options.find((opt) => opt.key === answerKey);
      if (!option || !Array.isArray(option.maps) || option.maps.length !== 2) {
        const err = new Error(`invalid mapping for ${q.qid} option ${answerKey}`);
        err.code = "INVALID_MAPPING";
        throw err;
      }
      option.maps.forEach((archetype) => {
        if (archetypeCounts[archetype] !== undefined) archetypeCounts[archetype] += 1;
      });
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
  const personalityCounts = createCounter(CUSTOMER_ARCHETYPES);
  for (const answer of answers) {
    const q = map.get(answer.qid);
    if (!q) continue;
    const answerKey = normalizeAnswerKey(answer, q);
    if (!answerKey) continue;
    const option = q.options.find((opt) => opt.key === answerKey);
    if (!option || !Array.isArray(option.maps) || option.maps.length !== 2) {
      const err = new Error(`invalid mapping for ${q.qid} option ${answerKey}`);
      err.code = "INVALID_MAPPING";
      throw err;
    }
    if (archetypeCounts[option.maps[0]] !== undefined) archetypeCounts[option.maps[0]] += 1;
    if (personalityCounts[option.maps[1]] !== undefined) personalityCounts[option.maps[1]] += 1;
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
    if (!item || !item.qid) return { ok: false, error: "each answer requires qid" };
    if (!validQids.has(item.qid)) return { ok: false, error: `invalid qid ${item.qid}` };
    if (seen.has(item.qid)) return { ok: false, error: `duplicate qid ${item.qid}` };
    const q = questions.find((question) => question.qid === item.qid);
    const answerKey = normalizeAnswerKey(item, q);
    if (!answerKey) {
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
