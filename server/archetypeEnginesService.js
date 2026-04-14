"use strict";

const crypto = require("crypto");
const fs = require("node:fs");
const path = require("node:path");

const LOVE_ARCHETYPES = require("../archetype-engines/content/loveArchetypes");
const LOVE_DYNAMICS = require("../archetype-engines/content/loveCoupleDynamics");
const LEADERSHIP_ARCHETYPES = require("../archetype-engines/content/leadershipArchetypes");
const LOYALTY_ARCHETYPES = require("../archetype-engines/content/loyaltyArchetypes");
const AUTHORED_LOVE_BANK_1 = require("../archetype-engines/question-banks/love.bank1");
const LEADERSHIP_BANK1 = require("../archetype-engines/question-banks/leadership.bank1");
const LEADERSHIP_BANK2 = require("../archetype-engines/question-banks/leadership.bank2");
const LEADERSHIP_BANK3 = require("../archetype-engines/question-banks/leadership.bank3");
const LOYALTY_BANK1 = require("../archetype-engines/question-banks/loyalty.bank1");
const LOYALTY_BANK2 = require("../archetype-engines/question-banks/loyalty.bank2");
const LOYALTY_BANK3 = require("../archetype-engines/question-banks/loyalty.bank3");
const ROOT_DIR = path.resolve(__dirname, "..");
const LOVE_PROMOTION_MANIFEST = path.join(ROOT_DIR, "artifacts", "love-banks", "promotion-manifest.json");
const LEADERSHIP_PROMOTION_MANIFEST = path.join(ROOT_DIR, "artifacts", "leadership-banks", "promotion-manifest.json");
const LOYALTY_PROMOTION_MANIFEST = path.join(ROOT_DIR, "artifacts", "loyalty-banks", "promotion-manifest.json");

const { buildOutputContract } = require("../assessment-core/outputContract");
const { attributionSnapshot } = require("../assessment-core/attribution");
const { REVIEW_STATUSES, resolveGeneratedBank } = require("../assessment-core/sourceResolver");

const ENGINE_TYPES = Object.freeze(["love", "leadership", "loyalty"]);
const SIGNAL_MULTIPLIER = Object.freeze({ ID: 1.0, BH: 1.0, SC: 1.25, ST: 1.5, DS: 1.0 });
const WEIGHT_TYPE_MULTIPLIER = Object.freeze({ standard: 1.0, baseline: 1.0, scenario: 1.25, stress: 1.5, desired: 1.0, identity: 1.0 });
const PRIMARY_WEIGHT = 2;
const SECONDARY_WEIGHT = 1;
const LEADERSHIP_AUTHORED_BANK_1 = Object.freeze([...LEADERSHIP_BANK1]);
const LEADERSHIP_SKELETON_BANKS = Object.freeze({ LEADERSHIP_BANK_1: LEADERSHIP_BANK1, LEADERSHIP_BANK_2: LEADERSHIP_BANK2, LEADERSHIP_BANK_3: LEADERSHIP_BANK3 });
const LOYALTY_AUTHORED_BANK_1 = Object.freeze([...LOYALTY_BANK1]);
const LOYALTY_AUTHORED_BANK_2 = Object.freeze([...LOYALTY_BANK2]);
const LOYALTY_AUTHORED_BANK_3 = Object.freeze([...LOYALTY_BANK3]);
const LOYALTY_SKELETON_BANKS = Object.freeze({ LOYALTY_BANK_1: LOYALTY_BANK1, LOYALTY_BANK_2: LOYALTY_BANK2, LOYALTY_BANK_3: LOYALTY_BANK3 });
const LOYALTY_DIMENSION_NAMES = Object.freeze({
  TD: "Trust Dependence",
  SA: "Satisfaction Attachment",
  ECM: "Emotional Commitment",
  CH: "Convenience Habit",
  SF: "Switching Friction",
});
const LOYALTY_COMMUNICATION_RULES = Object.freeze({
  TD: Object.freeze({
    tone: "confident",
    style: "direct",
    messaging_focus: "trust_reinforcement",
    retention_hook: "consistency + proof + transparency",
    churn_trigger: "broken promises, inconsistency, hidden changes",
    plain_language_summary: "You tend to stay loyal when people feel consistent and dependable. If trust breaks, everything can shift quickly.",
    best_way_to_talk_to_them: "Be clear, calm, and transparent. Avoid hype and back claims with proof.",
    what_keeps_them_engaged: "Consistency, accountability, and people following through over time.",
    what_pushes_them_away: "Surprises without explanation, broken promises, or trust gaps.",
    loyalty_loop: { label: "Trust → Satisfaction → Trust", meaning: "Proof builds confidence, confidence sustains repeat behavior, and repeat behavior reinforces trust.", why: "When trust stays intact, loyalty tends to strengthen naturally.", breakPoint: "Any credibility break can collapse the loop quickly.", plain: "When someone feels reliable and keeps doing what they promised, your loyalty usually gets stronger." },
    realWorld: "You tend to stay loyal when you feel safe, consistent, and sure about someone.",
    relationships: {
      summary: "You’re loyal when you feel safe, consistent, and sure about someone.",
      romantic: "In partnerships, trust tends to be everything for you. Once it is solid, you may stay deeply committed — but if it breaks, rebuilding can take time.",
      friendship: "You often stay close to friends who show up consistently. You may pull back when people feel unpredictable.",
      family: "You usually value reliability and honesty in family bonds. Trust strain may create emotional distance over time.",
    },
  }),
  SA: Object.freeze({
    tone: "practical",
    style: "clear",
    messaging_focus: "value_reinforcement",
    retention_hook: "quality + usefulness + continued payoff",
    churn_trigger: "declining performance, inconsistency, wasted effort",
    plain_language_summary: "If the connection keeps feeling worthwhile, you tend to stay. If it stops feeling worth the effort, you may move on.",
    best_way_to_talk_to_them: "Emphasize outcomes, quality, and clear improvements.",
    what_keeps_them_engaged: "Consistent payoff in time, energy, and emotional effort.",
    what_pushes_them_away: "Value erosion, inconsistent quality, and effort that no longer pays off.",
    loyalty_loop: { label: "Satisfaction → Habit → Satisfaction", meaning: "Repeated positive experiences build routine, and routine raises your satisfaction baseline.", why: "Reliable follow-through tends to protect long-term loyalty.", breakPoint: "A noticeable dip often triggers quick re-evaluation.", plain: "You usually stay when the connection keeps working well. Once the value drops, loyalty can soften quickly." },
    realWorld: "You tend to stay when the relationship keeps proving it’s worth your time and effort.",
    relationships: {
      summary: "You tend to stay loyal when relationships keep feeling worthwhile and mutually supportive.",
      romantic: "In dating or partnership, you often stay committed when effort feels mutual and the relationship keeps growing.",
      friendship: "You usually invest in friendships that feel balanced and dependable over time.",
      family: "You may stay engaged in family dynamics when respect and follow-through are present in everyday interactions.",
    },
  }),
  ECM: Object.freeze({
    tone: "warm",
    style: "human",
    messaging_focus: "connection_reinforcement",
    retention_hook: "recognition + belonging + authenticity",
    churn_trigger: "feeling fake, unseen, manipulated, emotionally disconnected",
    plain_language_summary: "Loyalty feels personal for you. You tend to stay where you feel seen, valued, and emotionally connected.",
    best_way_to_talk_to_them: "Be expressive and human. Make them feel seen, and avoid scripted language.",
    what_keeps_them_engaged: "Authentic recognition, identity fit, and emotional resonance.",
    what_pushes_them_away: "Performative messaging, manipulation, or feeling emotionally ignored.",
    loyalty_loop: { label: "Connection → Meaning → Commitment", meaning: "Feeling seen creates meaning, and meaning deepens long-term commitment.", why: "Emotional resonance often anchors loyalty even when alternatives exist.", breakPoint: "Perceived inauthenticity can dissolve attachment quickly.", plain: "When someone feels real and personal, your loyalty deepens. If it feels performative, you tend to detach." },
    realWorld: "You tend to stay when a relationship feels meaningful and emotionally real.",
    relationships: {
      summary: "You tend to stay loyal when you feel emotionally seen, understood, and connected.",
      romantic: "In partnerships, emotional presence often matters as much as practical compatibility for you.",
      friendship: "You usually stay close to people who feel genuine and emotionally available.",
      family: "You may invest deeply in family bonds that feel heartfelt, but you can distance when interactions feel cold or performative.",
    },
  }),
  CH: Object.freeze({
    tone: "simple",
    style: "frictionless",
    messaging_focus: "ease_reinforcement",
    retention_hook: "simplicity + fit + default flow",
    churn_trigger: "added effort, friction, broken routine, complication",
    plain_language_summary: "You stay with what fits your flow. If it gets harder than it should be, you start looking elsewhere.",
    best_way_to_talk_to_them: "Keep messages short, clear, and effortless to act on.",
    what_keeps_them_engaged: "Speed, convenience, and predictable low-friction routines.",
    what_pushes_them_away: "New steps, added complexity, and interruptions to familiar flow.",
    loyalty_loop: { label: "Ease → Habit → Ease", meaning: "Low effort creates repeat behavior, and repetition raises the value of ease.", why: "Habit-based loyalty tends to hold when routines stay smooth.", breakPoint: "Even small friction can trigger exploration elsewhere.", plain: "When interactions stay easy, you tend to stay. If the flow breaks, loyalty can weaken quickly." },
    realWorld: "You stay with what fits your routine and doesn’t make life harder.",
    relationships: {
      summary: "You tend to stay loyal when connection feels easy, stable, and low-friction.",
      romantic: "In partnerships, smooth communication and practical compatibility often help you feel secure and committed.",
      friendship: "You usually keep close friendships that feel natural and easy to maintain.",
      family: "You may stay most engaged with family members when interactions feel simple, respectful, and drama-light.",
    },
  }),
  SF: Object.freeze({
    tone: "pragmatic",
    style: "blunt",
    messaging_focus: "practical_tradeoff",
    retention_hook: "stability + not worth switching + cost/effort awareness",
    churn_trigger: "easy escape path, accumulated resentment, better low-friction alternative",
    plain_language_summary: "You usually don’t leave unless it’s really worth it. Most of the time, switching just feels like too much.",
    best_way_to_talk_to_them: "Be practical and transparent about the tradeoff of staying vs leaving.",
    what_keeps_them_engaged: "Stable outcomes and clear reasons why staying is still efficient.",
    what_pushes_them_away: "A painless alternative plus built-up frustration from feeling trapped.",
    loyalty_loop: { label: "Stability → Friction → Stability", meaning: "Stability and switching effort reinforce continuation.", why: "Loyalty often holds until a clearly easier alternative appears.", breakPoint: "Resentment plus easy alternatives can flip behavior quickly.", plain: "You tend to stay put unless moving becomes clearly easier or better." },
    realWorld: "You usually stay unless leaving becomes easier or more worth it.",
    relationships: {
      summary: "You often stay loyal through difficulty, especially when leaving feels costly or disruptive.",
      romantic: "In partnership, you may hold on longer than most and leave only when a clear breaking point is reached.",
      friendship: "You often keep long-standing friendships, even when they become complicated, until the strain outweighs the bond.",
      family: "You may remain committed to family ties through ups and downs, but unresolved resentment can eventually force distance.",
    },
  }),
});

function loyaltyDimensionLabel(code) {
  return LOYALTY_DIMENSION_NAMES[String(code || "").trim().toUpperCase()] || String(code || "").trim().toUpperCase() || "Loyalty Pattern";
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveGeneratedValidatedLoveSource() {
  const manifest = readJsonIfExists(LOVE_PROMOTION_MANIFEST);
  if (!manifest || !Array.isArray(manifest.banks)) {
    return {
      sourceType: "no_generated_bank_available",
      sourcePath: null,
      questions: [],
      bankId: null,
      reviewStatus: null,
    };
  }

  const requestedBankId = String(process.env.LOVE_LIVE_BANK_ID || "").trim().toUpperCase();
  const approvedBanks = manifest.banks
    .filter((entry) => String(entry?.review_status || "") === "approved_for_live_candidate")
    .sort((left, right) => new Date(String(right.generated_at || 0)).getTime() - new Date(String(left.generated_at || 0)).getTime());

  const selected = requestedBankId
    ? approvedBanks.find((entry) => String(entry.bank_id || "").toUpperCase() === requestedBankId)
    : approvedBanks[0];

  if (!selected) {
    return {
      sourceType: "no_generated_bank_available",
      sourcePath: null,
      questions: [],
      bankId: null,
      reviewStatus: null,
    };
  }

  const promotedFile = path.resolve(ROOT_DIR, String(selected?.source_artifact_paths?.generatedFile || ""));
  const promotedQuestions = readJsonIfExists(promotedFile);
  if (!Array.isArray(promotedQuestions) || promotedQuestions.length !== 25) {
    return {
      sourceType: "invalid_generated_bank_artifact",
      sourcePath: path.relative(ROOT_DIR, promotedFile),
      questions: [],
      bankId: String(selected.bank_id || "").trim() || null,
      reviewStatus: String(selected.review_status || "").trim() || null,
    };
  }

  return {
    sourceType: "generated_validated_bank",
    sourcePath: path.relative(ROOT_DIR, promotedFile),
    questions: promotedQuestions,
    bankId: String(selected.bank_id || "").trim() || null,
    reviewStatus: String(selected.review_status || "").trim() || null,
  };
}

const LOVE_GENERATED_SOURCE = Object.freeze(resolveGeneratedValidatedLoveSource());
const LOVE_QUESTION_SOURCE = Object.freeze({
  authored: {
    sourceType: "authored_bank_1",
    sourcePath: "archetype-engines/question-banks/love.bank1.js",
    bankId: "AUTHORED_BANK_1",
    questionCount: AUTHORED_LOVE_BANK_1.length,
  },
  generated: {
    sourceType: LOVE_GENERATED_SOURCE.sourceType,
    sourcePath: LOVE_GENERATED_SOURCE.sourcePath,
    bankId: LOVE_GENERATED_SOURCE.bankId,
    questionCount: LOVE_GENERATED_SOURCE.questions.length,
    reviewStatus: LOVE_GENERATED_SOURCE.reviewStatus,
  },
  useGeneratorOnFirstAttempt: false,
});

const LOVE_QUESTIONS = Object.freeze([...AUTHORED_LOVE_BANK_1, ...LOVE_GENERATED_SOURCE.questions]);
const LEADERSHIP_QUESTIONS = Object.freeze([...LEADERSHIP_AUTHORED_BANK_1]);
const LOYALTY_QUESTIONS = Object.freeze([...LOYALTY_AUTHORED_BANK_1, ...LOYALTY_AUTHORED_BANK_2, ...LOYALTY_AUTHORED_BANK_3]);


function resolveGovernedEngineSource({ engineType, attempt = 0, authoredBankId, authoredSourceType = "authored_bank_1", authoredQuestions = [], manifestPath }) {
  const authoredNormalized = authoredQuestions.map(normalizeQuestion).filter((q) => q.isActive !== false);
  if (attempt <= 0) {
    return {
      selectedBankId: authoredBankId,
      availableBanks: [authoredBankId],
      retakeAttempt: attempt,
      questionSource: authoredSourceType,
      useGeneratorOnFirstAttempt: false,
      generatedBankAvailable: false,
      promotionStatuses: REVIEW_STATUSES,
      questionBanks: { [authoredBankId]: authoredNormalized },
      activeQuestions: authoredNormalized,
      diagnostics: { engineType, questionSource: authoredSourceType, manifestPath: path.relative(ROOT_DIR, manifestPath), reviewStatus: null },
    };
  }
  const generated = resolveGeneratedBank({ rootDir: ROOT_DIR, manifestPath });
  const generatedQuestions = (generated.questions || []).map(normalizeQuestion).filter((q) => q.isActive !== false);
  return {
    selectedBankId: generated.available ? generated.bankId : null,
    availableBanks: generated.available ? [generated.bankId] : [],
    retakeAttempt: attempt,
    questionSource: "generated_validated_bank",
    useGeneratorOnFirstAttempt: false,
    generatedBankAvailable: Boolean(generated.available),
    promotionStatuses: REVIEW_STATUSES,
    questionBanks: generated.available ? { [generated.bankId]: generatedQuestions } : {},
    activeQuestions: generated.available ? generatedQuestions : [],
    diagnostics: {
      engineType,
      questionSource: "generated_validated_bank",
      generatedReason: generated.reason || null,
      manifestPath: path.relative(ROOT_DIR, manifestPath),
      generatedSourcePath: generated.sourcePath || null,
      reviewStatus: generated.reviewStatus || null,
    },
  };
}

const LEADERSHIP_QUESTION_SOURCE = Object.freeze({
  authored: { sourceType: "authored_bank_1", sourcePath: "archetype-engines/engines/leadership/question-banks/leadership.bank1.js", bankId: "AUTHORED_BANK_1", questionCount: LEADERSHIP_AUTHORED_BANK_1.length },
  generated: { sourceType: "promotion_manifest_governed", sourcePath: path.relative(ROOT_DIR, LEADERSHIP_PROMOTION_MANIFEST), statuses: REVIEW_STATUSES },
  useGeneratorOnFirstAttempt: false,
});

const LOYALTY_QUESTION_SOURCE = Object.freeze({
  authored: { sourceType: "authored_bank_1", sourcePath: "archetype-engines/engines/loyalty/question-banks/loyalty.bank1.js", bankId: "AUTHORED_BANK_1", questionCount: LOYALTY_AUTHORED_BANK_1.length },
  authoredSequence: [
    { sourceType: "authored_bank_1", sourcePath: "archetype-engines/engines/loyalty/question-banks/loyalty.bank1.js", bankId: "AUTHORED_BANK_1", questionCount: LOYALTY_AUTHORED_BANK_1.length },
    { sourceType: "authored_bank_2", sourcePath: "archetype-engines/engines/loyalty/question-banks/loyalty.bank2.js", bankId: "AUTHORED_BANK_2", questionCount: LOYALTY_AUTHORED_BANK_2.length },
    { sourceType: "authored_bank_3", sourcePath: "archetype-engines/engines/loyalty/question-banks/loyalty.bank3.js", bankId: "AUTHORED_BANK_3", questionCount: LOYALTY_AUTHORED_BANK_3.length },
  ],
  generated: { sourceType: "promotion_manifest_governed", sourcePath: path.relative(ROOT_DIR, LOYALTY_PROMOTION_MANIFEST), statuses: REVIEW_STATUSES },
  useGeneratorOnFirstAttempt: false,
});

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

function buildLoyaltyCommunicationProfile(scored) {
  const primaryCode = scored?.primaryArchetype?.code;
  const secondaryCode = scored?.secondaryArchetype?.code;
  const primaryRule = LOYALTY_COMMUNICATION_RULES[primaryCode] || LOYALTY_COMMUNICATION_RULES.TD;
  return {
    primary_driver: primaryCode || "TD",
    secondary_driver: secondaryCode || primaryCode || "TD",
    tone: primaryRule.tone,
    style: primaryRule.style,
    messaging_focus: primaryRule.messaging_focus,
    retention_hook: primaryRule.retention_hook,
    churn_trigger: primaryRule.churn_trigger,
    plain_language_summary: primaryRule.plain_language_summary,
    best_way_to_talk_to_them: primaryRule.best_way_to_talk_to_them,
    what_keeps_them_engaged: primaryRule.what_keeps_them_engaged,
    what_pushes_them_away: primaryRule.what_pushes_them_away,
  };
}

function buildLoyaltyInsights(scored, archetypeIndex = {}) {
  const profile = buildLoyaltyCommunicationProfile(scored);
  const primaryCode = profile.primary_driver;
  const secondaryCode = profile.secondary_driver;
  const primaryName = archetypeIndex[primaryCode]?.name || archetypeIndex[primaryCode]?.canonicalName || loyaltyDimensionLabel(primaryCode);
  const secondaryName = archetypeIndex[secondaryCode]?.name || archetypeIndex[secondaryCode]?.canonicalName || loyaltyDimensionLabel(secondaryCode);
  const primaryScore = Number(scored?.normalizedScores?.[primaryCode] || 0).toFixed(1);
  const loyaltyState = scored?.balanceStates?.overall || "balanced";
  const loyaltyLoop = LOYALTY_COMMUNICATION_RULES[primaryCode]?.loyalty_loop || LOYALTY_COMMUNICATION_RULES.TD.loyalty_loop;
  const relationshipPatterns = LOYALTY_COMMUNICATION_RULES[primaryCode]?.relationships || LOYALTY_COMMUNICATION_RULES.TD.relationships;
  const retentionGap = strongestGap(scored?.desiredCurrentGap || {});
  const perceivedVsActual = strongestGap(scored?.identityBehaviorGap || {});
  const humanLoyaltyPattern = `You often show loyalty through ${primaryName.toLowerCase()}: you stay when this need feels met.`;
  const humanLoyaltyState = `Right now, your loyalty pattern tends to feel ${loyaltyState}.`;
  const humanRetentionInsight = `In real life, your loyalty grows when this is present: ${profile.retention_hook}.`;
  const humanChurnRiskInsight = `You may start pulling back when this shows up: ${profile.churn_trigger}.`;

  return {
    communication_profile: profile,
    whyThisMatters: "Loyalty is multi-mechanism: trust, satisfaction, emotional connection, routine, and switching friction each influence long-term relationship stability differently.",
    scientificFoundation: "Multi-Mechanism Loyalty Model integrating cognitive, emotional, behavioral, and structural retention drivers.",
    loyaltyPattern: `${primaryName} is your dominant loyalty driver (${primaryScore}%), with ${secondaryName} as your secondary pattern.`,
    loyaltyState: `Your current loyalty state is ${loyaltyState}.`,
    retentionInsight: `Your retention hook is ${profile.retention_hook}.`,
    churnRiskInsight: `Your strongest pull-away trigger is ${profile.churn_trigger}.`,
    loyaltyLoop: {
      label: loyaltyLoop.label,
      what_it_means: loyaltyLoop.meaning,
      why_it_matters: loyaltyLoop.why,
      break_point: loyaltyLoop.breakPoint,
      plain_language_translation: loyaltyLoop.plain,
    },
    loyaltyStrengtheningPlan: [
      `Lead communication with a ${profile.tone} tone and ${profile.style} delivery style.`,
      `Reinforce ${profile.messaging_focus.replace(/_/g, " ")} in every high-impact touchpoint.`,
      `Protect against churn triggers: ${profile.churn_trigger}.`,
    ],
    loyaltyHumanTranslations: {
      loyaltyPattern: humanLoyaltyPattern,
      loyaltyState: humanLoyaltyState,
      retentionInsight: humanRetentionInsight,
      churnRiskInsight: humanChurnRiskInsight,
    },
    relationshipInterpretation: {
      sectionTitle: "How This Shows Up In Your Relationships",
      relationshipSummary: relationshipPatterns.summary,
      romanticPartnerPattern: relationshipPatterns.romantic,
      friendshipPattern: relationshipPatterns.friendship,
      familyPattern: relationshipPatterns.family,
    },
    loveAssessmentCta: {
      sectionTitle: "Want a deeper relationship breakdown?",
      intro: "This shows how you form loyalty.",
      bridge: "But relationships go deeper than loyalty alone.",
      bullets: [
        "how you connect emotionally",
        "how you communicate",
        "what you need in a relationship",
      ],
      buttonLabel: "Take Love Assessment",
      href: "/archetype-engines/love/assessment",
    },
    churnTriggerProfile: profile.churn_trigger,
    retentionGap: retentionGap ? `${loyaltyDimensionLabel(retentionGap.code)} (${retentionGap.value > 0 ? "+" : ""}${retentionGap.value.toFixed(1)})` : "No retention gap signal detected.",
    perceivedVsActualLoyalty: perceivedVsActual ? `${loyaltyDimensionLabel(perceivedVsActual.code)} (${perceivedVsActual.value > 0 ? "+" : ""}${perceivedVsActual.value.toFixed(1)})` : "Perceived and actual loyalty are currently aligned.",
    uiScienceMapping: {
      primary_driver: "Dominant normalized dimension",
      secondary_driver: "Second-highest normalized dimension",
      retention_hook: "Retention reinforcement driver",
      churn_trigger: "Primary churn risk mechanism",
      loyalty_loop: "Dominant mechanism reinforcement cycle",
    },
    loyaltyArchetypeTranslations: Object.fromEntries(Object.entries(LOYALTY_COMMUNICATION_RULES).map(([code, rule]) => [code, rule.realWorld])),
    loyaltyDimensionLabels: LOYALTY_DIMENSION_NAMES,
  };
}

function strongestGap(map = {}) {
  const top = topEntry(map, { abs: true });
  if (!top) return null;
  return top;
}

function withInsights(engineType, scored) {
  const content = getEngineContent(engineType) || { archetypes: [] };
  const archetypeIndex = Object.fromEntries((content.archetypes || []).map((item) => [item.code, item]));
  const base = { ...scored, ...buildResultInsights(scored, archetypeIndex) };
  if (engineType !== "loyalty") return base;
  return { ...base, ...buildLoyaltyInsights(scored, archetypeIndex) };
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
  if (engineType === "loyalty") {
    const bankScopedQuestions = filterQuestionsByAnsweredBank(LOYALTY_QUESTIONS, answers, opts.bankId || null);
    return withInsights(engineType, scoreCanonicalAssessment(bankScopedQuestions, answers));
  }
  return null;
}

function getQuestionBanks(engineType, opts = {}) {
  if (engineType === "love") {
    const attempt = Number(opts.retakeAttempt || 0);
    const authoredQuestions = AUTHORED_LOVE_BANK_1.map(normalizeQuestion).filter((q) => q.isActive !== false);
    const generatedQuestions = LOVE_GENERATED_SOURCE.questions.map(normalizeQuestion).filter((q) => q.isActive !== false);

    if (attempt <= 0) {
      return {
        selectedBankId: "AUTHORED_BANK_1",
        availableBanks: ["AUTHORED_BANK_1"],
        retakeAttempt: attempt,
        questionSource: "authored_bank_1",
        useGeneratorOnFirstAttempt: false,
        questionBanks: { AUTHORED_BANK_1: authoredQuestions },
        activeQuestions: authoredQuestions,
      };
    }

    const generatedBankId = LOVE_GENERATED_SOURCE.bankId || null;
    const generatedAvailable = generatedQuestions.length === 25 && Boolean(generatedBankId);
    return {
      selectedBankId: generatedAvailable ? generatedBankId : null,
      availableBanks: generatedAvailable ? [generatedBankId] : [],
      retakeAttempt: attempt,
      questionSource: "generated_validated_bank",
      useGeneratorOnFirstAttempt: false,
      generatedBankAvailable: generatedAvailable,
      questionBanks: generatedAvailable ? { [generatedBankId]: generatedQuestions } : {},
      activeQuestions: generatedAvailable ? generatedQuestions : [],
    };
  }
  if (engineType === "leadership") {
    return resolveGovernedEngineSource({
      engineType,
      attempt: Number(opts.retakeAttempt || 0),
      authoredBankId: "AUTHORED_BANK_1",
      authoredQuestions: LEADERSHIP_AUTHORED_BANK_1,
      manifestPath: LEADERSHIP_PROMOTION_MANIFEST,
    });
  }
  if (engineType === "loyalty") {
    const completedAttempts = Number(opts.retakeAttempt || 0);
    const authoredSequence = [
      {
        selectedBankId: "AUTHORED_BANK_1",
        questionSource: "authored_bank_1",
        sourcePath: "archetype-engines/engines/loyalty/question-banks/loyalty.bank1.js",
        questions: LOYALTY_AUTHORED_BANK_1,
      },
      {
        selectedBankId: "AUTHORED_BANK_2",
        questionSource: "authored_bank_2",
        sourcePath: "archetype-engines/engines/loyalty/question-banks/loyalty.bank2.js",
        questions: LOYALTY_AUTHORED_BANK_2,
      },
      {
        selectedBankId: "AUTHORED_BANK_3",
        questionSource: "authored_bank_3",
        sourcePath: "archetype-engines/engines/loyalty/question-banks/loyalty.bank3.js",
        questions: LOYALTY_AUTHORED_BANK_3,
      },
    ];
    const attemptProfile = authoredSequence[completedAttempts];
    if (!attemptProfile) {
      return {
        selectedBankId: null,
        availableBanks: [],
        retakeAttempt: completedAttempts,
        questionSource: "governed_retake_unconfigured",
        useGeneratorOnFirstAttempt: false,
        generatedBankAvailable: false,
        promotionStatuses: REVIEW_STATUSES,
        questionBanks: {},
        activeQuestions: [],
        diagnostics: {
          engineType,
          questionSource: "governed_retake_unconfigured",
          reason: "attempt_limit_reached",
          completedAttempts,
          maxGovernedAttempts: authoredSequence.length,
        },
      };
    }
    const activeQuestions = attemptProfile.questions.map(normalizeQuestion).filter((q) => q.isActive !== false);
    return {
      selectedBankId: attemptProfile.selectedBankId,
      availableBanks: [attemptProfile.selectedBankId],
      retakeAttempt: completedAttempts,
      questionSource: attemptProfile.questionSource,
      useGeneratorOnFirstAttempt: false,
      generatedBankAvailable: false,
      promotionStatuses: REVIEW_STATUSES,
      questionBanks: { [attemptProfile.selectedBankId]: activeQuestions },
      activeQuestions,
      diagnostics: {
        engineType,
        questionSource: attemptProfile.questionSource,
        sourcePath: attemptProfile.sourcePath,
        completedAttempts,
      },
    };
  }
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



function toCanonicalResultPayload({ engineType, scored = {}, assessmentId = null, userId = null, version = "v1", bankId = null, questionSource = null, attribution = {} } = {}) {
  return buildOutputContract({
    assessment_id: assessmentId,
    user_id: userId,
    engine: engineType,
    version,
    bank_id: bankId,
    questionSource,
    attribution: attributionSnapshot(attribution),
    normalizedScores: scored.normalizedScores || {},
    rawScores: scored.rawScores || {},
    maxPossibleScores: scored.maxPossibleScores || {},
    balance_states: scored.balanceStates || {},
    stress_profile: scored.stressProfile || {},
    desired_gap: scored.desiredCurrentGap || {},
    identity_behavior_gap: scored.identityBehaviorGap || {},
    consistency: scored.contradictionConsistency || {},
    confidence: scored.confidence || 0,
    flags: scored.flags || {},
  });
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
  LOVE_QUESTION_SOURCE,
  LEADERSHIP_QUESTION_SOURCE,
  LOYALTY_QUESTION_SOURCE,
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
  toCanonicalResultPayload,
  newId,
};
