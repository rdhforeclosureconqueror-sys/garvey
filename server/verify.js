const { pool } = require("./db");

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
  const quickPayload = {
    email: "verify@garvey.test",
    tenant_slug: "verify-tenant",
    mode: "quick",
    answers: Array.from({ length: 25 }, (_, i) => ["A", "B", "C", "D"][i % 4])
  };

  const deepPayload = {
    email: "verify@garvey.test",
    tenant_slug: "verify-tenant",
    mode: "deep",
    answers: Array.from({ length: 60 }, (_, i) => ["A", "B", "C", "D"][i % 4])
  };

  const quickRes = await fetch(`${baseUrl}/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(quickPayload)
  });

  if (!quickRes.ok) return false;

  const deepRes = await fetch(`${baseUrl}/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(deepPayload)
  });

  if (!deepRes.ok) return false;

  const deepJson = await deepRes.json();
  return Boolean(
    deepJson.primary_role &&
    deepJson.secondary_role &&
    deepJson.config
  );
}

async function checkAdminConfigFlow(baseUrl) {
  const tenantSlug = "verify-tenant";

  const getRes = await fetch(`${baseUrl}/t/${tenantSlug}/admin/config`);
  if (!getRes.ok) return false;

  const updateRes = await fetch(`${baseUrl}/t/${tenantSlug}/admin/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config: { reward_system: false, referral_system: false }
    })
  });

  if (!updateRes.ok) return false;

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
    body: JSON.stringify({
      email: "verify@garvey.test",
      referred_email: "verify-ref@example.com"
    })
  });

  return referralRes.status === 403;
}

async function runVerification(baseUrl) {
  const status = {
    phase1: "FAIL",
    phase2: "FAIL",
    phase3: "FAIL",
    phase8: "FAIL",
    system: "DEGRADED"
  };

  const dbReady = await checkDatabase();
  if (!dbReady) return status;

  status.phase1 = "PASS";

  const intakeReady = await checkIntakePipeline(baseUrl);
  if (!intakeReady) return status;

  status.phase2 = "PASS";
  status.phase3 = "PASS";

  const adminReady = await checkAdminConfigFlow(baseUrl);
  if (!adminReady) return status;

  status.phase8 = "PASS";

  status.system = "HEALTHY";
  return status;
}

module.exports = {
  runVerification
};