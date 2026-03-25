"use strict";

/*
🔥 NEW BII ENGINE (DB-ALIGNED)
- No static scoringMap
- Works with mapping_a/b/c/d
- Accepts structured answers
*/

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

/*
answers format expected:

[
  {
    selected: "A",
    mapping: ["Builder","Resource"]
  }
]
*/

function scoreAssessment(answers = []) {
  const roles = initializeRoles();

  for (const answer of answers) {
    const mappings = answer.mapping || [];

    for (const role of mappings) {
      const key = role.toLowerCase().replace(" ", "_");

      if (roles[key] !== undefined) {
        roles[key] += 2; // consistent weight
      }
    }
  }

  return roles;
}

function getTopRoles(roles) {
  const sorted = Object.entries(roles).sort((a, b) => b[1] - a[1]);

  return {
    primary: sorted[0]?.[0] || null,
    secondary: sorted[1]?.[0] || null
  };
}

/*
🔥 NEW: ROLE DEVELOPMENT SYSTEM
*/
function generateRoleGrowthPlan(roles) {
  const weakest = Object.entries(roles)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([role]) => role);

  const rolePlans = {
    architect: "Study system design, create workflows, map business processes",
    builder: "Execute daily tasks, build offers, launch quickly",
    operator: "Track metrics, optimize processes, refine systems",
    connector: "Network, build relationships, expand reach",
    nurturer: "Focus on customer care and retention",
    educator: "Create content, teach, build authority",
    resource_generator: "Focus on monetization and revenue streams",
    protector: "Secure assets, risk management, compliance",
    steward: "Maintain systems, ensure consistency and stability"
  };

  return weakest.map(role => ({
    role,
    improvement: rolePlans[role] || "Develop foundational skills"
  }));
}

function generateRecommendations(primary, secondary) {
  return {
    focus: `${primary} + ${secondary}`,
    strategy:
      "Build around your strengths while reinforcing weaker roles",
    systems: [
      "engagement_engine",
      "reward_system",
      "analytics_engine",
      "automation_loops"
    ]
  };
}

function generateTenantConfig(primary, secondary) {
  return {
    reward_system: ["builder", "resource_generator"].includes(primary),
    engagement_engine: ["connector", "nurturer"].includes(primary),
    content_engine: ["educator", "architect"].includes(primary),
    referral_system: ["connector", "resource_generator"].includes(primary),
    analytics_engine: secondary === "operator"
  };
}

module.exports = {
  scoreAssessment,
  getTopRoles,
  generateRecommendations,
  generateTenantConfig,
  generateRoleGrowthPlan
};
