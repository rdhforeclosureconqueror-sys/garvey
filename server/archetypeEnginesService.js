"use strict";

const crypto = require("crypto");

const LOVE_ARCHETYPES = require("../archetype-engines/content/loveArchetypes");
const LOVE_DYNAMICS = require("../archetype-engines/content/loveCoupleDynamics");
const LEADERSHIP_ARCHETYPES = require("../archetype-engines/content/leadershipArchetypes");
const LOYALTY_ARCHETYPES = require("../archetype-engines/content/loyaltyArchetypes");
const LOVE_QUESTIONS = require("../archetype-engines/question-banks/love");
const LEADERSHIP_BANK1 = require("../archetype-engines/question-banks/leadership.bank1");
const LEADERSHIP_BANK2 = require("../archetype-engines/question-banks/leadership.bank2");
const LEADERSHIP_BANK3 = require("../archetype-engines/question-banks/leadership.bank3");
const LOYALTY_BANK1 = require("../archetype-engines/question-banks/loyalty.bank1");
const LOYALTY_BANK2 = require("../archetype-engines/question-banks/loyalty.bank2");
const LOYALTY_BANK3 = require("../archetype-engines/question-banks/loyalty.bank3");

const ENGINE_TYPES = Object.freeze(["love", "leadership", "loyalty"]);
const SIGNAL_MULTIPLIER = Object.freeze({ ID: 1.0, BH: 1.0, SC: 1.25, ST: 1.5, DS: 1.0 });
const PRIMARY_WEIGHT = 2;
const SECONDARY_WEIGHT = 1;

const LEADERSHIP_QUESTIONS = Object.freeze([...LEADERSHIP_BANK1, ...LEADERSHIP_BANK2, ...LEADERSHIP_BANK3]);
const LOYALTY_QUESTIONS = Object.freeze([...LOYALTY_BANK1, ...LOYALTY_BANK2, ...LOYALTY_BANK3]);

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    acc[k] = acc[k] || [];
    acc[k].push(item);
    return acc;
  }, {});
}

function normalizeMap(raw) {
  const values = Object.values(raw);
  const max = Math.max(...values, 1);
  const out = {};
  for (const [k, v] of Object.entries(raw)) out[k] = Number(((v / max) * 100).toFixed(2));
  return out;
}

function selectPrimarySecondary(scores) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return {
    primary: sorted[0] ? { code: sorted[0][0], score: sorted[0][1] } : null,
    secondary: sorted[1] ? { code: sorted[1][0], score: sorted[1][1] } : null,
  };
}

function deriveBalanceState(normalized) {
  const vals = Object.values(normalized);
  const spread = Math.max(...vals) - Math.min(...vals);
  if (spread >= 40) return "polarized";
  if (spread >= 25) return "stretched";
  return "balanced";
}

function scoreLoveAssessment(answers = {}) {
  const byBank = groupBy(LOVE_QUESTIONS, "bank");
  const totals = { current: {}, desired: {}, behavior: {} };

  for (const q of LOVE_QUESTIONS) {
    const raw = Number(answers[q.id]);
    const value = Number.isFinite(raw) ? Math.min(5, Math.max(1, raw)) : 3;
    const scored = q.reverseScored ? 6 - value : value;
    totals[q.bank][q.archetypeCode] = (totals[q.bank][q.archetypeCode] || 0) + scored;
  }

  const normalized = {
    current: normalizeMap(totals.current),
    desired: normalizeMap(totals.desired),
    behavior: normalizeMap(totals.behavior),
  };

  const combined = {};
  Object.keys(totals.current).forEach((code) => {
    combined[code] = Number(((normalized.current[code] * 0.45) + (normalized.behavior[code] * 0.35) + (normalized.desired[code] * 0.2)).toFixed(2));
  });

  const normalizedCombined = normalizeMap(combined);
  const top = selectPrimarySecondary(normalizedCombined);

  const desiredVsCurrent = {};
  const identityBehaviorGap = {};
  let contradiction = 0;
  Object.keys(normalized.current).forEach((code) => {
    desiredVsCurrent[code] = Number((normalized.desired[code] - normalized.current[code]).toFixed(2));
    identityBehaviorGap[code] = Number((normalized.current[code] - normalized.behavior[code]).toFixed(2));
    contradiction += Math.abs(desiredVsCurrent[code]);
  });

  const consistency = Number((100 - Math.min(100, contradiction / 5)).toFixed(2));
  return {
    questionCount: LOVE_QUESTIONS.length,
    banks: Object.fromEntries(Object.entries(byBank).map(([k, v]) => [k, v.length])),
    normalizedScores: normalizedCombined,
    bankScores: normalized,
    primaryArchetype: top.primary,
    secondaryArchetype: top.secondary,
    balanceState: deriveBalanceState(normalizedCombined),
    desiredVsCurrent,
    contradictionConsistency: { contradiction: Number(contradiction.toFixed(2)), consistency },
    identityBehaviorGap,
    stressProfile: normalized.behavior,
  };
}

function pickOption(question, answer) {
  if (typeof answer === "string") {
    return question.options.find((opt) => opt.id === answer) || question.options[2] || question.options[0];
  }
  if (typeof answer === "number") {
    const idx = Math.max(0, Math.min(question.options.length - 1, Math.round(answer) - 1));
    return question.options[idx] || question.options[0];
  }
  return question.options[2] || question.options[0];
}

function scoreMappedEngineAssessment(questions, answers = {}) {
  const totals = {};
  const byClassRaw = { ID: {}, BH: {}, SC: {}, ST: {}, DS: {} };
  const pairDelta = [];
  const answerIndex = {};

  for (const q of questions) {
    const selected = pickOption(q, answers[q.id]);
    const signalType = selected.signalType || q.questionClass;
    const multiplier = SIGNAL_MULTIPLIER[signalType] || 1;

    totals[selected.primary] = (totals[selected.primary] || 0) + (PRIMARY_WEIGHT * multiplier);
    byClassRaw[signalType][selected.primary] = (byClassRaw[signalType][selected.primary] || 0) + (PRIMARY_WEIGHT * multiplier);

    if (selected.secondary) {
      totals[selected.secondary] = (totals[selected.secondary] || 0) + (SECONDARY_WEIGHT * multiplier);
      byClassRaw[signalType][selected.secondary] = (byClassRaw[signalType][selected.secondary] || 0) + (SECONDARY_WEIGHT * multiplier);
    }

    answerIndex[q.id] = q.options.findIndex((opt) => opt.id === selected.id);
  }

  for (const q of questions) {
    if (!q.reversePairId || q.id > q.reversePairId) continue;
    if (answerIndex[q.id] === undefined || answerIndex[q.reversePairId] === undefined) continue;
    pairDelta.push(Math.abs(answerIndex[q.id] - answerIndex[q.reversePairId]));
  }

  const normalizedScores = normalizeMap(totals);
  const top = selectPrimarySecondary(normalizedScores);
  const gap = top.primary && top.secondary
    ? Number((top.primary.score - top.secondary.score).toFixed(2))
    : null;

  const bankScores = {
    identity: normalizeMap(byClassRaw.ID),
    behavior: normalizeMap(byClassRaw.BH),
    selfConcept: normalizeMap(byClassRaw.SC),
    stress: normalizeMap(byClassRaw.ST),
    desired: normalizeMap(byClassRaw.DS),
  };

  const codes = new Set([
    ...Object.keys(normalizedScores),
    ...Object.keys(bankScores.identity),
    ...Object.keys(bankScores.behavior),
    ...Object.keys(bankScores.desired),
  ]);

  const desiredCurrentGap = {};
  const identityBehaviorGap = {};
  const balanceStates = { overall: deriveBalanceState(normalizedScores), dimensions: {} };
  for (const code of codes) {
    desiredCurrentGap[code] = Number(((bankScores.desired[code] || 0) - (bankScores.identity[code] || 0)).toFixed(2));
    identityBehaviorGap[code] = Number(((bankScores.identity[code] || 0) - (bankScores.behavior[code] || 0)).toFixed(2));
    const value = normalizedScores[code] || 0;
    balanceStates.dimensions[code] = value >= 80 ? "dominant" : value <= 45 ? "under-indexed" : "balanced";
  }

  const contradiction = pairDelta.length ? Number(((pairDelta.reduce((a, b) => a + b, 0) / (pairDelta.length * 3)) * 100).toFixed(2)) : 0;
  const consistency = Number((100 - contradiction).toFixed(2));

  return {
    questionCount: questions.length,
    bankCounts: Object.fromEntries(Object.entries(groupBy(questions, "bankId")).map(([k, v]) => [k, v.length])),
    normalizedScores,
    primaryArchetype: top.primary,
    secondaryArchetype: top.secondary,
    hybridArchetype: gap !== null && gap <= 7 && top.secondary
      ? { codes: [top.primary.code, top.secondary.code], gap, label: `${top.primary.code}-${top.secondary.code}` }
      : null,
    balanceStates,
    desiredCurrentGap,
    contradictionConsistency: { contradiction, consistency },
    identityBehaviorGap,
    stressProfile: bankScores.stress,
    bankScores,
  };
}

function scoreEngineAssessment(engineType, answers = {}) {
  if (engineType === "love") return scoreLoveAssessment(answers);
  if (engineType === "leadership") return scoreMappedEngineAssessment(LEADERSHIP_QUESTIONS, answers);
  if (engineType === "loyalty") return scoreMappedEngineAssessment(LOYALTY_QUESTIONS, answers);
  return null;
}

function getQuestionBanks(engineType) {
  if (engineType === "love") {
    return {
      current: LOVE_QUESTIONS.filter((q) => q.bank === "current"),
      desired: LOVE_QUESTIONS.filter((q) => q.bank === "desired"),
      behavior: LOVE_QUESTIONS.filter((q) => q.bank === "behavior"),
    };
  }
  if (engineType === "leadership") return groupBy(LEADERSHIP_QUESTIONS, "bankId");
  if (engineType === "loyalty") return groupBy(LOYALTY_QUESTIONS, "bankId");
  return {};
}

function computeLoveCompatibility(resultA, resultB) {
  const scoreA = resultA?.normalizedScores || {};
  const scoreB = resultB?.normalizedScores || {};
  const codes = Array.from(new Set([...Object.keys(scoreA), ...Object.keys(scoreB)]));
  let delta = 0;
  for (const code of codes) delta += Math.abs((scoreA[code] || 0) - (scoreB[code] || 0));
  const base = Math.max(0, 100 - (delta / Math.max(codes.length, 1)));

  let dynamicBonus = 0;
  for (const d of LOVE_DYNAMICS) {
    if (
      [resultA?.primaryArchetype?.code, resultA?.secondaryArchetype?.code].includes(d.pair[0])
      && [resultB?.primaryArchetype?.code, resultB?.secondaryArchetype?.code].includes(d.pair[1])
    ) dynamicBonus += d.scoreBias;
  }

  const compatibility = Math.min(100, Number((base + dynamicBonus).toFixed(2)));
  return {
    compatibility,
    baseAlignment: Number(base.toFixed(2)),
    dynamicBonus,
    tier: compatibility >= 80 ? "high" : compatibility >= 60 ? "moderate" : "developing",
  };
}

function getEngineContent(engineType) {
  if (engineType === "love") return { archetypes: LOVE_ARCHETYPES, dynamics: LOVE_DYNAMICS };
  if (engineType === "leadership") return { archetypes: LEADERSHIP_ARCHETYPES, dynamics: [] };
  if (engineType === "loyalty") return { archetypes: LOYALTY_ARCHETYPES, dynamics: [] };
  return null;
}

async function initializeArchetypeEngineSchema(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS engine_assessments (id TEXT PRIMARY KEY, engine_type TEXT NOT NULL, tenant_slug TEXT, session_id TEXT, user_id TEXT, campaign_context TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await pool.query(`CREATE TABLE IF NOT EXISTS engine_results (result_id TEXT PRIMARY KEY, assessment_id TEXT, engine_type TEXT NOT NULL, tenant_slug TEXT, result_payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await pool.query(`CREATE TABLE IF NOT EXISTS engine_compatibility_results (id TEXT PRIMARY KEY, engine_type TEXT NOT NULL, tenant_slug TEXT, payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await pool.query(`CREATE TABLE IF NOT EXISTS engine_page_views (id TEXT PRIMARY KEY, engine_type TEXT NOT NULL, tenant_slug TEXT, page_key TEXT NOT NULL, session_id TEXT, user_id TEXT, campaign_context TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
}

function newId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

module.exports = {
  ENGINE_TYPES,
  LOVE_QUESTIONS,
  LEADERSHIP_QUESTIONS,
  LOYALTY_QUESTIONS,
  SIGNAL_MULTIPLIER,
  getQuestionBanks,
  getEngineContent,
  scoreLoveAssessment,
  scoreEngineAssessment,
  computeLoveCompatibility,
  initializeArchetypeEngineSchema,
  newId,
};
