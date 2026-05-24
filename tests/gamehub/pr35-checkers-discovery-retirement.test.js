const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const registry = require('../../public/gamehub/gamehub-registry.js');

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

test('checkers remains explicitly hold_for_repair and tracking disabled', () => {
  const checkers = registry.getGameByKey('checkers');
  assert.ok(checkers);
  assert.equal(checkers.instrumentation_status, 'hold_for_repair');
  assert.equal(checkers.tracking_ready, false);
  assert.equal(checkers.local_instrumentation_ready, false);
});

test('checkers is excluded from active launch/discovery surfaces while hold_for_repair', () => {
  const checkers = registry.getGameByKey('checkers');
  assert.equal(checkers.public_launch_allowed, false);
  assert.equal(checkers.parent_context_launch_allowed, false);
  assert.equal(checkers.child_context_launch_allowed, false);

  const publicKeys = registry.getLaunchableGames('public').map((entry) => entry.game_key);
  const parentKeys = registry.getLaunchableGames('parent').map((entry) => entry.game_key);
  const childKeys = registry.getLaunchableGames('child').map((entry) => entry.game_key);

  assert.equal(publicKeys.includes('checkers'), false);
  assert.equal(parentKeys.includes('checkers'), false);
  assert.equal(childKeys.includes('checkers'), false);
});

test('PR35 change does not introduce tracking, scoring, or db write wiring', () => {
  const combined = `${read('public/gamehub/gamehub-registry.js')}\n${read('public/gamehub/index.html')}`;
  assert.doesNotMatch(combined, /tracking_ready\s*:\s*true/i);
  assert.doesNotMatch(combined, /gatesScoring|insert\s+into|update\s+gates_|db\.|database\s+write/i);
});
