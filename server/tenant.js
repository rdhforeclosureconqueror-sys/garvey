const pool = require("./db");

async function getTenant(slug) {
  const result = await pool.query(
    "SELECT * FROM tenants WHERE slug=$1",
    [slug]
  );
  return result.rows[0];
}

module.exports = { getTenant };
