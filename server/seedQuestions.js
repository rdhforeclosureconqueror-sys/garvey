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

// Each option is designed to bias toward 2 roles strongly and 1 role lightly.
const OPTION_ROLE_MAP = {
  A: ["architect", "educator", "steward"],
  B: ["operator", "builder", "architect"],
  C: ["connector", "nurturer", "educator"],
  D: ["resource_generator", "protector", "steward"]
};

function buildOptionWeights(optionKey) {
  const [primary, secondary, tertiary] = OPTION_ROLE_MAP[optionKey];
  const w = {};
  for (const r of ROLES) w[r] = 0;
  w[primary] = 2;
  w[secondary] = 1;
  w[tertiary] = 1;
  return w;
}

function buildWeights() {
  // option-based weights
  return {
    A: buildOptionWeights("A"),
    B: buildOptionWeights("B"),
    C: buildOptionWeights("C"),
    D: buildOptionWeights("D")
  };
}

// Make questions actually different by cycling themes
const THEMES = [
  { name: "Identity", stem: "How do you naturally express yourself when leading?" },
  { name: "Decision Making", stem: "When decisions are uncertain, what do you default to?" },
  { name: "Community Role", stem: "In a group, what role do you naturally take?" },
  { name: "Execution", stem: "When it’s time to execute, what’s your first move?" }
];

function buildQuestionText(i) {
  const t = THEMES[(i - 1) % THEMES.length];
  return `(${t.name}) ${t.stem}`;
}

function buildOptions(i, type) {
  // Keep options stable & meaningful (not “Option A for Question X”)
  // Slightly different wording between fast/full if you want.
  if (type === "fast") {
    return {
      A: "I zoom out, design the system, and clarify the plan.",
      B: "I move fast, execute, and adjust in motion.",
      C: "I align people, communicate, and keep everyone moving together.",
      D: "I secure resources, reduce risk, and protect the mission."
    };
  }

  // full (more descriptive)
  return {
    A: "I architect the system: define the strategy, structure, and long-term approach.",
    B: "I execute aggressively: prioritize action, speed, and operational output.",
    C: "I build community: connect people, nurture relationships, and drive engagement.",
    D: "I protect & resource: secure assets, reduce risk, and stabilize performance."
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
    const type = i <= 25 ? "fast" : "full";
    await pool.query(
      `INSERT INTO questions (qid, question, options, weights, type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (qid) DO NOTHING`,
      [`Q${i}`, buildQuestionText(i), buildOptions(i, type), buildWeights(), type]
    );
  }

  return 60;
}

module.exports = { seed };
