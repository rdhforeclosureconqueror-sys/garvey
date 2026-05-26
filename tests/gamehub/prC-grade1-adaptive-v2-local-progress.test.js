const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const adaptive = fs.readFileSync(path.join(root, 'public/gamehub/adaptive_learning'), 'utf8');

test('grade 1 adaptive v2 progress state is server-backed for runtime pilot', () => {
  assert.match(adaptive, /Grade 1 Adaptive V2 runtime \(PR [EF]\)/);
  assert.match(adaptive, /\/api\/adaptive-v2\/progress\/summary\//);
});

test('checkpoint attempts and hint usage are represented and persisted through controlled endpoints', () => {
  assert.match(adaptive, /grade1V2State\.progress\.checkpointAttempts\+=1/);
  assert.match(adaptive, /grade1V2State\.progress\.hintUsage\+=1/);
  assert.match(adaptive, /id="v2UseHintBtn"/);
});

test('parent-friendly local summary sections render in runtime panel', () => {
  assert.match(adaptive, /Today's Practice Session/);
  assert.match(adaptive, /Growing skills/);
  assert.match(adaptive, /Needs more practice/);
  assert.match(adaptive, /Session recommendation/);
  assert.match(adaptive, /Parent Progress Summary/);
  assert.doesNotMatch(adaptive, /Converted planning artifact only; runtime pathway mapping pending\./);
});

test('no gates scoring or diagnosis/pass-fail language is introduced', () => {
  assert.doesNotMatch(adaptive, /gatesScoring|gate score|connect gates/i);
  assert.doesNotMatch(adaptive, /pass\/fail outcome|clinical diagnosis/i);
});


test('selected session count maps exactly to rendered queue length without overshoot', () => {
  const adaptiveHtml = fs.readFileSync(path.join(root, 'public/gamehub/adaptive_learning.html'), 'utf8');
  assert.match(adaptiveHtml, /for\(let i=0;i<desired;i\+=1\)/);
  assert.match(adaptiveHtml, /grade1V2State\.session\.queue\.length/);
});
