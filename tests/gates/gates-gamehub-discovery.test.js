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


test('gate detail practice recommendations use gate mapping helper and launch_path links', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'public', 'gates.js'), 'utf8');
  assert.match(source, /getGateMappedPracticeGames\(/);
  assert.match(source, /getGamesByGate\(gateNumberOrKey\)/);
  assert.match(source, /Practice Games for this Gate/);
  assert.match(source, /instrumentation_status === 'local_pilot_ready'/);
  assert.match(source, /local_instrumentation_ready === true/);
  assert.match(source, /tracking_ready === false/);
  assert.match(source, /game_key !== 'checkers'/);
  assert.match(source, /These games are optional developmental practices\. They are not tests, grades, or diagnoses\./);

  assert.match(source, /What this game practices/);
  assert.match(source, /Children may engage with these games in different ways\. Practice experiences do not equal grades or diagnoses\./);
  assert.match(source, /Focus and sustained attention/);
  assert.doesNotMatch(source, /developmental outcome|child outcome|diagnostic conclusion/i);
  assert.match(source, /buildGameHubLaunchPath\(game\.launch_path \|\| game\.file_path, childId\)/);

  const focusGames = registry.getGamesByGate('focus').filter((entry) => (
    entry.instrumentation_status === 'local_pilot_ready'
    && entry.local_instrumentation_ready === true
    && entry.tracking_ready === false
    && entry.game_key !== 'checkers'
  ));
  assert.ok(focusGames.length > 0);
  assert.equal(focusGames.some((entry) => entry.game_key === 'checkers'), false);
  for (const entry of focusGames) {
    assert.ok(entry.launch_path.endsWith('.html'));
  }
});
