'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const activity = require('../../public/gamehub/content/mate-masie-challenge.js');
test('Mate Masie provides a clue and a question', () => {
  assert.match(activity.CLUE, /Mara/);
  assert.match(activity.QUESTION, /details/);
  assert.equal(activity.OPTIONS.length, 3);
});
test('correct recall returns positive non-punitive feedback', () => {
  const result = activity.checkAnswer('blue-basket');
  assert.equal(result.correct, true);
  assert.match(result.feedback, /remembered/);
});
test('incorrect recall allows gentle retry', () => {
  const result = activity.checkAnswer('red-drum');
  assert.equal(result.correct, false);
  assert.match(result.feedback, /Listen again/);
});
