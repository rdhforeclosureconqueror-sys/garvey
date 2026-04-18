const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("phase24 dashboard route mount safety remains unchanged for existing customer return dashboard", () => {
  const serverSource = fs.readFileSync("server/index.js", "utf8");
  assert.match(serverSource, /app\.get\('\/dashboard\.html',/);
  assert.match(serverSource, /path\.join\(__dirname, '\.\.', 'dashboardnew', 'index\.html'\)/);
  assert.match(serverSource, /app\.use\('\/dashboardnew', express\.static\(path\.join\(__dirname, '\.\.', 'dashboardnew'\)\)\);/);
});

test("phase24 dashboard includes internal-only TDE operator console surfaces", () => {
  const html = fs.readFileSync("dashboardnew/index.html", "utf8");
  assert.match(html, /TDE Operator Console \(Internal Testing Only\)/);
  assert.match(html, /id="tdeChildScopeInput"/);
  assert.match(html, /id="tdeOverviewPanel"/);
  assert.match(html, /id="tdeChildDevelopmentPanel"/);
  assert.match(html, /id="tdeCheckinInterventionPanel"/);
  assert.match(html, /id="tdeVoicePanel"/);
  assert.match(html, /id="tdeValidationAdminPanel"/);
  assert.match(html, /Internal\/admin-only additive surface for controlled TDE extension testing/);
});

test("phase24 operator UI uses extension endpoints with explicit sparse-data fallback rendering", () => {
  const source = fs.readFileSync("dashboardnew/app.js", "utf8");
  assert.match(source, /\/api\/youth-development\/tde\/admin\/overview/);
  assert.match(source, /\/api\/youth-development\/tde\/recommendations\/:childId/);
  assert.match(source, /\/api\/youth-development\/tde\/voice\/status\/:childId/);
  assert.match(source, /Loaded with fallback\/missing data states/);
  assert.match(source, /Internal surface disabled by default/);
  assert.match(source, /Enable the internal surface gate before loading TDE extension panels/);
});
