const roles = [
  "Architect","Operator","Steward","Builder",
  "Connector","Protector","Nurturer","Educator","ResourceGenerator"
];

function scoreAnswers(answers, questions) {
  const scores = {};
  roles.forEach(r => scores[r] = 0);

  answers.forEach(({ qid, answer }) => {
    const q = questions.find(q => q.qid === qid);
    if (!q) return;

    const weights = q.weights?.[answer];
    if (!weights) return;

    Object.entries(weights).forEach(([role, value]) => {
      scores[role] += value;
    });
  });

  return scores;
}

function getTopRoles(scores) {
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1]);

  return {
    primary_role: sorted[0][0],
    secondary_role: sorted[1][0]
  };
}

module.exports = {
  roles,
  scoreAnswers,
  getTopRoles
};
