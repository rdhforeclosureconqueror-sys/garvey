'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const service = fs.readFileSync('server/leaderWithinService.js','utf8');
const routes = fs.readFileSync('server/leaderWithinRoutes.js','utf8');
const db = fs.readFileSync('server/leaderWithinDb.js','utf8');

test('facilitator control center exposes resolver, cohort detail, and responsive progress UI', () => {
  assert.match(service, /async function resolveFacilitatorParticipantCurriculumState/);
  assert.match(service, /resolveParticipantCurriculumState\(pool,\{enrollmentId:row\.enrollment_id,cohortId,now\}\)/);
  assert.match(service, /facilitatorCohortDetail/);
  assert.match(routes, /Cohort Progress Table/);
  assert.match(routes, /progress-cards/);
  assert.match(routes, /Open Participant/);
});

test('review workflow separates youth feedback, private notes, and follow-up flags', () => {
  for (const table of ['leader_within_youth_feedback','leader_within_follow_up_flags','leader_within_recognitions']) assert.match(db, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert.match(service, /async function reviewReflection/);
  assert.match(service, /leader_within_youth_feedback/);
  assert.match(service, /leader_within_facilitator_notes[\s\S]*facilitator_private/);
  assert.match(service, /async function createFollowUpFlag/);
  assert.match(service, /async function resolveFollowUpFlag/);
  assert.match(routes, /Notes From Your Facilitator/);
});

test('progression, pause resume, reopen, assessment retake, and recognition are audited', () => {
  for (const fn of ['advanceCohortSession','advanceCohortWeek','pauseCohort','resumeCohort','reopenSession','allowAssessmentRetake','createRecognition']) assert.match(service, new RegExp(`async function ${fn}`));
  for (const event of ['cohort_session_advanced','cohort_week_advanced','cohort_paused','cohort_resumed','session_reopened','assessment_retake_allowed','recognition_created','reflection_reviewed','youth_feedback_created','private_note_created','follow_up_flag_created','follow_up_flag_resolved']) assert.match(service, new RegExp(event));
  assert.match(service, /SESSION_ORDER\.indexOf/);
  assert.match(service, /override_reason/);
  assert.match(db, /paused_at TIMESTAMP/);
  assert.match(db, /retake_allowed BOOLEAN NOT NULL DEFAULT FALSE/);
});

test('admin api routes require existing csrf middleware and avoid browser supplied identities', () => {
  for (const route of ['advance-session','advance-week','pause','resume','reopen-session','assessment-retake','recognitions','follow-up-flags']) assert.match(routes, new RegExp(route));
  assert.match(routes, /requireCsrf/);
  assert.match(service, /const actor=trustedActorFromRequest\(req\)/);
  assert.doesNotMatch(service, /req\.body\.facilitator_account_id/);
  assert.doesNotMatch(service, /req\.body\.tenant_id/);
});
