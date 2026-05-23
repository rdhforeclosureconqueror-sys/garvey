const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const sightWordsSource = fs.readFileSync('public/gamehub/1stgradesightwords', 'utf8');

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
  'hint_band'
];

test('sight words pilot emits only canonical-safe adapter events', () => {
  const names = [...sightWordsSource.matchAll(/emitAdapterEvent\("([^"]+)"/g)].map((m) => m[1]);
  assert.ok(names.length > 0, 'expected sight words to emit adapter events');
  for (const eventName of names) {
    assert.ok(ALLOWED_EVENTS.has(eventName), `unexpected event ${eventName}`);
  }
});

test('sight words payloads stay in canonical key set with no word/letter leakage', () => {
  ALLOWED_KEYS.slice(0, 8).forEach((key) => assert.ok(sightWordsSource.includes(key), `missing expected key ${key}`));
  assert.equal(/emitAdapterEvent\([^\n]+\b(word|letter|typed|answer|question|score|child|diagnostic)\b/i.test(sightWordsSource), false);
});

test('sight words instrumentation remains local-only and gameplay flow markers are intact', () => {
  ['fetch(', 'XMLHttpRequest', 'localStorage', 'indexedDB', 'database', 'db.'].forEach((token) => {
    assert.equal(sightWordsSource.includes(token), false, `forbidden runtime token present: ${token}`);
  });

  [
    '🚀 Sight Words – Match & Learn',
    '🧩 Match the Words',
    '✏️ Learn the Words',
    '🔄 New Match',
    'Check',
    'Show Word'
  ].forEach((token) => {
    assert.ok(sightWordsSource.includes(token), `missing gameplay flow marker ${token}`);
  });
});
