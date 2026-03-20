const { pool } = require("./db");
const { roles } = require("./scoringEngine");

function roleWeightFor(i, roleIndex) {
  return (i + roleIndex) % roles.length === 0 ? 2 : (i + roleIndex) % 3 === 0 ? 1 : 0;
}

async function seedQuestions() {
  const existing = await pool.query("SELECT COUNT(*)::int AS count FROM questions");
  if (existing.rows[0].count > 0) return existing.rows[0].count;

  for (let i = 1; i <= 60; i += 1) {
    const qid = `Q${i}`;
    const type = i <= 25 ? "core" : "extended";

    const roleValues = roles.map((role, index) => roleWeightFor(i, index));

    await pool.query(
      `INSERT INTO questions (
        qid, question, option_a, option_b, option_c, option_d,
        architect, operator, steward, builder, connector, protector, nurturer, educator, resource_generator, type
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )`,
      [
        qid,
        `Question ${i}`,
        "Option A",
        "Option B",
        "Option C",
        "Option D",
        ...roleValues,
        type
      ]
    );
  }

  return 60;
}

module.exports = {
  seedQuestions
};
