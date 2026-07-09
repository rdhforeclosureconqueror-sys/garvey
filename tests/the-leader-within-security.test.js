'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const svc = require('../server/leaderWithinService');

function req(overrides = {}) { return { headers: {}, query: {}, body: {}, params: {}, ...overrides }; }
function actor(role = 'youth_participant', extra = {}) { return { authActor: { userId: 7, email: 'youth@example.com', role, tenantSlug: 'tenant-a', isAdmin: false, ...extra } }; }
function poolWithEnrollment(row) {
  const queries = [];
  return { queries, async query(sql, params) { queries.push({ sql, params }); if (/FROM leader_within_program_enrollments e JOIN users u/.test(sql) && /e.participant_id=\$1/.test(sql)) return { rows: row ? [row] : [] }; if (/leader_within_practice_selections/.test(sql) || /leader_within_session_progress/.test(sql) || /leader_within_assessment_snapshots/.test(sql)) return { rows: [] }; return { rows: [] }; } };
}
const enrollment = { id: 11, participant_id: 7, participant_email: 'youth@example.com', participant_name: 'Youth', tenant_slug: 'tenant-a', program_title: 'The Leader Within', duration_weeks: 12, current_week: 1, current_session: 'A', alternate_story_title: null };

test('production ignores spoofable headers and query parameters for identity', async () => {
  const oldEnv = process.env.NODE_ENV; const oldFlag = process.env.LEADER_WITHIN_DEV_ACTOR_OVERRIDE;
  process.env.NODE_ENV = 'production'; delete process.env.LEADER_WITHIN_DEV_ACTOR_OVERRIDE;
  assert.throws(() => svc.trustedActorFromRequest(req({ headers: { 'x-user-email': 'youth@example.com', 'x-user-role': 'admin', 'x-tenant-slug': 'tenant-a' }, query: { email: 'other@example.com', role: 'facilitator', tenant: 'tenant-b' } })), /Authentication required/);
  process.env.NODE_ENV = oldEnv; process.env.LEADER_WITHIN_DEV_ACTOR_OVERRIDE = oldFlag;
});

test('development actor override requires explicit non-production flag and dedicated header', () => {
  const oldEnv = process.env.NODE_ENV; const oldFlag = process.env.LEADER_WITHIN_DEV_ACTOR_OVERRIDE;
  process.env.NODE_ENV = 'test'; process.env.LEADER_WITHIN_DEV_ACTOR_OVERRIDE = 'true';
  const a = svc.trustedActorFromRequest(req({ headers: { 'x-leader-within-dev-actor': JSON.stringify({ user_id: 7, email: 'youth@example.com', tenant_slug: 'tenant-a', role: 'youth_participant' }) } }));
  assert.equal(a.email, 'youth@example.com'); assert.equal(a.active_tenant_slug, 'tenant-a');
  process.env.NODE_ENV = 'production';
  assert.throws(() => svc.trustedActorFromRequest(req({ headers: { 'x-leader-within-dev-actor': JSON.stringify({ user_id: 1, email: 'admin@example.com', role: 'admin' }) } })), /Authentication required/);
  process.env.NODE_ENV = oldEnv; process.env.LEADER_WITHIN_DEV_ACTOR_OVERRIDE = oldFlag;
});

test('youth dashboard empty state does not invoke demo inserts', async () => {
  const pool = poolWithEnrollment(null);
  const result = await svc.getYouthDashboard(pool, req(actor()));
  assert.equal(result.empty_state.message, 'You are not currently enrolled in a Leader Within program.');
  assert.equal(pool.queries.some(q => /INSERT INTO/.test(q.sql)), false);
});

test('youth dashboard returns own enrollment and filters private notes by omission', async () => {
  const pool = poolWithEnrollment(enrollment);
  const result = await svc.getYouthDashboard(pool, req(actor()));
  assert.equal(result.participant.first_name, 'Youth');
  assert.equal(JSON.stringify(result).includes('facilitator_notes'), false);
  assert.equal(JSON.stringify(result).includes('Secret facilitator sentence'), false);
});

test('facilitator assignment and tenant checks fail closed', async () => {
  const trusted = svc.trustedActorFromRequest(req({ ...actor('facilitator'), authActor: { userId: 9, email: 'fac@example.com', role: 'facilitator', tenantSlug: 'tenant-a' } }));
  assert.equal(trusted.role, 'facilitator');
  const pool = { async query(sql) { if (/WHERE e.participant_id/.test(sql)) return { rows: [{ id: 2, participant_id: 8, assigned_facilitator_email: 'other@example.com', tenant_slug: 'tenant-a' }] }; return { rows: [] }; } };
  await assert.rejects(() => svc.participantProfile(pool, req({ ...actor('facilitator', { userId: 9, email: 'fac@example.com' }), params: { participantId: 8 } })), /Facilitator is not assigned/);
});

test('reflection visibility and session/story input validation reject unsafe values', async () => {
  const pool = poolWithEnrollment(enrollment);
  await assert.rejects(() => svc.submitReflection(pool, req({ ...actor(), body: { response_text: 'x', visibility: 'facilitator_only' } })), /Invalid visibility/);
  await assert.rejects(() => svc.selectPractice(pool, req({ ...actor(), body: { practice_id: 'not canonical' } })), /Invalid participant-controlled practice selection/);
});
