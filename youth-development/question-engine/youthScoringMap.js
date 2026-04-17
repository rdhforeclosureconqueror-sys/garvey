"use strict";

const { YOUTH_QUESTION_BANK } = require("./youthQuestionBank");

const TRAIT_SPECS = Object.freeze([
  Object.freeze({ code: "SR", label: "Self-Regulation", item_count: 4 }),
  Object.freeze({ code: "CQ", label: "Curiosity / Exploratory Drive", item_count: 4 }),
  Object.freeze({ code: "CR", label: "Creativity / Problem Finding", item_count: 4 }),
  Object.freeze({ code: "RS", label: "Reasoning / Pattern Recognition", item_count: 4 }),
  Object.freeze({ code: "PS", label: "Persistence / Challenge Tolerance", item_count: 3 }),
  Object.freeze({ code: "FB", label: "Feedback Responsiveness", item_count: 3 }),
  Object.freeze({ code: "DE", label: "Domain Engagement", item_count: 3 }),
]);

const TRAIT_REPORT_TEXT = Object.freeze({
  SR: Object.freeze({
    what_this_means: "Your child currently shows signs of how they organize attention, manage steps, and recover focus during learning.",
    what_it_looks_like: "This may show up as planning before starting, noticing mistakes, and getting back on task with less prompting.",
    why_it_matters: "Self-regulation supports learning independence and helps children use their strengths more consistently across settings.",
    support_next: "Short routines for planning, checking work, and breaking tasks into steps can help strengthen this pattern.",
    confidence_note: "This result is based on parent observation only and should be confirmed with additional evidence over time.",
  }),
  CQ: Object.freeze({
    what_this_means: "Your child currently shows signs of exploratory drive and interest in understanding beyond basic instructions.",
    what_it_looks_like: "This may show up as asking deeper questions, continuing to explore topics, and seeking extra examples.",
    why_it_matters: "Curiosity supports deeper learning and helps children build stronger connections across ideas and experiences.",
    support_next: "Provide open-ended prompts, short exploration time, and space for your child to follow meaningful questions.",
    confidence_note: "This result is based on parent observation only and should be confirmed with additional evidence over time.",
  }),
  CR: Object.freeze({
    what_this_means: "Your child currently shows signs of generating original ideas and noticing possibilities others may not see right away.",
    what_it_looks_like: "This may show up as trying multiple approaches, making novel connections, and improving ideas through revision.",
    why_it_matters: "Creative problem finding supports adaptability and helps children approach challenges with flexibility.",
    support_next: "Invite brainstorming, accept first drafts, and use gentle revision routines that reward idea development over perfection.",
    confidence_note: "This result is based on parent observation only and should be confirmed with additional evidence over time.",
  }),
  RS: Object.freeze({
    what_this_means: "Your child currently shows signs of pattern recognition and reasoning through why answers or strategies make sense.",
    what_it_looks_like: "This may show up as noticing rules, explaining thinking, and applying ideas from one setting to another.",
    why_it_matters: "Reasoning supports transfer learning, decision quality, and confidence when solving unfamiliar problems.",
    support_next: "Ask your child to explain their thinking, compare options, and reflect on how a strategy can transfer to new tasks.",
    confidence_note: "This result is based on parent observation only and should be confirmed with additional evidence over time.",
  }),
  PS: Object.freeze({
    what_this_means: "Your child currently shows signs of challenge tolerance and willingness to keep trying when tasks become difficult.",
    what_it_looks_like: "This may show up as recovering after mistakes, trying again, and shifting strategies when the first attempt does not work.",
    why_it_matters: "Persistence helps children continue learning through setbacks and build resilience during demanding tasks.",
    support_next: "Use brief effort cycles, normalize mistakes, and reinforce retry behavior so challenge recovery becomes routine.",
    confidence_note: "This result is based on parent observation only and should be confirmed with additional evidence over time.",
  }),
  FB: Object.freeze({
    what_this_means: "Your child currently shows signs of how effectively they use correction and guidance to improve performance over time.",
    what_it_looks_like: "This may show up as applying specific feedback, remembering corrections, and making targeted improvements on later attempts.",
    why_it_matters: "Feedback responsiveness helps children convert support into growth and improve more efficiently across learning contexts.",
    support_next: "Give specific, actionable feedback and invite a quick second try so your child can practice using guidance immediately.",
    confidence_note: "This result is based on parent observation only and should be confirmed with additional evidence over time.",
  }),
  DE: Object.freeze({
    what_this_means: "Your child currently shows signs of sustained engagement in areas they care about and return to over time.",
    what_it_looks_like: "This may show up as voluntary return to topics, extra effort in high-interest areas, and visible depth growth over time.",
    why_it_matters: "Domain engagement supports sustained practice and can strengthen motivation for deeper skill development.",
    support_next: "Protect regular time for high-interest activities and help your child document progress so growth is visible and encouraging.",
    confidence_note: "This result is based on parent observation only and should be confirmed with additional evidence over time.",
  }),
});

const BAND_LABELS = Object.freeze([
  Object.freeze({ min: 0, max: 39, label: "Needs more support" }),
  Object.freeze({ min: 40, max: 59, label: "Emerging" }),
  Object.freeze({ min: 60, max: 79, label: "Building" }),
  Object.freeze({ min: 80, max: 100, label: "Currently strong" }),
]);

const UNANSWERED_SUPPRESSION_THRESHOLD = 0.2;

function clampScore(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 100) return 100;
  return Number(value.toFixed(4));
}

function toBandLabel(score) {
  const numericScore = Number(score) || 0;
  return BAND_LABELS.find((band) => numericScore >= band.min && numericScore <= band.max)?.label || "Emerging";
}

function buildAnswerLookup(answerPairs) {
  return Object.fromEntries((Array.isArray(answerPairs) ? answerPairs : []).map((row) => [row.question_id, Number(row.value)]));
}

function scoreTrait(traitSpec, answerLookup) {
  const questions = YOUTH_QUESTION_BANK.filter((question) => question.primary_trait === traitSpec.code);
  const maxPossible = traitSpec.item_count * 4;
  const rawSum = questions.reduce((sum, question) => sum + (Number(answerLookup[question.id]) || 0), 0);
  const answeredCount = questions.filter((question) => [1, 2, 3, 4].includes(Number(answerLookup[question.id]))).length;
  const currentScore = clampScore((rawSum / maxPossible) * 100);

  return {
    trait_code: traitSpec.code,
    trait_name: traitSpec.label,
    baseline_score: clampScore(Math.max(0, currentScore - 6)),
    current_score: currentScore,
    change_score: Number(Math.min(6, currentScore).toFixed(4)),
    confidence_score: answeredCount === traitSpec.item_count ? 58 : 46,
    evidence_mix_score: 30,
    trend_direction: "stable",
    answered_item_count: answeredCount,
    item_count: traitSpec.item_count,
    status_label: toBandLabel(currentScore),
    report: TRAIT_REPORT_TEXT[traitSpec.code],
  };
}

function runYouthIntakeScoring(answerPairs, options = {}) {
  const lookup = buildAnswerLookup(answerPairs);
  const traitRows = TRAIT_SPECS.map((spec) => scoreTrait(spec, lookup));
  const unansweredCount = Number(options.unansweredCount || 0);
  const totalQuestions = Number(options.totalQuestions || YOUTH_QUESTION_BANK.length);
  const unansweredRatio = totalQuestions > 0 ? unansweredCount / totalQuestions : 1;
  const interpretationSuppressed = unansweredRatio > UNANSWERED_SUPPRESSION_THRESHOLD;

  const sorted = [...traitRows].sort((a, b) => b.current_score - a.current_score || a.trait_code.localeCompare(b.trait_code));

  const interpretation = interpretationSuppressed
    ? {
      incomplete: true,
      message: "Insufficient evidence: more than 20% of items were unanswered. Complete more responses to view provisional trait interpretation.",
      highest_trait: null,
      lowest_trait: null,
      conflict: null,
      strengths: [],
      support_areas: [],
      priority_traits: [],
    }
    : {
      incomplete: false,
      highest_trait: sorted[0] || null,
      lowest_trait: sorted[sorted.length - 1] || null,
      conflict: null,
      strengths: sorted.filter((row) => row.current_score >= 80).slice(0, 3),
      support_areas: [...sorted].reverse().filter((row) => row.current_score <= 39).slice(0, 3),
      priority_traits: [...sorted].reverse().slice(0, 3),
    };

  const traitReports = Object.freeze(Object.fromEntries(traitRows.map((row) => [row.trait_code, row.report])));

  return {
    trait_rows: traitRows,
    interpretation,
    trait_reports: traitReports,
    completion: {
      unanswered_count: unansweredCount,
      total_questions: totalQuestions,
      unanswered_ratio: Number(unansweredRatio.toFixed(4)),
      interpretation_suppressed: interpretationSuppressed,
    },
  };
}

module.exports = {
  runYouthIntakeScoring,
};
