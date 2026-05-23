const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const adaptiveSource = fs.readFileSync('public/gamehub/adaptive_learning', 'utf8');

const ALLOWED_EVENTS = new Set([
  'game_session_started',
  'activity_selected',
  'round_started',
  'round_completed',
  'level_changed',
  'challenge_selected',
  'accuracy_summary',
  'persistence_signal',
  'recovery_after_miss',
  'game_session_ended'
]);

const ALLOWED_KEYS = [
  'game_key',
  'activity_key',
  'mode',
  'subject',
  'difficulty_band',
  'grade_band',
  'accuracy_band',
  'duration_band',
  'persistence_band',
  'completion_state',
  'event_category'
];

test('adaptive learning emits only canonical adapter events for pilot instrumentation', () => {
  const names = [...adaptiveSource.matchAll(/emitAdapterEvent\("([^"]+)"/g)].map((m) => m[1]);
  assert.ok(names.length > 0, 'expected adaptive learning to emit adapter events');
  for (const eventName of names) {
    assert.ok(ALLOWED_EVENTS.has(eventName), `unexpected event ${eventName}`);
  }
});

test('adaptive learning payloads stay in canonical safe key set with no raw content leakage', () => {
  ALLOWED_KEYS.forEach((key) => assert.ok(adaptiveSource.includes(key), `missing expected key ${key}`));
  assert.equal(/emitAdapterEvent\([^\n]+\b(prompt|answer|correct_answer|correct_explanation|studentName|diagnostic|selected)\b/i.test(adaptiveSource), false);
});

test('adaptive learning instrumentation remains local-only and tracking_ready stays false', () => {
  ['fetch(', 'XMLHttpRequest', 'indexedDB', 'database', 'db.'].forEach((token) => {
    assert.equal(adaptiveSource.includes(token), false, `forbidden runtime token present: ${token}`);
  });

  const registry = fs.readFileSync('public/gamehub/gamehub-registry.js', 'utf8');
  assert.match(registry, /game_key:\s*['\"]adaptive_learning['\"][\s\S]*tracking_ready:\s*false/);
});
