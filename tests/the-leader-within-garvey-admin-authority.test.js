const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createLeaderWithinRouter } = require('../server/leaderWithinRoutes');
const svc = require('../server/leaderWithinService');

function invoke(router, method, path, extra = {}) {
  return new Promise((resolve) => {
    const req = { method, path, url: path, originalUrl: path, headers: { host: 'garvey.test', ...(extra.headers || {}) }, query: extra.query || {}, params: {}, body: extra.body || {}, ...extra };
    const res = { statusCode: 200, headers: {}, setHeader(k,v){this.headers[k.toLowerCase()]=v;}, header(k,v){this.setHeader(k,v);}, status(c){this.statusCode=c; return this;}, type(v){this.headers['content-type']=v; return this;}, json(v){this.body=JSON.stringify(v); this.jsonBody=v; resolve(this);}, send(v){this.body=v; resolve(this);}, redirect(c,u){this.statusCode=c; this.headers.location=u; resolve(this);} };
    router.handle(req, res, () => resolve(res));
  });
}

test('Leader Within does not define or require a separate super-admin env var', () => {
  const service = fs.readFileSync('server/leaderWithinService.js', 'utf8');
  const index = fs.readFileSync('server/index.js', 'utf8');
  assert.doesNotMatch(service, /LEADER_WITHIN_SUPERADMIN_EMAILS/);
  assert.doesNotMatch(index, /LEADER_WITHIN_SUPERADMIN_EMAILS|bootstrapLeaderWithinSuperAdmins/);
  assert.match(index, /process\.env\.ADMIN_EMAILS/);
});

test('Garvey canonical admin resolver normalizes the expected platform owner', () => {
  const index = fs.readFileSync('server/index.js', 'utf8');
  assert.match(index, /function parseAdminEmails/);
  assert.match(index, /trim\(\)\.toLowerCase\(\)/);
  assert.match(index, /rdhforeclosureconqueror@gmail\.com/);
  assert.match(index, /function isAdminEmail/);
  assert.match(index, /req\.authActor = \{/);
  assert.match(index, /isAdmin: isAdminEmail\(session\.email\)/);
});

test('trusted actor uses existing Garvey req.authActor.isAdmin for Leader Within admin', () => {
  const req = { authActor: { userId: 1, email: 'RDHForeclosureConqueror@gmail.com ', role: 'business_owner', tenantSlug: 'tenant-a', tenantId: 11, isAdmin: true } };
  const actor = svc.trustedActorFromRequest(req);
  assert.equal(actor.is_admin, true);
  assert.equal(actor.is_superadmin, true);
  assert.equal(actor.email, 'rdhforeclosureconqueror@gmail.com');
});

test('Leader Within admin route accepts Garvey admin without facilitator session', async () => {
  const pool = { query: async () => ({ rows: [] }) };
  const res = await invoke(createLeaderWithinRouter(pool), 'GET', '/admin/the-leader-within', { authActor: { userId: 1, email: 'admin@example.com', role: 'business_owner', tenantSlug: 'tenant-a', tenantId: 1, isAdmin: true } });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /Leader Within Administration/);
});

test('Leader Within admin diagnostic returns safe booleans only', async () => {
  const seen = [];
  const pool = { query: async (sql) => { seen.push(sql); if (/leader_within_facilitator_accounts/.test(sql)) return { rows: [{ id: 9, status: 'active' }] }; if (/COUNT/.test(sql)) return { rows: [{ count: 2 }] }; return { rows: [] }; } };
  const res = await invoke(createLeaderWithinRouter(pool), 'GET', '/api/admin/the-leader-within/diagnostic', { authActor: { userId: 1, email: 'rdhforeclosureconqueror@gmail.com', role: 'business_owner', tenantSlug: 'tenant-a', tenantId: 1, isAdmin: true } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.jsonBody.garvey_admin_recognized, true);
  assert.equal(res.jsonBody.leader_within_admin_access, true);
  assert.equal(res.jsonBody.dedicated_facilitator_account_linked, true);
  const serialized = JSON.stringify(res.jsonBody);
  assert.doesNotMatch(serialized, /ADMIN_EMAILS|LEADER_WITHIN_SUPERADMIN_EMAILS|secret|token|rdhforeclosureconqueror@gmail.com/);
});

test('ordinary Garvey owner, browser headers, youth, and facilitator sessions do not become Garvey admins', () => {
  assert.equal(svc.trustedActorFromRequest({ authActor: { userId: 2, email: 'owner@example.com', role: 'business_owner', tenantSlug: 'tenant-a', isAdmin: false } }).is_admin, false);
  assert.throws(() => svc.trustedActorFromRequest({ headers: { 'x-user-role': 'admin', 'x-user-email': 'fake@example.com' }, query: { role: 'admin' } }), /Authentication required/);
  assert.equal(svc.trustedActorFromRequest({ leaderWithinFacilitatorActor: { authenticated: true, actor_type: 'leader_within_facilitator', user_id: 3, role: 'facilitator', email: 'fac@example.com', is_admin: false } }).is_admin, false);
  assert.equal(svc.trustedActorFromRequest({ leaderWithinYouthActor: { authenticated: true, user_id: 4, participant_id: 4, email: 'youth@example.com', is_admin: false } }).is_admin, false);
});
