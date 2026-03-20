// FILE: server/biiEngine.js
// ✅ Legacy BII engine kept intact (behavior unchanged).
// ✅ Conflict markers removed; formatting normalized.

"use strict";

const scoringMap = {
  A: { architect: 2, educator: 1, builder: 1 },
  B: { builder: 2, operator: 2 },
  C: { connector: 2, nurturer: 2, educator: 1 },
  D: { resource_generator: 2, protector: 2, steward: 2 }
};

function initializeRoles() {
  return {
    architect: 0,
    educator: 0,
    builder: 0,
    operator: 0,
    connector: 0,
    nurturer: 0,
    resource_generator: 0,
    protector: 0,
    steward: 0
  };
}

function scoreAssessment(answers = []) {
  const roles = initializeRoles();

  for (const answer of answers) {
    const roleWeightMap = scoringMap[answer];
    if (!roleWeightMap) continue;

    for (const [role, weight] of Object.entries(roleWeightMap)) {
      roles[role] += weight;
    }
  }

  return roles;
}

function getTopRoles(roles) {
  const sortedRoles = Object.entries(roles).sort((a, b) => b[1] - a[1]);
  return {
    primary: sortedRoles[0]?.[0] || null,
    secondary: sortedRoles[1]?.[0] || null
  };
}

function generateRecommendations(primary, secondary, mode) {
  return {
    systems: [
      "behavior_tracking",
      "reward_engine",
      "customer_data_capture",
      "engagement_sequences"
    ],
    focus: `${primary} + ${secondary}`,
    operating_mode: mode,
    message:
      "Your system should amplify your primary strengths while adding process support for secondary strengths.",
    next_steps: [
      "Enable role-aligned feature flags",
      "Prioritize automated engagement loops",
      "Track conversion actions on the dashboard"
    ]
  };
}

function generateTenantConfig(primary, secondary) {
  const config = {
    reward_system: ["builder", "resource_generator", "steward"].includes(primary),
    engagement_engine:
      ["connector", "nurturer", "educator"].includes(primary) || secondary === "connector",
    email_marketing: ["operator", "resource_generator"].includes(secondary),
    content_engine:
      ["educator", "architect", "connector"].includes(primary) || secondary === "educator",
    referral_system: ["connector", "resource_generator", "nurturer"].includes(primary)
  };

  if (primary === "architect" || secondary === "architect") {
    config.automation_blueprints = true;
  }

  if (primary === "operator") {
    config.analytics_engine = true;
  }

  return config;
}

module.exports = {
  scoreAssessment,
  getTopRoles,
  generateRecommendations,
  generateTenantConfig
};
