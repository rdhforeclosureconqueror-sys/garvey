const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const spellingSource = fs.readFileSync('public/gamehub/spelling', 'utf8');

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
  'event_category'
];

test('spelling pilot emits only canonical-safe adapter events', () => {
  const names = [...spellingSource.matchAll(/emitAdapterEvent\("([^"]+)"/g)].map((m) => m[1]);
  assert.ok(names.length > 0, 'expected spelling to emit adapter events');
  for (const eventName of names) {
    assert.ok(ALLOWED_EVENTS.has(eventName), `unexpected event ${eventName}`);
  }
});

test('spelling pilot payloads stay in canonical safe key set with no answer/word leakage', () => {
  ALLOWED_KEYS.forEach((key) => assert.ok(spellingSource.includes(key), `missing expected key ${key}`));
  assert.equal(/emitAdapterEvent\([^\n]+\b(word|typed|answer|question|score|child|diagnostic)\b/i.test(spellingSource), false);
});

test('spelling adapter instrumentation remains local-only and gameplay flow text is intact', () => {
  ['fetch(', 'XMLHttpRequest', 'localStorage', 'indexedDB', 'database', 'db.'].forEach((token) => {
    assert.equal(spellingSource.includes(token), false, `forbidden runtime token present: ${token}`);
  });

  [
    'Start Lesson (10 words)',
    'Start Quiz on These 10 Words',
    'Start I-Spy Game',
    'Mode: LESSON COMPLETE',
    'Mode: QUIZ COMPLETE',
    'I-Spy game finished!'
  ].forEach((token) => {
    assert.ok(spellingSource.includes(token), `missing gameplay flow marker ${token}`);
  });
});
