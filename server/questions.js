// FILE: server/questions.js
// ✅ New-only helper (optional): DB → frontend-compatible shape
// ✅ No seeding here (seeding lives in server/seedQuestions.js)
// ✅ No Express router here (routing lives in server/index.js)

"use strict";

function normalizeMode(mode) {
  const modeStr = String(mode || "25");
  if (!["25", "60"].includes(modeStr)) {
    const err = new Error("mode must be 25 or 60");
    err.statusCode = 400;
    throw err;
  }
  return modeStr;
}

async function fetchQuestionsByMode(pool, mode = "25") {
  const modeStr = normalizeMode(mode);
  const type = modeStr === "60" ? "full" : "fast";
  const limit = modeStr === "60" ? 60 : 25;

  const result = await pool.query(
    `SELECT qid, question, options, type
     FROM questions
     WHERE type = $1
     ORDER BY id ASC
     LIMIT $2`,
    [type, limit]
  );

  const questions = result.rows.map((q) => ({
    qid: q.qid,
    question: q.question,
    option_a: q.options?.A || "",
    option_b: q.options?.B || "",
    option_c: q.options?.C || "",
    option_d: q.options?.D || "",
    type: q.type
  }));

  return { mode: modeStr, type, count: questions.length, questions };
}

module.exports = { fetchQuestionsByMode };
