"use strict";

const { getQuestions } = require("./intelligenceEngine");

// ================================
// HELPERS
// ================================

function safeOptionText(question, idx) {
  return question?.options?.[idx]?.text || "";
}

function safeMapping(question, idx) {
  const maps = question?.options?.[idx]?.maps || [];
  return Array.isArray(maps) ? maps.slice(0, 2) : [];
}

function buildOptionsObject(a, b, c, d) {
  return { A: a, B: b, C: c, D: d };
}

// ================================
// MAIN SEED FUNCTION
// ================================

async function seed(pool) {
  const business = getQuestions("business_owner") || [];
  const customer = getQuestions("customer") || [];
  const all = [...business, ...customer];

  console.log("🌱 Seeding questions...");
  console.log(`➡️ Business: ${business.length}`);
  console.log(`➡️ Customer: ${customer.length}`);
  console.log(`➡️ Total: ${all.length}`);

  if (!all.length) {
    throw new Error("❌ No questions loaded from intelligenceEngine");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Clean existing
    await client.query(`
      DELETE FROM questions
      WHERE assessment_type IN ('business_owner', 'customer')
    `);

    for (const question of all) {
      const optionA = safeOptionText(question, 0);
      const optionB = safeOptionText(question, 1);
      const optionC = safeOptionText(question, 2);
      const optionD = safeOptionText(question, 3);

      const mappingA = safeMapping(question, 0);
      const mappingB = safeMapping(question, 1);
      const mappingC = safeMapping(question, 2);
      const mappingD = safeMapping(question, 3);

      const optionsJSON = JSON.stringify(
        buildOptionsObject(optionA, optionB, optionC, optionD)
      );

      await client.query(
        `
        INSERT INTO questions (
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
          $3::jsonb,
          '{}'::jsonb,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11::jsonb,
          $12::jsonb,
          $13::jsonb,
          $14::jsonb
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
          mapping_d = EXCLUDED.mapping_d
        `,
        [
          question.qid,
          question.question,
          optionsJSON,
          question.type,
          question.type === "business_owner"
            ? "business_owner"
            : "customer",
          question.question,
          optionA,
          optionB,
          optionC,
          optionD,
          JSON.stringify(mappingA),
          JSON.stringify(mappingB),
          JSON.stringify(mappingC),
          JSON.stringify(mappingD),
        ]
      );
    }

    await client.query("COMMIT");

    console.log("✅ Seed complete");
    return all.length;

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", err);
    throw err;

  } finally {
    client.release();
  }
}

// ================================
// EXPORT (IMPORTANT FIX)
// ================================

module.exports = { seed };

// ================================
// DIRECT RUN SUPPORT (BIG UPGRADE)
// ================================

if (require.main === module) {
  const { pool } = require("./db");

  seed(pool)
    .then((count) => {
      console.log(`🔥 SEEDED ${count} QUESTIONS`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
