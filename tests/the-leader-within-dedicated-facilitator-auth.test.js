const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('dedicated facilitator auth uses tlw_facilitator_session and not garvey owner session', () => {
  const svc = fs.readFileSync('server/leaderWithinService.js','utf8');
  assert.match(svc, /const FACILITATOR_COOKIE = "tlw_facilitator_session"/);
  assert.match(svc, /leader_within_facilitator_accounts/);
  assert.match(svc, /leader_within_facilitator_sessions/);
  assert.match(svc, /function buildFacilitatorSessionCookie/);
  assert.match(svc, /token_hash/);
  assert.doesNotMatch(svc.match(/async function signInFacilitator[\s\S]*?async function revokeFacilitatorSession/)?.[0] || '', /auth_sessions|garvey_owner_session/);
  assert.match(svc.match(/async function signInFacilitator[\s\S]*?async function revokeFacilitatorSession/)?.[0] || '', /issueFacilitatorSession\(pool,req,account,"dedicated"\)/);
});

test('facilitator sign-in page has dedicated product language and fields', () => {
  const routes = fs.readFileSync('server/leaderWithinRoutes.js','utf8');
  assert.match(routes, /\/the-leader-within\/facilitator\/sign-in/);
  assert.match(routes, /Leader Within Facilitator Sign In/);
  assert.match(routes, /Sign in to manage your Leader Within cohorts and participants\./);
  assert.match(routes, /Email address or Facilitator ID/);
  assert.match(routes, /Need Help Signing In\?/);
  assert.match(routes, /Return to The Leader Within/);
  const page = routes.match(/r\.get\('\/the-leader-within\/facilitator\/sign-in'[\s\S]*?r\.get\('\/api\/the-leader-within\/facilitator\/csrf'/)?.[0] || '';
  assert.doesNotMatch(page, /Business Name|Create Owner Account|Garvey Business Hub|Business Assessment|authorized Garvey account/);
});

test('database model includes non-destructive facilitator accounts, sessions, and account cohort assignment', () => {
  const db = fs.readFileSync('server/leaderWithinDb.js','utf8');
  assert.match(db, /CREATE TABLE IF NOT EXISTS leader_within_facilitator_accounts/);
  assert.match(db, /linked_garvey_user_id INTEGER REFERENCES users\(id\) ON DELETE SET NULL/);
  assert.match(db, /facilitator_id TEXT NOT NULL UNIQUE/);
  assert.match(db, /password_hash TEXT NOT NULL/);
  assert.match(db, /credential_version INTEGER NOT NULL DEFAULT 1/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS leader_within_facilitator_sessions/);
  assert.match(db, /token_hash TEXT NOT NULL UNIQUE/);
  assert.match(db, /revoked_at TIMESTAMP/);
  assert.match(db, /facilitator_account_id INTEGER REFERENCES leader_within_facilitator_accounts\(id\) ON DELETE CASCADE/);
});
