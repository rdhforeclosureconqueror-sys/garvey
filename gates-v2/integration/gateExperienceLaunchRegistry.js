'use strict';

const CHILD_GATE_EXPERIENCES = Object.freeze({
  emotion: Object.freeze({
    experienceId: 'example_emotion_block_tower_k1',
    gateKey: 'emotion',
    gateName: 'Emotion',
    ageBands: Object.freeze(['k1']),
    path: '/gates-v2-child/',
    status: 'available',
    label: 'Begin the Emotion Gate Adventure',
    description: 'Help your child practice noticing feelings, body clues, calming, choices, consequences, and repair through a short interactive story.',
  }),
});

const KNOWN_GATE_KEYS = Object.freeze(['attention', 'emotion', 'choice', 'body', 'discipline', 'truth', 'repair', 'creation', 'community', 'legacy']);
const GATE_NAMES = Object.freeze({ attention: 'Attention', emotion: 'Emotion', choice: 'Choice', body: 'Body', discipline: 'Discipline', truth: 'Truth', repair: 'Repair', creation: 'Creation', community: 'Community', legacy: 'Legacy' });

function normalizeGate(value) {
  const gate = String(value?.gate_key || value?.key || value?.name || value || '').trim().toLowerCase().replace(/[^a-z]/g, '');
  return gate || null;
}

function resolveAgeBand({ childAgeBand = '', childGradeBand = '' } = {}) {
  const grade = String(childGradeBand || '').trim().toLowerCase();
  const age = String(childAgeBand || '').trim().toLowerCase();
  if (!grade && !age) return { status: 'missing', ageBand: null };
  if (/\b(k|kindergarten)\b/.test(grade) || /grade\s*1\b|\b1st\b|\bfirst\b/.test(grade)) return { status: 'supported', ageBand: 'k1' };
  if (/\b(5|6|7)\b/.test(age) || /5\s*-\s*7/.test(age)) return { status: 'supported', ageBand: 'k1' };
  return { status: 'unsupported', ageBand: 'unknown' };
}

function resolveGateExperienceLaunch({ growthGate, childAgeBand = '', childGradeBand = '', registry = CHILD_GATE_EXPERIENCES } = {}) {
  const gateKey = normalizeGate(growthGate);
  if (!gateKey || !KNOWN_GATE_KEYS.includes(gateKey)) return { status: 'invalid_gate', gateKey, gateName: 'Unknown Gate', launch: null, age: resolveAgeBand({ childAgeBand, childGradeBand }) };
  const gateName = GATE_NAMES[gateKey] || String(growthGate?.name || gateKey);
  const experience = registry[gateKey];
  if (!experience || experience.status !== 'available') return { status: 'coming_soon', gateKey, gateName, launch: null, age: resolveAgeBand({ childAgeBand, childGradeBand }) };
  const age = resolveAgeBand({ childAgeBand, childGradeBand });
  if (age.status === 'unsupported') return { status: 'unsupported_age_band', gateKey, gateName, launch: null, age, experience };
  return { status: 'available', gateKey, gateName, launch: experience, age, experience };
}

module.exports = { CHILD_GATE_EXPERIENCES, KNOWN_GATE_KEYS, resolveAgeBand, resolveGateExperienceLaunch };
