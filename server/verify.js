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
  const payload = {
    email: "verify@garvey.test",
    tenant_slug: "verify-tenant",
    mode: "quick",
    answers: ["A", "B", "C", "D"]
  };

  const intakeResponse = await fetch(`${baseUrl}/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!intakeResponse.ok) {
    return false;
  }

  const intakeJson = await intakeResponse.json();
  if (!intakeJson.primary_role || !intakeJson.secondary_role || !intakeJson.config) {
    return false;
  }

  const dashboardResponse = await fetch(`${baseUrl}/t/verify-tenant/dashboard`);
  return dashboardResponse.ok;
}

async function runVerification(baseUrl) {
  const status = {
    phase1: "FAIL",
    phase2: "FAIL",
    phase3: "FAIL",
    system: "DEGRADED"
  };

  const dbReady = await checkDatabase();
  if (!dbReady) {
    return status;
  }

  status.phase1 = "PASS";

  const intakeReady = await checkIntakePipeline(baseUrl);
  if (!intakeReady) {
    return status;
  }

  status.phase2 = "PASS";
  status.phase3 = "PASS";
  status.system = "HEALTHY";
  return status;
}

module.exports = {
  runVerification
};
