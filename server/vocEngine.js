// FILE: server/vocEngine.js
// ✅ New-only, deterministic, backend-safe
// ✅ Stable tie-breaks (score desc, then trait name asc)
// ✅ Validates/normalizes answers (A/B/C/D), ignores junk
// ✅ No DB access, pure functions

"use strict";

const TRAITS = [
  "discount_driven",
  "relationship_driven",
  "urgency_driven",
  "trust_driven",
  "convenience_driven"
];

const SCORING_MAP = Object.freeze({
  A: Object.freeze({ discount_driven: 2, urgency_driven: 1 }),
  B: Object.freeze({ relationship_driven: 2, trust_driven: 1 }),
  C: Object.freeze({ convenience_driven: 2, trust_driven: 1 }),
  D: Object.freeze({ urgency_driven: 2, discount_driven: 1 })
});

const ENGAGEMENT_STYLE_MAP = Object.freeze({
  discount_driven: "sms",
  relationship_driven: "community",
  urgency_driven: "push",
  trust_driven: "email",
  convenience_driven: "self_service"
});

const TRIGGER_MAP = Object.freeze({
  discount_driven: "discount",
  relationship_driven: "community",
  urgency_driven: "urgency",
  trust_driven: "social_proof",
  convenience_driven: "ease"
});

const FRICTION_MAP = Object.freeze({
  discount_driven: "high_price",
  relationship_driven: "lack_of_personal_touch",
  urgency_driven: "slow_response",
  trust_driven: "low_trust",
  convenience_driven: "complex_checkout"
});

const LOYALTY_MAP = Object.freeze({
  discount_driven: "exclusive_offers",
  relationship_driven: "personalized_followups",
  urgency_driven: "fast_fulfillment",
  trust_driven: "consistent_quality",
  convenience_driven: "frictionless_experience"
});

function emptyScores() {
  const scores = {};
  for (const t of TRAITS) scores[t] = 0;
  return scores;
}

function normalizeAnswer(a) {
  const s = String(a || "").trim().toUpperCase();
  return s === "A" || s === "B" || s === "C" || s === "D" ? s : null;
}

function scoreVOCAnswers(answers = []) {
  const scores = emptyScores();

  for (const raw of answers) {
    const key = normalizeAnswer(raw);
    if (!key) continue;

    const weights = SCORING_MAP[key];
    for (const [trait, weight] of Object.entries(weights)) {
      scores[trait] += Number(weight) || 0;
    }
  }

  return scores;
}

function getDominantTraits(scores) {
  const entries = Object.entries(scores || {}).filter(([trait, v]) => TRAITS.includes(trait) && Number.isFinite(Number(v)));

  // Stable tie-breaker: score desc, then trait asc
  entries.sort((a, b) => {
    const diff = Number(b[1]) - Number(a[1]);
    if (diff !== 0) return diff;
    return String(a[0]).localeCompare(String(b[0]));
  });

  return entries.map(([trait]) => trait);
}

function generateVOCProfile(scores) {
  const ranked = getDominantTraits(scores);
  const primary = ranked[0] || null;
  const secondary = ranked[1] || null;

  if (!primary) {
    return {
      customer_profile: null,
      engagement_style: null,
      buying_trigger: null,
      friction_point: null,
      loyalty_driver: null,
      scores: scores || emptyScores()
    };
  }

  return {
    customer_profile: primary,
    engagement_style: ENGAGEMENT_STYLE_MAP[primary] || null,
    buying_trigger: TRIGGER_MAP[primary] || null,
    friction_point: (secondary && FRICTION_MAP[secondary]) || FRICTION_MAP[primary] || null,
    loyalty_driver: LOYALTY_MAP[primary] || null,
    scores
  };
}

function mergeVOCIntoConfig(existingConfig = {}, vocResult) {
  const merged = { ...(existingConfig || {}) };

  if (!vocResult || !vocResult.engagement_style) {
    return merged;
  }

  if (vocResult.engagement_style === "sms") merged.engagement_engine = true;
  if (vocResult.buying_trigger === "discount") merged.reward_system = true;
  if (vocResult.friction_point === "slow_response") merged.automation_blueprints = true;

  merged.voc_profile = {
    customer_profile: vocResult.customer_profile || null,
    engagement_style: vocResult.engagement_style || null,
    buying_trigger: vocResult.buying_trigger || null,
    friction_point: vocResult.friction_point || null,
    loyalty_driver: vocResult.loyalty_driver || null,
    updated_at: new Date().toISOString()
  };

  return merged;
}

module.exports = {
  scoreVOCAnswers,
  generateVOCProfile,
  mergeVOCIntoConfig
};
