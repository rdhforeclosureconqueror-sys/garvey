const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('public/gamehub/braingames.html', 'utf8');
const registry = fs.readFileSync('public/gamehub/gamehub-registry.js', 'utf8');

const ALLOWED_EVENTS = new Set([
  'game_session_started',
  'activity_selected',
  'round_started',
  'round_completed',
  'level_changed',
  'persistence_signal',
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
  'level_band',
  'completion_state',
  'event_category'
];

test('braingames mini-suite emits only canonical events for pilot adapter instrumentation', () => {
  const names = [...source.matchAll(/emitAdapterEvent\('([^']+)'/g)].map((m) => m[1]);
  assert.ok(names.length > 0, 'expected braingames to emit adapter events');
  for (const eventName of names) {
    assert.ok(ALLOWED_EVENTS.has(eventName), `unexpected event ${eventName}`);
  }
});

test('braingames payloads use safe keys and do not leak raw score/prompt/identity text', () => {
  ALLOWED_KEYS.forEach((key) => assert.ok(source.includes(key), `missing expected key ${key}`));
  assert.equal(/emitAdapterEvent\([^\n]+\b(score|prompt|question|answer|child|name|diagnostic)\b/i.test(source), false);
});

test('braingames instrumentation remains local-only and tracking_ready remains false', () => {
  ['fetch(', 'XMLHttpRequest', 'indexedDB', 'database', 'db.'].forEach((token) => {
    assert.equal(source.includes(token), false, `forbidden runtime token present: ${token}`);
  });
  assert.match(registry, /game_key:\s*['\"]braingames['\"][\s\S]*tracking_ready:\s*false/);
});

test('braingames mini-game selection markers remain playable', () => {
  ['Freeze Runner', 'Distraction Defender', 'Plasma Hold', 'Calm Reactor', 'Switch Matrix'].forEach((token) => {
    assert.ok(source.includes(token), `missing gameplay marker ${token}`);
  });
});
