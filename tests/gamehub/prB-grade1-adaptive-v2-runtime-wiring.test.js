const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const adaptive = fs.readFileSync(path.join(root, 'public/gamehub/adaptive_learning'), 'utf8');

test('adaptive page launches with existing shell and selector preserved', () => {
  assert.match(adaptive, /Start a Practice Session/);
  assert.match(adaptive, /id="startBtn"/);
  assert.match(adaptive, /id="gradeSelect"/);
});

test('grade 1 v2 runtime panel loads math and reading\/english content', () => {
  assert.match(adaptive, /Grade 1 Adaptive V2 runtime \(PR [BC]\)/);
  assert.match(adaptive, /reading-english/);
  assert.match(adaptive, /math/);
});

test('grade 1 lesson snippet, worked example, hint ladder, checkpoint, feedback, and recommendation render hooks exist', () => {
  assert.match(adaptive, /Lesson snippet/);
  assert.match(adaptive, /Worked example/);
  assert.match(adaptive, /Hint ladder/);
  assert.match(adaptive, /Checkpoint/);
  assert.match(adaptive, /Supportive feedback:/);
  assert.match(adaptive, /Next practice recommendation:/);
});

test('no db writes, tracking enablement, gates scoring, or clinical pass\/fail language were added', () => {
  assert.doesNotMatch(adaptive, /insert\s+into|update\s+.*set|database\s*write|db\./i);
  assert.doesNotMatch(adaptive, /tracking_ready\s*:\s*true|enable tracking/i);
  assert.doesNotMatch(adaptive, /gatesScoring|connect gates|gate score/i);
  assert.doesNotMatch(adaptive, /clinical diagnosis|diagnostic proof|pass\/fail outcome/i);
});

test('grade 1 content package files exist for math and reading/english', () => {
  assert.equal(fs.existsSync(path.join(root, 'public/gamehub/content/adaptive-v2/grades/grade1/math/skills/g1m_ns_001.lesson-package.v1.json')), true);
  assert.equal(fs.existsSync(path.join(root, 'public/gamehub/content/adaptive-v2/grades/grade1/reading-english/skills/g1e_rf_001.lesson-package.v1.json')), true);
});
