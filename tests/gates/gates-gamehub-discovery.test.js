const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const registry = require('../../public/gamehub/gamehub-registry.js');

test('gates discovery launch paths are registry-compatible and resolve to existing gamehub files', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'public', 'gates.js'), 'utf8');
  assert.match(source, /GameHubRegistry/);
  assert.match(source, /getLaunchableGames\(context\)/);
  assert.match(source, /Explore Practice Games/);

  const parentGames = registry.getLaunchableGames('parent');
  const childGames = registry.getLaunchableGames('child');
  assert.ok(parentGames.length > 0);
  assert.ok(childGames.length > 0);

  for (const entry of childGames) {
    const rel = entry.file_path.replace(/^\//, '');
    assert.equal(fs.existsSync(path.join(process.cwd(), 'public', rel)), true, `missing launch file: ${entry.file_path}`);
  }
});

test('discovery phase does not add tracking, gates scoring linkage, or db-write hooks in gates UI', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'public', 'gates.js'), 'utf8');
  assert.doesNotMatch(source, /tracking_ready\s*=\s*true/i);
  assert.doesNotMatch(source, /gatesScoring|insert\s+into|update\s+gates_/i);
});
