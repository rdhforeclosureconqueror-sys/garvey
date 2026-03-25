"use strict";

const { getQuestions } = require("./intelligenceEngine");

function optionLetter(idx) {
  return ["A", "B", "C", "D"][idx];
}

function mappingFor(question, idx) {
  const maps = question.options[idx].maps;
  if (question.type === "business_owner") {
    return maps;
  }
  return { archetype: maps[0], personality: maps[1] };
}

function optionText(question, idx) {
  return question.options[idx].text;
}

async function seed(pool) {
  const business = getQuestions("business_owner");
  const customer = getQuestions("customer");
  const all = [...business, ...customer];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM questions
       WHERE assessment_type IN ('business_owner', 'customer')`
    );

    for (const question of all) {
      const optionA = optionText(question, 0);
      const optionB = optionText(question, 1);
      const optionC = optionText(question, 2);
      const optionD = optionText(question, 3);

      const mappingA = mappingFor(question, 0);
      const mappingB = mappingFor(question, 1);
      const mappingC = mappingFor(question, 2);
      const mappingD = mappingFor(question, 3);

      await client.query(
        `INSERT INTO questions (
          qid,
          question,
          options,
          weights,
          type,
          assessment_type,
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          mapping_a,
          mapping_b,
          mapping_c,
          mapping_d
        ) VALUES (
          $1,
          $2,
          $3,
          '{}'::jsonb,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14
        )
        ON CONFLICT (qid)
        DO UPDATE SET
          question = EXCLUDED.question,
          options = EXCLUDED.options,
          weights = EXCLUDED.weights,
          type = EXCLUDED.type,
          assessment_type = EXCLUDED.assessment_type,
          question_text = EXCLUDED.question_text,
          option_a = EXCLUDED.option_a,
          option_b = EXCLUDED.option_b,
          option_c = EXCLUDED.option_c,
          option_d = EXCLUDED.option_d,
          mapping_a = EXCLUDED.mapping_a,
          mapping_b = EXCLUDED.mapping_b,
          mapping_c = EXCLUDED.mapping_c,
          mapping_d = EXCLUDED.mapping_d`,
        [
          question.qid,
          question.question,
          {
            [optionLetter(0)]: optionA,
            [optionLetter(1)]: optionB,
            [optionLetter(2)]: optionC,
            [optionLetter(3)]: optionD,
          },
          question.type === "business_owner" ? "business_owner" : "customer",
          question.type,
          question.question,
          optionA,
          optionB,
          optionC,
          optionD,
          mappingA,
          mappingB,
          mappingC,
          mappingD,
        ]
      );
    }

    await client.query("COMMIT");
    return all.length;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { seed };
