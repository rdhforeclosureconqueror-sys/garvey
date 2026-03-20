function buildSeeder(pool) {
return async function seed() {
try {
console.log("🌱 Seeding questions...");

```
  await pool.query(`DELETE FROM questions;`);

  const roles = [
    "Architect","Operator","Steward","Builder",
    "Connector","Protector","Nurturer","Educator","ResourceGenerator"
  ];

  function generateWeights(primaryIndex) {
    const weights = {};
    roles.forEach(r => { weights[r] = 0; });

    const primary = roles[primaryIndex % roles.length];
    const secondary = roles[(primaryIndex + 3) % roles.length];

    weights[primary] = 2;
    weights[secondary] = 1;

    return weights;
  }

  function buildOptions(type) {
    return type === "full"
      ? {
          A: "Strategize and design systems",
          B: "Take action and execute quickly",
          C: "Support and guide people",
          D: "Connect and unify others"
        }
      : {
          A: "Think first",
          B: "Act first",
          C: "Help others",
          D: "Bring people together"
        };
  }

  // FULL
  for (let i = 1; i <= 60; i++) {
    const options = buildOptions("full");

    const weights = {
      A: generateWeights(0),
      B: generateWeights(1),
      C: generateWeights(2),
      D: generateWeights(3)
    };

    await pool.query(
      `INSERT INTO questions (qid, question, options, weights, type)
       VALUES ($1,$2,$3::jsonb,$4::jsonb,$5)
       ON CONFLICT (qid) DO UPDATE SET
         question = EXCLUDED.question,
         options = EXCLUDED.options,
         weights = EXCLUDED.weights,
         type = EXCLUDED.type`,
      [
        `Q${i}`,
        `Question ${i}: How do you naturally respond in real-world situations?`,
        JSON.stringify(options),
        JSON.stringify(weights),
        "full"
      ]
    );
  }

  // FAST
  for (let i = 1; i <= 25; i++) {
    const options = buildOptions("fast");

    const weights = {
      A: generateWeights(0),
      B: generateWeights(1),
      C: generateWeights(2),
      D: generateWeights(3)
    };

    await pool.query(
      `INSERT INTO questions (qid, question, options, weights, type)
       VALUES ($1,$2,$3::jsonb,$4::jsonb,$5)
       ON CONFLICT (qid) DO UPDATE SET
         question = EXCLUDED.question,
         options = EXCLUDED.options,
         weights = EXCLUDED.weights,
         type = EXCLUDED.type`,
      [
        `FQ${i}`,
        `Quick Question ${i}: What feels most natural to you?`,
        JSON.stringify(options),
        JSON.stringify(weights),
        "fast"
      ]
    );
  }

  console.log("✅ Questions seeded successfully");

} catch (err) {
  console.error("❌ SEED ERROR:", err);
  throw err;
}
```

};
}

module.exports = { buildSeeder };
