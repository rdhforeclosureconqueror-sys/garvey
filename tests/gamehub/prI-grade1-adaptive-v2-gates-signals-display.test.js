const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const adaptive = fs.readFileSync(path.join(root, 'public/gamehub/adaptive_learning'), 'utf8');

test('prI fetches candidate gates signals via read-only endpoint', () => {
  assert.match(adaptive, /\/api\/adaptive-v2\/gates-signals\//);
  assert.match(adaptive, /loadGrade1GatesSignals\(/);
});

test('prI renders parent-facing possible gates practice signals section and safety copy', () => {
  assert.match(adaptive, /Possible Gates Practice Signals/);
  assert.match(adaptive, /These are practice signals, not scores, grades, or diagnoses\./);
  assert.match(adaptive, /Gate name/);
  assert.match(adaptive, /Signal category/);
  assert.match(adaptive, /Confidence band/);
  assert.match(adaptive, /Supporting aggregate summary/);
});

test('prI renders empty-state copy when no candidate signals exist', () => {
  assert.match(adaptive, /Complete a few practice checkpoints to see possible practice signals\./);
});

test('prI keeps read-only safety boundaries and avoids leakage language', () => {
  assert.doesNotMatch(adaptive, /insert\s+into\s+gates_|update\s+gates_|gates_score|rank children/i);
  assert.doesNotMatch(adaptive, /diagnosis result|pass\/fail outcome/i);
  assert.doesNotMatch(adaptive, /raw prompt|raw answer|prompt text|answer text/i);
});
