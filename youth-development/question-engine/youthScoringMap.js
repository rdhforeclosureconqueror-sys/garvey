"use strict";

const { YOUTH_QUESTION_BANK, YOUTH_QUESTION_CATEGORIES } = require("./youthQuestionBank");

const TRAIT_TO_CATEGORY_WEIGHTS = Object.freeze({
  SR: Object.freeze({ focus: 0.55, emotional_regulation: 0.45 }),
  PS: Object.freeze({ social: 0.6, emotional_regulation: 0.4 }),
  FB: Object.freeze({ discipline: 0.7, focus: 0.3 }),
  DE: Object.freeze({ confidence: 0.7, social: 0.3 }),
  CQ: Object.freeze({ confidence: 0.6, focus: 0.4 }),
  CR: Object.freeze({ confidence: 0.5, social: 0.5 }),
  RS: Object.freeze({ focus: 0.5, discipline: 0.5 }),
});

const TRAIT_NAME_MAP = Object.freeze({
  SR: "SELF_REGULATION",
  PS: "PROSOCIALITY",
  FB: "FOLLOW_THROUGH",
  DE: "DRIVE_AND_EFFICACY",
  CQ: "CURIOSITY",
  CR: "CREATIVITY",
  RS: "REASONING",
});

const CONFLICT_LIBRARY = Object.freeze({
  "DE:SR": "Confidence appears stronger than regulation; build routines that help effort stay consistent under frustration.",
  "CQ:FB": "Exploration is stronger than follow-through; use short checkpoints so ideas turn into finished actions.",
  "PS:SR": "Social intent is ahead of self-regulation; co-regulate transitions before high-stress interactions.",
  "RS:DE": "Reasoning appears stronger than confidence; encourage low-risk practice where your child explains their thinking out loud.",
});

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return Number(value.toFixed(4));
}

function clamp100(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 100) return 100;
  return Number(value.toFixed(4));
}

function toPercentFromLikert(avg) {
  if (!Number.isFinite(avg)) return 0;
  return clamp100(((avg - 1) / 3) * 100);
}

function buildCategoryScores(answerPairs) {
  const questionById = Object.fromEntries(YOUTH_QUESTION_BANK.map((question) => [question.id, question]));
  const buckets = Object.fromEntries(YOUTH_QUESTION_CATEGORIES.map((category) => [category, []]));

  for (const answer of answerPairs) {
    const question = questionById[answer.question_id];
    if (!question) continue;
    buckets[question.category].push(Number(answer.value));
  }

  const categoryScores = {};
  for (const category of YOUTH_QUESTION_CATEGORIES) {
    const values = buckets[category];
    const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    categoryScores[category] = {
      raw_average: Number(avg.toFixed(4)),
      normalized_score: toPercentFromLikert(avg),
      answered_count: values.length,
    };
  }

  return categoryScores;
}

function buildTraitRows(categoryScores) {
  const rows = Object.entries(TRAIT_TO_CATEGORY_WEIGHTS).map(([traitCode, weights]) => {
    const weightedScore = Object.entries(weights).reduce(
      (sum, [category, weight]) => sum + (Number(categoryScores[category]?.normalized_score || 0) * Number(weight)),
      0
    );

    const coverage = Object.keys(weights).filter((category) => Number(categoryScores[category]?.answered_count || 0) > 0).length;
    const coverageRatio = clamp01(coverage / Object.keys(weights).length);
    const confidenceScore = clamp100(65 + (coverageRatio * 20));
    const currentScore = clamp100(weightedScore);
    const baselineScore = clamp100(currentScore - 8);
    const changeScore = Number((currentScore - baselineScore).toFixed(4));

    return {
      trait_code: traitCode,
      trait_name: TRAIT_NAME_MAP[traitCode] || traitCode,
      baseline_score: baselineScore,
      current_score: currentScore,
      change_score: changeScore,
      confidence_score: confidenceScore,
      evidence_mix_score: clamp100(62 + (coverageRatio * 18)),
      trend_direction: changeScore > 2 ? "increasing" : "stable",
    };
  });

  return rows.sort((a, b) => {
    if (b.current_score !== a.current_score) return b.current_score - a.current_score;
    return a.trait_code.localeCompare(b.trait_code);
  });
}

function detectTraitConflict(topTrait, lowTrait) {
  if (!topTrait || !lowTrait) return null;
  const directKey = `${topTrait.trait_code}:${lowTrait.trait_code}`;
  const reverseKey = `${lowTrait.trait_code}:${topTrait.trait_code}`;

  if (CONFLICT_LIBRARY[directKey]) {
    return { conflict_key: directKey, insight: CONFLICT_LIBRARY[directKey] };
  }
  if (CONFLICT_LIBRARY[reverseKey]) {
    return { conflict_key: reverseKey, insight: CONFLICT_LIBRARY[reverseKey] };
  }

  return {
    conflict_key: `${topTrait.trait_code}:${lowTrait.trait_code}`,
    insight: `There is a visible gap between ${topTrait.trait_name} and ${lowTrait.trait_name}; focus support where scores are currently lowest.`,
  };
}

function buildTraitInterpretation(traitRows) {
  const sorted = [...traitRows].sort((a, b) => b.current_score - a.current_score || a.trait_code.localeCompare(b.trait_code));
  const topTrait = sorted[0] || null;
  const lowTrait = sorted[sorted.length - 1] || null;
  const conflict = detectTraitConflict(topTrait, lowTrait);

  const strengths = sorted.filter((row) => row.current_score >= 70).slice(0, 3);
  const supportAreas = [...sorted].reverse().filter((row) => row.current_score <= 45).slice(0, 3);
  const priorities = [...sorted].reverse().slice(0, 3);

  return {
    highest_trait: topTrait,
    lowest_trait: lowTrait,
    conflict,
    strengths,
    support_areas: supportAreas,
    priority_traits: priorities,
  };
}

function runYouthIntakeScoring(answerPairs) {
  const categoryScores = buildCategoryScores(answerPairs);
  const traitRows = buildTraitRows(categoryScores);
  const interpretation = buildTraitInterpretation(traitRows);

  return {
    category_scores: categoryScores,
    trait_rows: traitRows,
    interpretation,
  };
}

module.exports = {
  runYouthIntakeScoring,
};
