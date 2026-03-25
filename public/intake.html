"use strict";

/*
🔥 NEW BII ENGINE — ALIGNED WITH NEW SYSTEM

- Uses REAL mappings from intake (mapping_a, mapping_b, etc.)
- Supports BOTH business_owner + customer
- Produces:
  → primary
  → secondary
  → weakness
  → improvement plan
*/

// ==================================================
// ARCHETYPE DEFINITIONS
// ==================================================

const ARCHETYPES = {
  builder: {
    traits: "action-oriented",
    strength: "execution",
    weakness: "inconsistency",
    improve: "implement routines and tracking systems"
  },
  architect: {
    traits: "strategic",
    strength: "systems",
    weakness: "overthinking",
    improve: "set execution deadlines"
  },
  operator: {
    traits: "structured",
    strength: "stability",
    weakness: "rigidity",
    improve: "introduce flexibility"
  },
  connector: {
    traits: "relationship-driven",
    strength: "networking",
    weakness: "lack of systems",
    improve: "track interactions and follow-ups"
  },
  resource: {
    traits: "opportunity-focused",
    strength: "revenue generation",
    weakness: "poor retention",
    improve: "build repeat systems"
  },
  protector: {
    traits: "risk-aware",
    strength: "risk control",
    weakness: "fear-based hesitation",
    improve: "test low-risk actions"
  },
  nurturer: {
    traits: "care-driven",
    strength: "loyalty",
    weakness: "underpricing",
    improve: "set boundaries and pricing standards"
  },
  educator: {
    traits: "knowledge-focused",
    strength: "trust building",
    weakness: "low monetization",
    improve: "package and sell knowledge"
  }
};

// ==================================================
// HELPERS
// ==================================================

function normalizeKey(key) {
  return String(key || "").toLowerCase().replace(/\s+/g, "_");
}

function initializeScores() {
  return {
    builder: 0,
    architect: 0,
    operator: 0,
    connector: 0,
    resource: 0,
    protector: 0,
    nurturer: 0,
    educator: 0
  };
}

// ==================================================
// CORE SCORING ENGINE
// ==================================================

function scoreAssessment(answers = []) {
  const scores = initializeScores();

  for (const answer of answers) {
    const mapping = answer.mapping;

    // BUSINESS OWNER → array
    if (Array.isArray(mapping)) {
      for (const role of mapping) {
        const key = normalizeKey(role);
        if (scores[key] !== undefined) {
          scores[key] += 1;
        }
      }
    }

    // CUSTOMER → object
    if (mapping && typeof mapping === "object") {
      if (mapping.archetype) {
        const key = normalizeKey(mapping.archetype);
        if (scores[key] !== undefined) {
          scores[key] += 1;
        }
      }
    }
  }

  return scores;
}

// ==================================================
// ROLE RANKING
// ==================================================

function getTopRoles(scores) {
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]);

  return {
    primary: sorted[0]?.[0] || null,
    secondary: sorted[1]?.[0] || null,
    weakness: sorted[sorted.length - 1]?.[0] || null
  };
}

// ==================================================
// IMPROVEMENT ENGINE
// ==================================================

function generateRecommendations(primary, secondary, weakness) {
  const primaryData = ARCHETYPES[primary] || {};
  const weaknessData = ARCHETYPES[weakness] || {};

  return {
    focus: `${primary} + ${secondary}`,
    primary_strength: primaryData.strength,
    weakness: weakness,
    improvement: weaknessData.improve,

    systems: [
      "behavior_tracking",
      "reward_engine",
      "customer_data_capture",
      "engagement_sequences"
    ],

    message:
      "Build systems that amplify your strengths and correct your weakest area.",

    next_steps: [
      `Double down on ${primary}`,
      `Support ${secondary} with systems`,
      `Fix ${weakness} using: ${weaknessData.improve}`
    ]
  };
}

// ==================================================
// TENANT CONFIG ENGINE
// ==================================================

function generateTenantConfig(primary, secondary) {
  return {
    reward_system: ["builder", "resource"].includes(primary),
    engagement_engine:
      ["connector", "nurturer", "educator"].includes(primary),
    analytics_engine: primary === "operator",
    content_engine:
      ["educator", "architect", "connector"].includes(primary),
    referral_system:
      ["connector", "resource", "nurturer"].includes(primary)
  };
}

// ==================================================
// MASTER FUNCTION
// ==================================================

function runBII(answers = []) {
  const scores = scoreAssessment(answers);

  const { primary, secondary, weakness } = getTopRoles(scores);

  const recommendations = generateRecommendations(
    primary,
    secondary,
    weakness
  );

  const config = generateTenantConfig(primary, secondary);

  return {
    scores,
    primary,
    secondary,
    weakness,
    recommendations,
    config
  };
}

// ==================================================

module.exports = {
  scoreAssessment,
  getTopRoles,
  generateRecommendations,
  generateTenantConfig,
  runBII
};
