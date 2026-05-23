const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const game6Source = fs.readFileSync('public/gamehub/game6', 'utf8');

const ALLOWED_EVENTS = new Set([
  'game_session_started',
  'activity_selected',
  'round_started',
  'round_completed',
  'retry_started',
  'recovery_after_miss',
  'game_session_ended'
]);

const ALLOWED_KEYS = [
  'game_key',
  'activity_key',
  'mode',
  'success',
  'duration_band',
  'persistence_band',
  'completion_state',
  'event_category',
  'accuracy_band'
];

test('game6 pilot emits only canonical-safe adapter events', () => {
  const names = [...game6Source.matchAll(/emitAdapterEvent\("([^"]+)"/g)].map((m) => m[1]);
  assert.ok(names.length > 0, 'expected game6 to emit adapter events');
  for (const eventName of names) {
    assert.ok(ALLOWED_EVENTS.has(eventName), `unexpected event ${eventName}`);
  }
});

test('game6 payloads stay in canonical safe key set with no word/prompt/answer leakage', () => {
  ALLOWED_KEYS.forEach((key) => assert.ok(game6Source.includes(key), `missing expected key ${key}`));
  assert.equal(/emitAdapterEvent\([^\n]+\b(word|prompt|answer|selected|score|child|diagnostic)\b/i.test(game6Source), false);
});

test('game6 instrumentation remains local-only and mode flow markers are intact', () => {
  ['fetch(', 'XMLHttpRequest', 'localStorage', 'indexedDB', 'database', 'db.'].forEach((token) => {
    assert.equal(game6Source.includes(token), false, `forbidden runtime token present: ${token}`);
  });

  ['Speed Match', 'Synonym Smash', 'Antonym Hunter', 'Word Match'].forEach((token) => {
    assert.ok(game6Source.includes(token), `missing gameplay flow marker ${token}`);
  });
});
