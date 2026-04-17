const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PROGRAM_PHASES,
  PROGRAM_WEEKS,
  PROGRAM_CHECKPOINTS,
  PROGRAM_MODEL_CONTRACTS,
} = require('../../youth-development/tde/programRail');

test('36-week map is complete with deterministic required fields', () => {
  assert.equal(PROGRAM_PHASES.length, 3);
  assert.equal(PROGRAM_WEEKS.length, 36);

  const requiredWeekFields = PROGRAM_MODEL_CONTRACTS.program_week.required_fields;
  for (const week of PROGRAM_WEEKS) {
    for (const field of requiredWeekFields) {
      assert.ok(Object.prototype.hasOwnProperty.call(week, field), `missing field ${field} on week ${week.week_number}`);
    }
  }
});

test('phase boundaries are correct (1-12, 13-24, 25-36)', () => {
  const phase1 = PROGRAM_WEEKS.filter((week) => week.phase_number === 1).map((week) => week.week_number);
  const phase2 = PROGRAM_WEEKS.filter((week) => week.phase_number === 2).map((week) => week.week_number);
  const phase3 = PROGRAM_WEEKS.filter((week) => week.phase_number === 3).map((week) => week.week_number);

  assert.deepEqual(phase1, Array.from({ length: 12 }, (_, i) => i + 1));
  assert.deepEqual(phase2, Array.from({ length: 12 }, (_, i) => i + 13));
  assert.deepEqual(phase3, Array.from({ length: 12 }, (_, i) => i + 25));
});

test('checkpoint generation is deterministic and aligned to required weeks', () => {
  const checkpointWeeks = PROGRAM_CHECKPOINTS.map((entry) => entry.week_number);
  assert.deepEqual(checkpointWeeks, [1, 12, 24, 36]);

  const first = JSON.stringify(PROGRAM_CHECKPOINTS);
  const second = JSON.stringify(PROGRAM_CHECKPOINTS);
  assert.equal(first, second);

  for (const checkpoint of PROGRAM_CHECKPOINTS) {
    assert.ok(checkpoint.evidence_collection_plan);
    assert.ok(Array.isArray(checkpoint.target_traits));
    assert.equal(checkpoint.environment_review_flag, true);
    assert.equal(checkpoint.confidence_review_flag, true);
    assert.ok(Array.isArray(checkpoint.traceability_references));
  }
});
