const scoringMap = {
  A: { architect: 1, educator: 1 },
  B: { builder: 1, operator: 1 },
  C: { connector: 1, nurturer: 1 },
  D: { resource_generator: 1, protector: 1, steward: 1 }
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

function scoreAssessment(answers) {
  const roles = initializeRoles();

  answers.forEach(ans => {
    const map = scoringMap[ans];
    if (!map) return;

    Object.keys(map).forEach(role => {
      roles[role] += map[role];
    });
  });

  return roles;
}

function getTopRoles(roles) {
  const sorted = Object.entries(roles)
    .sort((a, b) => b[1] - a[1]);

  return {
    primary: sorted[0][0],
    secondary: sorted[1][0]
  };
}

function generateRecommendations(primary, secondary) {
  return {
    systems: [
      "behavior_tracking",
      "reward_engine",
      "customer_data_capture"
    ],
    focus: `${primary} + ${secondary}`,
    message: "Your system should support your natural strengths while stabilizing weak areas."
  };
}

module.exports = {
  scoreAssessment,
  getTopRoles,
  generateRecommendations
};
