const test = require('node:test');
const assert = require('node:assert/strict');

const { getAuthoredWeekContent, auditWeeklyContentSources } = require('../../youth-development/content/weeklyProgramContent');

test('weekly parent content audit reports canonical sources and no placeholder/demo/filler classifications', () => {
  const audit = auditWeeklyContentSources();
  assert.equal(audit.ok, true);
  assert.equal(typeof audit.sources.authored_phase_content, 'string');
  assert.equal(typeof audit.sources.program_weeks_rail, 'string');
  assert.deepEqual(audit.classifications.placeholder_demo_filler_content, []);
  assert.deepEqual(audit.classifications.generated_but_not_bank_governed, []);
  assert.deepEqual(audit.classifications.unclear_origin, []);
});

test('authored week content is parent-usable and explicitly traceable by field', () => {
  const week = getAuthoredWeekContent(1);
  assert.equal(typeof week.title, 'string');
  assert.equal(typeof week.objective, 'string');
  assert.equal(Array.isArray(week.parent_guidance), true);
  assert.equal(typeof week.reflection_prompt, 'string');
  assert.equal(typeof week.observation_prompt, 'string');
  assert.equal(week.source_trace.title, 'authored_phase_content');
  assert.equal(week.source_trace.step_sequence, 'structured_rail_definition');
  assert.doesNotMatch(JSON.stringify(week), /demo|placeholder|fixture|loading\./i);
});
