const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');
const { createAssessmentMvpRouter } = require('../../server/assessmentMvpRoutes');
const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');
const { createAdaptiveV2Router } = require('../../server/adaptiveV2Routes');
const { buildLearningJourney } = require('../../server/learningJourneyService');
const { listYouthChildProfilesForAccount } = require('../../server/youthDevelopmentProfiles');

const accountCtx = { tenant: 'demo', email: 'parent@example.com' };

function fakeRegistryPool({ tde = [], legacy = [], journey = {} } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.includes('FROM tde_child_profiles')) {
        const [tenant, email] = params;
        const rows = tde.filter((row) => {
          const p = row.payload || {};
          const ownedTenant = String(p.tenant || p.tenant_slug || p?.ownership?.tenant || p?.dashboard_scope?.tenant || '').toLowerCase();
          const ownedEmail = String(p.email || p.parent_email || p?.ownership?.email || p?.dashboard_scope?.email || '').toLowerCase();
          return ownedTenant === tenant && ownedEmail === email;
        }).sort((a, b) => String(a.child_id).localeCompare(String(b.child_id)) || new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at) || Number(b.id || 0) - Number(a.id || 0));
        const latest = new Map();
        for (const row of rows) if (!latest.has(row.child_id)) latest.set(row.child_id, row);
        return { rows: [...latest.values()] };
      }
      if (sql.includes('FROM assessment_submissions')) return { rows: legacy };
      if (sql.includes('FROM assessment_sessions')) return { rows: journey.assessment_sessions || [] };
      if (sql.includes('FROM skill_world_progress')) return { rows: journey.skill_world_progress || [] };
      if (sql.includes('FROM adaptive_v2_skill_progress')) return { rows: journey.adaptive_v2_skill_progress || [] };
      if (sql.includes('FROM adaptive_v2_checkpoint_attempts')) return { rows: journey.adaptive_v2_checkpoint_attempts || [] };
      if (sql.includes('FROM gates_child_profiles')) return { rows: [] };
      if (sql.includes('INSERT INTO adaptive_v2_skill_progress') || sql.includes('INSERT INTO adaptive_v2_checkpoint_attempts')) return { rows: [] };
      throw new Error(`Unmocked query: ${sql}`);
    }
  };
}

function getTenantBySlug(slug) {
  return slug === 'demo' ? { id: 7, slug: 'demo' } : null;
}

function deriveChildScopeId({ childName }) {
  return `legacy-${String(childName).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function registry(pool) {
  return listYouthChildProfilesForAccount({
    pool,
    accountCtx,
    getTenantBySlug,
    normalizeEmail: (v) => String(v || '').toLowerCase(),
    deriveChildScopeId,
    logger: { warn() {} },
  });
}

const princessPersistent = {
  id: 1,
  child_id: '101',
  profile_version: 'phase3-v1',
  payload: {
    tenant: 'demo',
    parent_email: 'parent@example.com',
    child_display_name: 'Princess Nia',
    child_grade_band: 'Grade 1',
    parent_profile_id: '55',
    auth_user_id: '9001',
  },
  created_at: '2026-07-14T00:00:00Z',
  updated_at: '2026-07-15T00:00:00Z',
};

test('new Youth Development child in tde_child_profiles resolves without assessment submissions', async () => {
  const pool = fakeRegistryPool({ tde: [princessPersistent], legacy: [] });
  const children = await registry(pool);
  assert.equal(children.length, 1);
  assert.equal(children[0].child_id, '101');
  assert.equal(children[0].child_display_name, 'Princess Nia');
  assert.equal(children[0].source_registry, 'youth_development');
  assert.equal(children[0].ownership_verified, true);
});

test('Princess Nia resolves from tde_child_profiles and selects latest valid profile version', async () => {
  const pool = fakeRegistryPool({ tde: [
    { ...princessPersistent, id: 1, payload: { ...princessPersistent.payload, child_display_name: 'Old Nia' }, updated_at: '2026-07-13T00:00:00Z' },
    { ...princessPersistent, id: 2, profile_version: 'phase3-v2', updated_at: '2026-07-16T00:00:00Z' },
  ] });
  const children = await registry(pool);
  assert.equal(children.length, 1);
  assert.equal(children[0].child_display_name, 'Princess Nia');
  assert.equal(children[0].profile_version, 'phase3-v2');
});

test('persistent profile deduplicates legacy assessment history by canonical child_id', async () => {
  const pool = fakeRegistryPool({ tde: [princessPersistent], legacy: [{
    id: 44,
    created_at: '2026-07-12T00:00:00Z',
    customer_name: 'Princess Nia Legacy Name',
    child_id: '101',
    raw_answers: { ownership: { user_id: '9001', child_profile: { child_id: '101', child_name: 'Princess Nia Legacy Name' } } },
  }] });
  const children = await registry(pool);
  assert.equal(children.length, 1);
  assert.equal(children[0].child_display_name, 'Princess Nia');
  assert.equal(children[0].source, 'persistent_profile');
});

test('legacy assessment-derived learner resolves when no persistent profile exists', async () => {
  const pool = fakeRegistryPool({ legacy: [{
    id: 45,
    created_at: '2026-07-12T00:00:00Z',
    customer_name: 'Maya',
    raw_answers: { ownership: { user_id: '9002', child_profile: { child_id: 'child-maya', child_name: 'Maya' } } },
  }] });
  const children = await registry(pool);
  assert.equal(children.length, 1);
  assert.equal(children[0].child_id, 'child-maya');
  assert.equal(children[0].source, 'legacy_explicit_assessment_profile');
});

test('another parent child is excluded by tde_child_profiles payload ownership', async () => {
  const pool = fakeRegistryPool({ tde: [princessPersistent, {
    id: 3,
    child_id: '202',
    profile_version: 'phase3-v1',
    payload: { tenant: 'demo', parent_email: 'other@example.com', child_display_name: 'Other Child' },
    created_at: '2026-07-15T00:00:00Z',
    updated_at: '2026-07-15T00:00:00Z',
  }] });
  const children = await registry(pool);
  assert.deepEqual(children.map((c) => c.child_id), ['101']);
});

async function startAssessmentServer(resolveOwnedChild, sessionStore = new Map()) {
  const app = express();
  app.use(express.json());
  app.use('/api/assessment-mvp', createAssessmentMvpRouter({
    sessionStore,
    requireAuthentication: true,
    resolveAuthenticatedParent: async () => ({ authenticated: true, authUserId: 9001, parentProfile: { id: 55, email: 'parent@example.com' } }),
    resolveOwnedChild,
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}`, sessionStore };
}

test('Assessment Start succeeds for first Youth Development session from tde_child_profiles', async () => {
  const pool = fakeRegistryPool({ tde: [princessPersistent] });
  const resolveOwnedChild = async ({ childId, input }) => {
    if (input.program_context !== 'youth_development') return { ok: false, status: 500, error: 'unexpected_gates_fallback' };
    const children = await registry(pool);
    const child = children.find((entry) => entry.child_id === String(childId));
    return child ? { ok: true, learnerId: child.child_id, childProfile: child } : { ok: false, status: 404, error: 'youth_development_child_profile_not_found' };
  };
  const { server, baseUrl, sessionStore } = await startAssessmentServer(resolveOwnedChild);
  try {
    const res = await fetch(`${baseUrl}/api/assessment-mvp/sessions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ child_id: '101', grade: 1, subject: 'Math', itemsPerPackage: 1, program_context: 'youth_development', source_registry: 'youth_development', tenant: 'demo', email: 'parent@example.com' }) });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.child_context.child_id, '101');
    assert.equal(sessionStore.size, 1);
    assert.equal([...sessionStore.values()][0].learner_id, '101');
  } finally { server.close(); }
});

test('Youth Development requests do not fall through to Gates when profile is missing', async () => {
  const resolveOwnedChild = async ({ input }) => input.program_context === 'youth_development'
    ? { ok: false, status: 404, error: 'youth_development_child_profile_not_found' }
    : { ok: false, status: 500, error: 'unexpected_gates_fallback' };
  const { server, baseUrl } = await startAssessmentServer(resolveOwnedChild);
  try {
    const res = await fetch(`${baseUrl}/api/assessment-mvp/sessions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ child_id: '999', grade: 1, subject: 'Math', itemsPerPackage: 1, program_context: 'youth_development', source_registry: 'youth_development', tenant: 'demo', email: 'parent@example.com' }) });
    const body = await res.json();
    assert.equal(res.status, 404);
    assert.equal(body.error, 'youth_development_child_profile_not_found');
  } finally { server.close(); }
});

test('Learning Journey and Parent Dashboard can read new Youth Development activity', async () => {
  const pool = fakeRegistryPool({
    tde: [princessPersistent],
    journey: {
      assessment_sessions: [{ session_id: 's1', child_id: '101', status: 'in_progress', subject: 'Math', updated_at: '2026-07-16T10:00:00Z' }],
      adaptive_v2_skill_progress: [{ child_id: '101', grade: '1', selected_skill_id: 'G1M', checkpoint_attempts: 1, correct_count: 1, total_count: 1, mastery_band: 'consistent', updated_at: '2026-07-16T10:05:00Z' }],
    }
  });
  const journey = await buildLearningJourney(pool, { childId: '101', parentProfileId: '55', childName: 'Princess Nia' });
  assert.equal(journey.ok, true);
  assert.equal(journey.empty_state, false);

  const app = express();
  app.use(createYouthDevelopmentRouter({ pool, listYouthChildProfiles: () => registry(pool) }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/youth-development/parent-dashboard/adaptive-summary?tenant=demo&email=parent@example.com&child_id=101`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.child_id, '101');
    assert.equal(body.empty_state, false);
  } finally { server.close(); }
});

test('Adaptive progress writes use Youth Development registry and exclude Gates fallback', async () => {
  const pool = fakeRegistryPool({ tde: [princessPersistent] });
  const app = express();
  app.use(express.json());
  app.use(createAdaptiveV2Router({ pool, listYouthChildProfiles: () => registry(pool) }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    const ok = await fetch(`http://127.0.0.1:${server.address().port}/api/adaptive-v2/progress/checkpoint-attempt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ program_context: 'youth_development', source_registry: 'youth_development', tenant: 'demo', email: 'parent@example.com', child_id: '101', grade: '1', runtime_version: 'adaptive_v2', skill_id: 'G1M', checkpoint_attempts: 1, correct_count: 1, total_count: 1 }) });
    assert.equal(ok.status, 200);
    const missing = await fetch(`http://127.0.0.1:${server.address().port}/api/adaptive-v2/progress/checkpoint-attempt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ program_context: 'youth_development', source_registry: 'youth_development', tenant: 'demo', email: 'parent@example.com', child_id: '999', grade: '1', runtime_version: 'adaptive_v2', skill_id: 'G1M' }) });
    const body = await missing.json();
    assert.equal(missing.status, 404);
    assert.equal(body.error, 'youth_development_child_profile_not_found');
  } finally { server.close(); }
});
