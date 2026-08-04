'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveAgeBand, resolveGateExperienceLaunch } = require('../../gates-v2/integration/gateExperienceLaunchRegistry');

test('gate resolver exposes only Emotion K1 as available', () => {
  const emotion = resolveGateExperienceLaunch({ growthGate: { gate_key: 'emotion', name: 'Emotion' }, childGradeBand: 'K' });
  assert.equal(emotion.status, 'available');
  assert.equal(emotion.launch.path, '/gates-v2-child/');
  for (const gate of ['attention', 'choice', 'body', 'discipline', 'truth', 'repair', 'creation', 'community', 'legacy']) {
    assert.equal(resolveGateExperienceLaunch({ growthGate: gate, childGradeBand: 'K' }).status, 'coming_soon', gate);
  }
  assert.equal(resolveGateExperienceLaunch({ growthGate: 'not-a-gate' }).status, 'invalid_gate');
});

test('age band resolution is deterministic and honest', () => {
  assert.equal(resolveAgeBand({ childGradeBand: 'Kindergarten' }).status, 'supported');
  assert.equal(resolveAgeBand({ childGradeBand: 'Grade 1' }).status, 'supported');
  assert.equal(resolveAgeBand({ childAgeBand: '5-7' }).status, 'supported');
  assert.equal(resolveAgeBand({ childGradeBand: 'Grade 3', childAgeBand: '8-9' }).status, 'unsupported');
  assert.equal(resolveAgeBand({}).status, 'missing');
  assert.equal(resolveGateExperienceLaunch({ growthGate: 'emotion', childGradeBand: 'Grade 3' }).status, 'unsupported_age_band');
});
