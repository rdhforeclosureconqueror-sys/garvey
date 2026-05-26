const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const adaptive = fs.readFileSync(path.join(root, 'public/gamehub/adaptive_learning'), 'utf8');

test('adaptive page still has core launch shell controls', () => {
  assert.match(adaptive, /Start a Practice Session/);
  assert.match(adaptive, /id="startBtn"/);
  assert.match(adaptive, /id="quizScreen"/);
});

test('active grade selector is grades 1 through 6 only', () => {
  const select = adaptive.match(/<select id="gradeSelect">([\s\S]*?)<\/select>/);
  assert.ok(select);
  const options = [...select[1].matchAll(/<option value="(\d+)"(?: selected)?>/g)].map((m) => Number(m[1]));
  assert.deepEqual(options, [1,2,3,4,5,6]);
  assert.doesNotMatch(select[1], /value="7"|value="8"/);
});

test('v2 label and parent-facing checkpoint language are present', () => {
  assert.match(adaptive, /Adaptive Learning V2 — Grades 1–6/);
  assert.match(adaptive, /Checkpoints help show what to practice next\. They are not pass\/fail labels\./);
});

test('legacy 6-8 behavior stays fallback/archive-only and active runtime clamps to 1-6', () => {
  assert.match(adaptive, /active grades 1-6; legacy 6-8 archived fallback/);
  assert.match(adaptive, /Math\.min\(6,s\.currentGradeTarget\+1\)/);
  assert.match(adaptive, /Math\.max\(1,s\.currentGradeTarget-1\)/);
});

test('no db writes, tracking enablement, or gates scoring wiring added', () => {
  assert.doesNotMatch(adaptive, /insert\s+into|update\s+.*set|database\s*write|db\./i);
  assert.doesNotMatch(adaptive, /tracking_ready\s*:\s*true|enable tracking|track\(/i);
  assert.doesNotMatch(adaptive, /gatesScoring|connect gates|gate score/i);
});

test('legacy content files remain in repository', () => {
  assert.equal(fs.existsSync(path.join(root, 'public/gamehub/content/question-bank.sample.json')), true);
});
