const { pool } = require("./db");

async function seed() {
  try {
    // CLEAN START
    await pool.query(`DELETE FROM question_map;`);
    await pool.query(`DELETE FROM question_options;`);
    await pool.query(`DELETE FROM questions;`);

    // =========================
    // ROLES
    // =========================
    const roles = [
      "Architect",
      "Operator",
      "Steward",
      "Builder",
      "Connector",
      "Protector",
      "Nurturer",
      "Educator",
      "ResourceGenerator"
    ];

    // =========================
    // QUESTION GENERATOR
    // =========================
    function createQuestion(qid, text, type = "full") {
      return {
        qid,
        text,
        type
      };
    }

    const questions = [];

    // =========================
    // BUILD 60 QUESTIONS
    // =========================
    for (let i = 1; i <= 60; i++) {
      questions.push(
        createQuestion(
          `Q${i}`,
          `Question ${i}: What best describes your natural behavior in this situation?`,
          "full"
        )
      );
    }

    // =========================
    // BUILD 25 QUESTIONS (FAST)
    // =========================
    for (let i = 1; i <= 25; i++) {
      questions.push(
        createQuestion(
          `FQ${i}`,
          `Quick Question ${i}: What feels most natural to you?`,
          "fast"
        )
      );
    }

    // =========================
    // INSERT QUESTIONS
    // =========================
    for (const q of questions) {
      await pool.query(
        `INSERT INTO questions (qid, question, type) VALUES ($1, $2, $3)`,
        [q.qid, q.text, q.type]
      );
    }

    // =========================
    // OPTIONS
    // =========================
    const options = ["A", "B", "C", "D"];

    for (const q of questions) {
      for (const opt of options) {
        await pool.query(
          `INSERT INTO question_options (qid, option) VALUES ($1, $2)`,
          [q.qid, opt]
        );
      }
    }

    // =========================
    // WEIGHT ENGINE (CRITICAL)
    // =========================
    function getWeights(optionIndex) {
      const weights = {
        Architect: 0,
        Operator: 0,
        Steward: 0,
        Builder: 0,
        Connector: 0,
        Protector: 0,
        Nurturer: 0,
        Educator: 0,
        ResourceGenerator: 0
      };

      // ROTATING ROLE LOGIC
      const roleKeys = Object.keys(weights);

      const primary = roleKeys[optionIndex];
      const secondary = roleKeys[(optionIndex + 3) % roleKeys.length];

      weights[primary] = 2;
      weights[secondary] = 1;

      return weights;
    }

    // =========================
    // INSERT MAPPING
    // =========================
    for (const q of questions) {
      options.forEach(async (opt, index) => {
        const w = getWeights(index);

        await pool.query(
          `
          INSERT INTO question_map
          (qid, option, architect, operator, steward, builder, connector, protector, nurturer, educator, resourcegenerator, type)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          `,
          [
            q.qid,
            opt,
            w.Architect,
            w.Operator,
            w.Steward,
            w.Builder,
            w.Connector,
            w.Protector,
            w.Nurturer,
            w.Educator,
            w.ResourceGenerator,
            q.type
          ]
        );
      });
    }

    console.log("🔥 FULL SYSTEM SEEDED (60 + 25 QUESTIONS)");
    process.exit();

  } catch (err) {
    console.error("❌ ERROR:", err);
    process.exit(1);
  }
}

seed();
