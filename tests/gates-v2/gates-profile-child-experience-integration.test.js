'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('profile renders Emotion Gate Adventure card without exposing child ids to public route', () => {
  const js = fs.readFileSync('public/gates.js', 'utf8');
  assert.match(js, /renderGateAdventureCard\(result, growthGate\)/);
  assert.match(js, /Begin the Emotion Gate Adventure/);
  assert.match(js, /\/gates-v2-child\//);
  assert.match(js, /return_to=/);
  assert.doesNotMatch(js, /gates-v2-child\/\?child/i);
  assert.doesNotMatch(js, /gates-v2-child\/\?assessment/i);
  assert.match(js, /Completion does not change assessment scores, Gate stage, Growth Gate, or Practice Progress/);
  assert.match(js, /Open Gate Details/);
  assert.match(js, /View Practice Progress/);
});

test('child experience validates return_to targets client-side', () => {
  const js = fs.readFileSync('public/gates-v2-child/emotion-k1.js', 'utf8');
  assert.match(js, /safeReturnPath/);
  assert.match(js, /decoded\.startsWith\('\/\/'\)/);
  assert.match(js, /\[a-z\]\[a-z0-9\+\.\-\]\*:/);
  assert.match(js, /\^\\\/gates\\\//);
  assert.match(js, /window\.location\.assign\(safeReturnPath\(\)\)/);
});
