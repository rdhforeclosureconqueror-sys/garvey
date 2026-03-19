const roles = [
  "architect",
  "operator",
  "steward",
  "builder",
  "connector",
  "protector",
  "nurturer",
  "educator",
  "resource_generator"
];

function emptyScores() {
  return roles.reduce((acc, role) => ({ ...acc, [role]: 0 }), {});
}

function scoreAnswers(answers = [], questions = []) {
  const scores = emptyScores();
  const questionMap = new Map(questions.map((q) => [q.qid, q]));

  for (const item of answers) {
    const q = questionMap.get(item.qid);
    if (!q) continue;

    for (const role of roles) {
      scores[role] += Number(q[role] || 0);
    }
  }

  return scores;
}

function getTopRoles(scores) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return {
    primary_role: sorted[0]?.[0] || null,
    secondary_role: sorted[1]?.[0] || null
  };
}

module.exports = {
  roles,
  scoreAnswers,
  getTopRoles
};
