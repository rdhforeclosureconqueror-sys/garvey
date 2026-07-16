const test = require('node:test');
const assert = require('node:assert/strict');
const { buildLearningJourney } = require('../server/learningJourneyService');

function poolWithRows(rowsByTable) {
  return { async query(sql) {
    if (sql.includes('FROM assessment_sessions')) return { rows: rowsByTable.assessment_sessions || [] };
    if (sql.includes('FROM skill_world_progress')) return { rows: rowsByTable.skill_world_progress || [] };
    if (sql.includes('FROM adaptive_v2_skill_progress')) return { rows: rowsByTable.adaptive_v2_skill_progress || [] };
    if (sql.includes('FROM adaptive_v2_checkpoint_attempts')) return { rows: rowsByTable.adaptive_v2_checkpoint_attempts || [] };
    return { rows: [] };
  } };
}

test('Learning Journey advances high mastery to the next lesson', async () => {
  const journey = await buildLearningJourney(poolWithRows({ adaptive_v2_skill_progress: [{ grade: '1', selected_skill_id: 'G1-MATH-05', checkpoint_attempts: 1, correct_count: 49, total_count: 50, mastery_band: 'consistent', next_recommended_skill_id: 'G1-MATH-06' }] }), { childId: '101', childName: 'Princess Nia' });
  assert.equal(journey.ok, true);
  assert.equal(journey.current.recommendation.type, 'enrichment');
  assert.equal(journey.parent_view.next_recommended_activity.includes('G1 Math 06'), true);
  assert.equal(journey.ai_coach_context.must_not_guess_curriculum_position, true);
});

test('Learning Journey recommends practice for weak mastery or repeated errors', async () => {
  const journey = await buildLearningJourney(poolWithRows({
    adaptive_v2_skill_progress: [{ grade: '1', selected_skill_id: 'G1-MATH-FRACTIONS', checkpoint_attempts: 4, correct_count: 7, total_count: 11, mastery_band: 'emerging', next_recommended_skill_id: 'G1-MATH-06' }],
    adaptive_v2_checkpoint_attempts: [
      { skill_id: 'G1-MATH-FRACTIONS', checkpoint_id: 'c1', is_correct: false, mastery_band_after: 'emerging', created_at: '2026-07-15T10:00:00Z' },
      { skill_id: 'G1-MATH-FRACTIONS', checkpoint_id: 'c2', is_correct: false, mastery_band_after: 'emerging', created_at: '2026-07-15T10:05:00Z' }
    ]
  }), { childId: '101', childName: 'Princess Nia' });
  assert.equal(journey.current.recommendation.type, 'practice');
  assert.match(journey.current.recommendation.reason, /practice is better/i);
});

test('Learning Journey prioritizes unfinished Skill Worlds for Continue Learning', async () => {
  const journey = await buildLearningJourney(poolWithRows({ skill_world_progress: [{ skill_id: 'FRACTION-WORLD', status: 'in_progress', progress_percent: 40, score_percent: 60, attempts: 3, updated_at: '2026-07-15T10:00:00Z' }] }), { childId: '101' });
  assert.equal(journey.current.recommendation.type, 'skill_world');
  assert.match(journey.current.recommendation.launch_route, /skill-world/);
  assert.equal(journey.child_view.headline, 'Continue Your Adventure');
});
