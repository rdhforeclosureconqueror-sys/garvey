const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const brickblastSource = fs.readFileSync(path.join(root, 'public/gamehub/brickblast'), 'utf8');

const CANONICAL_EVENTS = new Set([
  'game_session_started',
  'game_session_ended',
  'round_started',
  'round_completed',
  'level_changed',
  'recovery_after_miss'
]);

const ALLOWED_PAYLOAD_KEYS = new Set([
  'game_key',
  'activity_key',
  'level_band',
  'previous_level_band',
  'next_level_band',
  'success',
  'completion_state',
  'duration_band',
  'persistence_band',
  'event_category',
  'mode'
]);

test('BrickBlast pilot emits only canonical adapter events', () => {
  const matches = [...brickblastSource.matchAll(/emitAdapterEvent\("([^"]+)"/g)].map((m) => m[1]);
  assert.ok(matches.length > 0, 'expected BrickBlast to emit adapter events');
  matches.forEach((eventName) => {
    assert.equal(CANONICAL_EVENTS.has(eventName), true, `non-canonical event emitted: ${eventName}`);
  });
});

test('BrickBlast payloads are sanitized/banded and avoid forbidden details', () => {
  const payloadKeyMatches = [...brickblastSource.matchAll(/\b([a-z_]+)\s*:/g)].map((m) => m[1]);
  const pilotPayloadKeys = payloadKeyMatches.filter((k) => ALLOWED_PAYLOAD_KEYS.has(k));
  assert.ok(pilotPayloadKeys.length >= 10, 'expected adapter payload keys to be present');

  assert.doesNotMatch(brickblastSource, /emitAdapterEvent\([^)]*score\s*:/i);
  assert.doesNotMatch(brickblastSource, /emitAdapterEvent\([^)]*combo\s*:/i);
  assert.doesNotMatch(brickblastSource, /emitAdapterEvent\([^)]*\bx\s*:/i);
  assert.doesNotMatch(brickblastSource, /emitAdapterEvent\([^)]*\by\s*:/i);
  assert.doesNotMatch(brickblastSource, /emitAdapterEvent\([^)]*child/i);
  assert.doesNotMatch(brickblastSource, /emitAdapterEvent\([^)]*diagnostic/i);
  assert.doesNotMatch(brickblastSource, /emitAdapterEvent\([^)]*answer/i);
});

test('BrickBlast instrumentation remains local-only and gameplay flavor text stays intact', () => {
  assert.match(brickblastSource, /gamehub-session-adapter\.js/);
  assert.doesNotMatch(brickblastSource, /fetch\(|XMLHttpRequest|localStorage|indexedDB|database|db\./i);

  assert.match(brickblastSource, /Combo Rush Edition/);
  assert.match(brickblastSource, /mystery drops/);
  assert.match(brickblastSource, /Best Combo/);
  assert.match(brickblastSource, /LASER READY/);
});
