const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("phase24 dashboard route mount safety remains unchanged for existing customer return dashboard", () => {
  const serverSource = fs.readFileSync("server/index.js", "utf8");
  assert.match(serverSource, /app\.get\('\/dashboard\.html',/);
  assert.match(serverSource, /path\.join\(__dirname, '\.\.', 'dashboardnew', 'index\.html'\)/);
  assert.match(serverSource, /app\.use\('\/dashboardnew', express\.static\(path\.join\(__dirname, '\.\.', 'dashboardnew'\)\)\);/);
});

test("phase24 customer return engine now exposes TDE operator as secondary link card", () => {
  const html = fs.readFileSync("dashboardnew/index.html", "utf8");
  assert.match(html, /id="tdeOperatorConsoleLinkCard"/);
  assert.match(html, /TDE Operator Console \(Secondary Entry\)/);
  assert.match(html, /href="\/youth-development\.html#tdeOperatorConsole"/);
  assert.doesNotMatch(html, /id="tdeChildScopeInput"/);
});

test("phase24 youth development dashboard is the primary internal TDE operator mount", () => {
  const html = fs.readFileSync("public/youth-development.html", "utf8");
  assert.match(html, /id="tdeOperatorConsole"/);
  assert.match(html, /TDE Operator Console \(Internal Testing Only\)/);
  assert.match(html, /id="tdeChildScopeInput"/);
  assert.match(html, /id="tdeOverviewPanel"/);
  assert.match(html, /id="tdeValidationAdminPanel"/);
  assert.match(html, /<script src="\/js\/tde-operator-console\.js" defer><\/script>/);
});

test("phase24 operator UI uses extension endpoints with explicit sparse-data fallback rendering", () => {
  const source = fs.readFileSync("public/js/tde-operator-console.js", "utf8");
  assert.match(source, /\/api\/owner\/session/);
  assert.match(source, /\/api\/youth-development\/tde\/admin\/overview/);
  assert.match(source, /child_id=:childId/);
  assert.match(source, /\/api\/youth-development\/children/);
  assert.match(source, /\/api\/youth-development\/tde\/recommendations\/:childId/);
  assert.match(source, /\/api\/youth-development\/tde\/voice\/status\/:childId/);
  assert.match(source, /No child in scope/);
  assert.match(source, /internal_test_mode/);
  assert.match(source, /Loaded with fallback\/missing data states/);
  assert.match(source, /Enable the internal surface gate before loading TDE extension panels/);
});
