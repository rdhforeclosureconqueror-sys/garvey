const TRAITS = [
  "discount_driven",
  "relationship_driven",
  "urgency_driven",
  "trust_driven",
  "convenience_driven"
];

const scoringMap = {
  A: { discount_driven: 2, urgency_driven: 1 },
  B: { relationship_driven: 2, trust_driven: 1 },
  C: { convenience_driven: 2, trust_driven: 1 },
  D: { urgency_driven: 2, discount_driven: 1 }
};

function initializeScores() {
  return TRAITS.reduce((acc, trait) => ({ ...acc, [trait]: 0 }), {});
}

function scoreVOCAnswers(answers = []) {
  const scores = initializeScores();

  answers.forEach((answer) => {
    const weights = scoringMap[answer];
    if (!weights) return;

    Object.entries(weights).forEach(([trait, weight]) => {
      scores[trait] += weight;
    });
  });

  return scores;
}

function getDominantTraits(scores) {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([trait]) => trait);
}

function generateVOCProfile(scores) {
  const ranked = getDominantTraits(scores);
  const primary = ranked[0];
  const secondary = ranked[1];

  const engagementStyleMap = {
    discount_driven: "sms",
    relationship_driven: "community",
    urgency_driven: "push",
    trust_driven: "email",
    convenience_driven: "self_service"
  };

  const triggerMap = {
    discount_driven: "discount",
    relationship_driven: "community",
    urgency_driven: "urgency",
    trust_driven: "social_proof",
    convenience_driven: "ease"
  };

  const frictionMap = {
    discount_driven: "high_price",
    relationship_driven: "lack_of_personal_touch",
    urgency_driven: "slow_response",
    trust_driven: "low_trust",
    convenience_driven: "complex_checkout"
  };

  const loyaltyMap = {
    discount_driven: "exclusive_offers",
    relationship_driven: "personalized_followups",
    urgency_driven: "fast_fulfillment",
    trust_driven: "consistent_quality",
    convenience_driven: "frictionless_experience"
  };

  return {
    customer_profile: primary,
    engagement_style: engagementStyleMap[primary],
    buying_trigger: triggerMap[primary],
    friction_point: frictionMap[secondary] || frictionMap[primary],
    loyalty_driver: loyaltyMap[primary],
    scores
  };
}

function mergeVOCIntoConfig(existingConfig = {}, vocResult) {
  const merged = { ...existingConfig };

  if (vocResult.engagement_style === "sms") {
    merged.engagement_engine = true;
  }

  if (vocResult.buying_trigger === "discount") {
    merged.reward_system = true;
  }

  if (vocResult.friction_point === "slow_response") {
    merged.automation_blueprints = true;
  }

  merged.voc_profile = {
    customer_profile: vocResult.customer_profile,
    engagement_style: vocResult.engagement_style,
    buying_trigger: vocResult.buying_trigger,
    friction_point: vocResult.friction_point,
    loyalty_driver: vocResult.loyalty_driver,
    updated_at: new Date().toISOString()
  };

  return merged;
}

module.exports = {
  scoreVOCAnswers,
  generateVOCProfile,
  mergeVOCIntoConfig
};
