"use strict";

function sortScores(scores = {}) {
  return Object.entries(scores).sort((a, b) => b[1] - a[1]);
}

function buildOutputContract({
  assessment_id,
  user_id = null,
  engine,
  version = "v1",
  bank_id = null,
  questionSource = null,
  attribution = {},
  normalizedScores = {},
  rawScores = {},
  maxPossibleScores = {},
  balance_states = {},
  stress_profile = {},
  desired_gap = {},
  identity_behavior_gap = {},
  consistency = {},
  confidence = 0,
  flags = {},
} = {}) {
  const ranked = sortScores(normalizedScores).map(([code, score], index) => ({ rank: index + 1, code, score }));
  const primary = ranked[0] || null;
  const secondary = ranked[1] || null;
  const hybridGap = primary && secondary ? Number((primary.score - secondary.score).toFixed(2)) : null;
  const isHybrid = hybridGap !== null && hybridGap <= 7;

  return {
    assessment_id,
    user_id,
    engine,
    version,
    bank_id,
    scores: normalizedScores,
    ranked_archetypes: ranked,
    identity: {
      primary,
      secondary,
      is_hybrid: isHybrid,
      hybrid_label: isHybrid && primary && secondary ? `${primary.code}-${secondary.code}` : null,
    },
    balance_states,
    stress_profile,
    desired_gap,
    identity_behavior_gap,
    consistency,
    confidence,
    flags,
    summary: {
      primary: primary?.code || null,
      secondary: secondary?.code || null,
      confidence,
    },
    rawScores,
    maxPossibleScores,
    questionSource,
    attribution,
  };
}

module.exports = { buildOutputContract };
