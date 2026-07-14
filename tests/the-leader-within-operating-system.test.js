'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const db = fs.readFileSync('server/leaderWithinDb.js','utf8');
const service = fs.readFileSync('server/leaderWithinService.js','utf8');
const routes = fs.readFileSync('server/leaderWithinRoutes.js','utf8');
const index = fs.readFileSync('server/index.js','utf8');

test('durable Leader Within data model and seeded 12-week program exist', () => {
  for (const table of [
    'leader_within_programs','leader_within_cohorts','leader_within_program_enrollments',
    'leader_within_session_progress','leader_within_practice_selections','leader_within_reflections',
    'leader_within_shared_perspectives','leader_within_assessment_snapshots',
    'leader_within_facilitator_notes','leader_within_pocketpt_activity_summaries'
  ]) assert.match(db, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert.match(db, /The Leader Within — 12-Week Program/);
  assert.match(index, /applyLeaderWithinMigrations|createLeaderWithinRouter/);
});

test('youth, facilitator, cohort, and participant routes exist', () => {
  for (const route of ['/the-leader-within/my-program','/admin/the-leader-within','/admin/the-leader-within/cohorts/:cohortId','/admin/the-leader-within/participants/:participantId']) {
    assert.match(routes, new RegExp(route.replace(/[/:]/g, m => m === '/' ? '\\/' : '.')));
  }
  assert.match(routes, /\/api\/the-leader-within\/my-program/);
  assert.match(routes, /\/api\/admin\/the-leader-within/);
});

test('server-side authorization separates youth, facilitator, and tenant access', () => {
  assert.match(service, /Youth participants can only access their own program state/);
  assert.match(service, /Tenant isolation enforced/);
  assert.match(service, /Facilitator is not assigned to this cohort/);
  assert.match(service, /assertFacilitatorForCohort/);
  assert.match(service, /facilitator_private/);
});

test('youth dashboard exposes approved fields without raw scores or facilitator notes', () => {
  assert.match(service, /approved_strength_summary/);
  assert.match(service, /approved_growth_summary/);
  assert.match(routes, /Your result is a guide, not a limit/);
  assert.doesNotMatch(routes, /raw_score|rawScores|diagnostic_score|Private Facilitator Note[\s\S]*my-program/);
});

test('Week One session separation and story scheduling are explicit', () => {
  assert.match(service, /Session A — Learn the Story/);
  assert.match(service, /Session B — Practice Through the Body/);
  assert.match(service, /Session C — Apply and Reflect/);
  assert.match(service, /The Group Without a Captain/);
  assert.match(service, /The Practice That Started Falling Apart/);
  assert.match(service, /The Friend Who Did Not Say Much/);
  assert.match(service, /The Plan Changed/);
  assert.match(service, /The Person Who Always Talks First/);
  assert.match(service, /additional_stories/);
});

test('practice, reflection, shared perspective, controls, and PocketPT boundary are implemented', () => {
  assert.match(service, /Invalid participant-controlled practice selection/);
  assert.match(service, /INSERT INTO leader_within_practice_selections/);
  assert.match(service, /INSERT INTO leader_within_reflections/);
  assert.match(service, /INSERT INTO leader_within_shared_perspectives/);
  assert.match(service, /reopen/);
  assert.match(service, /make_up/);
  assert.match(service, /alternate_story_title/);
  assert.match(service, /Your PocketPT fitness session will match your current ability, safety needs, and personal training plan/);
  assert.doesNotMatch(service + routes, /PocketPT secret|POCKETPT_SECRET|universal workout prescribed/i);
});


test('youth operating system surfaces curriculum-connected daily workflow', () => {
  assert.match(service, /function curriculumWeek\(n\)/);
  assert.match(service, /weekly_story_library/);
  assert.match(service, /Today's Movement Mission/);
  assert.match(service, /Discover Your Leadership Style/);
  assert.match(service, /Choose today's leadership practice/);
  assert.match(service, /submissions_visible_to_facilitator: true/);
  assert.match(routes, /View This Week's Stories/);
  assert.match(routes, /Choose Today's Leadership Practice/);
  assert.match(routes, /Weekly Progress/);
  assert.match(routes, /My Growth/);
  assert.match(routes, /\/the-leader-within\/archetypes/);
});
