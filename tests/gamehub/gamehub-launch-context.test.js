const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const registry = require('../../public/gamehub/gamehub-registry.js');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('getLaunchContextForGame returns playable launch path with safe context params', () => {
  const launch = registry.getLaunchContextForGame('spelling', {
    gate_context: 'learning',
    practice_path: 'daily_path',
    mode_preset: 'Support'
  });
  assert.ok(launch);
  assert.equal(launch.context.game_key, 'spelling');
  assert.equal(launch.context.gate_context, 'learning');
  assert.equal(launch.context.practice_path, 'daily_path');
  assert.equal(launch.context.mode_preset, 'support');
  assert.match(launch.launch_path, /^\/gamehub\/spelling\.html\?/);
  assert.match(launch.launch_path, /game_key=spelling/);
  assert.match(launch.launch_path, /mode_preset=support/);
});

test('getLaunchContextForGame rejects invalid params and unsupported values', () => {
  assert.equal(registry.getLaunchContextForGame('spelling', { mode_preset: 'expert' }), null);
  assert.equal(registry.getLaunchContextForGame('spelling', { gate_context: '../unsafe' }), null);
  assert.equal(registry.getLaunchContextForGame('spelling', { practice_path: 'bad path' }), null);
  assert.equal(registry.getLaunchContextForGame('missing_game', { mode_preset: 'support' }), null);
});

test('launch-context foundation does not enable tracking/scoring/db writes', () => {
  const source = read('public/gamehub/gamehub-registry.js').toLowerCase();
  assert.doesNotMatch(source, /tracking_ready\s*:\s*true/);
  assert.doesNotMatch(source, /insert\s+into|update\s+gates_|database|db\.|gatesscoring|diagnos/);
});

test('index renders parent-facing preset UI and safety copy', () => {
  const html = read('public/gamehub/index.html');
  assert.match(html, /Practice mode preset/);
  assert.match(html, /Support/);
  assert.match(html, /Standard/);
  assert.match(html, /Challenge/);
  assert.match(html, /Practice modes change the experience style, not your child’s value or ability\./);
  assert.match(html, /getLaunchContextForGame/);
});
