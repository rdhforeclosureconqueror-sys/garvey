const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('public/gamehub/braingame2.html', 'utf8');
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

test('braingame2 mini-suite emits only canonical adapter events', () => {
  const names = [...source.matchAll(/emitAdapterEvent\('([^']+)'/g)].map((m) => m[1]);
  assert.ok(names.length > 0, 'expected braingame2 to emit adapter events');
  for (const eventName of names) {
    assert.ok(ALLOWED_EVENTS.has(eventName), `unexpected event ${eventName}`);
  }
});

test('braingame2 payloads avoid identity/raw prompt/exact score leakage', () => {
  assert.doesNotMatch(source, /emitAdapterEvent\([^)]*\b(child|prompt|question|answer|diagnostic)\b\s*:/i);
  assert.doesNotMatch(source, /emitAdapterEvent\([^)]*\b(score|jackpot|prize)\b\s*:/i);
});

test('braingame2 instrumentation remains local-only and tracking_ready remains false', () => {
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|indexedDB|localStorage|database|db\./i);
  assert.match(registry, /game_key:\s*['\"]braingame2['\"][\s\S]*tracking_ready:\s*false/);
});

test('braingame2 mini-game markers remain present', () => {
  ['Maze Freeze Run', 'Signal Sorter', 'Quantum Prize Wheel', 'Emotion Meter Challenge', 'Task Switching Lab'].forEach((token) => {
    assert.ok(source.includes(token), `missing gameplay marker ${token}`);
  });
});
