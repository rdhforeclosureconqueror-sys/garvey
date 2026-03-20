// FILE: server/questions.js
// Keep this file simple: export question retrieval helpers (optional).
// ✅ No seeding here (seeding lives in server/seedQuestions.js)
// ✅ No Express router here (routing lives in server/index.js)

"use strict";

async function fetchQuestionsByMode(pool, mode = "25") {
  const modeStr = String(mode || "25");
  const type = modeStr === "60" ? "full" : "fast";
  const limit = modeStr === "60" ? 60 : 25;

  const result = await pool.query(
    `SELECT qid, question, options, weights, type
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