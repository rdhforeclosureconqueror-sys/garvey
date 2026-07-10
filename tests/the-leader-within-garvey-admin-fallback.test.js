const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Garvey admin fallback reuses canonical credential verifier and admin resolver', () => {
  const service = fs.readFileSync('server/leaderWithinService.js','utf8');
  const auth = fs.readFileSync('server/authService.js','utf8');
  assert.match(auth, /async function authenticateOwnerCredentials/);
  assert.match(auth, /function resolveGarveyAuthActor/);
  assert.match(auth, /function isAdminEmail/);
  assert.match(service, /authenticateGarveyUser\(pool,identity,password\)/);
  assert.match(service, /resolveGarveyAuthActor\(garveyAccount\)/);
  assert.doesNotMatch(service, /LEADER_WITHIN_SUPERADMIN_EMAILS/);
});

test('Garvey admin fallback creates linked super-admin facilitator session without owner session reuse', () => {
  const service = fs.readFileSync('server/leaderWithinService.js','utf8');
  assert.match(service, /linked_garvey_user_id/);
  assert.match(service, /'active','super_admin',FALSE/);
  assert.match(service, /garvey_admin_facilitator_account_auto_created/);
  assert.match(service, /garvey_admin_authenticated_through_leader_within_sign_in/);
  assert.match(service, /facilitator_session_created/);
  assert.match(service, /buildFacilitatorSessionCookie\(req,token/);
  assert.doesNotMatch(service.match(/async function signInFacilitator[\s\S]*?async function revokeFacilitatorSession/)?.[0] || '', /buildTrustedSessionCookie|garvey_owner_session/);
});

test('Garvey admin fallback blocks non-admin, browser-claim, and inactive facilitator bypasses', () => {
  const service = fs.readFileSync('server/leaderWithinService.js','utf8');
  assert.match(service, /!actor\?\.isAdmin/);
  assert.match(service, /garvey_admin_fallback_rejected/);
  assert.match(service, /\["suspended","disabled","archived"\]/);
  assert.match(service, /garvey_admin_linked_facilitator_blocked/);
  assert.doesNotMatch(service.match(/async function signInFacilitator[\s\S]*?async function revokeFacilitatorSession/)?.[0] || '', /req\.query.*admin|x-user-role|x-user-email/);
});

