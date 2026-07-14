'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const routes = fs.readFileSync('server/leaderWithinRoutes.js','utf8');
const service = fs.readFileSync('server/leaderWithinService.js','utf8');

test('deployment version exposes control-center handler markers', () => {
  for (const marker of [
    'leader_within_curriculum_resolver_version',
    'leader_within_facilitator_control_center_handler_version',
    'leader_within_reflection_review_handler_version',
    'leader_within_progression_handler_version',
    'leader_within_feedback_handler_version',
    'leader_within_follow_up_handler_version'
  ]) assert.match(routes, new RegExp(marker));
});

test('facilitator browser-facing routes and action destinations are connected to real handlers', () => {
  const routesExpected = [
    '/the-leader-within/facilitator/dashboard',
    '/admin/the-leader-within/cohorts/:cohortId',
    '/admin/the-leader-within/participants/:participantId',
    '/api/admin/the-leader-within/cohorts/:cohortId/participants/:participantId/curriculum-state',
    '/api/admin/the-leader-within/reflections/:reflectionId/review',
    '/api/admin/the-leader-within/participants/:participantId/notes',
    '/api/admin/the-leader-within/participants/:participantId/follow-up-flags',
    '/api/admin/the-leader-within/follow-up-flags/:flagId/resolve',
    '/api/admin/the-leader-within/participants/:participantId/recognitions',
    '/api/admin/the-leader-within/participants/:participantId/assessment-retake',
    '/api/admin/the-leader-within/cohorts/:cohortId/advance-session',
    '/api/admin/the-leader-within/cohorts/:cohortId/advance-week',
    '/api/admin/the-leader-within/cohorts/:cohortId/pause',
    '/api/admin/the-leader-within/cohorts/:cohortId/resume',
    '/api/admin/the-leader-within/cohorts/:cohortId/reopen-session'
  ];
  for (const route of routesExpected) assert.match(routes, new RegExp(route.replace(/[/:]/g, m => m === '/' ? '\\/' : ':')));
  for (const handler of ['facilitatorDashboard','facilitatorCohortDetail','participantProfile','resolveFacilitatorParticipantCurriculumState','reviewReflection','addNote','createFollowUpFlag','resolveFollowUpFlag','createRecognition','allowAssessmentRetake','advanceCohortSession','advanceCohortWeek','pauseCohort','resumeCohort','reopenSession']) assert.match(routes, new RegExp(`svc\\.${handler}`));
  for (const action of ['advance-session','advance-week','pause','resume','reopen-session','assessment-retake','recognitions','follow-up-flags','notes']) assert.match(routes, new RegExp(`data-action-url=[^>]+${action}`));
});

test('participant detail UI separates youth feedback, private note, follow-up, recognition, assessment, and review controls', () => {
  for (const label of ['Feedback the youth will see','Private facilitator note','Follow-up needed','Youth-visible feedback history','Follow-up flags','Recognition history','Assessment Retake','Current Leadership Mission']) assert.match(routes, new RegExp(label));
  assert.match(routes, /Notes From Your Facilitator/);
  assert.match(service, /notes_from_facilitator: youthFeedback/);
  assert.doesNotMatch(service, /private_note.*notes_from_facilitator/i);
});

test('safe diagnostic returns booleans/counts only and route availability flags', () => {
  assert.match(routes, /facilitator-control-center\/diagnostic/);
  for (const field of ['facilitator_session_resolved','facilitator_account_active','assigned_cohort_count','reflection_review_route_available','private_note_route_available','follow_up_route_available','recognition_route_available','progression_route_available','data_preservation']) assert.match(routes, new RegExp(field));
  const diag = routes.slice(routes.indexOf("facilitator-control-center/diagnostic"), routes.indexOf("r.post('/api/admin/the-leader-within/recovery"));
  assert.doesNotMatch(diag, /email|token|reflection_text|response_text|leader_id/);
});
