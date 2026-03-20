// FILE: server/seedQuestions.js
// ✅ Pure module: async function seed(pool)
// ✅ No DB import
// ✅ No process.exit()
// ✅ Logs exactly:
//    - "Seeding questions..."
//    - "Questions already exist"
"use strict";

const ROLES = [
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

function emptyRoleMap() {
  const m = {};
  for (const r of ROLES) m[r] = 0;
  return m;
}

// IMPORTANT: scoringEngine expects: question.weights[ANSWER_LETTER] -> { role: number }
function buildOptionWeights(i) {
  const A = emptyRoleMap();
  const B = emptyRoleMap();
  const C = emptyRoleMap();
  const D = emptyRoleMap();

  A[ROLES[i % ROLES.length]] = 2;
  A[ROLES[(i + 2) % ROLES.length]] = 1;

  B[ROLES[(i + 1) % ROLES.length]] = 2;
  B[ROLES[(i + 4) % ROLES.length]] = 1;

  C[ROLES[(i + 3) % ROLES.length]] = 2;
  C[ROLES[(i + 6) % ROLES.length]] = 1;

  D[ROLES[(i + 5) % ROLES.length]] = 2;
  D[ROLES[(i + 7) % ROLES.length]] = 1;

  return { A, B, C, D };
}

function buildOptions(i) {
  return {
    A: `Option A for Question ${i}`,
    B: `Option B for Question ${i}`,
    C: `Option C for Question ${i}`,
    D: `Option D for Question ${i}`
  };
}

async function seed(pool) {
  const existing = await pool.query("SELECT COUNT(*)::int AS count FROM questions");
  if ((existing.rows[0]?.count || 0) > 0) {
    console.log("Questions already exist");
    return existing.rows[0].count;
  }

  console.log("Seeding questions...");

  for (let i = 1; i <= 60; i += 1) {
    await pool.query(
      `INSERT INTO questions (qid, question, options, weights, type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (qid) DO NOTHING`,
      [
        `Q${i}`,
        `Question ${i}`,
        buildOptions(i),
        buildOptionWeights(i),
        i <= 25 ? "fast" : "full"
      ]
    );
  }

  return 60;
}

module.exports = { seed };
