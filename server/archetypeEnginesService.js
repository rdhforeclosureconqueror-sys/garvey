"use strict";

const crypto = require("crypto");

const LOVE_ARCHETYPES = require("../archetype-engines/content/loveArchetypes");
const LOVE_DYNAMICS = require("../archetype-engines/content/loveCoupleDynamics");
const LEADERSHIP_ARCHETYPES = require("../archetype-engines/content/leadershipArchetypes");
const LOYALTY_ARCHETYPES = require("../archetype-engines/content/loyaltyArchetypes");
const LOVE_QUESTIONS = require("../archetype-engines/question-banks/love");

const ENGINE_TYPES = Object.freeze(["love", "leadership", "loyalty"]);

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
  getEngineContent,
  scoreLoveAssessment,
  computeLoveCompatibility,
  initializeArchetypeEngineSchema,
  newId,
};
