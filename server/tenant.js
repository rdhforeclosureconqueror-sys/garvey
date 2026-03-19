const { pool } = require("./db");

const DEFAULT_TENANT_CONFIG = {
  reward_system: true,
  engagement_engine: true,
  email_marketing: false,
  content_engine: true,
  referral_system: true
};

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

async function getTenantConfig(tenantId) {
  const result = await pool.query(
    "SELECT config FROM tenant_config WHERE tenant_id = $1",
    [tenantId]
  );

  return {
    ...DEFAULT_TENANT_CONFIG,
    ...(result.rows[0]?.config || {})
  };
}

module.exports = {
  DEFAULT_TENANT_CONFIG,
  getTenantBySlug,
  ensureTenant,
  getTenantConfig
};
