const { pool } = require("./db");
const { analyzeTenantPerformance } = require("./adaptiveEngine");

const requiredTables = [
  "tenants",
  "users",
  "visits",
  "actions",
  "wishlist",
  "reviews",
  "referrals",
  "intake_sessions",
  "intake_responses",
  "intake_results",
  "voc_sessions",
  "voc_responses",
  "voc_results",
  "tenant_config"
];

async function checkDatabase() {
  await pool.query("SELECT 1");
  const tableResult = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'`
  );

  const tableSet = new Set(tableResult.rows.map((row) => row.table_name));
  return requiredTables.every((name) => tableSet.has(name));
}

async function checkIntakePipeline(baseUrl) {
  const payload = {
    email: "verify@garvey.test",
    tenant_slug: "verify-tenant",
    mode: "quick",
    answers: Array.from({ length: 25 }, (_, i) => ["A", "B", "C", "D"][i % 4])
  };

  const response = await fetch(`${baseUrl}/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) return false;
  const json = await response.json();
  return Boolean(json.primary_role && json.secondary_role && json.config);
}

async function checkAdminConfigFlow(baseUrl) {
  const tenantSlug = "verify-tenant";

  const getRes = await fetch(`${baseUrl}/t/${tenantSlug}/admin/config`);
  if (!getRes.ok) return false;

  const postRes = await fetch(`${baseUrl}/t/${tenantSlug}/admin/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config: { reward_system: false, referral_system: false } })
  });
  if (!postRes.ok) return false;

  const checkinRes = await fetch(`${baseUrl}/t/${tenantSlug}/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "verify@garvey.test" })
  });

  if (!checkinRes.ok) return false;
  const checkinJson = await checkinRes.json();
  if (checkinJson.points_added !== 0) return false;

  const referralRes = await fetch(`${baseUrl}/t/${tenantSlug}/referral`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "verify@garvey.test", referred_email: "verify2@garvey.test" })
  });

  return referralRes.status === 403;
}

async function checkVOCPipeline(baseUrl) {
  const payload = {
    email: "verify@garvey.test",
    tenant_slug: "verify-tenant",
    answers: Array.from({ length: 25 }, (_, i) => ["A", "B", "C", "D"][i % 4])
  };

  const response = await fetch(`${baseUrl}/voc-intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) return false;

  const json = await response.json();
  return Boolean(
    json.customer_profile &&
      json.engagement_style &&
      json.buying_trigger &&
      json.friction_point &&
      json.loyalty_driver
  );
}

async function checkAdaptiveEngine(baseUrl) {
  const tenantRes = await fetch(`${baseUrl}/t/verify-tenant/config`);
  if (!tenantRes.ok) return false;

  const tenantRow = await pool.query("SELECT id FROM tenants WHERE slug = 'verify-tenant'");
  if (!tenantRow.rows[0]) return false;

  const result = await analyzeTenantPerformance(tenantRow.rows[0].id);
  return Boolean(result.config && result.config.system_adjustments_log);
}

async function runVerification(baseUrl) {
  const status = {
    phase1: "FAIL",
    phase2: "FAIL",
    phase3: "FAIL",
    phase8: "FAIL",
    phase9: "FAIL",
    phase10: "FAIL",
    system: "DEGRADED"
  };

  if (!(await checkDatabase())) return status;
  status.phase1 = "PASS";

  if (!(await checkIntakePipeline(baseUrl))) return status;
  status.phase2 = "PASS";
  status.phase3 = "PASS";

  if (!(await checkAdminConfigFlow(baseUrl))) return status;
  status.phase8 = "PASS";

  if (!(await checkVOCPipeline(baseUrl))) return status;
  status.phase9 = "PASS";

  if (!(await checkAdaptiveEngine(baseUrl))) return status;
  status.phase10 = "PASS";

  status.system = "HEALTHY";
  return status;
}

module.exports = {
  runVerification
};
