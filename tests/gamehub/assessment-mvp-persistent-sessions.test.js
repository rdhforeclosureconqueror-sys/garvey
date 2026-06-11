const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const express = require('express');

const { createAssessmentMvpRouter } = require('../../server/assessmentMvpRoutes');
const { createAssessmentSession } = require('../../assessment-mvp/createAssessmentSession');

const root = path.join(__dirname, '..', '..');
const contentRoot = path.join(root, 'public/gamehub/skill-world/content');
const protectedPattern = /correct|acceptable|answer|rubric|scoring|score|solution|feedback|explanation/i;

const actors = {
  A1: { authenticated: true, authUserId: 101, parentProfile: { id: 201, email: 'a@example.com' } },
  A2: { authenticated: true, authUserId: 111, parentProfile: { id: 201, email: 'a@example.com' } },
  B: { authenticated: true, authUserId: 102, parentProfile: { id: 202, email: 'b@example.com' } },
};

const children = {
  301: { id: 301, parent_id: 201, first_name: JSON.stringify({ child_name: 'A Child', child_grade_band: 'Grade 3', metadata: { grade: 3 } }) },
  302: { id: 302, parent_id: 202, first_name: JSON.stringify({ child_name: 'B Child', child_grade_band: 'Grade 3', metadata: { grade: 3 } }) },
  303: { id: 303, parent_id: 201, first_name: JSON.stringify({ child_name: 'A Other Child', child_grade_band: 'Grade 3', metadata: { grade: 3 } }) },
};

function actorFromCookie(req) {
  const match = String(req.headers.cookie || '').match(/parent=([^;]+)/);
  return actors[match?.[1]] || { authenticated: false };
}

function parseChildProfile(row) {
  const parsed = JSON.parse(row.first_name);
  return {
    child_id: String(row.id),
    child_name: parsed.child_name,
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

function makeBacking() {
  return { sessions: [], items: [], exposures: [], nextId: 1, failNextCreate: false };
}

function publicClone(value) {
  return JSON.parse(JSON.stringify(value));
}

class DurableMockAssessmentStore {
  constructor(backing) {
    this.backing = backing;
    this.lock = Promise.resolve();
  }

  async locked(fn) {
    const previous = this.lock;
    let release;
    this.lock = new Promise((resolve) => { release = resolve; });
    await previous;
    try { return await fn(); } finally { release(); }
  }

  sessionFromRow(row, { resumed, childProfile }) {
    const items = this.backing.items.filter((item) => item.session_pk === row.id).sort((a, b) => a.display_order - b.display_order);
    return {
      session_id: row.session_id,
      session_version: row.session_version,
      assessment_role: row.assessment_role,
      grade: row.grade,
      subject: row.subject,
      status: row.status,
      resumed,
      current_question_position: row.current_question_position,
      public_items: items.map((item) => publicClone(item.public_payload)),
      package_ids: publicClone(row.selection_config.package_ids),
      selection_summary: publicClone(row.selection_config.selection_summary),
      exposed_item_ids: items.map((item) => item.item_identity).sort(),
      exposed_duplicate_keys: items.map((item) => item.duplicate_key).sort(),
      child_context: {
        child_id: childProfile.child_id,
        stored_grade_band: childProfile.child_grade_band,
        child_grade_band: childProfile.child_grade_band,
        grade_metadata: childProfile.metadata.grade,
      },
    };
  }

  async loadLearnerExposureHistory({ learnerId }) {
    const rows = this.backing.exposures.filter((row) => String(row.learner_id) === String(learnerId));
    return {
      item_ids: [...new Set(rows.map((row) => row.item_identity))],
      duplicate_keys: [...new Set(rows.map((row) => row.duplicate_key))],
    };
  }

  async createOrResumeAssessmentSession({ actor, ownedChild, grade, subject, itemsPerPackage }) {
    return this.locked(async () => {
      const existing = this.backing.sessions.find((row) => String(row.learner_id) === String(ownedChild.learnerId)
        && row.grade === grade && row.subject === subject && row.assessment_role === 'baseline' && row.status === 'in_progress');
      if (existing) return this.sessionFromRow(existing, { resumed: true, childProfile: ownedChild.childProfile });
      if (this.backing.failNextCreate) {
        this.backing.failNextCreate = false;
        throw new Error('simulated_transaction_failure');
      }
      const prior = await this.loadLearnerExposureHistory({ learnerId: ownedChild.learnerId });
      const selected = createAssessmentSession({
        grade, subject, itemsPerPackage,
        session_id: `amvp_${crypto.randomBytes(16).toString('hex')}`,
        previously_exposed_item_ids: prior.item_ids,
        previously_exposed_duplicate_keys: prior.duplicate_keys,
      });
      const row = {
        id: this.backing.nextId++, session_id: selected.session_id,
        learner_id: String(ownedChild.learnerId), parent_profile_id: actor.parentProfile.id, auth_user_id: actor.authUserId,
        assessment_role: 'baseline', grade, subject, status: 'in_progress', session_version: selected.session_version,
        selection_config: { itemsPerPackage, package_ids: selected.package_ids, selection_summary: selected.selection_summary },
        current_question_position: 0, started_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      const itemRows = selected.public_items.map((item, index) => ({
        session_pk: row.id, item_identity: item.item_identity, assessment_item_id: item.assessment_item_id,
        package_id: item.source_package_id, source_question_id: item.source_question_id, source_bank: item.source_bank,
        source_pointer: item.source_pointer, duplicate_key: item.duplicate_key, display_order: index,
        question_type: item.question_type, item_version_hash: crypto.createHash('sha256').update(JSON.stringify(item)).digest('hex'),
        public_payload: publicClone(item),
      }));
      const exposureRows = itemRows.map((item) => ({
        learner_id: String(ownedChild.learnerId), package_id: item.package_id, source_question_id: item.source_question_id,
        source_bank: item.source_bank, item_identity: item.item_identity, duplicate_key: item.duplicate_key,
        assessment_session_id: row.id,
      }));
      for (const exposure of exposureRows) {
        if (this.backing.exposures.some((row) => row.learner_id === exposure.learner_id
          && (row.item_identity === exposure.item_identity || row.duplicate_key === exposure.duplicate_key))) {
          const reread = this.backing.sessions.find((session) => String(session.learner_id) === String(ownedChild.learnerId)
            && session.grade === grade && session.subject === subject && session.status === 'in_progress');
          if (reread) return this.sessionFromRow(reread, { resumed: true, childProfile: ownedChild.childProfile });
          throw new Error('exposure_conflict');
        }
      }
      this.backing.sessions.push(row);
      this.backing.items.push(...itemRows);
      this.backing.exposures.push(...exposureRows);
      return this.sessionFromRow(row, { resumed: false, childProfile: ownedChild.childProfile });
    });
  }

  async getAssessmentSessionByPublicId({ sessionId, childProfile }) {
    const row = this.backing.sessions.find((session) => session.session_id === sessionId);
    if (!row) return null;
    return {
      session: childProfile ? this.sessionFromRow(row, { resumed: false, childProfile }) : null,
      ownership: { auth_user_id: row.auth_user_id, parent_profile_id: row.parent_profile_id, learner_id: row.learner_id },
    };
  }

  async getCurrentAssessmentSessionForLearner({ learnerId, parentProfileId, grade, subject, assessmentRole, childProfile }) {
    const rows = this.backing.sessions.filter((row) => String(row.learner_id) === String(learnerId)
      && Number(row.parent_profile_id) === Number(parentProfileId) && row.status === 'in_progress'
      && row.assessment_role === assessmentRole && (grade == null || row.grade === grade) && (subject == null || row.subject === subject));
    const row = rows.at(-1);
    return row ? this.sessionFromRow(row, { resumed: true, childProfile }) : null;
  }

  async updateAssessmentSessionPosition({ sessionId, parentProfileId, learnerId, currentQuestionPosition, childProfile }) {
    const row = this.backing.sessions.find((session) => session.session_id === sessionId);
    if (!row) return { status: 404, error: 'session_not_found' };
    if (Number(row.parent_profile_id) !== Number(parentProfileId) || String(row.learner_id) !== String(learnerId)) return { status: 403, error: 'forbidden' };
    if (row.status !== 'in_progress') return { status: 409, error: 'session_not_in_progress' };
    const count = this.backing.items.filter((item) => item.session_pk === row.id).length;
    if (!Number.isInteger(currentQuestionPosition) || currentQuestionPosition < 0 || currentQuestionPosition >= count) return { status: 400, error: 'invalid_current_question_position' };
    row.current_question_position = currentQuestionPosition;
    row.updated_at = new Date().toISOString();
    return { status: 200, session: this.sessionFromRow(row, { resumed: true, childProfile }) };
  }
}

async function startServer(backing, actorCookie = 'A1') {
  const app = express();
  app.use(express.json());
  app.use('/api/assessment-mvp', createAssessmentMvpRouter({
    assessmentStore: new DurableMockAssessmentStore(backing),
    requireAuthentication: true,
    resolveAuthenticatedParent: async (req) => actorFromCookie(req),
    resolveOwnedChild,
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}`, actorCookie };
}

async function jsonFetch(baseUrl, route, { method = 'GET', body, parent = 'A1' } = {}) {
  const headers = { cookie: `parent=${parent}` };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${baseUrl}${route}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { response, body: await response.json() };
}

function createPayload(extra = {}) {
  return { child_id: '301', grade: 3, subject: 'Math', itemsPerPackage: 1, ...extra };
}

function assertNoProtected(value) {
  const visit = (node, trail = []) => {
    if (Array.isArray(node)) return node.forEach((child, index) => visit(child, [...trail, String(index)]));
    if (!node || typeof node !== 'object') return;
    for (const [key, child] of Object.entries(node)) {
      assert.doesNotMatch(key, protectedPattern, `protected key leaked at ${[...trail, key].join('.')}`);
      visit(child, [...trail, key]);
    }
  };
  visit(value);
  assert.doesNotMatch(JSON.stringify(value), /internal_scoring_records|correct_answer|acceptable_answers|answer_key|scoring_key/i);
}

function contentHash() {
  const files = ['manifest.json', ...fs.readdirSync(contentRoot).filter((name) => name.endsWith('.skill-package.v1.json')).sort()];
  const hash = crypto.createHash('sha256');
  for (const file of files) hash.update(fs.readFileSync(path.join(contentRoot, file)));
  return hash.digest('hex');
}

test('authenticated parent creates, resumes, reads, and updates a durable persistent assessment session', async () => {
  const backing = makeBacking();
  const beforeHash = contentHash();
  let serverState = await startServer(backing);
  try {
    const created = await jsonFetch(serverState.baseUrl, '/api/assessment-mvp/sessions', { method: 'POST', body: createPayload() });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.resumed, false);
    assert.equal(created.body.current_question_position, 0);
    assert.equal(backing.sessions.length, 1, 'session row is written');
    assert.equal(backing.items.length, created.body.public_items.length, 'session items are written');
    assert.equal(backing.exposures.length, created.body.public_items.length, 'exposure rows are written');
    for (const row of backing.items) assertNoProtected(row.public_payload);
    assertNoProtected(created.body);

    const resumed = await jsonFetch(serverState.baseUrl, '/api/assessment-mvp/sessions', { method: 'POST', body: createPayload() });
    assert.equal(resumed.response.status, 200);
    assert.equal(resumed.body.session_id, created.body.session_id);
    assert.equal(resumed.body.resumed, true);
    assert.equal(backing.sessions.length, 1, 'no duplicate session rows are created');
    assert.equal(backing.exposures.length, created.body.public_items.length, 'no duplicate exposures are created');

    const progress = await jsonFetch(serverState.baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/progress`, {
      method: 'PATCH', body: { current_question_position: 1 },
    });
    assert.equal(progress.response.status, 200);
    assert.equal(progress.body.current_question_position, 1);

    await new Promise((resolve) => serverState.server.close(resolve));
    serverState = await startServer(backing);

    const fetched = await jsonFetch(serverState.baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}`, { parent: 'A2' });
    assert.equal(fetched.response.status, 200, 'session survives reconstructed store/router and new auth session');
    assert.equal(fetched.body.current_question_position, 1);
    assert.equal(fetched.body.child_context.child_id, '301');

    const current = await jsonFetch(serverState.baseUrl, '/api/assessment-mvp/children/301/current-session?subject=Math&grade=3&assessment_role=baseline');
    assert.equal(current.response.status, 200);
    assert.equal(current.body.session_id, created.body.session_id);

    const crossRead = await jsonFetch(serverState.baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}`, { parent: 'B' });
    assert.equal(crossRead.response.status, 403);
    const crossCurrent = await jsonFetch(serverState.baseUrl, '/api/assessment-mvp/children/301/current-session', { parent: 'B' });
    assert.equal(crossCurrent.response.status, 403);
    const siblingCurrent = await jsonFetch(serverState.baseUrl, '/api/assessment-mvp/children/303/current-session');
    assert.equal(siblingCurrent.response.status, 404);

    const invalidProgress = await jsonFetch(serverState.baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/progress`, {
      method: 'PATCH', body: { current_question_position: 999 },
    });
    assert.equal(invalidProgress.response.status, 400);

    backing.sessions[0].status = 'completed';
    const completedProgress = await jsonFetch(serverState.baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/progress`, {
      method: 'PATCH', body: { current_question_position: 0 },
    });
    assert.equal(completedProgress.response.status, 409);
    assert.equal(contentHash(), beforeHash, 'SkillPackages and manifest remain byte-identical');
  } finally {
    await new Promise((resolve) => serverState.server.close(resolve));
  }
});

test('persistent session store handles concurrent creates and transactional failure without partial rows', async () => {
  const backing = makeBacking();
  const { server, baseUrl } = await startServer(backing);
  try {
    backing.failNextCreate = true;
    const failed = await jsonFetch(baseUrl, '/api/assessment-mvp/sessions', { method: 'POST', body: createPayload() });
    assert.equal(failed.response.status, 400);
    assert.equal(backing.sessions.length, 0);
    assert.equal(backing.items.length, 0);
    assert.equal(backing.exposures.length, 0);

    const requests = Array.from({ length: 5 }, () => jsonFetch(baseUrl, '/api/assessment-mvp/sessions', { method: 'POST', body: createPayload() }));
    const results = await Promise.all(requests);
    assert.equal(new Set(results.map((result) => result.body.session_id)).size, 1);
    assert.equal(results.filter((result) => result.body.resumed === false).length, 1);
    assert.equal(results.filter((result) => result.body.resumed === true).length, 4);
    assert.equal(backing.sessions.length, 1);
    assert.equal(backing.exposures.length, backing.items.length);
    for (const result of results) assertNoProtected(result.body);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
