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

function buildWeights(index) {
  const weights = {};
  for (let roleIndex = 0; roleIndex < ROLES.length; roleIndex += 1) {
    const role = ROLES[roleIndex];
    const value =
      (index + roleIndex) % ROLES.length === 0
        ? 2
        : (index + roleIndex) % 3 === 0
          ? 1
          : 0;
    weights[role] = value;
  }
  return weights;
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
      [`Q${i}`, `Question ${i}`, buildOptions(i), buildWeights(i), i <= 25 ? "fast" : "full"]
    );
  }

  return 60;
}

module.exports = { seed };
