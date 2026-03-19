const { pool } = require("./db");

async function getTenantBySlug(slug) {
  const result = await pool.query("SELECT * FROM tenants WHERE slug = $1", [slug]);
  return result.rows[0] || null;
}

async function ensureTenant(slug) {
  let tenant = await getTenantBySlug(slug);

  if (!tenant) {
    const create = await pool.query(
      "INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING *",
      [slug, slug]
    );
    tenant = create.rows[0];
  }

  return tenant;
}

module.exports = {
  getTenantBySlug,
  ensureTenant
};
