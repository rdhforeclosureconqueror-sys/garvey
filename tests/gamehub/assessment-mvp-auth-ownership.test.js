const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');

const { createAssessmentMvpRouter } = require('../../server/assessmentMvpRoutes');

const actors = {
  A: { authenticated: true, authUserId: 101, parentProfile: { id: 201, display_name: 'Parent A', email: 'a@example.com' } },
  B: { authenticated: true, authUserId: 102, parentProfile: { id: 202, display_name: 'Parent B', email: 'b@example.com' } },
};

const children = {
  301: { id: 301, parent_id: 201, first_name: JSON.stringify({ child_name: 'A Child', child_age_band: '7-9', child_grade_band: 'Grade 3', metadata: { grade: 3 } }) },
  302: { id: 302, parent_id: 202, first_name: JSON.stringify({ child_name: 'B Child', child_age_band: '7-9', child_grade_band: 'Grade 3', metadata: { grade: 3 } }) },
};

function actorFromCookie(req) {
  const cookie = String(req.headers.cookie || '');
  const match = cookie.match(/parent=([^;]+)/);
  if (!match) return { authenticated: false };
  if (match[1] === 'expired') return { authenticated: false, clearCookie: true, reason: 'expired' };
  return actors[match[1]] || { authenticated: false };
}

function parseChildProfile(row) {
  const parsed = JSON.parse(row.first_name);
  return {
    child_id: String(row.id),
    child_name: parsed.child_name,
    child_age_band: parsed.child_age_band,
    child_grade_band: parsed.child_grade_band,
    metadata: parsed.metadata,
    profile_status: 'ready',
  };
}

async function resolveOwnedChild({ parentProfileId, childId }) {
  if (!/^[1-9]\d*$/.test(String(childId || '').trim())) return { ok: false, status: 400, error: 'malformed_child_id' };
  const row = children[Number(childId)];
  if (!row) return { ok: false, status: 404, error: 'child_not_found' };
  if (Number(row.parent_id) !== Number(parentProfileId)) return { ok: false, status: 403, error: 'forbidden' };
  return { ok: true, learnerId: String(row.id), childProfile: parseChildProfile(row), row };
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const sessionStore = new Map();
  app.use('/api/assessment-mvp', createAssessmentMvpRouter({
    sessionStore,
    requireAuthentication: true,
    resolveAuthenticatedParent: async (req) => actorFromCookie(req),
    resolveOwnedChild,
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  return { server, sessionStore, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function jsonFetch(baseUrl, route, { method = 'GET', body, parent = 'A' } = {}) {
  const headers = { cookie: `parent=${parent}` };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

function createPayload(extra = {}) {
  return { child_id: '301', grade: 3, subject: 'Math', itemsPerPackage: 1, ...extra };
}

function wrongResponsesFor(publicItems) {
  return Object.fromEntries(publicItems.map((item) => [item.assessment_item_id, 'wrong']));
}

function assertNoOwnershipInternals(value, trail = []) {
  if (Array.isArray(value)) return value.forEach((child, index) => assertNoOwnershipInternals(child, [...trail, String(index)]));
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!['auth_user_id', 'parent_profile_id', 'learner_id', 'token', 'token_hash', 'session_token'].includes(key), `ownership internal leaked at ${[...trail, key].join('.')}`);
    assertNoOwnershipInternals(child, [...trail, key]);
  }
}

test('assessment MVP authenticated session creation enforces child ownership and hides ownership internals', async () => {
  const { server, baseUrl, sessionStore } = await startServer();
  try {
    const unauthenticated = await jsonFetch(baseUrl, '/api/assessment-mvp/sessions', { method: 'POST', body: createPayload(), parent: '' });
    assert.equal(unauthenticated.response.status, 401);

    const missingChild = await jsonFetch(baseUrl, '/api/assessment-mvp/sessions', { method: 'POST', body: { grade: 3, subject: 'Math', itemsPerPackage: 1 } });
    assert.equal(missingChild.response.status, 400);
    assert.equal(missingChild.body.error, 'missing_child_id');

    const malformedChild = await jsonFetch(baseUrl, '/api/assessment-mvp/sessions', { method: 'POST', body: createPayload({ child_id: 'not-an-id' }) });
    assert.equal(malformedChild.response.status, 400);
    assert.equal(malformedChild.body.error, 'malformed_child_id');

    const missing = await jsonFetch(baseUrl, '/api/assessment-mvp/sessions', { method: 'POST', body: createPayload({ child_id: '999' }) });
    assert.equal(missing.response.status, 404);
    assert.equal(missing.body.error, 'child_not_found');

    const otherParentChild = await jsonFetch(baseUrl, '/api/assessment-mvp/sessions', { method: 'POST', body: createPayload({ child_id: '302' }) });
    assert.equal(otherParentChild.response.status, 403);
    assert.equal(otherParentChild.body.error, 'forbidden');

    const created = await jsonFetch(baseUrl, '/api/assessment-mvp/sessions', {
      method: 'POST',
      body: createPayload({ parent_profile_id: 999, auth_user_id: 999, learner_id: 999, parent_id: 999 }),
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.child_context.child_id, '301');
    assert.equal(created.body.child_context.child_grade_band, 'Grade 3');
    assertNoOwnershipInternals(created.body);

    const stored = sessionStore.get(created.body.session_id);
    assert.equal(stored.auth_user_id, actors.A.authUserId);
    assert.equal(stored.parent_profile_id, actors.A.parentProfile.id);
    assert.equal(stored.learner_id, '301');
    assert.notEqual(stored.parent_profile_id, 999, 'client-supplied parent ownership was ignored');
    assert.notEqual(stored.learner_id, 999, 'client-supplied learner ownership was ignored');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('assessment MVP authenticated reads, submissions, and reassessments reject cross-parent sessions', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const created = await jsonFetch(baseUrl, '/api/assessment-mvp/sessions', { method: 'POST', body: createPayload() });
    assert.equal(created.response.status, 201);

    const crossRead = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}`, { parent: 'B' });
    assert.equal(crossRead.response.status, 403);
    assert.equal(crossRead.body.error, 'forbidden');

    const crossSubmit = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/responses`, {
      method: 'POST',
      parent: 'B',
      body: { responses: wrongResponsesFor(created.body.public_items) },
    });
    assert.equal(crossSubmit.response.status, 403);
    assert.equal(crossSubmit.body.error, 'forbidden');

    const submitted = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/responses`, {
      method: 'POST',
      body: { parent_profile_id: 202, learner_id: 302, responses: wrongResponsesFor(created.body.public_items) },
    });
    assert.equal(submitted.response.status, 200);
    assertNoOwnershipInternals(submitted.body);

    const crossReassessment = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/reassessment`, {
      method: 'POST',
      parent: 'B',
      body: { package_ids: [submitted.body.recommendations[0].package_id], itemsPerPackage: 1 },
    });
    assert.equal(crossReassessment.response.status, 403);
    assert.equal(crossReassessment.body.error, 'forbidden');

    const reassessment = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/reassessment`, {
      method: 'POST',
      body: { package_ids: [submitted.body.recommendations[0].package_id], itemsPerPackage: 1 },
    });
    assert.equal(reassessment.response.status, 201);
    assertNoOwnershipInternals(reassessment.body);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('assessment MVP expired parent sessions are rejected and clear the Gates session cookie', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const expired = await jsonFetch(baseUrl, '/api/assessment-mvp/sessions', { method: 'POST', parent: 'expired', body: createPayload() });
    assert.equal(expired.response.status, 401);
    assert.equal(expired.body.error, 'unauthenticated');
    assert.match(expired.response.headers.get('set-cookie') || '', /gates_parent_session=;/);
    assert.match(expired.response.headers.get('set-cookie') || '', /Max-Age=0/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
