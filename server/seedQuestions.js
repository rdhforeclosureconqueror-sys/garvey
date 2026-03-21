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

/**
 * Deterministic role picking so seeding is stable across runs.
 * This is not “smart adaptive” yet; it just makes the bank coherent and non-repetitive.
 */
function pickRole(i, offset) {
  return ROLES[(i + offset) % ROLES.length];
}

/**
 * Option-based weights shape:
 * weights = { A:{role:n}, B:{...}, C:{...}, D:{...} }
 * Compatible with your scoringEngine.js (Shape 1).
 */
function buildOptionWeights(i) {
  const a1 = pickRole(i, 0);
  const a2 = pickRole(i, 3);

  const b1 = pickRole(i, 1);
  const b2 = pickRole(i, 4);

  const c1 = pickRole(i, 2);
  const c2 = pickRole(i, 5);

  const d1 = pickRole(i, 6);
  const d2 = pickRole(i, 7);

  return {
    A: { [a1]: 2, [a2]: 1 },
    B: { [b1]: 2, [b2]: 1 },
    C: { [c1]: 2, [c2]: 1 },
    D: { [d1]: 2, [d2]: 1 }
  };
}

/**
 * Prompts vary by section. 60 questions split into 4 sections of 15.
 */
const SECTION_DEFS = [
  {
    name: "Identity",
    prompts: [
      "How do you naturally express yourself as a leader?",
      "What does leadership look like for you day-to-day?",
      "When things go wrong, what’s your first instinct?"
    ],
    options: {
      A: "I design the system before acting.",
      B: "I act quickly and iterate in motion.",
      C: "I focus on people and alignment.",
      D: "I protect stability and reduce risk."
    }
  },
  {
    name: "Decision Making",
    prompts: [
      "When you need a decision fast, what do you trust most?",
      "How do you choose what to work on next?",
      "What do you optimize for when resources are tight?"
    ],
    options: {
      A: "Clarity and structure.",
      B: "Speed and execution.",
      C: "Consensus and support.",
      D: "Security and sustainability."
    }
  },
  {
    name: "Community Role",
    prompts: [
      "In a group, what role do you fall into naturally?",
      "What’s your default value to a team?",
      "How do you create momentum with other people?"
    ],
    options: {
      A: "Architecting the plan and roles.",
      B: "Driving tasks to completion.",
      C: "Connecting and nurturing relationships.",
      D: "Protecting standards and outcomes."
    }
  },
  {
    name: "Execution",
    prompts: [
      "When building something new, what’s your approach?",
      "What’s your strongest habit during execution?",
      "How do you create repeatable results?"
    ],
    options: {
      A: "I build repeatable systems.",
      B: "I push consistent output.",
      C: "I empower and teach others.",
      D: "I secure resources and remove threats."
    }
  }
];

function sectionForQuestion(i) {
  // i is 1..60
  const idx = Math.min(Math.floor((i - 1) / 15), SECTION_DEFS.length - 1);
  return SECTION_DEFS[idx];
}

function promptForQuestion(i) {
  const sec = sectionForQuestion(i);
  const p = sec.prompts[(i - 1) % sec.prompts.length];
  return `[${sec.name}] ${p}`;
}

function optionsForQuestion(i) {
  return sectionForQuestion(i).options;
}

async function seed(pool) {
  const existing = await pool.query("SELECT COUNT(*)::int AS count FROM questions");
  if ((existing.rows[0]?.count || 0) > 0) {
    console.log("Questions already exist");
    return existing.rows[0].count;
  }

  console.log("Seeding questions...");

  for (let i = 1; i <= 60; i += 1) {
    const qid = `Q${i}`;
    const type = i <= 25 ? "fast" : "full";

    await pool.query(
      `INSERT INTO questions (qid, question, options, weights, type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (qid) DO NOTHING`,
      [
        qid,
        promptForQuestion(i),
        optionsForQuestion(i),
        buildOptionWeights(i),
        type
      ]
    );
  }

  return 60;
}

module.exports = { seed };
