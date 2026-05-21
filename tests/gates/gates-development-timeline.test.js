const test = require('node:test');
const assert = require('node:assert/strict');
const { GATES_MIGRATIONS } = require('../../server/gatesDb');
const { summarizeTimelineForChild, buildTimelineEventId } = require('../../gates/gatesDevelopmentTimeline');
const fs = require('node:fs');

test('migration creates development timeline table and indexes', () => {
  const sql = GATES_MIGRATIONS.flatMap((m) => m.statements).join('\n');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS gates_development_timeline/i);
  assert.match(sql, /gates_development_timeline_event_id_uq/i);
  assert.match(sql, /gates_development_timeline_child_occurred_idx/i);
});

test('timeline event id is deterministic for duplicate suppression', () => {
  const a = buildTimelineEventId({ child_id: '1', parent_user_id: 2, event_type: 'assessment_completed', source_type: 'assessment_submit', source_id: 'ga_1' });
  const b = buildTimelineEventId({ child_id: '1', parent_user_id: 2, event_type: 'assessment_completed', source_type: 'assessment_submit', source_id: 'ga_1' });
  assert.equal(a, b);
});

test('timeline summary includes latest_event and gates_touched', () => {
  const summary = summarizeTimelineForChild([
    { title: 'Practice progress updated', gate_number: 2 },
    { title: 'Growth Gate identified: Attention', gate_number: 1 },
  ]);
  assert.equal(summary.total_events, 2);
  assert.equal(summary.latest_event.title, 'Practice progress updated');
  assert.deepEqual(summary.gates_touched, [1,2]);
});

test('ui renders Development Timeline section and contains calm language', () => {
  const js = fs.readFileSync('public/gates.js', 'utf8');
  assert.match(js, /Development Timeline/);
  assert.match(js, /Your family’s Gates journey will appear here/);
  assert.doesNotMatch(js, /leaderboard|streak|noncompliant|punishment|compliance/i);
});

test('routes wire timeline event types and timeline API auth ownership checks', () => {
  const routes = fs.readFileSync('server/gatesRoutes.js', 'utf8');
  assert.match(routes, /assessment_completed/);
  assert.match(routes, /growth_gate_selected/);
  assert.match(routes, /practice_progress_updated/);
  assert.match(routes, /\/api\/gates\/children\/:childId\/timeline/);
  assert.match(routes, /unauthenticated/);
  assert.match(routes, /forbidden/);
});
