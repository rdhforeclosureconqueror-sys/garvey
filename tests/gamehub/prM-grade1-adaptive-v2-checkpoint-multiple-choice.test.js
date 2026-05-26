const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const adaptive = fs.readFileSync(path.join(root, 'public/gamehub/adaptive_learning'), 'utf8');

test('checkpoint renderer shows multiple choice when choices/options exist', () => {
  assert.match(adaptive, /Array\.isArray\(currentQ\.choices\).*Array\.isArray\(currentQ\.options\)/);
  assert.match(adaptive, /type="radio" name="v2CheckpointChoice"/);
});

test('checkpoint submit checks selected choice value against answer', () => {
  assert.match(adaptive, /selectedChoiceEl=document\.querySelector\('input\[name="v2CheckpointChoice"\]:checked'\)/);
  assert.match(adaptive, /const val=\(selectedChoiceValue\|\|\(input\?\.value\|\|''\)\)\.trim\(\)/);
  assert.match(adaptive, /String\(val\)\.toLowerCase\(\)===String\(currentQ\.answer\)\.toLowerCase\(\)/);
});

test('typed answer fallback still exists when no choices/options are present', () => {
  assert.match(adaptive, /<input id="v2CheckpointAnswer" placeholder="Type answer"/);
});

test('checkpoint persistence stores aggregate correctness only', () => {
  assert.match(adaptive, /persistGrade1V2Progress\(\{checkpointId:currentQ\?\.id\|\|`q_\$\{cpIdx\+1\}`,isCorrect:correct\}\)/);
  assert.doesNotMatch(adaptive, /persistGrade1V2Progress\([^\)]*(answer|selectedChoice|raw)/i);
});
