const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const adaptive = fs.readFileSync(path.join(__dirname, '../../public/gamehub/adaptive_learning.html'), 'utf8');

test('prK renders Grade 1 voice controls', () => {
  assert.match(adaptive, /Listen to lesson/);
  assert.match(adaptive, /Listen to example/);
  assert.match(adaptive, /Listen to hint/);
  assert.match(adaptive, /Stop voice/);
});

test('prK uses adaptive-v2 voice sections route and fallback-safe browser speech', () => {
  assert.match(adaptive, /\/api\/adaptive-v2\/voice\/sections/);
  assert.match(adaptive, /speechSynthesis/);
});

test('prK keeps grade1-only voice with no grades 2-6 voice wiring, gates scoring, or diagnosis\/pass-fail language', () => {
  assert.doesNotMatch(adaptive, /grade\s*[2-6].*voice|voice.*grade\s*[2-6]/i);
  assert.doesNotMatch(adaptive, /gatesScoring|gate score|insert\s+into\s+gates_|update\s+gates_/i);
  assert.doesNotMatch(adaptive, /voice.*diagnos|voice.*pass\/?fail|adaptive-v2\/voice\/sections[^\n]*diagnos/i);
});
