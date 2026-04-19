const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');
const { YOUTH_QUESTION_BANK } = require('../../youth-development/question-engine/youthQuestionBank');

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter());
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${addr.port}`,
  };
}

function buildAnswers(valueByQuestion = () => 1, includeQuestion = () => true) {
  const out = {};
  for (const question of YOUTH_QUESTION_BANK) {
    if (!includeQuestion(question)) continue;
    out[question.id] = valueByQuestion(question);
  }
  return out;
}

test('GET /api/youth-development/questions returns authored 25-question parent-observation bank shape', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/questions`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.question_count, 25);
    assert.match(payload.bank_name, /Parent Observation Screener v1/);
    assert.equal(payload.respondent, 'parent_guardian');
    assert.match(payload.instructions, /past 6 to 8 weeks/);

    const traitCounts = payload.questions.reduce((acc, question) => {
      acc[question.primary_trait] = (acc[question.primary_trait] || 0) + 1;
      return acc;
    }, {});

    assert.deepEqual(traitCounts, {
      SR: 4,
      CQ: 4,
      CR: 4,
      RS: 4,
      PS: 3,
      FB: 3,
      DE: 3,
    });

    for (const question of payload.questions) {
      assert.match(question.id, /^YT_POBS_Q\d{2}$/);
      assert.equal(question.answer_scale.length, 4);
      assert.equal(typeof question.prompt, 'string');
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /youth-development/intake serves real walkthrough UI contract', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/youth-development/intake`);
    assert.equal(response.status, 200);
    const html = await response.text();

    assert.match(html, /Question 1 of 25/);
    assert.match(html, /state = \{ questions: \[\], index: 0, answers: \{\} \}/);
    assert.match(html, /fetch\("\/api\/youth-development\/questions"\)/);
    assert.match(html, /Please answer the intake questions before submitting\./);
    assert.match(html, /childNameInput/);
    assert.match(html, /\/api\/youth-development\/assess/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/youth-development/assess completes full 25-item question flow and returns deterministic output', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/assess`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: buildAnswers(() => 3) }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.answers_count, 25);
    assert.equal(payload.unanswered_count, 0);
    assert.equal(payload.flow.completed, true);
    assert.equal(payload.completion.interpretation_suppressed, false);
    assert.ok(Array.isArray(payload.aggregated_trait_rows));
    assert.equal(payload.aggregated_trait_rows.length, 7);
    assert.equal(typeof payload.rendered_html, 'string');
    assert.match(payload.rendered_html, /Parent insight narrative/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/youth-development/assess uses deterministic primary-trait scoring and report fields are present', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/assess`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        answers: buildAnswers((question) => (question.primary_trait === 'SR' ? 4 : 1)),
      }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    const sr = payload.aggregated_trait_rows.find((row) => row.trait_code === 'SR');
    const de = payload.aggregated_trait_rows.find((row) => row.trait_code === 'DE');

    assert.equal(sr.current_score, 100);
    assert.equal(de.current_score, 25);

    for (const traitCode of ['SR', 'CQ', 'CR', 'RS', 'PS', 'FB', 'DE']) {
      const report = payload.trait_reports[traitCode];
      assert.ok(report);
      for (const field of ['what_this_means', 'what_it_looks_like', 'why_it_matters', 'support_next', 'confidence_note']) {
        assert.equal(typeof report[field], 'string');
        assert.ok(report[field].length > 0);
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/youth-development/assess suppresses trait interpretation when >20% unanswered', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const answers = buildAnswers(() => 3, (question, idx) => true);
    const removedIds = YOUTH_QUESTION_BANK.slice(0, 6).map((q) => q.id);
    for (const id of removedIds) delete answers[id];

    const response = await fetch(`${baseUrl}/api/youth-development/assess`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.unanswered_count, 6);
    assert.equal(payload.completion.interpretation_suppressed, true);
    assert.equal(payload.interpretation.incomplete, true);
    assert.match(payload.interpretation.message, /Insufficient evidence/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/youth-development/assess caps confidence at provisional levels for parent-only data', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/assess`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: buildAnswers(() => 4) }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    for (const row of payload.aggregated_trait_rows) {
      assert.ok(row.confidence_score < 60, `confidence must remain provisional for ${row.trait_code}`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/youth-development/assess binds ownership when tenant/email are present and persistence hook is configured', async () => {
  const records = new Map();
  const children = new Map();
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    persistYouthAssessment: async ({ accountCtx, responsePayload, requestBody }) => {
      records.set(`${accountCtx.tenant}:${accountCtx.email}`, responsePayload);
      const childProfile = {
        child_id: 'child-maya-1',
        child_name: requestBody.child_name || null,
      };
      children.set(`${accountCtx.tenant}:${accountCtx.email}`, [childProfile]);
      return { account_bound: true, tenant: accountCtx.tenant, email: accountCtx.email, submission_id: 999, child_profile: childProfile };
    },
    loadLatestYouthAssessment: async ({ accountCtx }) => records.get(`${accountCtx.tenant}:${accountCtx.email}`) || null,
    listYouthChildProfiles: async ({ accountCtx }) => children.get(`${accountCtx.tenant}:${accountCtx.email}`) || [],
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/assess`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant: 'demo',
        email: 'parent@example.com',
        child_name: 'Maya',
        answers: buildAnswers(() => 2),
      }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ownership.account_bound, true);
    assert.equal(payload.ownership.tenant, 'demo');
    assert.equal(payload.ownership.email, 'parent@example.com');
    assert.equal(payload.ownership.submission_id, 999);
    assert.equal(payload.ownership.child_profile.child_name, 'Maya');
    assert.equal(payload.ownership.child_profile.child_id, 'child-maya-1');

    const latest = await fetch(`${baseUrl}/api/youth-development/parent-dashboard/latest?tenant=demo&email=parent@example.com`);
    assert.equal(latest.status, 200);
    const latestPayload = await latest.json();
    assert.equal(latestPayload.ok, true);
    assert.equal(latestPayload.has_result, true);
    assert.ok(latestPayload.payload && latestPayload.payload.page_model);

    const childrenRes = await fetch(`${baseUrl}/api/youth-development/children?tenant=demo&email=parent@example.com`);
    assert.equal(childrenRes.status, 200);
    const childrenPayload = await childrenRes.json();
    assert.equal(childrenPayload.ok, true);
    assert.equal(childrenPayload.has_children, true);
    assert.equal(childrenPayload.children[0].child_id, 'child-maya-1');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/youth-development/assess uses signed-in auth actor identity when auth context is present', async () => {
  let capturedAccountCtx = null;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authActor = { tenantSlug: 'signed-tenant', email: 'signed-in@example.com' };
    next();
  });
  app.use(createYouthDevelopmentRouter({
    persistYouthAssessment: async ({ accountCtx }) => {
      capturedAccountCtx = accountCtx;
      return { account_bound: true, tenant: accountCtx.tenant, email: accountCtx.email };
    },
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/assess?tenant=query-tenant&email=query@example.com`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant: 'body-tenant',
        email: 'body@example.com',
        answers: buildAnswers(() => 2),
      }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ownership.account_bound, true);
    assert.equal(payload.ownership.tenant, 'signed-tenant');
    assert.equal(payload.ownership.email, 'signed-in@example.com');
    assert.equal(capturedAccountCtx.tenant, 'signed-tenant');
    assert.equal(capturedAccountCtx.email, 'signed-in@example.com');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /api/youth-development/parent-dashboard/latest forwards optional child_id scope and children endpoint is additive-safe', async () => {
  let capturedChildId = null;
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    loadLatestYouthAssessment: async ({ childId }) => {
      capturedChildId = childId;
      return null;
    },
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const latestRes = await fetch(`${baseUrl}/api/youth-development/parent-dashboard/latest?tenant=demo&email=parent@example.com&child_id=child-real-1`);
    assert.equal(latestRes.status, 200);
    const latestPayload = await latestRes.json();
    assert.equal(latestPayload.ok, true);
    assert.equal(latestPayload.has_result, false);
    assert.equal(capturedChildId, 'child-real-1');

    const childrenRes = await fetch(`${baseUrl}/api/youth-development/children?tenant=demo&email=parent@example.com`);
    assert.equal(childrenRes.status, 200);
    const childrenPayload = await childrenRes.json();
    assert.equal(childrenPayload.ok, true);
    assert.equal(childrenPayload.has_children, false);
    assert.equal(childrenPayload.reason, 'persistence_not_enabled');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /api/youth-development/program/bridge returns child-scoped parent launch status', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    getProgramBridgeState: async ({ childId }) => ({
      ok: true,
      child_id: childId,
      launch_allowed: true,
      has_enrollment: false,
      current_week: 1,
      current_phase_name: 'Foundation',
      next_recommended_action: 'Begin Week 1',
      cta: { label: 'Start Program', href: '/youth-development/program?tenant=demo&email=parent%40example.com&child_id=' + childId },
    }),
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/program/bridge?tenant=demo&email=parent@example.com&child_id=child-real-1`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.child_id, 'child-real-1');
    assert.equal(payload.launch_allowed, true);
    assert.equal(payload.current_week, 1);
    assert.equal(payload.current_phase_name, 'Foundation');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/youth-development/program/launch returns resume state and does not loop parent to intake', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    launchProgramForChild: async ({ childId }) => ({
      ok: true,
      child_id: childId,
      launch_allowed: true,
      has_enrollment: true,
      current_week: 4,
      current_phase_name: 'Foundation',
      next_recommended_action: 'Continue Week 4',
      cta: { label: 'Continue Development Plan', href: '/youth-development/program?tenant=demo&email=parent%40example.com&child_id=' + childId },
    }),
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/program/launch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', email: 'parent@example.com', child_id: 'child-real-1' }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.has_enrollment, true);
    assert.equal(payload.next_recommended_action, 'Continue Week 4');
    assert.match(String(payload.cta && payload.cta.href), /\/youth-development\/program/);
    assert.doesNotMatch(String(payload.cta && payload.cta.href), /\/youth-development\/intake/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
