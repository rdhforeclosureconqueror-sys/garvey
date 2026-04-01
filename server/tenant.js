// FILE: server/tenant.js
// ✅ CHANGE: DEFAULT_TENANT_CONFIG now includes site/features containers
//           so merges are stable and siteGenerator always has objects.

"use strict";

const { pool } = require("./db");

const DEFAULT_TENANT_CONFIG = {
  reward_system: true,
  engagement_engine: true,
  email_marketing: false,
  content_engine: true,
  referral_system: true,
  automation_blueprints: false,
  analytics_engine: false,

  // Safe defaults for site generator + future extensions
  site: {},
  features: {
    proof_showcase_enabled: false,
    spotlight_enabled: false,
    contributions_enabled: false,
  },

  // Safe defaults for adaptive engine fields (optional but stable)
  reward_multiplier: 1,
  review_incentive_bonus: 0,
  system_adjustments_log: [],

  // VOC placeholder
  voc_profile: null
};

async function getTenantBySlug(slug) {
  const clean = String(slug || "").trim();
  if (!clean) return null;

  const result = await pool.query("SELECT * FROM tenants WHERE slug = $1", [clean]);
  return result.rows[0] || null;
}

async function ensureTenant(slug) {
  const clean = String(slug || "").trim();
  if (!clean) throw new Error("tenant slug is required");

  const existing = await getTenantBySlug(clean);
  if (existing) return existing;

  const created = await pool.query(
    `INSERT INTO tenants (name, slug)
     VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
     RETURNING *`,
    [clean, clean]
  );

  return created.rows[0];
}

async function getTenantConfig(tenantId) {
  const result = await pool.query("SELECT config FROM tenant_config WHERE tenant_id = $1", [tenantId]);

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
