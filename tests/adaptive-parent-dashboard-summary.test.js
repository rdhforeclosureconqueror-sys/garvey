const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAdaptiveParentDashboardSummary, isFakeLearnerName } = require('../server/adaptiveParentDashboardSummary');

function poolWithRows(rowsByTable) {
  return {
    calls: [],
    async query(sql, params) {
      this.calls.push({ sql, params });
      if (sql.includes('FROM assessment_sessions')) return { rows: rowsByTable.assessment_sessions || [] };
      if (sql.includes('FROM skill_world_progress')) return { rows: rowsByTable.skill_world_progress || [] };
      if (sql.includes('FROM adaptive_v2_skill_progress')) return { rows: rowsByTable.adaptive_v2_skill_progress || [] };
      if (sql.includes('FROM adaptive_v2_checkpoint_attempts')) return { rows: rowsByTable.adaptive_v2_checkpoint_attempts || [] };
      return { rows: [] };
    }
  };
}

test('parent dashboard summary returns Princess Nia assessment records and migrated progress under canonical ID', async () => {
  const pool = poolWithRows({
    assessment_sessions: [{ session_id: 'a1', child_id: '101', parent_profile_id: '55', subject: 'Math', grade: 1, status: 'completed', completed_at: '2026-07-15T10:00:00Z' }],
    adaptive_v2_skill_progress: [{ child_id: '101', parent_profile_id: '55', selected_skill_id: 'G1-MATH-01', checkpoint_attempts: 3, correct_count: 2, total_count: 3, next_recommended_skill_id: 'G1-MATH-02', updated_at: '2026-07-15T11:00:00Z' }],
    adaptive_v2_checkpoint_attempts: [{ child_id: '101', parent_profile_id: '55', skill_id: 'G1-MATH-01', is_correct: true, created_at: '2026-07-15T11:00:00Z' }]
  });
  const out = await buildAdaptiveParentDashboardSummary(pool, { childId: '101', parentProfileId: '55', childName: 'Princess Nia' });
  assert.equal(out.ok, true);
  assert.equal(out.child_id, '101');
  assert.equal(out.assessments_completed, 1);
  assert.equal(out.checkpoints_completed, 1);
  assert.equal(out.next_recommended_learning_activity, 'G1-MATH-02');
  assert.equal(out.recent_activity.every((item) => item.child_id === '101'), true);
});

test('parent dashboard summary returns Skill World completed, in-progress, and not-started states', async () => {
  const pool = poolWithRows({ skill_world_progress: [
    { child_id: '101', skill_id: 'WORLD-A', status: 'completed', progress_percent: 100, score_percent: 96, attempts: 2, last_step: 'finish', updated_at: '2026-07-15T10:00:00Z' },
    { child_id: '101', skill_id: 'WORLD-B', status: 'in_progress', progress_percent: 45, score_percent: 70, attempts: 4, last_step: 'lesson 2', updated_at: '2026-07-15T11:00:00Z' },
    { child_id: '101', skill_id: 'WORLD-C', status: 'not_started', progress_percent: 0, score_percent: 0, attempts: 0, last_step: '', updated_at: '2026-07-15T09:00:00Z' },
  ] });
  const out = await buildAdaptiveParentDashboardSummary(pool, { childId: '101', childName: 'Princess Nia' });
  assert.equal(out.skill_worlds_completed, 1);
  assert.equal(out.current_skill_world, 'WORLD-B');
  assert.deepEqual(out.skill_worlds.map((s) => s.status), ['completed', 'in_progress', 'not_started']);
});

test('records belonging to another parent are excluded through parent_profile_id query filters', async () => {
  const pool = poolWithRows({});
  await buildAdaptiveParentDashboardSummary(pool, { childId: '101', parentProfileId: '55', childName: 'Princess Nia' });
  assert.equal(pool.calls.every((call) => call.sql.includes('parent_profile_id::text=$2')), true);
  assert.equal(pool.calls.every((call) => call.params[1] === '55'), true);
});

test('guest, NSI, and Mar are not acceptable fallback learners', () => {
  assert.equal(isFakeLearnerName('Guest'), true);
  assert.equal(isFakeLearnerName('NSI'), true);
  assert.equal(isFakeLearnerName('Mar'), true);
  assert.equal(isFakeLearnerName('Princess Nia'), false);
});

test('empty progress displays a safe empty state', async () => {
  const out = await buildAdaptiveParentDashboardSummary(poolWithRows({}), { childId: '101', childName: 'Princess Nia' });
  assert.equal(out.ok, true);
  assert.equal(out.empty_state, true);
  assert.equal(out.overall_status_label, 'No adaptive learning progress yet');
});
