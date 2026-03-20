// FILE: server/scoringEngine.js
// ✅ Aligned to server/index.js (expects scoreAnswers(answers, questionRows))
// ✅ Works with BOTH JSON weight shapes:
//    1) option-based: q.weights = { A: {role: n}, B: {...}, C: {...}, D: {...} }
//    2) role-based:   q.weights = { role: n, role2: n, ... }
// ✅ Safe fallback for legacy flat columns (q[role])
// ✅ Lowercase role keys (matches tenant config + rest of server)

"use strict";

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
  const scores = {};
  for (const r of roles) scores[r] = 0;
  return scores;
}

function coerceNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function addRoleWeights(scores, roleWeights) {
  if (!isPlainObject(roleWeights)) return;
  for (const r of roles) {
    if (Object.prototype.hasOwnProperty.call(roleWeights, r)) {
      scores[r] += coerceNumber(roleWeights[r]);
    }
  }
}

function extractLegacyRoleWeight(questionRow, role) {
  return coerceNumber(questionRow?.[role]);
}

function scoreAnswers(answers = [], questions = []) {
  const scores = emptyScores();
  const questionMap = new Map(questions.map((q) => [q.qid, q]));

  for (const item of answers) {
    if (!item || !item.qid) continue;

    const q = questionMap.get(item.qid);
    if (!q) continue;

    const w = q.weights;

    // Shape 1: option-based weights
    if (
      isPlainObject(w) &&
      (Object.prototype.hasOwnProperty.call(w, "A") ||
        Object.prototype.hasOwnProperty.call(w, "B") ||
        Object.prototype.hasOwnProperty.call(w, "C") ||
        Object.prototype.hasOwnProperty.call(w, "D"))
    ) {
      const option = String(item.answer || "").toUpperCase();
      addRoleWeights(scores, w[option]);
      continue;
    }

    // Shape 2: role-based weights
    if (isPlainObject(w)) {
      addRoleWeights(scores, w);
      continue;
    }

    // Fallback: legacy flat columns per role
    for (const r of roles) {
      scores[r] += extractLegacyRoleWeight(q, r);
    }
  }

  return scores;
}

function getTopRoles(scores) {
  const entries = Object.entries(scores || {}).filter(([, v]) => Number.isFinite(Number(v)));

  if (entries.length === 0) {
    return { primary_role: null, secondary_role: null };
  }

  // Stable tiebreaker: score desc, then role name asc
  entries.sort((a, b) => {
    const diff = coerceNumber(b[1]) - coerceNumber(a[1]);
    if (diff !== 0) return diff;
    return String(a[0]).localeCompare(String(b[0]));
  });

  return {
    primary_role: entries[0]?.[0] || null,
    secondary_role: entries[1]?.[0] || null
  };
}

module.exports = {
  roles,
  scoreAnswers,
  getTopRoles
};
