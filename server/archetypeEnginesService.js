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
const WEIGHT_TYPE_MULTIPLIER = Object.freeze({ standard: 1.0, baseline: 1.0, scenario: 1.25, stress: 1.5, desired: 1.0, identity: 1.0 });
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

function normalizeMap(raw, knownCodes = []) {
  const seed = {};
  for (const code of knownCodes) seed[code] = Number(raw[code] || 0);
  for (const [k, v] of Object.entries(raw || {})) seed[k] = Number(v || 0);
  const values = Object.values(seed);
  const max = Math.max(...values, 1);
  const out = {};
  for (const [k, v] of Object.entries(seed)) out[k] = Number(((v / max) * 100).toFixed(2));
  return out;
}

function normalizeByMaxPossible(raw = {}, maxPossible = {}, knownCodes = []) {
  const out = {};
  for (const code of knownCodes) {
    const rawValue = Number(raw[code] || 0);
    const maxValue = Number(maxPossible[code] || 0);
    out[code] = Number((maxValue > 0 ? (rawValue / maxValue) * 100 : 0).toFixed(2));
  }
  return out;
}

function sortScoreEntries(scoreMap = {}) {
  return Object.entries(scoreMap).sort((a, b) => b[1] - a[1]);
}

function selectPrimarySecondary(scores) {
  const sorted = sortScoreEntries(scores);
  return {
    primary: sorted[0] ? { code: sorted[0][0], score: sorted[0][1] } : null,
    secondary: sorted[1] ? { code: sorted[1][0], score: sorted[1][1] } : null,
    ranked: sorted.map(([code, score], i) => ({ rank: i + 1, code, score })),
  };
}

function deriveBalanceByScore(value) {
  if (value <= 34) return "underexpressed";
  if (value <= 69) return "balanced";
  return "overexpressed";
}

function interpretIdentityBehaviorGap(gap) {
  const abs = Math.abs(Number(gap) || 0);
  if (abs <= 9) return "congruent";
  if (abs <= 19) return "mild_gap";
  if (abs <= 29) return "meaningful_gap";
  return "major_self_perception_gap";
}

function interpretStressShift(shift) {
  const n = Number(shift) || 0;
  if (n >= -9 && n <= 9) return "stable";
  if (n >= 10 && n <= 19) return "moderate_activation";
  if (n >= 20) return "strong_stress_activation";
  return "suppression_deactivation";
}

function interpretDesiredCurrentGap(gap) {
  const n = Number(gap) || 0;
  if (n >= -10 && n <= 10) return "aligned";
  if (n >= 11 && n <= 24) return "moderate_growth_desire";
  if (n >= 25) return "major_aspirational_gap";
  if (n >= -24) return "active_reduction_desired";
  return "major_reduction_desired";
}

function normalizeQuestion(q) {
  return {
    id: q.id || q.question_id,
    bankId: q.bankId || q.bank_id,
    questionClass: q.questionClass || q.question_class,
    questionSubclass: q.questionSubclass || q.question_subclass || null,
    prompt: q.prompt,
    reversePairId: q.reversePairId || q.reverse_pair_id || null,
    desiredPairId: q.desiredPairId || q.desired_pair_id || null,
    isScored: q.isScored !== undefined ? q.isScored : q.is_scored !== false,
    isActive: q.isActive !== undefined ? q.isActive : q.is_active !== false,
    options: (q.options || []).map((opt) => ({
      id: opt.id || opt.option_id,
      text: opt.text,
      primary: opt.primary || opt.primary_archetype,
      secondary: opt.secondary || opt.secondary_archetype || null,
      weightType: opt.weightType || opt.weight_type || "standard",
      signalType: opt.signalType || opt.signal_type || q.questionClass || q.question_class,
    })),
  };
}

function pickOption(question, answer) {
  if (typeof answer === "string") return question.options.find((opt) => opt.id === answer) || question.options[2] || question.options[0];
  if (typeof answer === "number") return question.options[Math.max(0, Math.min(question.options.length - 1, Math.round(answer) - 1))] || question.options[0];
  return question.options[2] || question.options[0];
}

function resolveQuestionClass(q) {
  const klass = String(q.questionClass || "").trim().toUpperCase();
  return SIGNAL_MULTIPLIER[klass] ? klass : null;
}

function resolveMultiplier(q, selected) {
  const classKey = resolveQuestionClass(q);
  if (classKey) return SIGNAL_MULTIPLIER[classKey] || 1;
  return WEIGHT_TYPE_MULTIPLIER[selected?.weightType] || 1;
}

function scoreContributionForCode(code, q, option) {
  if (!option || !code) return 0;
  const multiplier = resolveMultiplier(q, option);
  let score = 0;
  if (option.primary === code) score += PRIMARY_WEIGHT * multiplier;
  if (option.secondary === code) score += SECONDARY_WEIGHT * multiplier;
  return score;
}

function computeMaxPossibleScores(questions, codes) {
  const maxPossible = Object.fromEntries(codes.map((code) => [code, 0]));
  for (const q of questions) {
    if (!q.isScored) continue;
    for (const code of codes) {
      let best = 0;
      for (const option of q.options || []) {
        best = Math.max(best, scoreContributionForCode(code, q, option));
      }
      maxPossible[code] += best;
    }
  }
  return maxPossible;
}

function scoreCanonicalAssessment(rawQuestions, answers = {}) {
  const questions = rawQuestions.map(normalizeQuestion).filter((q) => q.isActive !== false);
  const codes = Array.from(new Set(questions.flatMap((q) => q.options.flatMap((o) => [o.primary, o.secondary]).filter(Boolean))));
  const totals = Object.fromEntries(codes.map((code) => [code, 0]));
  const classRaw = { ID: {}, BH: {}, SC: {}, ST: {}, DS: {} };
  const maxPossibleScores = computeMaxPossibleScores(questions, codes);
  const answered = [];
  const answerIdx = {};

  for (const q of questions) {
    if (!Object.prototype.hasOwnProperty.call(answers, q.id)) continue;
    const selected = pickOption(q, answers[q.id]);
    if (!selected) continue;
    answered.push(q.id);
    answerIdx[q.id] = q.options.findIndex((opt) => opt.id === selected.id);

    if (!q.isScored) continue;
    const questionClass = resolveQuestionClass(q) || "BH";
    const baseWeight = resolveMultiplier(q, selected);

    totals[selected.primary] = (totals[selected.primary] || 0) + (PRIMARY_WEIGHT * baseWeight);
    classRaw[questionClass][selected.primary] = (classRaw[questionClass][selected.primary] || 0) + (PRIMARY_WEIGHT * baseWeight);

    if (selected.secondary) {
      totals[selected.secondary] = (totals[selected.secondary] || 0) + (SECONDARY_WEIGHT * baseWeight);
      classRaw[questionClass][selected.secondary] = (classRaw[questionClass][selected.secondary] || 0) + (SECONDARY_WEIGHT * baseWeight);
    }
  }

  const normalizedScores = normalizeByMaxPossible(totals, maxPossibleScores, codes);
  const selection = selectPrimarySecondary(normalizedScores);
  const topGap = selection.primary && selection.secondary ? Number((selection.primary.score - selection.secondary.score).toFixed(2)) : null;
  const hybridArchetype = topGap !== null && topGap <= 7 && selection.secondary
    ? { codes: [selection.primary.code, selection.secondary.code], gap: topGap, label: `${selection.primary.code}-${selection.secondary.code}` }
    : null;

  const classScores = {
    identity: normalizeMap(classRaw.ID, codes),
    behavior: normalizeMap(classRaw.BH, codes),
    scenario: normalizeMap(classRaw.SC, codes),
    stress: normalizeMap(classRaw.ST, codes),
    desired: normalizeMap(classRaw.DS, codes),
  };

  const balanceStates = { overall: deriveBalanceByScore(selection.primary?.score || 0), dimensions: {} };
  const desiredCurrentGap = {};
  const desiredCurrentInterpretation = {};
  const identityBehaviorGap = {};
  const identityBehaviorInterpretation = {};
  const stressShift = {};
  const stressShiftInterpretation = {};

  for (const code of codes) {
    const normalizedValue = normalizedScores[code] || 0;
    balanceStates.dimensions[code] = deriveBalanceByScore(normalizedValue);

    const dcGap = Number(((classScores.desired[code] || 0) - (classScores.behavior[code] || 0)).toFixed(2));
    desiredCurrentGap[code] = dcGap;
    desiredCurrentInterpretation[code] = interpretDesiredCurrentGap(dcGap);

    const ibGap = Number(((classScores.identity[code] || 0) - (classScores.behavior[code] || 0)).toFixed(2));
    identityBehaviorGap[code] = ibGap;
    identityBehaviorInterpretation[code] = interpretIdentityBehaviorGap(ibGap);

    const stShift = Number(((classScores.stress[code] || 0) - (classScores.behavior[code] || 0)).toFixed(2));
    stressShift[code] = stShift;
    stressShiftInterpretation[code] = interpretStressShift(stShift);
  }

  const pairDelta = [];
  for (const q of questions) {
    if (!q.reversePairId || q.id > q.reversePairId) continue;
    if (answerIdx[q.id] === undefined || answerIdx[q.reversePairId] === undefined) continue;
    pairDelta.push(Math.abs(answerIdx[q.id] - answerIdx[q.reversePairId]));
  }
  const contradictionScore = pairDelta.length ? Number(((pairDelta.reduce((a, b) => a + b, 0) / (pairDelta.length * 3)) * 100).toFixed(2)) : 0;
  const consistencyScore = Number((100 - contradictionScore).toFixed(2));

  const completionPct = Number(((answered.length / Math.max(questions.length, 1)) * 100).toFixed(2));
  const confidence = Number(((completionPct * 0.6) + (consistencyScore * 0.4)).toFixed(2));

  const summaryBlock = {
    completion: `${answered.length}/${questions.length}`,
    primary: selection.primary?.code || null,
    secondary: selection.secondary?.code || null,
    hybrid: hybridArchetype ? hybridArchetype.label : null,
    confidence,
  };

  const flags = {
    has_hybrid: Boolean(hybridArchetype),
    low_completion: completionPct < 85,
    low_consistency: consistencyScore < 60,
    retake_recommended: completionPct < 85 || consistencyScore < 60,
  };

  return {
    questionCount: questions.length,
    bankCounts: Object.fromEntries(Object.entries(groupBy(questions, "bankId")).map(([k, v]) => [k, v.length])),
    rawScores: totals,
    maxPossibleScores,
    normalizedScores,
    rankedArchetypes: selection.ranked,
    primaryArchetype: selection.primary,
    secondaryArchetype: selection.secondary,
    hybridArchetype,
    balanceStates,
    desiredCurrentGap,
    desiredCurrentInterpretation,
    identityBehaviorGap,
    identityBehaviorInterpretation,
    stressProfile: classScores.stress,
    stressShift,
    stressShiftInterpretation,
    contradictionConsistency: { contradiction: contradictionScore, consistency: consistencyScore },
    completionQuality: { answered: answered.length, total: questions.length, completionPercent: completionPct },
    confidence,
    summaryBlock,
    flags,
    retakeCompatibility: {
      compatible: true,
      supportsBankRotation: true,
      supportsContradictionPairs: true,
      signature: `v1:${questions.length}:${Object.keys(groupBy(questions, "bankId")).join(",")}`,
    },
    bankScores: classScores,
  };
}

function formatBehaviorFragment(text, fallback) {
  const normalized = String(text || "").trim();
  if (!normalized) return fallback;
  return normalized.replace(/\.$/, "").toLowerCase();
}

function safePct(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
}

function topEntry(map = {}, { abs = false, direction = "desc" } = {}) {
  const entries = Object.entries(map || {}).filter(([, value]) => Number.isFinite(Number(value)));
  if (!entries.length) return null;
  entries.sort((a, b) => {
    const left = abs ? Math.abs(Number(a[1])) : Number(a[1]);
    const right = abs ? Math.abs(Number(b[1])) : Number(b[1]);
    return direction === "asc" ? left - right : right - left;
  });
  const [code, value] = entries[0];
  return { code, value: Number(value) };
}

function magnitudeLabel(value) {
  const abs = Math.abs(Number(value) || 0);
  if (abs >= 12) return "strong";
  if (abs >= 6) return "clear";
  return "slight";
}

function buildResultInsights(scored, archetypeIndex = {}) {
  const primaryCode = scored?.primaryArchetype?.code;
  const secondaryCode = scored?.secondaryArchetype?.code;
  const primary = archetypeIndex[primaryCode] || {};
  const secondary = archetypeIndex[secondaryCode] || {};
  const hybrid = scored?.hybridArchetype;
  const normalizedScores = scored?.normalizedScores || {};
  const behavior = scored?.bankScores?.behavior || {};
  const desiredGap = scored?.desiredCurrentGap || {};
  const identityGap = scored?.identityBehaviorGap || {};
  const stressProfile = scored?.stressProfile || {};
  const stressShift = scored?.stressShift || {};
  const consistency = safePct(scored?.contradictionConsistency?.consistency);
  const confidence = safePct(scored?.confidence);

  const topBehavior = topEntry(behavior);
  const lowBehavior = topEntry(behavior, { direction: "asc" });
  const overGap = topEntry(desiredGap);
  const underGap = topEntry(desiredGap, { direction: "asc" });
  const identityTop = topEntry(identityGap, { abs: true });
  const stressTop = topEntry(stressProfile);
  const stressShiftTop = topEntry(stressShift, { abs: true });

  const primaryStrength = safePct(normalizedScores[primaryCode]);
  const secondaryStrength = safePct(normalizedScores[secondaryCode]);
  const hierarchyGap = Number((primaryStrength - secondaryStrength).toFixed(1));
  const hybridLead = hybrid ? `You are operating as a hybrid ${hybrid.label} profile with only a ${Number(hybrid.gap || 0).toFixed(1)}-point separation.` : "";
  const styleBlend = secondaryCode
    ? ` ${secondary.name || secondaryCode} shapes your backup response when ${primary.name || primaryCode} is not enough.`
    : "";

  const patternSignal = topBehavior?.code
    ? `Your highest lived pattern is ${archetypeIndex[topBehavior.code]?.name || topBehavior.code} (${topBehavior.value.toFixed(1)}%), while ${archetypeIndex[lowBehavior?.code]?.name || lowBehavior?.code || "your lowest pattern"} is least active (${safePct(lowBehavior?.value).toFixed(1)}%).`
    : "Your current pattern mix is still stabilizing.";

  const overLine = overGap?.code
    ? `${archetypeIndex[overGap.code]?.name || overGap.code} is the strongest \"want more\" signal (${overGap.value > 0 ? "+" : ""}${overGap.value.toFixed(1)}).`
    : "";
  const underLine = underGap?.code
    ? `${archetypeIndex[underGap.code]?.name || underGap.code} is the strongest \"want less\" signal (${underGap.value > 0 ? "+" : ""}${underGap.value.toFixed(1)}).`
    : "";

  const stressDirection = stressTop?.code
    ? `Stress activates ${archetypeIndex[stressTop.code]?.name || stressTop.code} first (${stressTop.value.toFixed(1)}%),`
    : "Stress activation is currently diffuse,";
  const stressShiftDirection = stressShiftTop?.code
    ? ` with the biggest shift toward ${archetypeIndex[stressShiftTop.code]?.name || stressShiftTop.code} (${stressShiftTop.value > 0 ? "+" : ""}${stressShiftTop.value.toFixed(1)} vs baseline).`
    : "";

  const identityLine = identityTop?.code
    ? `Your largest identity-behavior gap is ${archetypeIndex[identityTop.code]?.name || identityTop.code} (${identityTop.value > 0 ? "+" : ""}${identityTop.value.toFixed(1)}), a ${magnitudeLabel(identityTop.value)} mismatch between self-image and lived behavior.`
    : "Identity and behavior signals are mostly aligned.";

  const consistencyBand = consistency >= 80 ? "high" : consistency >= 60 ? "moderate" : "low";
  const confidenceBand = confidence >= 80 ? "high" : confidence >= 60 ? "moderate" : "low";

  return {
    primaryInsight: `${hybridLead ? `${hybridLead} ` : ""}You primarily lead with ${primary.name || primaryCode || "your dominant pattern"} (${primaryStrength.toFixed(1)}%) and ${primary.coreEnergy || "a clear core drive"}. ${patternSignal}`,
    secondaryInsight: `Your secondary pattern is ${secondary.name || secondaryCode || "secondary"} (${secondaryStrength.toFixed(1)}%), creating a ${hierarchyGap.toFixed(1)}-point gap from your primary profile.${styleBlend}`,
    balanceInsight: `Current balance state is ${scored?.balanceStates?.overall || "balanced"}. ${overLine} ${underLine}`.trim(),
    stressInsight: `${stressDirection}${stressShiftDirection} You may ${formatBehaviorFragment(primary.outOfBalanceHigh, "shift into visible reactive patterns")} when this activation spikes.`,
    identityGapInsight: `${identityLine} Your biggest desired direction is to move ${underGap?.code ? `away from ${archetypeIndex[underGap.code]?.name || underGap.code}` : "away from lower-value habits"} and toward ${overGap?.code ? `${archetypeIndex[overGap.code]?.name || overGap.code}` : "your growth edge"}.`,
    consistencyInsight: `Consistency is ${consistency.toFixed(1)}% (${consistencyBand}) and confidence is ${confidence.toFixed(1)}% (${confidenceBand}). ${consistency < 60 ? "Use smaller, repeatable actions to reduce contradiction across contexts." : "Your response pattern is stable enough to trust for daily decisions."}`,
  };
}

function withInsights(engineType, scored) {
  const content = getEngineContent(engineType) || { archetypes: [] };
  const archetypeIndex = Object.fromEntries((content.archetypes || []).map((item) => [item.code, item]));
  return { ...scored, ...buildResultInsights(scored, archetypeIndex) };
}

function filterQuestionsByAnsweredBank(rawQuestions, answers = {}, requestedBankId = null) {
  const questions = rawQuestions.map(normalizeQuestion).filter((q) => q.isActive !== false);
  const grouped = groupBy(questions, "bankId");
  const bankIds = Object.keys(grouped);
  if (requestedBankId && grouped[requestedBankId]) return grouped[requestedBankId];

  const answerIds = new Set(Object.keys(answers || {}));
  const matchedBanks = bankIds.filter((bankId) => grouped[bankId].some((q) => answerIds.has(q.id)));
  if (matchedBanks.length === 1) return grouped[matchedBanks[0]];
  return questions;
}

function scoreLoveAssessment(answers = {}) {
  return scoreCanonicalAssessment(LOVE_QUESTIONS, answers);
}

function scoreEngineAssessment(engineType, answers = {}, opts = {}) {
  if (engineType === "love") {
    const bankScopedQuestions = filterQuestionsByAnsweredBank(LOVE_QUESTIONS, answers, opts.bankId || null);
    return withInsights(engineType, scoreCanonicalAssessment(bankScopedQuestions, answers));
  }
  if (engineType === "leadership") return withInsights(engineType, scoreCanonicalAssessment(LEADERSHIP_QUESTIONS, answers));
  if (engineType === "loyalty") return withInsights(engineType, scoreCanonicalAssessment(LOYALTY_QUESTIONS, answers));
  return null;
}

function getQuestionBanks(engineType, opts = {}) {
  if (engineType === "love") {
    const questions = LOVE_QUESTIONS.map(normalizeQuestion).filter((q) => q.isActive !== false);
    const grouped = groupBy(questions, "bankId");
    const bankIds = Object.keys(grouped).sort();
    const attempt = Number(opts.retakeAttempt || 0);
    const bankId = bankIds.length ? bankIds[((attempt % bankIds.length) + bankIds.length) % bankIds.length] : null;
    return {
      selectedBankId: bankId,
      availableBanks: bankIds,
      retakeAttempt: attempt,
      questionBanks: Object.fromEntries(bankIds.map((id) => [id, grouped[id]])),
      activeQuestions: bankId ? grouped[bankId] : [],
    };
  }
  if (engineType === "leadership") return groupBy(LEADERSHIP_QUESTIONS.map(normalizeQuestion), "bankId");
  if (engineType === "loyalty") return groupBy(LOYALTY_QUESTIONS.map(normalizeQuestion), "bankId");
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
    if ([resultA?.primaryArchetype?.code, resultA?.secondaryArchetype?.code].includes(d.pair[0])
      && [resultB?.primaryArchetype?.code, resultB?.secondaryArchetype?.code].includes(d.pair[1])) dynamicBonus += d.scoreBias;
  }

  const compatibility = Math.min(100, Number((base + dynamicBonus).toFixed(2)));
  return { compatibility, baseAlignment: Number(base.toFixed(2)), dynamicBonus, tier: compatibility >= 80 ? "high" : compatibility >= 60 ? "moderate" : "developing" };
}

function getEngineContent(engineType) {
  if (engineType === "love") return { archetypes: LOVE_ARCHETYPES, dynamics: LOVE_DYNAMICS };
  if (engineType === "leadership") return { archetypes: LEADERSHIP_ARCHETYPES, dynamics: [] };
  if (engineType === "loyalty") return { archetypes: LOYALTY_ARCHETYPES, dynamics: [] };
  return null;
}

async function initializeArchetypeEngineSchema(pool) {
  await pool.query("CREATE TABLE IF NOT EXISTS engine_assessments (id TEXT PRIMARY KEY, engine_type TEXT NOT NULL, tenant_slug TEXT, session_id TEXT, user_id TEXT, campaign_context TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());");
  await pool.query("CREATE TABLE IF NOT EXISTS engine_results (result_id TEXT PRIMARY KEY, assessment_id TEXT, engine_type TEXT NOT NULL, tenant_slug TEXT, result_payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());");
  await pool.query("CREATE TABLE IF NOT EXISTS engine_compatibility_results (id TEXT PRIMARY KEY, engine_type TEXT NOT NULL, tenant_slug TEXT, payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());");
  await pool.query("CREATE TABLE IF NOT EXISTS engine_page_views (id TEXT PRIMARY KEY, engine_type TEXT NOT NULL, tenant_slug TEXT, page_key TEXT NOT NULL, session_id TEXT, user_id TEXT, campaign_context TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());");
  await pool.query("CREATE TABLE IF NOT EXISTS engine_assessment_consents (id TEXT PRIMARY KEY, engine_type TEXT NOT NULL, tenant_slug TEXT, email TEXT NOT NULL, full_name TEXT NOT NULL, consent_version TEXT NOT NULL DEFAULT 'v1', consent_type TEXT NOT NULL DEFAULT 'business_only_required', accepted BOOLEAN NOT NULL, consent_signature TEXT NOT NULL, session_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());");
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
  WEIGHT_TYPE_MULTIPLIER,
  getQuestionBanks,
  getEngineContent,
  scoreLoveAssessment,
  scoreEngineAssessment,
  computeLoveCompatibility,
  initializeArchetypeEngineSchema,
  newId,
};
