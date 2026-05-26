const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const adaptive = fs.readFileSync(path.join(root, 'public/gamehub/adaptive_learning'), 'utf8');

test('grade 1 adaptive v2 progress state is local and in-memory for runtime pilot', () => {
  assert.match(adaptive, /Grade 1 Adaptive V2 runtime \(PR E\)/);
  assert.match(adaptive, /progress:\{currentSelectedSkill:"",checkpointAttempts:0,correctCount:0,totalCount:0,hintUsage:0,localMasteryBand:"emerging",nextRecommendedSkill:""\}/);
});

test('checkpoint attempts and hint usage are represented and updated locally', () => {
  assert.match(adaptive, /grade1V2State\.progress\.checkpointAttempts\+=1/);
  assert.match(adaptive, /grade1V2State\.progress\.hintUsage\+=1/);
  assert.match(adaptive, /id="v2UseHintBtn"/);
});

test('parent-friendly local summary sections render in runtime panel', () => {
  assert.match(adaptive, /Current practice profile/);
  assert.match(adaptive, /Growing skills/);
  assert.match(adaptive, /Needs more practice/);
  assert.match(adaptive, /Suggested next step/);
});

test('no gates scoring or diagnosis/pass-fail language is introduced', () => {
  assert.doesNotMatch(adaptive, /gatesScoring|gate score|connect gates/i);
  assert.doesNotMatch(adaptive, /pass\/fail outcome|clinical diagnosis/i);
});
