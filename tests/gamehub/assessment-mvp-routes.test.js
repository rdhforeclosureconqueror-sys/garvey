const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const express = require('express');

const { createAssessmentMvpRouter } = require('../../server/assessmentMvpRoutes');
const { loadSkillPackages, packageIdOf } = require('../../assessment-mvp/loadSkillPackages');

const root = path.join(__dirname, '..', '..');
const contentRoot = path.join(root, 'public/gamehub/skill-world/content');
const protectedFieldPattern = /correct_answer|correctAnswer|acceptable_answers|acceptableAnswers|scoring_key|scoringKey|internal_scoring_records|rubric|partial_credit|correct_option|answer_key|private_record|distractor_rationale|explanation/i;

function contentHash() {
  const files = ['manifest.json', ...fs.readdirSync(contentRoot).filter((name) => name.endsWith('.skill-package.v1.json')).sort()];
  const hash = crypto.createHash('sha256');
  for (const file of files) hash.update(fs.readFileSync(path.join(contentRoot, file)));
  return hash.digest('hex');
}

function assertNoProtectedScoringData(value) {
  const visit = (node, trail = []) => {
    if (Array.isArray(node)) return node.forEach((child, index) => visit(child, [...trail, String(index)]));
    if (!node || typeof node !== 'object') return;
    for (const [key, child] of Object.entries(node)) {
      assert.doesNotMatch(key, protectedFieldPattern, `protected field name leaked at ${[...trail, key].join('.')}`);
      if (/explanation/i.test(key)) assert.doesNotMatch(String(child), /answer|correct|acceptable|option/i);
      visit(child, [...trail, key]);
    }
  };
  visit(value);
  assert.doesNotMatch(JSON.stringify(value), /internal_scoring_records|correct_answer|acceptable_answers|answer_key|scoring_key/i);
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const sessionStore = new Map();
  app.use('/api/assessment-mvp', createAssessmentMvpRouter({ sessionStore, requireAuthentication: false }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  return { server, sessionStore, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function jsonFetch(baseUrl, route, { method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

async function createSession(baseUrl, payload = {}) {
  return jsonFetch(baseUrl, '/api/assessment-mvp/sessions', {
    method: 'POST',
    body: { grade: 1, subject: 'Math', itemsPerPackage: 3, ...payload },
  });
}

function wrongResponsesFor(publicItems) {
  return Object.fromEntries(publicItems.map((item) => [item.assessment_item_id, 'definitely not the answer']));
}

test('assessment MVP route validation and public session privacy', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const created = await createSession(baseUrl);
    assert.equal(created.response.status, 201);
    assert.match(created.body.session_id, /^amvp_[a-f0-9]{32}$/);
    assert.equal(created.body.assessment_role, 'baseline');
    assert.equal(created.body.grade, 1);
    assert.equal(created.body.subject, 'Math');
    assert.equal(created.body.status, 'in_progress');
    assert.ok(created.body.public_items.length > 0);
    assert.ok(created.body.package_ids.length > 0);
    assert.equal(typeof created.body.selection_summary, 'object');
    assert.equal(created.body.exposure.storage, 'temporary_in_memory');
    assert.ok(created.body.exposure.limitations.some((text) => text.includes('lost on server restart')));
    assertNoProtectedScoringData(created.body);

    const read = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}`);
    assert.equal(read.response.status, 200);
    assert.deepEqual(read.body, created.body);

    const badGrade = await createSession(baseUrl, { grade: 7 });
    assert.equal(badGrade.response.status, 400);
    assert.equal(badGrade.body.error, 'invalid_grade');

    const badSubject = await createSession(baseUrl, { subject: 'Science' });
    assert.equal(badSubject.response.status, 400);
    assert.equal(badSubject.body.error, 'invalid_subject');

    const tooManyItems = await createSession(baseUrl, { itemsPerPackage: 6 });
    assert.equal(tooManyItems.response.status, 400);
    assert.equal(tooManyItems.body.error, 'invalid_items_per_package');

    const malformed = await jsonFetch(baseUrl, '/api/assessment-mvp/sessions/not-a-session-id');
    assert.equal(malformed.response.status, 400);
    assert.equal(malformed.body.error, 'malformed_session_id');

    const unknown = await jsonFetch(baseUrl, '/api/assessment-mvp/sessions/amvp_00000000000000000000000000000000');
    assert.equal(unknown.response.status, 404);
    assert.equal(unknown.body.error, 'session_not_found');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('assessment MVP submissions use server-side session records and safe completion results', async () => {
  const { server, baseUrl, sessionStore } = await startServer();
  try {
    const created = await createSession(baseUrl);
    const beforeStored = sessionStore.get(created.body.session_id).session;
    assert.ok(Array.isArray(beforeStored.internal_scoring_records), 'server keeps scoring records internally');
    assert.equal(Object.prototype.hasOwnProperty.call(created.body, 'internal_scoring_records'), false);

    const foreign = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/responses`, {
      method: 'POST',
      body: { responses: { ...wrongResponsesFor(created.body.public_items), foreign_item: 'wrong' } },
    });
    assert.equal(foreign.response.status, 400);
    assert.equal(foreign.body.error, 'responses_include_items_not_owned_by_session');
    assertNoProtectedScoringData(foreign.body);
    assert.equal(sessionStore.get(created.body.session_id).result, null, 'foreign responses do not complete the session');

    const submitted = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/responses`, {
      method: 'POST',
      body: {
        grade: 6,
        subject: 'English',
        internal_scoring_records: [{ item_identity: created.body.public_items[0].item_identity, answer: 'client supplied' }],
        responses: wrongResponsesFor(created.body.public_items),
      },
    });
    assert.equal(submitted.response.status, 200);
    assert.equal(submitted.body.status, 'completed');
    assert.equal(submitted.body.grade, 1, 'client-supplied grade cannot override the original session');
    assert.equal(submitted.body.subject, 'Math', 'client-supplied subject cannot override the original session');
    assert.equal(submitted.body.response_results.length, created.body.public_items.length);
    assert.equal(submitted.body.response_results.every((result) => result.status !== 'unknown_item'), true);
    assert.equal(submitted.body.recommendations.length <= 3, true);
    assert.equal(submitted.body.recommendations.length, 3);
    const realPackageIds = new Set(loadSkillPackages({ grade: 1, subject: 'Math' }).map(packageIdOf));
    assert.equal(submitted.body.recommendations.every((rec) => realPackageIds.has(rec.package_id)), true);
    assert.equal(submitted.body.exposure.storage, 'temporary_in_memory');
    assertNoProtectedScoringData(submitted.body);

    const completedRead = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}`);
    assert.equal(completedRead.response.status, 200);
    assert.deepEqual(completedRead.body, submitted.body);

    const doubleSubmit = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/responses`, {
      method: 'POST',
      body: { responses: wrongResponsesFor(created.body.public_items) },
    });
    assert.equal(doubleSubmit.response.status, 409);
    assert.equal(doubleSubmit.body.error, 'session_already_completed');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('assessment MVP reassessment route enforces completed prior session and non-repeat boundaries', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const created = await createSession(baseUrl);
    const premature = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/reassessment`, {
      method: 'POST',
      body: { package_ids: [created.body.package_ids[0]], itemsPerPackage: 3 },
    });
    assert.equal(premature.response.status, 409);
    assert.equal(premature.body.error, 'prior_session_must_be_completed');

    const submitted = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/responses`, {
      method: 'POST',
      body: { responses: wrongResponsesFor(created.body.public_items) },
    });
    assert.equal(submitted.response.status, 200);

    const unrelated = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/reassessment`, {
      method: 'POST',
      body: { package_ids: ['G6E_WRITING_999'], itemsPerPackage: 3 },
    });
    assert.equal(unrelated.response.status, 400);
    assert.equal(unrelated.body.error, 'unrelated_reassessment_package_ids');

    const requestedPackage = submitted.body.recommendations[0].package_id;
    const reassessment = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/reassessment`, {
      method: 'POST',
      body: { grade: 6, subject: 'English', package_ids: [requestedPackage], itemsPerPackage: 3 },
    });
    assert.equal(reassessment.response.status, 201);
    assert.equal(reassessment.body.assessment_role, 'reassessment');
    assert.equal(reassessment.body.grade, 1);
    assert.equal(reassessment.body.subject, 'Math');
    assert.deepEqual(reassessment.body.requested_package_ids, [requestedPackage]);
    const priorItems = new Set(submitted.body.exposure.item_ids);
    const priorDuplicateKeys = new Set(submitted.body.exposure.duplicate_keys);
    assert.equal(reassessment.body.public_items.some((item) => priorItems.has(item.item_identity)), false);
    assert.equal(reassessment.body.public_items.some((item) => priorDuplicateKeys.has(item.duplicate_key)), false);
    assertNoProtectedScoringData(reassessment.body);

    const insufficientPackage = 'G1M_MD_TIME_001';
    assert.ok(submitted.body.package_ids.includes(insufficientPackage), 'time package appeared in prior result');
    const insufficient = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/reassessment`, {
      method: 'POST',
      body: { package_ids: [insufficientPackage], itemsPerPackage: 5 },
    });
    assert.equal(insufficient.response.status, 201);
    assert.deepEqual(insufficient.body.insufficient_evidence, [{
      package_id: insufficientPackage,
      safe_non_repeated_item_count: 0,
      reason_code: 'insufficient_non_repeated_items',
    }]);
    assertNoProtectedScoringData(insufficient.body);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('assessment MVP API leaves production manifest and SkillPackages byte-identical', async () => {
  const before = contentHash();
  const { server, baseUrl } = await startServer();
  try {
    const created = await createSession(baseUrl, { itemsPerPackage: 1 });
    assert.equal(created.response.status, 201);
    const submitted = await jsonFetch(baseUrl, `/api/assessment-mvp/sessions/${created.body.session_id}/responses`, {
      method: 'POST',
      body: { responses: wrongResponsesFor(created.body.public_items) },
    });
    assert.equal(submitted.response.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  assert.equal(contentHash(), before);
});
