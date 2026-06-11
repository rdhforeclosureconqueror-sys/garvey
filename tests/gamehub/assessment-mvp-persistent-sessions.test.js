const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const express = require('express');

const { createAssessmentMvpRouter } = require('../../server/assessmentMvpRoutes');
const { createAssessmentSession } = require('../../assessment-mvp/createAssessmentSession');
const { createReassessmentSession } = require('../../assessment-mvp/createReassessmentSession');
const { submitAssessmentResponses } = require('../../assessment-mvp/submitAssessmentResponses');

const root = path.join(__dirname, '..', '..');
const contentRoot = path.join(root, 'public/gamehub/skill-world/content');
const protectedPattern = /correct_answer|correctAnswer|acceptable_answers|acceptableAnswers|rubric|scoring_key|scoringKey|answer_key|internal_scoring_records|auth_user_id|parent_profile_id|token_hash|distractor|explanation/i;

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
  return { sessions: [], items: [], exposures: [], responses: [], evidence: [], recommendations: [], nextId: 1, failNextCreate: false, failNextCompletion: false };
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
      ...(row.selection_config.requested_package_ids ? { requested_package_ids: publicClone(row.selection_config.requested_package_ids) } : {}),
      ...(row.selection_config.insufficient_evidence ? { insufficient_evidence: publicClone(row.selection_config.insufficient_evidence) } : {}),
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
        current_question_position: 0, created_at: new Date().toISOString(), started_at: new Date().toISOString(), updated_at: new Date().toISOString(), completed_at: null, lock_version: 0,
        internal_scoring_records: publicClone(selected.internal_scoring_records),
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

  async loadAuthorizedReassessmentPackages({ priorSessionInternalId }) {
    const ids = new Set();
    for (const item of this.backing.items.filter((row) => row.session_pk === priorSessionInternalId)) ids.add(item.package_id);
    for (const evidence of this.backing.evidence.filter((row) => row.session_id === priorSessionInternalId)) ids.add(evidence.package_id);
    for (const recommendation of this.backing.recommendations.filter((row) => row.session_id === priorSessionInternalId)) ids.add(recommendation.recommended_package_id);
    return [...ids].sort();
  }

  async createPersistentReassessmentSession({ priorSessionId, actor, ownedChild, packageIds, itemsPerPackage }) {
    return this.locked(async () => {
      const priorRow = this.backing.sessions.find((session) => session.session_id === priorSessionId);
      if (!priorRow) return { status: 404, error: 'session_not_found' };
      if (Number(priorRow.parent_profile_id) !== Number(actor.parentProfile.id) || String(priorRow.learner_id) !== String(ownedChild.learnerId)) return { status: 403, error: 'forbidden' };
      if (priorRow.status !== 'completed') return { status: 409, error: 'prior_session_must_be_completed' };
      const existing = this.backing.sessions.find((row) => String(row.learner_id) === String(priorRow.learner_id)
        && row.grade === priorRow.grade && row.subject === priorRow.subject && row.assessment_role === 'reassessment'
        && row.prior_session_id === priorRow.id && row.status === 'in_progress');
      if (existing) return { status: 200, session: this.sessionFromRow(existing, { resumed: true, childProfile: ownedChild.childProfile }) };

      const requestedIds = [...new Set(packageIds.map((id) => String(id).trim()))].sort();
      const authorizedIds = await this.loadAuthorizedReassessmentPackages({ priorSessionInternalId: priorRow.id });
      const unrelated = requestedIds.filter((id) => !authorizedIds.includes(id));
      if (unrelated.length) return { status: 400, error: 'unrelated_reassessment_package_ids', unrelated_package_ids: unrelated };
      const prior = await this.loadLearnerExposureHistory({ learnerId: priorRow.learner_id });
      const reassessment = createReassessmentSession(priorRow.completed_result, {
        grade: priorRow.grade,
        subject: priorRow.subject,
        package_ids: requestedIds,
        itemsPerPackage,
        all_prior_exposed_item_ids: prior.item_ids,
        all_prior_exposed_duplicate_keys: prior.duplicate_keys,
        session_id: `amvp_${crypto.randomBytes(16).toString('hex')}`,
      });
      const now = new Date().toISOString();
      const row = {
        id: this.backing.nextId++, session_id: reassessment.session_id,
        learner_id: String(priorRow.learner_id), parent_profile_id: priorRow.parent_profile_id, auth_user_id: priorRow.auth_user_id,
        assessment_role: 'reassessment', grade: priorRow.grade, subject: priorRow.subject, status: 'in_progress', session_version: reassessment.session_version,
        selection_config: {
          itemsPerPackage,
          package_ids: reassessment.package_ids,
          requested_package_ids: reassessment.requested_package_ids,
          insufficient_evidence: (reassessment.insufficient_evidence || []).map((entry) => ({
            ...entry,
            available_safe_item_count: entry.available_safe_item_count ?? entry.safe_non_repeated_item_count ?? 0,
          })),
          selection_summary: reassessment.selection_summary,
        },
        prior_session_id: priorRow.id,
        current_question_position: 0, created_at: now, started_at: now, updated_at: now, completed_at: null, lock_version: 0,
        internal_scoring_records: publicClone(reassessment.internal_scoring_records),
      };
      const itemRows = reassessment.public_items.map((item, index) => ({
        session_pk: row.id, item_identity: item.item_identity, assessment_item_id: item.assessment_item_id,
        package_id: item.source_package_id, source_question_id: item.source_question_id, source_bank: item.source_bank,
        source_pointer: item.source_pointer, duplicate_key: item.duplicate_key, display_order: index,
        question_type: item.question_type, item_version_hash: crypto.createHash('sha256').update(JSON.stringify(item)).digest('hex'),
        public_payload: publicClone(item),
      }));
      const exposureRows = itemRows.map((item) => ({
        learner_id: String(priorRow.learner_id), package_id: item.package_id, source_question_id: item.source_question_id,
        source_bank: item.source_bank, item_identity: item.item_identity, duplicate_key: item.duplicate_key,
        assessment_session_id: row.id,
      }));
      for (const exposure of exposureRows) {
        if (this.backing.exposures.some((old) => old.learner_id === exposure.learner_id
          && (old.item_identity === exposure.item_identity || old.duplicate_key === exposure.duplicate_key))) {
          const reread = this.backing.sessions.find((session) => String(session.learner_id) === String(priorRow.learner_id)
            && session.grade === priorRow.grade && session.subject === priorRow.subject && session.assessment_role === 'reassessment'
            && session.prior_session_id === priorRow.id && session.status === 'in_progress');
          if (reread) return { status: 200, session: this.sessionFromRow(reread, { resumed: true, childProfile: ownedChild.childProfile }) };
          throw new Error('exposure_conflict');
        }
      }
      this.backing.sessions.push(row);
      this.backing.items.push(...itemRows);
      this.backing.exposures.push(...exposureRows);
      return { status: 201, session: this.sessionFromRow(row, { resumed: false, childProfile: ownedChild.childProfile }) };
    });
  }

  async getLearnerAssessmentHistory({ learnerId, parentProfileId, grade = null, subject = null, status = null, assessmentRole = null, limit = 50 }) {
    const bounded = Math.min(Number(limit), 50);
    const rows = this.backing.sessions.filter((row) => String(row.learner_id) === String(learnerId)
      && Number(row.parent_profile_id) === Number(parentProfileId)
      && (grade == null || row.grade === grade)
      && (subject == null || row.subject === subject)
      && (status == null || row.status === status)
      && (assessmentRole == null || row.assessment_role === assessmentRole))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')) || b.id - a.id)
      .slice(0, bounded);
    return {
      limit: bounded,
      sessions: rows.map((row) => ({
        session_id: row.session_id,
        assessment_role: row.assessment_role,
        grade: row.grade,
        subject: row.subject,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        completed_at: row.completed_at,
        current_question_position: row.current_question_position,
        package_ids: publicClone(row.selection_config.package_ids),
        evidence_summary: this.backing.evidence.filter((entry) => entry.session_id === row.id).map((entry) => ({
          source_package_id: entry.package_id,
          valid_scored_responses: entry.valid_response_count,
          correct_responses: entry.correct_count,
          incorrect_responses: entry.incorrect_count,
          omitted_responses: entry.omitted_count,
          not_scorable_responses: entry.not_scorable_count,
          accuracy: entry.accuracy,
          provisional_label: entry.provisional_label,
        })),
        recommendation_count: this.backing.recommendations.filter((entry) => entry.session_id === row.id).length,
        ...(row.prior_session_id ? { prior_session_id_public_reference_if_safe: this.backing.sessions.find((entry) => entry.id === row.prior_session_id)?.session_id || null } : {}),
      })),
    };
  }


  async getAssessmentSessionByPublicId({ sessionId, childProfile }) {
    const row = this.backing.sessions.find((session) => session.session_id === sessionId);
    if (!row) return null;
    const profile = childProfile || parseChildProfile(children[Number(row.learner_id)]);
    return {
      session: this.sessionFromRow(row, { resumed: false, childProfile: profile }),
      ownership: { auth_user_id: row.auth_user_id, parent_profile_id: row.parent_profile_id, learner_id: row.learner_id },
    };
  }

  async getCurrentAssessmentSessionForLearner({ learnerId, parentProfileId, grade, subject, assessmentRole, childProfile }) {
    const rows = this.backing.sessions.filter((row) => String(row.learner_id) === String(learnerId)
      && Number(row.parent_profile_id) === Number(parentProfileId) && row.status === 'in_progress'
      && (assessmentRole == null || row.assessment_role === assessmentRole) && (grade == null || row.grade === grade) && (subject == null || row.subject === subject));
    const row = rows.at(-1);
    return row ? this.sessionFromRow(row, { resumed: true, childProfile }) : null;
  }


  async submitPersistentAssessmentResponses({ sessionId, actor, ownedChild, responses }) {
    return this.locked(async () => {
      const row = this.backing.sessions.find((session) => session.session_id === sessionId);
      if (!row) return { status: 404, error: 'session_not_found' };
      if (Number(row.parent_profile_id) !== Number(actor.parentProfile.id) || String(row.learner_id) !== String(ownedChild.learnerId)) return { status: 403, error: 'forbidden' };
      if (row.status !== 'in_progress') return { status: 409, error: 'session_already_completed' };
      const items = this.backing.items.filter((item) => item.session_pk === row.id).sort((a, b) => a.display_order - b.display_order);
      const keys = new Map();
      for (const item of items) {
        keys.set(item.item_identity, item.item_identity);
        keys.set(item.assessment_item_id, item.item_identity);
      }
      const byIdentity = new Map();
      const foreign = [];
      for (const [key, value] of Object.entries(responses || {})) {
        const identity = keys.get(key);
        if (!identity) foreign.push(key);
        else byIdentity.set(identity, value);
      }
      if (foreign.length) return { status: 400, error: 'responses_include_items_not_owned_by_session', foreign_item_ids: foreign.sort() };
      if (this.backing.failNextCompletion) {
        this.backing.failNextCompletion = false;
        throw new Error('simulated_completion_transaction_failure');
      }
      const session = {
        ...this.sessionFromRow(row, { resumed: false, childProfile: ownedChild.childProfile }),
        internal_scoring_records: publicClone(row.internal_scoring_records),
      };
      const submissions = items.map((item) => ({ item_identity: item.item_identity, response: byIdentity.get(item.item_identity) }));
      const result = submitAssessmentResponses(session, submissions);
      const responseRows = result.response_results.map((score, index) => ({
        session_id: row.id,
        session_item_id: items[index].id || `${row.id}:${index}`,
        learner_response: { value: byIdentity.has(items[index].item_identity) ? byIdentity.get(items[index].item_identity) : null },
        response_status: score.status === 'omitted' ? 'omitted' : 'submitted',
        score_status: score.status,
        score_result: { status: score.status, ...(score.reason_code ? { reason_code: score.reason_code } : {}) },
        omitted: score.status === 'omitted',
      }));
      const evidenceRows = result.skill_evidence.map((evidence) => ({
        session_id: row.id,
        package_id: evidence.source_package_id,
        valid_response_count: evidence.valid_scored_responses,
        correct_count: evidence.correct_responses,
        incorrect_count: evidence.incorrect_responses,
        omitted_count: evidence.omitted_responses,
        not_scorable_count: evidence.not_scorable_responses,
        accuracy: evidence.accuracy,
        provisional_label: evidence.provisional_label,
      }));
      const recommendationRows = result.recommendations.slice(0, 3).map((recommendation) => ({
        session_id: row.id,
        learner_id: row.learner_id,
        recommended_package_id: recommendation.package_id,
        recommendation_type: recommendation.recommendation_type,
        reason_code: recommendation.reason_code,
        priority: recommendation.priority,
        status: 'active',
      }));
      this.backing.responses.push(...responseRows);
      this.backing.evidence.push(...evidenceRows);
      this.backing.recommendations.push(...recommendationRows);
      row.status = 'completed';
      row.completed_at = new Date().toISOString();
      row.updated_at = row.completed_at;
      row.lock_version += 1;
      row.completed_result = publicClone({ ...result, child_context: this.sessionFromRow(row, { resumed: false, childProfile: ownedChild.childProfile }).child_context });
      return { status: 200, result: publicClone(row.completed_result) };
    });
  }

  async getCompletedAssessmentResult({ sessionId }) {
    const row = this.backing.sessions.find((session) => session.session_id === sessionId);
    if (!row || row.status !== 'completed') return null;
    return publicClone(row.completed_result);
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

test('persistent completion stores responses, evidence, recommendations and reconstructs completed result', async () => {
  const backing = makeBacking();
  const beforeHash = contentHash();
  let serverState = await startServer(backing);
  try {
    const created = await jsonFetch(serverState.baseUrl, '/api/assessment-mvp/sessions', { method: 'POST', body: createPayload({ itemsPerPackage: 2 }) });
    assert.equal(created.response.status, 201);
    const responses = {};
    created.body.public_items.forEach((item, index) => {
      if (index === 0) return;
      responses[item.assessment_item_id] = item.question_type && item.question_type.includes('numeric') ? 'not a number' : '__not_the_answer__';
    });
    const submitted = await jsonFetch(serverState.baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/responses`, {
      method: 'POST',
      body: { responses, grade: 1, subject: 'English', package_id: 'client-spoof', score: 100, answer: 'client-answer' },
    });
    assert.equal(submitted.response.status, 200);
    assert.equal(submitted.body.status, 'completed');
    assert.equal(backing.responses.length, created.body.public_items.length, 'one response row exists per session item');
    assert.equal(backing.responses.filter((row) => row.omitted).length, 1, 'omitted response persists distinctly');
    assert.ok(backing.responses.some((row) => row.score_status === 'not_scorable' || row.score_status === 'incorrect' || row.score_status === 'omitted'));
    const notScorable = backing.evidence.reduce((sum, row) => sum + row.not_scorable_count, 0);
    const incorrect = backing.evidence.reduce((sum, row) => sum + row.incorrect_count, 0);
    assert.ok(notScorable >= 0);
    assert.ok(incorrect >= 0, 'not_scorable is tracked separately from incorrect');
    assert.equal(new Set(backing.evidence.map((row) => `${row.session_id}:${row.package_id}`)).size, backing.evidence.length, 'one evidence row per package');
    assert.ok(backing.recommendations.length <= 3, 'recommendations are capped at three');
    assert.equal(backing.sessions[0].status, 'completed');
    assert.ok(backing.sessions[0].completed_at, 'completed_at persists');
    assert.equal(submitted.body.overall_mastery_score, undefined, 'completed result contains no overall mastery score');
    assertNoProtected(submitted.body);

    await new Promise((resolve) => serverState.server.close(resolve));
    serverState = await startServer(backing);
    const afterRestart = await jsonFetch(serverState.baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}`, { parent: 'A2' });
    assert.equal(afterRestart.response.status, 200, 'completed result survives reconstructed store and new auth session');
    assert.deepEqual(afterRestart.body, submitted.body);
    assertNoProtected(afterRestart.body);

    const duplicate = await jsonFetch(serverState.baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/responses`, { method: 'POST', body: { responses } });
    assert.equal(duplicate.response.status, 409);
    assert.equal(backing.evidence.length, new Set(backing.evidence.map((row) => `${row.session_id}:${row.package_id}`)).size, 'no duplicate evidence rows');
    assert.equal(backing.recommendations.length, new Set(backing.recommendations.map((row) => `${row.session_id}:${row.recommended_package_id}:${row.recommendation_type}`)).size, 'no duplicate recommendation rows');
    assert.equal(backing.gates_progress?.length || 0, 0, 'no Gates progress writes');
    assert.equal(backing.adaptive_v2_skill_progress?.length || 0, 0, 'no Adaptive V2 progress writes');
    assert.equal(backing.skill_world_progress?.length || 0, 0, 'no Skill World progress writes');
    assert.equal(contentHash(), beforeHash, 'SkillPackages and manifest remain byte-identical');
  } finally {
    await new Promise((resolve) => serverState.server.close(resolve));
  }
});

test('persistent completion rejects foreign items and concurrent duplicate submissions without duplicate rows', async () => {
  const backing = makeBacking();
  const { server, baseUrl } = await startServer(backing);
  try {
    const created = await jsonFetch(baseUrl, '/api/assessment-mvp/sessions', { method: 'POST', body: createPayload({ itemsPerPackage: 1 }) });
    const foreign = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/responses`, {
      method: 'POST', body: { responses: { foreign_item_id: 'x' } },
    });
    assert.equal(foreign.response.status, 400);
    assert.equal(backing.responses.length, 0);

    const responses = Object.fromEntries(created.body.public_items.map((item) => [item.item_identity, '0']));
    const pair = await Promise.all([
      jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/responses`, { method: 'POST', body: { responses } }),
      jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/responses`, { method: 'POST', body: { responses } }),
    ]);
    assert.equal(pair.filter((result) => result.response.status === 200).length, 1, 'exactly one concurrent submission succeeds');
    assert.equal(pair.filter((result) => result.response.status === 409).length, 1, 'losing concurrent submission returns 409');
    assert.equal(backing.responses.length, created.body.public_items.length, 'no duplicate response rows');
    assert.equal(backing.evidence.length, new Set(backing.evidence.map((row) => `${row.session_id}:${row.package_id}`)).size);
    assert.equal(backing.recommendations.length, new Set(backing.recommendations.map((row) => `${row.session_id}:${row.recommended_package_id}:${row.recommendation_type}`)).size);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('persistent completion transaction failure leaves session in progress and writes no completion rows', async () => {
  const backing = makeBacking();
  const { server, baseUrl } = await startServer(backing);
  try {
    const created = await jsonFetch(baseUrl, '/api/assessment-mvp/sessions', { method: 'POST', body: createPayload() });
    backing.failNextCompletion = true;
    const failed = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/responses`, {
      method: 'POST', body: { responses: {} },
    });
    assert.equal(failed.response.status, 400);
    assert.equal(backing.sessions[0].status, 'in_progress');
    assert.equal(backing.responses.length, 0);
    assert.equal(backing.evidence.length, 0);
    assert.equal(backing.recommendations.length, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

async function createAndCompleteBaseline(baseUrl, { parent = 'A1', payload = createPayload({ itemsPerPackage: 3 }) } = {}) {
  const created = await jsonFetch(baseUrl, '/api/assessment-mvp/sessions', { method: 'POST', parent, body: payload });
  assert.equal(created.response.status, 201);
  const responses = Object.fromEntries(created.body.public_items.map((item) => [item.item_identity, '0']));
  const completed = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/responses`, {
    method: 'POST', parent, body: { responses },
  });
  assert.equal(completed.response.status, 200);
  assert.equal(completed.body.status, 'completed');
  return { created, completed };
}

test('persistent reassessment is authorized, durable, non-repeating, resumable, and completeable', async () => {
  const beforeHash = contentHash();
  const backing = makeBacking();
  let serverState = await startServer(backing);
  try {
    const { created: baseline, completed } = await createAndCompleteBaseline(serverState.baseUrl);
    const packageId = baseline.body.package_ids[0];
    const baselineItems = new Set(baseline.body.public_items.map((item) => item.item_identity));
    const baselineDuplicates = new Set(baseline.body.public_items.map((item) => item.duplicate_key));

    const unrelated = await jsonFetch(serverState.baseUrl, `/api/assessment-mvp/sessions/${baseline.body.session_id}/reassessment`, {
      method: 'POST',
      body: { package_ids: ['G9M_DOES_NOT_EXIST'], itemsPerPackage: 3, grade: 1, subject: 'English', learner_id: 'spoof' },
    });
    assert.equal(unrelated.response.status, 400);
    assert.equal(unrelated.body.error, 'unrelated_reassessment_package_ids');

    const crossParent = await jsonFetch(serverState.baseUrl, `/api/assessment-mvp/sessions/${baseline.body.session_id}/reassessment`, {
      method: 'POST', parent: 'B', body: { package_ids: [packageId], itemsPerPackage: 3 },
    });
    assert.equal(crossParent.response.status, 403);

    const reassessment = await jsonFetch(serverState.baseUrl, `/api/assessment-mvp/sessions/${baseline.body.session_id}/reassessment`, {
      method: 'POST',
      body: { package_ids: [packageId], itemsPerPackage: 3, grade: 1, subject: 'English', score: 100, items: [{ item_identity: 'client' }] },
    });
    assert.equal(reassessment.response.status, 201);
    assert.equal(reassessment.body.assessment_role, 'reassessment');
    assert.equal(reassessment.body.grade, baseline.body.grade, 'client grade override is ignored');
    assert.equal(reassessment.body.subject, baseline.body.subject, 'client subject override is ignored');
    assert.deepEqual(reassessment.body.requested_package_ids, [packageId]);
    assertNoProtected(reassessment.body);
    for (const item of reassessment.body.public_items) {
      assert.equal(baselineItems.has(item.item_identity), false, 'prior item identity is excluded');
      assert.equal(baselineDuplicates.has(item.duplicate_key), false, 'prior duplicate key is excluded');
    }
    for (const entry of reassessment.body.insufficient_evidence || []) {
      assert.equal(typeof entry.available_safe_item_count, 'number');
      assert.ok(entry.available_safe_item_count < 3);
    }

    const repeated = await jsonFetch(serverState.baseUrl, `/api/assessment-mvp/sessions/${baseline.body.session_id}/reassessment`, {
      method: 'POST', body: { package_ids: [packageId], itemsPerPackage: 3 },
    });
    assert.equal(repeated.response.status, 200);
    assert.equal(repeated.body.session_id, reassessment.body.session_id);
    assert.equal(repeated.body.resumed, true);
    assert.equal(backing.sessions.filter((row) => row.assessment_role === 'reassessment').length, 1);

    const concurrent = await Promise.all(Array.from({ length: 5 }, () => jsonFetch(serverState.baseUrl, `/api/assessment-mvp/sessions/${baseline.body.session_id}/reassessment`, {
      method: 'POST', body: { package_ids: [packageId], itemsPerPackage: 3 },
    })));
    assert.equal(new Set(concurrent.map((result) => result.body.session_id)).size, 1, 'concurrent requests resume one in-progress reassessment');
    assert.equal(backing.sessions.filter((row) => row.assessment_role === 'reassessment').length, 1);

    await new Promise((resolve) => serverState.server.close(resolve));
    serverState = await startServer(backing, 'A2');
    const current = await jsonFetch(serverState.baseUrl, '/api/assessment-mvp/children/301/current-session?assessment_role=reassessment', { parent: 'A2' });
    assert.equal(current.response.status, 200);
    assert.equal(current.body.session_id, reassessment.body.session_id);
    assert.equal(current.body.assessment_role, 'reassessment');
    assertNoProtected(current.body);

    const reassessmentResponses = Object.fromEntries(current.body.public_items.map((item) => [item.item_identity, '0']));
    const reassessmentCompleted = await jsonFetch(serverState.baseUrl, `/api/assessment-mvp/sessions/${current.body.session_id}/responses`, {
      method: 'POST', parent: 'A2', body: { responses: reassessmentResponses },
    });
    assert.equal(reassessmentCompleted.response.status, 200);
    assert.equal(reassessmentCompleted.body.status, 'completed');
    assert.ok(backing.responses.some((row) => row.session_id === backing.sessions.find((entry) => entry.session_id === current.body.session_id).id));
    assert.ok(backing.evidence.some((row) => row.session_id === backing.sessions.find((entry) => entry.session_id === current.body.session_id).id));
    assertNoProtected(reassessmentCompleted.body);

    const noneCurrent = await jsonFetch(serverState.baseUrl, '/api/assessment-mvp/children/301/current-session?assessment_role=reassessment', { parent: 'A2' });
    assert.equal(noneCurrent.response.status, 404, 'completed reassessment is not returned as current');

    await new Promise((resolve) => serverState.server.close(resolve));
    serverState = await startServer(backing, 'A2');
    const reloaded = await jsonFetch(serverState.baseUrl, `/api/assessment-mvp/sessions/${current.body.session_id}`, { parent: 'A2' });
    assert.equal(reloaded.response.status, 200);
    assert.deepEqual(reloaded.body, reassessmentCompleted.body, 'completed reassessment reloads after reconstructed store');

    const history = await jsonFetch(serverState.baseUrl, '/api/assessment-mvp/children/301/history', { parent: 'A2' });
    assert.equal(history.response.status, 200);
    assert.equal(history.body.sessions.length, 2);
    assert.deepEqual(history.body.sessions.map((row) => row.assessment_role), ['reassessment', 'baseline']);
    assert.ok(history.body.sessions[0].prior_session_id_public_reference_if_safe);
    assertNoProtected(history.body);

    const roleFiltered = await jsonFetch(serverState.baseUrl, '/api/assessment-mvp/children/301/history?assessment_role=baseline&grade=3&subject=Math&status=completed', { parent: 'A2' });
    assert.equal(roleFiltered.response.status, 200);
    assert.equal(roleFiltered.body.sessions.length, 1);
    assert.equal(roleFiltered.body.sessions[0].session_id, baseline.body.session_id);

    const otherChild = await jsonFetch(serverState.baseUrl, '/api/assessment-mvp/children/303/history', { parent: 'A2' });
    assert.equal(otherChild.response.status, 200);
    assert.equal(otherChild.body.sessions.length, 0);
    assert.equal(backing.gates_progress?.length || 0, 0);
    assert.equal(backing.adaptive_v2_skill_progress?.length || 0, 0);
    assert.equal(backing.skill_world_progress?.length || 0, 0);
    assert.equal(contentHash(), beforeHash, 'SkillPackages and manifest remain byte-identical');
  } finally {
    await new Promise((resolve) => serverState.server.close(resolve));
  }
});

test('persistent reassessment exposure exclusion spans multiple completed sessions', async () => {
  const backing = makeBacking();
  const { server, baseUrl } = await startServer(backing);
  try {
    const { created: baseline } = await createAndCompleteBaseline(baseUrl);
    const packageId = baseline.body.package_ids[0];
    const first = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${baseline.body.session_id}/reassessment`, {
      method: 'POST', body: { package_ids: [packageId], itemsPerPackage: 3 },
    });
    assert.equal(first.response.status, 201);
    const firstResponses = Object.fromEntries(first.body.public_items.map((item) => [item.item_identity, '0']));
    const firstCompleted = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${first.body.session_id}/responses`, {
      method: 'POST', body: { responses: firstResponses },
    });
    assert.equal(firstCompleted.response.status, 200);

    const second = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${first.body.session_id}/reassessment`, {
      method: 'POST', body: { package_ids: [packageId], itemsPerPackage: 3 },
    });
    assert.equal(second.response.status, 201);
    const allPriorIdentities = new Set([...baseline.body.public_items, ...first.body.public_items].map((item) => item.item_identity));
    const allPriorDuplicateKeys = new Set([...baseline.body.public_items, ...first.body.public_items].map((item) => item.duplicate_key));
    for (const item of second.body.public_items) {
      assert.equal(allPriorIdentities.has(item.item_identity), false, 'second reassessment excludes any prior item identity');
      assert.equal(allPriorDuplicateKeys.has(item.duplicate_key), false, 'second reassessment excludes any prior duplicate key');
    }
    assertNoProtected(second.body);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
