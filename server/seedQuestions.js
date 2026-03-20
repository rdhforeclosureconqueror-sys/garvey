const { pool } = require("./db");

async function seed() {
  try {
    await pool.query(`DELETE FROM questions;`);

    const roles = [
      "Architect","Operator","Steward","Builder",
      "Connector","Protector","Nurturer","Educator","ResourceGenerator"
    ];

    function generateWeights(index) {
      const weights = {};
      roles.forEach(r => weights[r] = 0);

      const primary = roles[index % roles.length];
      const secondary = roles[(index + 3) % roles.length];

      weights[primary] = 2;
      weights[secondary] = 1;

      return weights;
    }

    for (let i = 1; i <= 60; i++) {
      const options = {
        A: "Strategize and design",
        B: "Take action immediately",
        C: "Support and guide others",
        D: "Connect and unify people"
      };

      const weights = {
        A: generateWeights(0),
        B: generateWeights(1),
        C: generateWeights(2),
        D: generateWeights(3)
      };

      await pool.query(
        `INSERT INTO questions (qid, question, options, weights, type)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          `Q${i}`,
          `Question ${i}: How do you naturally respond?`,
          JSON.stringify(options),
          JSON.stringify(weights),
          "full"
        ]
      );
    }

    for (let i = 1; i <= 25; i++) {
      const options = {
        A: "Think first",
        B: "Act first",
        C: "Help others",
        D: "Bring people together"
      };

      const weights = {
        A: generateWeights(0),
        B: generateWeights(1),
        C: generateWeights(2),
        D: generateWeights(3)
      };

      await pool.query(
        `INSERT INTO questions (qid, question, options, weights, type)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          `FQ${i}`,
          `Quick Question ${i}: What feels natural?`,
          JSON.stringify(options),
          JSON.stringify(weights),
          "fast"
        ]
      );
    }

    console.log("🔥 QUESTIONS SEEDED (MATCHED TO YOUR DB)");
    process.exit();

  } catch (err) {
    console.error("❌ ERROR:", err);
    process.exit(1);
  }
}

seed();
