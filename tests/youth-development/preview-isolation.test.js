const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexPath = path.join(__dirname, '../../server/index.js');

function readIndexSource() {
  return fs.readFileSync(indexPath, 'utf8');
}

test('youth preview router mount remains isolated and mounted exactly once', () => {
  const source = readIndexSource();
  const createRouterCount = (source.match(/createYouthDevelopmentRouter\(\)/g) || []).length;
  const mountCount = (source.match(/app\.use\(createYouthDevelopmentRouter\(\)\);/g) || []).length;

  assert.equal(createRouterCount, 1, 'createYouthDevelopmentRouter() should appear exactly once in server/index.js');
  assert.equal(mountCount, 1, 'youth-development router should be mounted exactly once');
});

test('archetype-engine and dashboard route mounts stay unchanged while youth preview is added separately', () => {
  const source = readIndexSource();

  assert.match(source, /app\.use\("\/api\/archetype-engines", createArchetypeEnginesRouter\(\{ pool \}\)\);/);
  assert.match(source, /app\.get\('\/dashboard\.html',/);
  assert.match(source, /path\.join\(__dirname, '\.\.', 'dashboardnew', 'index\.html'\)/);
  assert.match(source, /app\.use\('\/dashboardnew', express\.static\(path\.join\(__dirname, '\.\.', 'dashboardnew'\)\)\);/);
});
