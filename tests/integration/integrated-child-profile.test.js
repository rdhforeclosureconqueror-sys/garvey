const test = require('node:test');
const assert = require('node:assert/strict');
const { buildIntegratedChildProfile } = require('../../integration/integratedChildProfileBuilder');

test('gates-only payload composes safely', () => {
  const p = buildIntegratedChildProfile({ childId: 'c1', gatesData: { gates_profile: { growth_gate: { name: 'Attention' } } } });
  assert.equal(p.source_presence.gates, true);
  assert.equal(p.source_presence.identity, false);
  assert.equal(p.source_presence.tde, false);
});

test('identity-only payload composes safely with soft wording', () => {
  const p = buildIntegratedChildProfile({ childId: 'c1', identityData: { primary_tendency: 'Creator' } });
  assert.equal(p.source_presence.identity, true);
  assert.ok(p.developmental_supports.join(' ').toLowerCase().includes('emerging creator tendencies'));
  assert.equal(/fixed|permanent|deterministic/.test(JSON.stringify(p).toLowerCase()), false);
});

test('partial data works and no rigid identity language', () => {
  const p = buildIntegratedChildProfile({ childId: 'c1', identityData: { primary_tendency: 'Explorer' }, tdeData: { trait_targets: ['SR'] } });
  const blob = JSON.stringify(p).toLowerCase();
  assert.equal(blob.includes('fixed identity'), false);
  assert.equal(blob.includes('rigid label'), false);
});

test('all sources compose and summary remains non-diagnostic', () => {
  const p = buildIntegratedChildProfile({ childId: 'c1', gatesData: { gates_profile: { growth_gate: { name: 'Emotion' } } }, identityData: { primary_tendency: 'Healer' }, tdeData: { trait_targets: ['AD', 'SR'] } });
  assert.equal(p.source_presence.gates, true);
  assert.equal(p.source_presence.identity, true);
  assert.equal(p.source_presence.tde, true);
  assert.ok(p.integrated_summary.toLowerCase().includes('independent'));
});
