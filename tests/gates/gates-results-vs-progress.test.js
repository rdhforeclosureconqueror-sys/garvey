const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('results UI distinguishes assessment profile from practice progress', () => {
  const js = fs.readFileSync('public/gates.js', 'utf8');
  assert.equal(js.includes('Current Gates Profile'), true);
  assert.equal(js.includes('Practice Progress'), true);
  assert.equal(js.includes('parent observation, not diagnosis'), true);
});

test('progress map explains progress starts at 0', () => {
  const js = fs.readFileSync('public/gates.js', 'utf8');
  assert.equal(js.includes('Practice progress starts at 0%'), true);
});

test('gate map avoids empty-state when latest assessment exists', () => {
  const js = fs.readFileSync('public/gates.js', 'utf8');
  assert.equal(js.includes('profile.gates_profile || profile.latest_gates_profile'), true);
});
