const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const adaptive = fs.readFileSync(path.join(root, 'public/gamehub/adaptive_learning'), 'utf8');

test('grade 1 adaptive v2 uses controlled persistence endpoints', () => {
  assert.match(adaptive, /Grade 1 Adaptive V2 runtime \(PR E\)/);
  assert.match(adaptive, /\/api\/adaptive-v2\/progress\/summary\//);
  assert.match(adaptive, /\/api\/adaptive-v2\/progress\/checkpoint-attempt/);
});

test('grade 1 persistence keeps supportive language and no gates wiring', () => {
  assert.doesNotMatch(adaptive, /pass\/fail outcome|clinical diagnosis/i);
  assert.doesNotMatch(adaptive, /gates_practice|gates_score|gate score/i);
});

test('grade 1 persistence avoids raw prompt/answer persistence keys in write payload', () => {
  assert.doesNotMatch(adaptive, /parent_summary_snapshot:[^}]*prompt/i);
  assert.doesNotMatch(adaptive, /parent_summary_snapshot:[^}]*answer/i);
});
