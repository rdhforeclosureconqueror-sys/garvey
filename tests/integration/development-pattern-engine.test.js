const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDevelopmentPatternEngine } = require('../../integration/developmentPatternEngine');

test('development pattern engine returns non-punitive developmental fields', () => {
  const result = buildDevelopmentPatternEngine({
    gatesProfile: { growth_gate: { name: 'Attention' } },
    practiceProgress: [{ status: 'practicing', progress_percent: 40 }],
    habitSignals: [{ integration_signals: ['integration signal: returns to connection'], self_correction_signals: ['self-correction: restarts calmly'], family_practices: ['family practice: evening reset'] }],
  });

  assert.ok(result.developmental_momentum);
  assert.ok(Array.isArray(result.emerging_patterns));
  assert.ok(Array.isArray(result.parent_growth_reflections));
  const corpus = JSON.stringify(result).toLowerCase();
  assert.equal(corpus.includes('non-compliant'), false);
  assert.equal(corpus.includes('failing'), false);
  assert.equal(corpus.includes('deficient'), false);
});
