const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Leader Within admin reuses Garvey admin actor instead of a separate super-admin env', () => {
  const svc = fs.readFileSync('server/leaderWithinService.js','utf8');
  assert.doesNotMatch(svc, /LEADER_WITHIN_SUPERADMIN_EMAILS/);
  assert.doesNotMatch(svc, /function configuredSuperAdminEmails|async function bootstrapLeaderWithinSuperAdmins/);
  assert.match(svc, /req\.authActor\?\.email && req\.authActor\?\.userId/);
  assert.match(svc, /is_admin: req\.authActor\.isAdmin === true/);
  assert.match(svc, /is_superadmin: req\.authActor\.isAdmin === true/);
  assert.doesNotMatch(svc.match(/async function signInFacilitator[\s\S]*?async function revokeFacilitatorSession/)?.[0] || '', /super_admin/);
});

test('facilitator request model and routes are approval-only', () => {
  const db = fs.readFileSync('server/leaderWithinDb.js','utf8');
  const routes = fs.readFileSync('server/leaderWithinRoutes.js','utf8');
  const svc = fs.readFileSync('server/leaderWithinService.js','utf8');
  assert.match(db, /CREATE TABLE IF NOT EXISTS leader_within_facilitator_requests/);
  assert.match(db, /status TEXT NOT NULL DEFAULT 'pending'/);
  assert.match(db, /reviewed_by_facilitator_account_id INTEGER REFERENCES leader_within_facilitator_accounts/);
  assert.match(db, /idx_lw_facilitator_requests_pending_email/);
  assert.match(routes, /\/the-leader-within\/facilitator\/request-access/);
  assert.match(routes, /\/api\/the-leader-within\/facilitator\/request-access/);
  assert.match(svc, /async function submitFacilitatorAccessRequest/);
  const submit = svc.match(/async function submitFacilitatorAccessRequest[\s\S]*?async function facilitatorManagementDashboard/)?.[0] || '';
  assert.doesNotMatch(submit, /super_admin|password_hash|leader_within_facilitator_sessions/);
  assert.doesNotMatch(submit, /b\.role|b\.status|desired_role/);
});

test('super-admin management has dashboard, review, direct creation, setup, and reset routes', () => {
  const routes = fs.readFileSync('server/leaderWithinRoutes.js','utf8');
  const svc = fs.readFileSync('server/leaderWithinService.js','utf8');
  assert.match(routes, /\/admin\/the-leader-within\/facilitators/);
  assert.match(routes, /\/api\/admin\/the-leader-within\/facilitator-requests\/:requestId\/review/);
  assert.match(routes, /\/api\/admin\/the-leader-within\/facilitators/);
  assert.match(routes, /\/the-leader-within\/facilitator\/setup/);
  assert.match(svc, /const LEADER_WITHIN_ROLES = new Set\(\["super_admin","program_admin","program_director","lead_facilitator","facilitator","observer"\]\)/);
  assert.match(svc, /const FACILITATOR_ACCOUNT_STATUSES = new Set\(\["invited","setup_pending","active","suspended","disabled","archived"\]\)/);
  assert.match(svc, /async function reviewFacilitatorRequest/);
  assert.match(svc, /one_time_setup_credential/);
  assert.match(svc, /hashToken\(setup\)/);
  assert.match(svc, /requireSuperAdmin\(actor\)/);
});
