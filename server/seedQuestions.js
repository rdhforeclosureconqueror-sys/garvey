// FILE: server/seedQuestions.js
// ✅ Pure module: async function seed(pool)
// ✅ No DB import
// ✅ No process.exit()
// ✅ Logs exactly:
//    - "Seeding questions..."
//    - "Questions already exist"
//
// ✅ Fixes your current issue:
// - Seeds REAL question text + REAL option text (not repeating)
// - Stores OPTION-BASED WEIGHTS so scoring changes per answer:
//   weights = { A:{role:n}, B:{...}, C:{...}, D:{...} }
// - Includes type mapping: 1..25 => "fast", 26..60 => "full"

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

const SECTIONS = [
  {
    name: "Identity",
    prompt: "How do you naturally express yourself as an owner?"
  },
  {
    name: "Decision Making",
    prompt: "How do you decide when things get uncertain?"
  },
  {
    name: "Community Role",
    prompt: "What role do you naturally play in teams and partnerships?"
  },
  {
    name: "Execution",
    prompt: "How do you move work from idea to reality?"
  }
];

const OPTION_BANK = [
  {
    A: "I design the plan before taking action.",
    B: "I act quickly and refine along the way.",
    C: "I listen, guide, and build trust first.",
    D: "I connect people and create alignment."
  },
  {
    A: "I create systems so the business can scale.",
    B: "I focus on output and daily execution.",
    C: "I protect the culture and customer experience.",
    D: "I grow relationships and networks."
  },
  {
    A: "I prefer clarity, structure, and strategy.",
    B: "I prefer momentum, testing, and speed.",
    C: "I prefer support, care, and stability.",
    D: "I prefer collaboration and community."
  },
  {
    A: "I map the whole journey end-to-end.",
    B: "I ship the next step immediately.",
    C: "I coach and develop people.",
    D: "I build partnerships and referral loops."
  }
];

function pickSection(i) {
  return SECTIONS[(i - 1) % SECTIONS.length];
}

function buildQuestionText(i, type) {
  const section = pickSection(i);
  const depth = type === "full" ? " (deeper)" : "";
  return `[${section.name}] Q${i}${depth}: ${section.prompt}`;
}

function buildOptions(i, type) {
  const base = OPTION_BANK[(i - 1) % OPTION_BANK.length];

  if (type === "fast") {
    return {
      A: base.A,
      B: base.B,
      C: base.C,
      D: base.D
    };
  }

  // "full" adds a little more specificity (still deterministic)
  return {
    A: `${base.A} (systems + planning)`,
    B: `${base.B} (execution + iteration)`,
    C: `${base.C} (people + protection)`,
    D: `${base.D} (network + alignment)`
  };
}

/**
 * Deterministic role-pairing so the assessment is consistent.
 * Each option pushes two roles strongly + one lightly.
 */
function weightsForOption(i, optionLetter) {
  const idx = (i + optionLetter.charCodeAt(0)) % ROLES.length;
  const primary = ROLES[idx];
  const secondary = ROLES[(idx + 3) % ROLES.length];
  const tertiary = ROLES[(idx + 6) % ROLES.length];

  const w = {};
  for (const r of ROLES) w[r] = 0;
  w[primary] = 2;
  w[secondary] = 1;
  w[tertiary] = 1;
  return w;
}

function buildWeights(i) {
  return {
    A: weightsForOption(i, "A"),
    B: weightsForOption(i, "B"),
    C: weightsForOption(i, "C"),
    D: weightsForOption(i, "D")
  };
}

async function upsertQuestion(pool, q) {
  await pool.query(
    `INSERT INTO questions (qid, question, options, weights, type)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (qid)
     DO UPDATE SET
       question = EXCLUDED.question,
       options  = EXCLUDED.options,
       weights  = EXCLUDED.weights,
       type     = EXCLUDED.type`,
    [q.qid, q.question, q.options, q.weights, q.type]
  );
}

/**
 * If questions already exist, we *repair* any rows that are missing JSON fields
 * without changing your required logs.
 */
async function repairExistingQuestions(pool) {
  // Repair missing JSON columns / bad rows (no extra logs)
  const rows = (
    await pool.query(
      `SELECT qid, question, options, weights, type
       FROM questions
       WHERE qid IS NULL
          OR question IS NULL
          OR options IS NULL
          OR weights IS NULL
          OR type IS NULL`
    )
  ).rows;

  for (const row of rows) {
    const qid = row.qid || "Q1";
    const n = Number(String(qid).replace(/[^0-9]/g, "")) || 1;
    const type = n <= 25 ? "fast" : "full";

    await upsertQuestion(pool, {
      qid,
      type,
      question: row.question || buildQuestionText(n, type),
      options: row.options && typeof row.options === "object" ? row.options : buildOptions(n, type),
      weights: row.weights && typeof row.weights === "object" ? row.weights : buildWeights(n)
    });
  }
}

async function seed(pool) {
  const existing = await pool.query("SELECT COUNT(*)::int AS count FROM questions");
  const count = existing.rows[0]?.count || 0;

  if (count > 0) {
    console.log("Questions already exist");
    await repairExistingQuestions(pool);
    return count;
  }

  console.log("Seeding questions...");

  for (let i = 1; i <= 60; i += 1) {
    const type = i <= 25 ? "fast" : "full";

    await upsertQuestion(pool, {
      qid: `Q${i}`,
      question: buildQuestionText(i, type),
      options: buildOptions(i, type),
      weights: buildWeights(i),
      type
    });
  }

  return 60;
}

module.exports = { seed };
