const { pool } = require("./db");
const { DEFAULT_TENANT_CONFIG } = require("./tenant");

function safeNumber(value) {
  return Number(value || 0);
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

async function analyzeTenantPerformance(tenantId) {
  const [configRow, userStats, visitsStats, actionsStats, reviewsStats, referralsStats] = await Promise.all([
    pool.query("SELECT config FROM tenant_config WHERE tenant_id = $1", [tenantId]),
    pool.query("SELECT COALESCE(SUM(points), 0)::int AS total_points, COUNT(*)::int AS users FROM users WHERE tenant_id = $1", [tenantId]),
    pool.query("SELECT COUNT(*)::int AS visits FROM visits WHERE tenant_id = $1", [tenantId]),
    pool.query("SELECT COUNT(*)::int AS actions FROM actions WHERE tenant_id = $1", [tenantId]),
    pool.query("SELECT COUNT(*)::int AS reviews FROM reviews WHERE tenant_id = $1", [tenantId]),
    pool.query("SELECT COUNT(*)::int AS referrals FROM referrals WHERE tenant_id = $1", [tenantId])
  ]);

  const currentConfig = {
    ...DEFAULT_TENANT_CONFIG,
    ...(configRow.rows[0]?.config || {})
  };

  const metrics = {
    total_points: safeNumber(userStats.rows[0]?.total_points),
    users: safeNumber(userStats.rows[0]?.users),
    visits: safeNumber(visitsStats.rows[0]?.visits),
    actions: safeNumber(actionsStats.rows[0]?.actions),
    reviews: safeNumber(reviewsStats.rows[0]?.reviews),
    referrals: safeNumber(referralsStats.rows[0]?.referrals)
  };

  const adjustments = [];
  const nextConfig = { ...currentConfig };

  if (nextConfig.referral_system === true && metrics.referrals === 0) {
    nextConfig.referral_system = false;
    adjustments.push("disabled_referral_system_due_zero_referrals");
  }

  const engagementRate = metrics.users > 0 ? metrics.actions / metrics.users : 0;
  const currentMultiplier = Number(nextConfig.reward_multiplier || 1);

  if (engagementRate < 1) {
    nextConfig.reward_multiplier = clamp(currentMultiplier + 0.25, 1, 3);
    adjustments.push("boosted_reward_multiplier_due_low_engagement");
  } else if (engagementRate > 4) {
    nextConfig.reward_multiplier = clamp(currentMultiplier - 0.1, 0.5, 3);
    adjustments.push("reduced_reward_multiplier_due_high_engagement");
  } else {
    nextConfig.reward_multiplier = currentMultiplier;
    adjustments.push("maintained_reward_multiplier_due_stable_engagement");
  }

  if (nextConfig.content_engine === true && metrics.reviews === 0) {
    nextConfig.review_incentive_bonus = 5;
    adjustments.push("enabled_review_incentive_bonus_due_zero_reviews");
  }

  const logEntry = {
    run_at: new Date().toISOString(),
    metrics,
    adjustments
  };

  const existingLog = Array.isArray(nextConfig.system_adjustments_log)
    ? nextConfig.system_adjustments_log
    : [];

  nextConfig.system_adjustments_log = [...existingLog.slice(-19), logEntry];

  await pool.query(
    `INSERT INTO tenant_config (tenant_id, config, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (tenant_id)
     DO UPDATE SET config = EXCLUDED.config,
                   updated_at = NOW()`,
    [tenantId, nextConfig]
  );

  return {
    tenant_id: tenantId,
    config: nextConfig,
    metrics,
    adjustments
  };
}

async function runAdaptiveCycle() {
  const tenants = await pool.query("SELECT id, slug FROM tenants");
  const results = [];

  for (const tenant of tenants.rows) {
    const updated = await analyzeTenantPerformance(tenant.id);
    results.push({ slug: tenant.slug, ...updated });
  }

  return results;
}

module.exports = {
  analyzeTenantPerformance,
  runAdaptiveCycle
};
