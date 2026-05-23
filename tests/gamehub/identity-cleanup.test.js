const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

test('adaptive learning identity UI uses neutral learner defaults', () => {
  const adaptive = read('public/gamehub/adaptive_learning');
  assert.match(adaptive, /<label>Learner name<\/label>/);
  assert.match(adaptive, /DEFAULT_LEARNER_NAME="Demo Learner"/);
  assert.doesNotMatch(adaptive, /Marley Adaptive Learning System/i);
});

test('adaptive learning removes hardcoded active child names and keeps playable generic defaults', () => {
  const adaptive = read('public/gamehub/adaptive_learning');
  assert.doesNotMatch(adaptive, /Marley and I went to the library\./);
  assert.doesNotMatch(adaptive, /Yesterday, Marley went to the store\./);
  assert.match(adaptive, /The learner and I went to the library\./);
  assert.match(adaptive, /Yesterday, the learner went to the store\./);
  assert.match(adaptive, /child_display_name:"Learner"/);
  assert.match(adaptive, /studentName:DEFAULT_LEARNER_NAME/);
});

test('adaptive learning local storage keys are neutral with legacy fallback read only', () => {
  const adaptive = read('public/gamehub/adaptive_learning');
  assert.match(adaptive, /gamehub_adaptive_learning_history_/);
  assert.match(adaptive, /LEGACY_HISTORY_STORAGE_KEY="marley_adaptive_history"/);
  assert.match(adaptive, /getLegacyHistory\(\)/);
  assert.doesNotMatch(adaptive, /localStorage\.setItem\(LEGACY_HISTORY_STORAGE_KEY/);
});

test('no tracking or gates writeback introduced in identity cleanup', () => {
  const adaptive = read('public/gamehub/adaptive_learning');
  assert.doesNotMatch(adaptive, /track\(|track event|gatesScoring|database write|writeback/i);
});
