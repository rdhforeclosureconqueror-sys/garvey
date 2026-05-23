const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const surfSource = fs.readFileSync('public/gamehub/surf.html', 'utf8');

test('surf uses only canonical adapter events for pilot instrumentation', () => {
  const names = [...surfSource.matchAll(/emitAdapterEvent\('([^']+)'/g)].map((m) => m[1]);
  const allowed = new Set([
    'game_session_started',
    'round_started',
    'challenge_selected',
    'round_completed',
    'recovery_after_miss',
    'level_changed',
    'persistence_signal',
    'game_session_ended'
  ]);
  assert.ok(names.length > 0);
  for (const n of names) assert.ok(allowed.has(n), `unexpected event ${n}`);
});

test('surf instrumentation does not emit raw question/answer fields or child identity', () => {
  assert.equal(/emitAdapterEvent\([^\n]+question/i.test(surfSource), false);
  assert.equal(/emitAdapterEvent\([^\n]+answer/i.test(surfSource), false);
  assert.equal(/emitAdapterEvent\([^\n]+child/i.test(surfSource), false);
});

test('surf emits safe banded payload keys and remains local-only', () => {
  const forbiddenRuntime = ['fetch(', 'XMLHttpRequest', 'localStorage', 'indexedDB'];
  forbiddenRuntime.forEach((token) => assert.equal(surfSource.includes(token), false));
  ['attempt_count_band','streak_band','level_band','duration_band','persistence_band','completion_state'].forEach((key) => {
    assert.ok(surfSource.includes(key), `missing ${key}`);
  });
});

test('surf gameplay fun mechanics remain present', () => {
  ['Coins:', 'Streak:', 'BOOST', 'Magic: Rainbow Hearts+', 'Choose your challenge level.'].forEach((token) => {
    assert.ok(surfSource.includes(token), `missing gameplay token ${token}`);
  });
});
