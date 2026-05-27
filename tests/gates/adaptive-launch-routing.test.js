const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const gates = fs.readFileSync('public/gates.js', 'utf8');

test('gates launch surfaces pass adaptive v2 launch context through registry', () => {
  assert.match(gates, /getLaunchContextForGame\(entry\.game_key, \{ child_profile_hint: childId, grade: '1' \}\)/);
  assert.match(gates, /getLaunchContextForGame\(game\.game_key, \{[\s\S]*child_profile_hint: childId,[\s\S]*grade: '1'/);
});
