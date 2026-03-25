"use strict";

const { getQuestions } = require("./intelligenceEngine");

// 🔹 Safe helpers
function optionLetter(idx) {
  return ["A", "B", "C", "D"][idx];
}

function safeOptionText(question, idx) {
  return question?.options?.[idx]?.text || "";
}

function safeMapping(question, idx) {
  const maps = question?.options?.[idx]?.maps || [];

  if (question.type === "business_owner") {
    // Ensure array format
    return Array.isArray(maps) ? maps : [];
  }

  // Ensure object format for customer
  return {
    archetype: maps[0] || null,
    personality: maps[1] || null,
  };
}

function buildOptionsObject(a, b, c, d) {
  return {
    A: a,
    B: b,
    C: c,
    D: d,
  };
}

async function seed(pool) {
  const business = getQuestions("business_owner") || [];
  const customer = getQuestions("customer") || [];
  const all = [...business, ...customer];

  console.log("🌱 Seeding questions...");
  console.log(`➡️ Total questions: ${all.length}`);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 🔥 Clean existing
    await client.query(`
      DELETE FROM questions
      WHERE assessment_type IN ('business_owner', 'customer')
    `);

    for (const question of all) {
      // 🔹 Safe extraction
      const optionA = safeOptionText(question, 0);
      const optionB = safeOptionText(question, 1);
      const optionC = safeOptionText(question, 2);
      const optionD = safeOptionText(question, 3);

      const mappingA = safeMapping(question, 0);
      const mappingB = safeMapping(question, 1);
      const mappingC = safeMapping(question, 2);
      const mappingD = safeMapping(question, 3);

      const optionsObject = buildOptionsObject(
        optionA,
        optionB,
        optionC,
        optionD
      );

      // 🔥 CRITICAL: stringify ALL json fields
      const optionsJSON = JSON.stringify(optionsObject);
      const mappingAJSON = JSON.stringify(mappingA);
      const mappingBJSON = JSON.stringify(mappingB);
      const mappingCJSON = JSON.stringify(mappingC);
      const mappingDJSON = JSON.stringify(mappingD);

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
          question.type === "business_owner" ? "business_owner" : "customer",
          question.question,
          optionA,
          optionB,
          optionC,
          optionD,
          mappingAJSON,
          mappingBJSON,
          mappingCJSON,
          mappingDJSON,
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

module.exports = seed;
