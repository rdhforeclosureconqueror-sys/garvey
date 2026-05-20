const test = require('node:test');
const assert = require('node:assert/strict');
const { FIRST_GENERATION_BLUEPRINT, BLUEPRINT_BY_KEY } = require('../../gates/firstGenerationBlueprint');
const { generateGatesRecommendations } = require('../../gates/gatesRecommendations');
const { buildGatesProfile } = require('../../gates/gatesProfileBuilder');

test('Blueprint exports all 10 gates', () => {
  assert.equal(FIRST_GENERATION_BLUEPRINT.length, 10);
});

test('Emotion gate has core blueprint fields', () => {
  const g = BLUEPRINT_BY_KEY.get('emotion');
  assert.ok(g.reflection_questions?.length);
  assert.ok(g.journal_prompts?.length);
  assert.ok(g.developing_signs?.length);
  assert.ok(g.ceremony);
});

test('recommendations include reflection, journal, observation, practice, ceremony', () => {
  const recs = generateGatesRecommendations({ child_id:'1', current_growth_gate:'emotion' });
  const cats = new Set(recs.map(r=>r.category));
  for (const c of ['reflection','journal','observation','practice','ceremony']) assert.equal(cats.has(c), true);
});

test('profile builder returns stage labels', () => {
  const profile = buildGatesProfile({ gate_scores:[{gate_key:'emotion',normalized_score:0.7,status:'practicing'}], primary_gates:['emotion'], current_growth_gate:'emotion' });
  assert.ok(profile.gate_map[1].current_stage);
});

test('no medical wording in blueprint', () => {
  const raw = JSON.stringify(FIRST_GENERATION_BLUEPRINT).toLowerCase();
  for (const banned of ['diagnostic','medical','pathology','iq','disorder']) assert.equal(raw.includes(banned), false);
});
