"use strict";

const { getQuestions } = require("./intelligenceEngine");

async function seed(pool) {
  const business = getQuestions("business_owner");
  const customer = getQuestions("customer");

  const all = [...business, ...customer];
  for (const q of all) {
    const options = {
      A: q.options[0].text,
      B: q.options[1].text,
      C: q.options[2].text,
      D: q.options[3].text,
    };

    await pool.query(
      `INSERT INTO questions (qid, question, options, weights, type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (qid)
       DO UPDATE SET question = EXCLUDED.question, options = EXCLUDED.options, weights = EXCLUDED.weights, type = EXCLUDED.type`,
      [q.qid, q.question, options, {}, q.type]
    );
  }

  return all.length;
}

module.exports = { seed };
