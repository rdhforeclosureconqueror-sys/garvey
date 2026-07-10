const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createLeaderWithinRouter } = require('../server/leaderWithinRoutes');
const svc = require('../server/leaderWithinService');


const facilitatorActor = {
  authenticated: true,
  actor_type: 'leader_within_facilitator',
  facilitator_account_id: 501,
  user_id: 501,
  email: 'fac@example.com',
  facilitator_id: 'TLW-F-TEST',
  display_name: 'Test Facilitator',
  active_tenant_slug: 'tenant-a',
  tenant_id: 1,
  role: 'facilitator',
  is_admin: false,
};

function facilitatorPool({ cohorts = [], accountStatus = 'active', sessionRevoked = null, expiresAt = new Date(Date.now() + 60_000).toISOString(), credentialVersion = 1 } = {}) {
  return {
    async query(sql, params) {
      if (sql.includes('FROM leader_within_facilitator_sessions')) {
        return { rows: [{
          session_id: 700,
          facilitator_account_id: facilitatorActor.facilitator_account_id,
          tenant_id: 1,
          session_credential_version: credentialVersion,
          expires_at: expiresAt,
          revoked_at: sessionRevoked,
          email: facilitatorActor.email,
          facilitator_id: facilitatorActor.facilitator_id,
          first_name: 'Test',
          last_name: 'Facilitator',
          preferred_name: 'Test Facilitator',
          role: facilitatorActor.role,
          account_status: accountStatus,
          current_credential_version: credentialVersion,
          linked_garvey_user_id: null,
          tenant_slug: 'tenant-a',
        }] };
      }
      if (sql.includes('UPDATE leader_within_facilitator_sessions SET last_seen_at')) return { rows: [] };
      if (sql.includes('FROM leader_within_cohorts')) return { rows: cohorts };
      return { rows: [] };
    }
  };
}

const facilitatorCookie = { headers: { cookie: 'tlw_facilitator_session=test-token' } };

function invoke(router, method, url, extra = {}) {
  const [path, qs = ''] = url.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs));
  const req = { method, url, path, query, headers: { host: 'garveyfrontend.onrender.com', ...extra.headers }, protocol: 'https', ...extra };
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200, headers: {},
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      getHeader(k) { return this.headers[String(k).toLowerCase()]; },
      status(c) { this.statusCode = c; return this; },
      type(v) { this.headers['content-type'] = v; return this; },
      redirect(code, loc) { if (typeof loc === 'undefined') { loc = code; code = 302; } this.statusCode = code; this.headers.location = loc; resolve(this); return this; },
      send(body) { this.body = body; resolve(this); return this; },
      json(body) { this.body = body; resolve(this); return this; },
      cookie() {}, clearCookie() {},
    };
    router.handle(req, res, reject);
  });
}

test('landing-page facilitator CTA goes directly to trusted sign-in and youth CTA remains unchanged', () => {
  const html = fs.readFileSync('public/the-leader-within.html', 'utf8');
  assert.match(html, /href="\/the-leader-within\/facilitator\/sign-in"[^>]*>Facilitator Sign In/);
  assert.match(html, /href="\/the-leader-within\/sign-in"[^>]*>Start or Continue My Journey/);
  assert.doesNotMatch(html, /href="\/login"/);
  assert.doesNotMatch(html, /href="\/index\.html\?next=%2Fadmin%2Fthe-leader-within"[^>]*>Facilitator Sign In/);
  assert.match(html, /Already registered by your facilitator\? Use your Leader ID and private sign-in code to continue\./);
});

test('signed-out facilitator route renders dedicated trusted sign-in without business owner fields', async () => {
  const res = await invoke(createLeaderWithinRouter({ query: async () => ({ rows: [] }) }), 'GET', '/the-leader-within/facilitator/sign-in');
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /Leader Within Facilitator Sign In/);
  assert.match(res.body, /Email address or Facilitator ID/);
  assert.match(res.body, /Password/);
  assert.doesNotMatch(res.body, /Owner Dashboard|Garvey Business Hub/);
  assert.doesNotMatch(res.body, /Business Name/);
  assert.doesNotMatch(res.body, /Create Owner Account/);
  assert.doesNotMatch(res.body, /Business Assessment/);
});

test('/login compatibility route redirects to dedicated facilitator dashboard with safe internal return path', async () => {
  const router = createLeaderWithinRouter({ query: async () => ({ rows: [] }) });
  const ok = await invoke(router, 'GET', '/login?next=/the-leader-within/facilitator/dashboard');
  assert.equal(ok.statusCode, 302);
  assert.equal(ok.headers.location, '/index.html?next=%2Fthe-leader-within%2Ffacilitator%2Fdashboard');
  const bad = await invoke(router, 'GET', '/login?next=https://evil.example/phish');
  assert.equal(bad.headers.location, '/index.html?next=%2Fthe-leader-within%2Ffacilitator%2Fdashboard');
});

test('one tap from the landing CTA reaches the dedicated facilitator sign-in page', async () => {
  const html = fs.readFileSync('public/the-leader-within.html', 'utf8');
  assert.match(html, /href="\/the-leader-within\/facilitator\/sign-in"/);
  const res = await invoke(createLeaderWithinRouter({ query: async () => ({ rows: [] }) }), 'GET', '/the-leader-within/facilitator/sign-in');
  assert.match(res.body, /\/api\/the-leader-within\/facilitator\/csrf/);
  assert.match(res.body, /\/api\/the-leader-within\/facilitator\/sign-in/);
});

test('dedicated authenticated facilitator is redirected to ordinary facilitator dashboard', async () => {
  const res = await invoke(createLeaderWithinRouter(facilitatorPool()), 'GET', '/the-leader-within/facilitator/sign-in', facilitatorCookie);
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, '/the-leader-within/facilitator/dashboard');
});

test('Garvey admin session does not authenticate ordinary facilitator sign-in', async () => {
  const pool = { query: async () => ({ rows: [] }) };
  const res = await invoke(createLeaderWithinRouter(pool), 'GET', '/the-leader-within/facilitator/sign-in', { authActor: { userId: 1, email: 'admin@example.com', role: 'admin', tenantSlug: 'tenant-a', isAdmin: true } });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /Leader Within Facilitator Sign In/);
  assert.doesNotMatch(res.body, /Leader Within Facilitator Dashboard/);
});

test('garvey owner session alone does not grant ordinary facilitator dashboard access', async () => {
  const res = await invoke(createLeaderWithinRouter({ query: async () => ({ rows: [] }) }), 'GET', '/the-leader-within/facilitator/dashboard', { headers: { cookie: 'garvey_owner_session=owner-token' }, authActor: { userId: 8, email: 'member@example.com', role: 'owner', tenantSlug: 'tenant-a' } });
  assert.equal(res.statusCode, 403);
  assert.match(res.body, /Leader Within Access Needed|not currently active/);
});

test('dedicated facilitator with no cohort sees no-cohort dashboard empty state', async () => {
  const res = await invoke(createLeaderWithinRouter(facilitatorPool()), 'GET', '/the-leader-within/facilitator/dashboard', facilitatorCookie);
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /No Leader Within cohorts are currently assigned to you/);
  assert.match(res.body, /Contact a program administrator to receive a cohort assignment/);
});

test('signed-out dashboard redirects to trusted sign-in and not /login', async () => {
  const res = await invoke(createLeaderWithinRouter({ query: async () => ({ rows: [] }) }), 'GET', '/admin/the-leader-within');
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, '/the-leader-within/facilitator/sign-in');
  assert.notEqual(res.headers.location, '/login');
});

test('query role and untrusted browser headers do not grant facilitator access', async () => {
  const res = await invoke(createLeaderWithinRouter({ query: async () => ({ rows: [] }) }), 'GET', '/the-leader-within/facilitator/dashboard?role=facilitator', { headers: { 'x-user-role': 'facilitator', 'x-user-email': 'fake@example.com', 'x-tenant-slug': 'tenant-a' } });
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, '/the-leader-within/facilitator/sign-in');
});

test('admin-only bootstrap requires admin and stable facilitator user id in tenant', async () => {
  await assert.rejects(() => svc.bootstrapCohort({ query: async () => ({ rows: [] }) }, { authActor: { userId: 9, email: 'fac@example.com', role: 'facilitator', tenantSlug: 'tenant-a' }, body: {} }), /Leader Within administrator access required|Administrator access required/);
  const calls = [];
  const pool = { query: async (sql, params) => { calls.push({ sql, params }); if (sql.includes('FROM tenants')) return { rows: [{ id: 1, slug: 'tenant-a' }] }; if (sql.includes('FROM tenant_memberships')) return { rows: [{ user_id: 9 }] }; if (sql.includes('FROM leader_within_programs')) return { rows: [{ id: 5 }] }; if (sql.includes('INSERT INTO leader_within_cohorts')) return { rows: [{ id: 10, tenant_id: 1, assigned_facilitator_user_id: 9 }] }; return { rows: [] }; } };
  const out = await svc.bootstrapCohort(pool, { authActor: { userId: 1, email: 'admin@example.com', role: 'admin', tenantSlug: 'tenant-a', isAdmin: true }, body: { tenant_slug: 'tenant-a', facilitator_user_id: 9, cohort_name: 'Staging Cohort A', location_id: 'Staging' } });
  assert.equal(out.ok, true);
  assert.equal(out.assignment.facilitator_user_id, 9);
  assert.ok(calls.some(c => /leader_within_cohort_facilitators/.test(c.sql)));
});

test('Garvey admin facilitator with zero cohorts can open first-cohort form without Access Needed', async () => {
  const pool = facilitatorPool();
  const original = facilitatorActor.role;
  facilitatorActor.role = 'super_admin';
  try {
    const res = await invoke(createLeaderWithinRouter(pool), 'GET', '/admin/the-leader-within/bootstrap', facilitatorCookie);
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Create Your First Leader Within Cohort/);
    assert.match(res.body, /bootstrapCohortForm/);
    assert.doesNotMatch(res.body, /Leader Within Access Needed/);
  } finally {
    facilitatorActor.role = original;
  }
});

test('Garvey admin bootstrap uses linked facilitator account id and blocks browser tenant escalation', async () => {
  const calls = [];
  const pool = { query: async (sql, params) => {
    calls.push({ sql, params });
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
    if (sql.includes('FROM tenants')) return { rows: [{ id: 1, slug: 'tenant-a' }] };
    if (sql.includes('FROM leader_within_facilitator_accounts')) return { rows: [{ id: 501, linked_garvey_user_id: 1, tenant_id: 1, status: 'active', role: 'super_admin' }] };
    if (sql.includes('FROM leader_within_programs')) return { rows: [{ id: 5 }] };
    if (sql.includes('FROM leader_within_cohorts')) return { rows: [] };
    if (sql.includes('INSERT INTO leader_within_cohorts')) return { rows: [{ id: 10, tenant_id: 1, assigned_facilitator_user_id: 1 }] };
    return { rows: [] };
  } };
  const actor = { authenticated: true, actor_type: 'leader_within_facilitator', facilitator_account_id: 501, user_id: 1, email: 'admin@example.com', role: 'super_admin', active_tenant_slug: 'tenant-a', is_admin: true, is_superadmin: true };
  const out = await svc.bootstrapCohort(pool, { leaderWithinFacilitatorActor: actor, body: { tenant_slug: 'tenant-a', cohort_name: 'Leader Within Pilot Cohort', location_id: 'Dallas Pilot' } });
  assert.equal(out.ok, true);
  assert.equal(out.assignment.facilitator_account_id, 501);
  assert.ok(calls.some(c => /facilitator_account_id/.test(c.sql) && /leader_within_cohort_facilitators/.test(c.sql)));
  await assert.rejects(() => svc.bootstrapCohort(pool, { leaderWithinFacilitatorActor: { ...actor, role: 'facilitator', facilitator_role: 'facilitator', is_superadmin: false }, body: { tenant_slug: 'other-tenant', cohort_name: 'Bad', location_id: 'Bad' } }), /Cross-tenant cohort creation is not allowed/);
});

test('facilitator dashboard exposes explicit Leader Within and complete sign-out actions', async () => {
  const original = facilitatorActor.role;
  facilitatorActor.role = 'super_admin';
  try {
    const res = await invoke(createLeaderWithinRouter(facilitatorPool()), 'GET', '/the-leader-within/facilitator/dashboard', facilitatorCookie);
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Sign Out of Leader Within/);
    assert.match(res.body, /Sign Out Completely/);
    assert.match(res.body, /\/api\/the-leader-within\/facilitator\/sign-out/);
    assert.match(res.body, /\/api\/the-leader-within\/facilitator\/sign-out-completely/);
    assert.doesNotMatch(res.body, />Sign Out</);
  } finally {
    facilitatorActor.role = original;
  }
});

test('signed-out state preserves Garvey admin session and requires explicit continue', async () => {
  const res = await invoke(createLeaderWithinRouter({ query: async () => ({ rows: [] }) }), 'GET', '/the-leader-within/facilitator/signed-out', { authActor: { userId: 1, email: 'admin@example.com', role: 'business_owner', tenantSlug: 'tenant-a', tenantId: 1, isAdmin: true } });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /You have signed out of The Leader Within/);
  assert.match(res.body, /You are still signed into Garvey as an administrator/);
  assert.match(res.body, /Continue with Garvey Admin/);
  assert.match(res.body, /\/api\/the-leader-within\/facilitator\/continue-garvey-admin/);
  assert.doesNotMatch(res.body, /Leader Within Facilitator Dashboard/);
});

test('linked Garvey admin facilitator reconciliation repairs local-part-only email by linked user id', async () => {
  const calls = [];
  const pool = { async query(sql, params) {
    calls.push({ sql, params });
    if (sql.includes('FROM leader_within_facilitator_accounts')) return { rows: [{ id: 501, tenant_id: 1, linked_garvey_user_id: 1, email: 'rdhforeclosureconqueror', normalized_email: 'rdhforeclosureconqueror', status: 'active', role: 'facilitator' }] };
    if (sql.includes('UPDATE leader_within_facilitator_accounts')) return { rows: [{ id: 501, tenant_id: 1, linked_garvey_user_id: 1, email: 'rdhforeclosureconqueror@gmail.com', normalized_email: 'rdhforeclosureconqueror@gmail.com', status: 'active', role: 'super_admin' }] };
    return { rows: [] };
  }};
  const account = await svc.reconcileLinkedGarveyAdminFacilitator(pool, { user_id: 1, email: 'rdhforeclosureconqueror@gmail.com' });
  assert.equal(account.id, 501);
  assert.equal(account.email, 'rdhforeclosureconqueror@gmail.com');
  assert.equal(account.normalized_email, 'rdhforeclosureconqueror@gmail.com');
  assert.equal(account.linked_garvey_user_id, 1);
  assert.ok(calls.some(c => /UPDATE leader_within_facilitator_accounts/.test(c.sql) && c.params[1] === 'rdhforeclosureconqueror@gmail.com'));
});

test('facilitator session reloads canonical Garvey email and does not pass local-part to admin resolver', async () => {
  const calls = [];
  const pool = facilitatorPool();
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('FROM leader_within_facilitator_sessions')) return { rows: [{
      session_id: 700, facilitator_account_id: 501, tenant_id: 1, session_credential_version: 1, expires_at: new Date(Date.now() + 60_000).toISOString(), revoked_at: null,
      email: 'rdhforeclosureconqueror', facilitator_id: 'TLW-F-ADMIN', first_name: null, last_name: null, preferred_name: 'Rashad Harbor', role: 'facilitator', account_status: 'active', current_credential_version: 1, linked_garvey_user_id: 1, tenant_slug: 'tenant-a'
    }] };
    if (sql.includes('UPDATE leader_within_facilitator_sessions SET last_seen_at')) return { rows: [] };
    if (sql.includes('SELECT id,email FROM users')) return { rows: [{ id: 1, email: 'rdhforeclosureconqueror@gmail.com' }] };
    if (sql.includes('FROM leader_within_facilitator_accounts')) return { rows: [{ id: 501, tenant_id: 1, linked_garvey_user_id: 1, email: 'rdhforeclosureconqueror', normalized_email: 'rdhforeclosureconqueror', status: 'active', role: 'facilitator' }] };
    if (sql.includes('UPDATE leader_within_facilitator_accounts')) return { rows: [{ id: 501, tenant_id: 1, linked_garvey_user_id: 1, email: 'rdhforeclosureconqueror@gmail.com', normalized_email: 'rdhforeclosureconqueror@gmail.com', status: 'active', role: 'super_admin' }] };
    return { rows: [] };
  };
  const actor = await svc.resolveFacilitatorSession(pool, facilitatorCookie);
  assert.equal(actor.canonical_email, 'rdhforeclosureconqueror@gmail.com');
  assert.equal(actor.email, 'rdhforeclosureconqueror@gmail.com');
  assert.equal(actor.linked_garvey_user_id, 1);
  assert.equal(actor.is_admin, true);
  assert.equal(actor.is_superadmin, true);
  assert.equal(actor.display_name, 'Rashad Harbor');
  assert.ok(calls.some(c => /SELECT id,email FROM users/.test(c.sql) && c.params[0] === 1));
});

test('ambiguous linked admin reconciliation rejects instead of appending arbitrary domain', async () => {
  const pool = { async query(sql) {
    if (sql.includes('FROM leader_within_facilitator_accounts')) return { rows: [
      { id: 501, linked_garvey_user_id: 1, normalized_email: 'rdhforeclosureconqueror', email: 'rdhforeclosureconqueror', status: 'active' },
      { id: 502, linked_garvey_user_id: 2, normalized_email: 'rdhforeclosureconqueror@gmail.com', email: 'rdhforeclosureconqueror@gmail.com', status: 'active' },
    ] };
    return { rows: [] };
  }};
  await assert.rejects(() => svc.reconcileLinkedGarveyAdminFacilitator(pool, { user_id: 1, email: 'rdhforeclosureconqueror@gmail.com' }), /We could not sign you in/);
});

test('facilitator_role super_admin with zero cohorts opens bootstrap without cohort assignment', async () => {
  const original = { role: facilitatorActor.role, is_admin: facilitatorActor.is_admin };
  facilitatorActor.role = 'super_admin';
  facilitatorActor.is_admin = false;
  const res = await invoke(createLeaderWithinRouter(facilitatorPool()), 'GET', '/admin/the-leader-within/bootstrap', facilitatorCookie);
  facilitatorActor.role = original.role;
  facilitatorActor.is_admin = original.is_admin;
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /data-route-marker="tlw-first-cohort-bootstrap-v3"/);
  assert.match(res.body, /bootstrapCohortForm/);
  assert.doesNotMatch(res.body, /Leader Within Access Needed/);
});

test('ordinary facilitator and observer with zero cohorts still get Access Needed for bootstrap', async () => {
  facilitatorActor.role = 'facilitator'; facilitatorActor.is_admin = false;
  const ordinary = await invoke(createLeaderWithinRouter(facilitatorPool()), 'GET', '/admin/the-leader-within/bootstrap', facilitatorCookie);
  assert.equal(ordinary.statusCode, 403);
  assert.match(ordinary.body, /Leader Within Access Needed/);
  facilitatorActor.role = 'observer';
  const observer = await invoke(createLeaderWithinRouter(facilitatorPool()), 'GET', '/admin/the-leader-within/bootstrap', facilitatorCookie);
  facilitatorActor.role = 'facilitator';
  assert.equal(observer.statusCode, 403);
  assert.match(observer.body, /Leader Within Access Needed/);
});
