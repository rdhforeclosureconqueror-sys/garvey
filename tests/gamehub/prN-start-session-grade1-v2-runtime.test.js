'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const adaptive = fs.readFileSync('public/gamehub/adaptive_learning', 'utf8');

test('start screen hides standalone grade1 checkpoint panel from learner runtime', () => {
  assert.match(adaptive, /id="grade1V2Panel" class="mini hidden"/);
});

test('startSession routes grade 1 to adaptive v2 checkpoint queue', () => {
  assert.match(adaptive, /runtimeSource=\"adaptive_v2_grade1_checkpoint\"|runtimeSource:\"adaptive_v2_grade1_checkpoint\"/);
  assert.match(adaptive, /mapGrade1SessionItemToQuestion/);
  assert.match(adaptive, /buildGrade1SessionQueue/);
});

test('grade1 runtime uses sequential queue and avoids legacy adaptive chooser for grade1 path', () => {
  assert.match(adaptive, /if\(s\.runtimeSource==="adaptive_v2_grade1_checkpoint"\)\{return state\.pool\[state\.results\.length\]\|\|null;\}/);
});
