const test = require('node:test');
const assert = require('node:assert/strict');
const registry = require('../../public/gamehub/gamehub-registry.js');
const fs = require('node:fs');

test('adaptive launch context defaults to adaptive v2 runtime flag and game key', () => {
  const launch = registry.getLaunchContextForGame('adaptive_learning', { mode_preset: 'support', grade: '1' });
  assert.equal(launch.context.game_key, 'adaptive_learning');
  assert.equal(launch.context.adaptive_v2, 'true');
  assert.equal(launch.context.grade, '1');
  assert.match(launch.launch_path, /\/gamehub\/adaptive_learning\.html\?/);
  assert.match(launch.launch_path, /adaptive_v2=true/);
});

test('adaptive launch does not target legacy grade 6 or grades 7-8 by default', () => {
  const launch = registry.getLaunchContextForGame('adaptive_learning', { mode_preset: 'standard' });
  assert.doesNotMatch(launch.launch_path, /grade=6/);
  assert.doesNotMatch(launch.launch_path, /grade=7|grade=8/);
});

test('gamehub index adaptive launches are built from registry launch context', () => {
  const index = fs.readFileSync('public/gamehub/index.html', 'utf8');
  assert.match(index, /getLaunchContextForGame\(entry\.game_key, \{ mode_preset: getModePreset\(\), grade: '1' \}\)/);
});
