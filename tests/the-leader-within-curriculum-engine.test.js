'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const service = fs.readFileSync('server/leaderWithinService.js','utf8');
const routes = fs.readFileSync('server/leaderWithinRoutes.js','utf8');
const db = fs.readFileSync('server/leaderWithinDb.js','utf8');

test('canonical curriculum resolver returns normalized mission state', () => {
  assert.match(service, /async function resolveParticipantCurriculumState/);
  for (const key of ['participant','program','cohort','position','mission','featured_story','weekly_stories','practices','movement','reflection','assessment','progress','growth']) assert.match(service, new RegExp(`${key}:`));
  assert.match(service, /leader-within-curriculum-resolver-v1/);
  assert.match(service, /cohort_current_week \|\| row\.current_week/);
  assert.match(service, /cohort_current_session \|\| row\.current_session/);
});

test('durable content version and story completion schema exist', () => {
  assert.match(db, /curriculum_version TEXT NOT NULL DEFAULT '2026\.07'/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS leader_within_story_completions/);
  assert.match(db, /UNIQUE \(enrollment_id, story_id\)/);
  assert.match(db, /ALTER TABLE leader_within_program_enrollments ADD COLUMN IF NOT EXISTS curriculum_version/);
});

test('weekly story library and detail routes are connected', () => {
  for (const route of ['/the-leader-within/stories', '/the-leader-within/weeks/:weekNumber/stories', '/the-leader-within/stories/:storyId']) {
    assert.match(routes, new RegExp(route.replace(/[/:]/g, m => m === '/' ? '\\/' : '.')));
  }
  assert.match(routes, /\/api\/the-leader-within\/stories\/:storyId\/complete/);
  assert.match(service, /story_not_assigned/);
  assert.match(service, /INSERT INTO leader_within_story_completions/);
});

test('practice and reflection persist with mission linkage fields', () => {
  assert.match(db, /selected_practice_id TEXT/);
  assert.match(db, /mission_id TEXT/);
  assert.match(db, /facilitator_review_status TEXT NOT NULL DEFAULT 'pending_review'/);
  assert.match(service, /participant_id,cohort_id,session_code,participant_reason,status/);
  assert.match(service, /mission_id,story_id,selected_practice_id,response_text,visibility/);
});

