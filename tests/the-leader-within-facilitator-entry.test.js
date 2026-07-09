const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createLeaderWithinRouter } = require('../server/leaderWithinRoutes');
const svc = require('../server/leaderWithinService');

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
  assert.match(res.body, /Email, username, or existing Garvey account identity/);
  assert.doesNotMatch(res.body, /Business Name/);
  assert.doesNotMatch(res.body, /Create Owner Account/);
  assert.doesNotMatch(res.body, /Business Assessment/);
});

test('/login compatibility route redirects to trusted Garvey sign-in page with safe internal return path', async () => {
  const router = createLeaderWithinRouter({ query: async () => ({ rows: [] }) });
  const ok = await invoke(router, 'GET', '/login?next=/admin/the-leader-within');
  assert.equal(ok.statusCode, 302);
  assert.equal(ok.headers.location, '/index.html?next=%2Fadmin%2Fthe-leader-within');
  const bad = await invoke(router, 'GET', '/login?next=https://evil.example/phish');
  assert.equal(bad.headers.location, '/index.html?next=%2Fadmin%2Fthe-leader-within');
});

test('one tap from the landing CTA reaches the dedicated facilitator sign-in page', async () => {
  const html = fs.readFileSync('public/the-leader-within.html', 'utf8');
  assert.match(html, /href="\/the-leader-within\/facilitator\/sign-in"/);
  const res = await invoke(createLeaderWithinRouter({ query: async () => ({ rows: [] }) }), 'GET', '/the-leader-within/facilitator/sign-in');
  assert.match(res.body, /\/api\/the-leader-within\/facilitator\/csrf/);
  assert.match(res.body, /\/api\/the-leader-within\/facilitator\/sign-in/);
});

test('trusted authenticated facilitator is redirected to dashboard', async () => {
  const pool = { query: async () => ({ rows: [] }) };
  const res = await invoke(createLeaderWithinRouter(pool), 'GET', '/the-leader-within/facilitator/sign-in', { authActor: { userId: 9, email: 'fac@example.com', role: 'facilitator', tenantSlug: 'tenant-a' } });
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, '/admin/the-leader-within');
});

test('trusted authenticated admin is redirected to dashboard', async () => {
  const pool = { query: async () => ({ rows: [] }) };
  const res = await invoke(createLeaderWithinRouter(pool), 'GET', '/the-leader-within/facilitator/sign-in', { authActor: { userId: 1, email: 'admin@example.com', role: 'admin', tenantSlug: 'tenant-a', isAdmin: true } });
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, '/admin/the-leader-within');
});

test('authenticated unauthorized user receives branded not-authorized state', async () => {
  const res = await invoke(createLeaderWithinRouter({ query: async () => ({ rows: [] }) }), 'GET', '/admin/the-leader-within', { authActor: { userId: 8, email: 'member@example.com', role: 'customer', tenantSlug: 'tenant-a' } });
  assert.equal(res.statusCode, 403);
  assert.match(res.body, /Leader Within Access Needed/);
  assert.match(res.body, /has not been assigned to a Leader Within facilitator role or cohort/);
  assert.match(res.body, /Return to The Leader Within/);
});

test('authorized facilitator with no cohort sees no-cohort dashboard empty state', async () => {
  const res = await invoke(createLeaderWithinRouter({ query: async () => ({ rows: [] }) }), 'GET', '/admin/the-leader-within', { authActor: { userId: 9, email: 'fac@example.com', role: 'facilitator', tenantSlug: 'tenant-a' } });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /No Leader Within cohorts are currently assigned to you/);
});

test('signed-out dashboard redirects to trusted sign-in and not /login', async () => {
  const res = await invoke(createLeaderWithinRouter({ query: async () => ({ rows: [] }) }), 'GET', '/admin/the-leader-within');
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, '/the-leader-within/facilitator/sign-in');
  assert.notEqual(res.headers.location, '/login');
});

test('query role and untrusted browser headers do not grant facilitator access', async () => {
  const res = await invoke(createLeaderWithinRouter({ query: async () => ({ rows: [] }) }), 'GET', '/admin/the-leader-within?role=facilitator', { headers: { 'x-user-role': 'facilitator', 'x-user-email': 'fake@example.com', 'x-tenant-slug': 'tenant-a' } });
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, '/the-leader-within/facilitator/sign-in');
});

test('admin-only bootstrap requires admin and stable facilitator user id in tenant', async () => {
  await assert.rejects(() => svc.bootstrapCohort({ query: async () => ({ rows: [] }) }, { authActor: { userId: 9, email: 'fac@example.com', role: 'facilitator', tenantSlug: 'tenant-a' }, body: {} }), /Administrator access required/);
  const calls = [];
  const pool = { query: async (sql, params) => { calls.push({ sql, params }); if (sql.includes('FROM tenants')) return { rows: [{ id: 1, slug: 'tenant-a' }] }; if (sql.includes('FROM tenant_memberships')) return { rows: [{ user_id: 9 }] }; if (sql.includes('FROM leader_within_programs')) return { rows: [{ id: 5 }] }; if (sql.includes('INSERT INTO leader_within_cohorts')) return { rows: [{ id: 10, tenant_id: 1, assigned_facilitator_user_id: 9 }] }; return { rows: [] }; } };
  const out = await svc.bootstrapCohort(pool, { authActor: { userId: 1, email: 'admin@example.com', role: 'admin', tenantSlug: 'tenant-a', isAdmin: true }, body: { tenant_slug: 'tenant-a', facilitator_user_id: 9, cohort_name: 'Staging Cohort A', location_id: 'Staging' } });
  assert.equal(out.ok, true);
  assert.equal(out.assignment.facilitator_user_id, 9);
  assert.ok(calls.some(c => /leader_within_cohort_facilitators/.test(c.sql)));
});
