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

test('assessment history continuity keeps prior records while latest result updates for same child scope', async () => {
  const records = new Map();
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    persistYouthAssessment: async ({ accountCtx, responsePayload, requestBody }) => {
      const key = `${accountCtx.tenant}:${accountCtx.email}:${requestBody.child_id || 'child-real-1'}`;
      const history = records.get(key) || [];
      const nextEntry = {
        ...responsePayload,
        saved_at: new Date(Date.now() + history.length * 1000).toISOString(),
        interpretation: {
          ...responsePayload.scoring.interpretation,
        },
      };
      history.unshift(nextEntry);
      records.set(key, history);
      return {
        account_bound: true,
        tenant: accountCtx.tenant,
        email: accountCtx.email,
        child_profile: { child_id: requestBody.child_id || 'child-real-1', child_name: requestBody.child_name || 'Maya' },
      };
    },
    loadLatestYouthAssessment: async ({ accountCtx, childId }) => {
      const key = `${accountCtx.tenant}:${accountCtx.email}:${childId || 'child-real-1'}`;
      const history = records.get(key) || [];
      if (!history.length) return null;
      return {
        ...history[0],
        assessment_history: history.map((entry, idx) => ({
          submission_id: idx + 1,
          saved_at: entry.saved_at,
          child_profile: { child_id: childId || 'child-real-1', child_name: 'Maya' },
          interpretation: entry.interpretation || {},
        })),
      };
    },
    listYouthChildProfiles: async () => ([{ child_id: 'child-real-1', child_name: 'Maya' }]),
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const first = await fetch(`${baseUrl}/api/youth-development/assess`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', email: 'parent@example.com', child_id: 'child-real-1', child_name: 'Maya', answers: buildAnswers(() => 2) }),
    });
    assert.equal(first.status, 200);
    const second = await fetch(`${baseUrl}/api/youth-development/assess`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', email: 'parent@example.com', child_id: 'child-real-1', child_name: 'Maya', answers: buildAnswers(() => 3) }),
    });
    assert.equal(second.status, 200);

    const latestRes = await fetch(`${baseUrl}/api/youth-development/parent-dashboard/latest?tenant=demo&email=parent@example.com&child_id=child-real-1`);
    assert.equal(latestRes.status, 200);
    const latest = await latestRes.json();
    assert.equal(latest.ok, true);
    assert.equal(latest.has_result, true);
    assert.ok(Array.isArray(latest.payload.assessment_history));
    assert.equal(latest.payload.assessment_history.length, 2);
    assert.equal(latest.payload.assessment_history[0].child_profile.child_id, 'child-real-1');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('program bridge consumes saved assessment context and does not false-empty when latest result exists', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    loadLatestYouthAssessment: async ({ childId }) => ({
      page_model: { page_title: 'Youth Development Parent Dashboard' },
      saved_at: '2026-04-01T00:00:00.000Z',
      assessment_history: [{ submission_id: 1, child_profile: { child_id: childId || 'child-real-1' } }],
    }),
    listYouthChildProfiles: async () => ([{ child_id: 'child-real-1', child_name: 'Maya' }]),
    getProgramBridgeState: async ({ childId }) => ({
      ok: true,
      child_id: childId,
      launch_allowed: true,
      has_enrollment: false,
      current_week: 1,
      next_recommended_action: 'Start Program',
      cta: { label: 'Start Program', href: `/youth-development/program?child_id=${childId}` },
    }),
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const latest = await fetch(`${baseUrl}/api/youth-development/parent-dashboard/latest?tenant=demo&email=parent@example.com&child_id=child-real-1`);
    assert.equal(latest.status, 200);
    const latestPayload = await latest.json();
    assert.equal(latestPayload.has_result, true);

    const bridge = await fetch(`${baseUrl}/api/youth-development/program/bridge?tenant=demo&email=parent@example.com&child_id=child-real-1`);
    assert.equal(bridge.status, 200);
    const bridgePayload = await bridge.json();
    assert.equal(bridgePayload.ok, true);
    assert.equal(bridgePayload.launch_allowed, true);
    assert.equal(bridgePayload.child_id, 'child-real-1');
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
      cta: { label: 'View Weekly Plan', href: '/youth-development/program?tenant=demo&email=parent%40example.com&child_id=' + childId },
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

test('GET /youth-development/program serves guided parent-first planner copy and normalized CTAs', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({}));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const response = await fetch(`${baseUrl}/youth-development/program`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Build Your Weekly Plan/);
    assert.match(html, /Today’s Session/);
    assert.match(html, /Start Today’s Session/);
    assert.match(html, /View Weekly Plan/);
    assert.match(html, /View More Options/);
    assert.doesNotMatch(html, /Continue Program/);
    assert.doesNotMatch(html, /Continue Development Plan/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /api/youth-development/program/week-content returns current week guided content from program rail when enrolled', async () => {
  const app = express();
  app.use(express.json());
  let savedExecution = {
    week_status: 'not_started',
    completed_step_keys: [],
    active_step_index: 0,
    reflection_note: '',
    observation_note: '',
    reflection_saved: false,
    observation_saved: false,
    resume_ready: false,
    next_week_available: false,
  };
  app.use(createYouthDevelopmentRouter({
    getProgramBridgeState: async ({ childId }) => ({
      ok: true,
      child_id: childId,
      launch_allowed: true,
      setup_needed: false,
      has_enrollment: true,
      current_week: 1,
      current_phase_name: 'Foundation',
      next_recommended_action: 'Continue Week 1',
    }),
    getProgramWeekExecution: async () => savedExecution,
    getProgramWeekPlanning: async () => ({
      commitment_plan: { days_per_week: 3, preferred_days: ['monday', 'wednesday', 'friday'], preferred_time: '5:30 PM', session_duration_minutes: 30, start_date: '2026-04-19' },
      scheduled_sessions: [{ session_id: 'plan-1', day: 'monday', day_label: 'Monday', time: '17:30', status: 'planned', core_activity_title: 'Breathe and Count Reset' }],
      accountability: { planned_this_week: 3, completed_this_week: 1, consistency_label: 'building' },
    }),
    saveProgramWeekExecution: async ({ actionType, note }) => {
      if (actionType === 'save_reflection') {
        savedExecution = { ...savedExecution, reflection_note: note, reflection_saved: true, week_status: 'in_progress', resume_ready: true };
      }
      return { ok: true, execution_state: savedExecution };
    },
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/program/week-content?tenant=demo&email=parent@example.com&child_id=child-real-1`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.state, 'content_ready');
    assert.equal(payload.current_week, 1);
    assert.equal(payload.week_content.week_number, 1);
    assert.match(payload.week_content.title, /Week 1/);
    assert.match(payload.week_content.phase_week_context, /Week 1 of 36/);
    assert.ok(payload.week_content.content_blocks.core_activity);
    assert.equal(Array.isArray(payload.week_content.weekly_goals), true);
    assert.equal(Array.isArray(payload.week_content.parent_guidance), true);
    assert.equal(Array.isArray(payload.week_content.session_flow), true);
    assert.ok(payload.week_content.observation_support_area);
    assert.ok(payload.week_content.progress);
    assert.equal(payload.week_content.progress.total_weeks, 36);
    assert.equal(Array.isArray(payload.week_content.roadmap), true);
    assert.equal(payload.week_content.roadmap.some((entry) => entry.status === 'current'), true);
    assert.ok(payload.week_content.activity_bank_surface);
    assert.ok(payload.week_content.activity_bank_surface.selected_path);
    assert.equal(Array.isArray(payload.week_content.activity_bank_surface.banks.core_activity), true);
    assert.ok(payload.week_content.parent_guidance_setup);
    assert.ok(payload.week_content.current_activity_session_plan);
    assert.ok(payload.week_content.reflection_checkin_support);
    assert.ok(payload.execution_state);
    assert.equal(payload.week_content.content_audit.ok, true);
    assert.deepEqual(payload.week_content.content_audit.classifications.placeholder_demo_filler_content, []);
    assert.ok(payload.week_content.parent_prompts.reflection_prompt);
    assert.ok(payload.week_content.bank_depth_audit);
    assert.ok(Array.isArray(payload.week_content.bank_depth_audit.areas));
    assert.ok(payload.week_content.lesson_plan_template);
    assert.ok(Array.isArray(payload.week_content.lesson_plan_template.blocks));
    assert.ok(payload.week_content.commitment_plan);
    assert.ok(Array.isArray(payload.week_content.scheduled_sessions));
    assert.ok(payload.week_content.accountability);
    assert.doesNotMatch(String(payload.week_content.objective), /loading\\.|fixture|placeholder/i);
    assert.doesNotMatch(String(payload.week_content.week_purpose), /loading\\.|fixture|placeholder/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('week-content marks planner setup required until commitment fields are complete', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    getProgramBridgeState: async ({ childId }) => ({
      ok: true,
      child_id: childId,
      launch_allowed: true,
      setup_needed: false,
      has_enrollment: true,
      current_week: 1,
      current_phase_name: 'Foundation',
      next_recommended_action: 'Continue Week 1',
    }),
    getProgramWeekExecution: async () => ({ week_status: 'not_started', completed_step_keys: [], active_step_index: 0 }),
    getProgramWeekPlanning: async () => ({
      commitment_plan: {
        days_per_week: 3,
        preferred_days: ['monday'],
        preferred_time: '5:30 PM',
        session_duration_minutes: 30,
      },
      scheduled_sessions: [],
      accountability: { planned_this_week: 0, completed_this_week: 0, consistency_label: 'early' },
    }),
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/program/week-content?tenant=demo&email=parent@example.com&child_id=child-real-1`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.week_content.planner_setup_required, true);
    assert.equal(payload.week_content.commitment_setup_status, 'required');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('week-content marks planner setup complete when weekly commitment includes frequency, days, time, length, and energy', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    getProgramBridgeState: async ({ childId }) => ({
      ok: true,
      child_id: childId,
      launch_allowed: true,
      setup_needed: false,
      has_enrollment: true,
      current_week: 1,
      current_phase_name: 'Foundation',
      next_recommended_action: 'Continue Week 1',
    }),
    getProgramWeekExecution: async () => ({ week_status: 'not_started', completed_step_keys: [], active_step_index: 0 }),
    getProgramWeekPlanning: async () => ({
      commitment_plan: {
        weekly_frequency: 4,
        preferred_days: ['monday', 'wednesday'],
        preferred_time: '5:30 PM',
        session_length: 30,
        energy_type: 'balanced',
      },
      scheduled_sessions: [{ session_id: 'plan-1', day: 'monday', time: '17:30', status: 'planned' }],
      accountability: { planned_this_week: 1, completed_this_week: 0, consistency_label: 'early' },
    }),
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/program/week-content?tenant=demo&email=parent@example.com&child_id=child-real-1`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.week_content.planner_setup_required, false);
    assert.equal(payload.week_content.commitment_setup_status, 'complete');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('program commitment, session plan, and completion routes persist planner operations', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    saveProgramCommitmentPlan: async ({ commitment }) => ({
      ok: true,
      commitment_plan: commitment,
      commitment_setup_status: 'complete',
      planner_setup_required: false,
      scheduled_sessions: [
        { session_id: 'plan-1', day: 'monday', day_label: 'Monday', time: '17:30', status: 'planned' },
        { session_id: 'plan-2', day: 'wednesday', day_label: 'Wednesday', time: '17:30', status: 'planned' },
      ],
      accountability: { planned_this_week: 3, completed_this_week: 0, consistency_label: 'early' },
    }),
    saveProgramSessionPlan: async ({ payload }) => ({ ok: true, scheduled_sessions: payload.scheduled_sessions || [] }),
    markProgramSessionComplete: async ({ sessionId }) => ({ ok: true, session_id: sessionId }),
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const commitment = await fetch(`${baseUrl}/api/youth-development/program/commitment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant: 'demo',
        email: 'parent@example.com',
        child_id: 'child-real-1',
        weekly_frequency: '3x',
        preferred_days: ['monday'],
        preferred_time: '5:30 PM',
        session_length: 30,
        energy_type: 'balanced',
        start_date: '2026-04-19',
      }),
    });
    const commitmentPayload = await commitment.json();
    assert.equal(commitmentPayload.ok, true);
    assert.equal(commitmentPayload.commitment_plan.weekly_frequency, 3);
    assert.equal(commitmentPayload.commitment_setup_status, 'complete');
    assert.equal(commitmentPayload.planner_setup_required, false);
    assert.equal(Array.isArray(commitmentPayload.scheduled_sessions), true);
    assert.equal(commitmentPayload.scheduled_sessions.length, 2);

    const sessionPlan = await fetch(`${baseUrl}/api/youth-development/program/session-plan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', email: 'parent@example.com', child_id: 'child-real-1', week_number: 1, scheduled_sessions: [{ session_id: 'plan-1', day: 'monday', time: '17:30', status: 'planned' }] }),
    });
    const sessionPlanPayload = await sessionPlan.json();
    assert.equal(sessionPlanPayload.ok, true);
    assert.equal(sessionPlanPayload.scheduled_sessions.length, 1);

    const complete = await fetch(`${baseUrl}/api/youth-development/program/session-complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', email: 'parent@example.com', child_id: 'child-real-1', week_number: 1, session_id: 'plan-1' }),
    });
    const completePayload = await complete.json();
    assert.equal(completePayload.ok, true);
    assert.equal(completePayload.session_id, 'plan-1');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});


test('program session completion route forwards scoped schedule identifiers', async () => {
  const app = express();
  app.use(express.json());
  let captured = null;
  app.use(createYouthDevelopmentRouter({
    markProgramSessionComplete: async (payload) => {
      captured = payload;
      return { ok: true, session_id: payload.sessionId };
    },
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const complete = await fetch(`${baseUrl}/api/youth-development/program/session-complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant: 'demo',
        email: 'parent@example.com',
        child_id: 'child-real-1',
        week_number: 1,
        session_id: 'plan-1',
        day: 'monday',
        time: '17:30',
        scheduled_at: '2026-04-20T17:30:00.000Z',
      }),
    });
    assert.equal(complete.status, 200);
    const payload = await complete.json();
    assert.equal(payload.ok, true);
    assert.equal(captured.day, 'monday');
    assert.equal(captured.time, '17:30');
    assert.equal(captured.scheduledAt, '2026-04-20T17:30:00.000Z');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('program commitment route rejects incomplete setup contract payloads', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    saveProgramCommitmentPlan: async () => ({ ok: true }),
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const commitment = await fetch(`${baseUrl}/api/youth-development/program/commitment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', email: 'parent@example.com', child_id: 'child-real-1', preferred_days: ['monday'] }),
    });
    assert.equal(commitment.status, 200);
    const payload = await commitment.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'commitment_setup_invalid');
    assert.ok(Array.isArray(payload.required_fields));
    assert.ok(payload.messages.includes('weekly_frequency_invalid'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('program commitment route rejects payloads with no preferred days selected', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    saveProgramCommitmentPlan: async () => ({ ok: true }),
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const commitment = await fetch(`${baseUrl}/api/youth-development/program/commitment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant: 'demo',
        email: 'parent@example.com',
        child_id: 'child-real-1',
        weekly_frequency: 3,
        preferred_days: [],
        preferred_time: '5:30 PM',
        session_length: 30,
        energy_type: 'balanced',
      }),
    });
    assert.equal(commitment.status, 200);
    const payload = await commitment.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'commitment_setup_invalid');
    assert.ok(payload.messages.includes('preferred_days_required'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('program commitment route accepts valid preferred_days payload and forwards normalized setup', async () => {
  const app = express();
  app.use(express.json());
  let captured = null;
  app.use(createYouthDevelopmentRouter({
    saveProgramCommitmentPlan: async ({ commitment }) => {
      captured = commitment;
      return { ok: true, commitment_setup_status: 'complete', planner_setup_required: false, scheduled_sessions: [{ session_id: 'plan-1' }] };
    },
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const commitment = await fetch(`${baseUrl}/api/youth-development/program/commitment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant: 'demo',
        email: 'parent@example.com',
        child_id: 'child-real-1',
        weekly_frequency: 3,
        preferred_days: ['Mon', 'wed', 'Friday'],
        preferred_time: '17:30:00',
        session_length: 30,
        energy_type: 'balanced',
        start_date: '2026-04-20',
      }),
    });
    assert.equal(commitment.status, 200);
    const payload = await commitment.json();
    assert.equal(payload.ok, true);
    assert.deepEqual(captured.preferred_days, ['monday', 'wednesday', 'friday']);
    assert.equal(captured.preferred_time, '5:30 PM');
    assert.equal(captured.preferred_time_window, '5:30 PM');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('program commitment route rejects malformed time window and invalid start date', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    saveProgramCommitmentPlan: async () => ({ ok: true }),
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const commitment = await fetch(`${baseUrl}/api/youth-development/program/commitment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant: 'demo',
        email: 'parent@example.com',
        child_id: 'child-real-1',
        weekly_frequency: 3,
        preferred_days: ['monday'],
        preferred_time_window: { start_time: '6:30 PM', end_time: '5:30 PM' },
        session_length: 30,
        energy_type: 'balanced',
        start_date: '2026-02-30',
      }),
    });
    assert.equal(commitment.status, 200);
    const payload = await commitment.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'commitment_setup_invalid');
    assert.ok(payload.messages.includes('preferred_time_window_invalid_range'));
    assert.ok(payload.messages.includes('start_date_invalid'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('program session-plan route surfaces scheduled session schema violations', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    saveProgramSessionPlan: async ({ payload }) => {
      const sessions = Array.isArray(payload.scheduled_sessions) ? payload.scheduled_sessions : [];
      const invalid = sessions.find((entry) => !entry.session_id || !entry.day || !entry.time);
      if (invalid) return { ok: false, error: 'scheduled_sessions_invalid', messages: ['scheduled_sessions[0].session_id_required'] };
      return { ok: true, scheduled_sessions: sessions };
    },
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const sessionPlan = await fetch(`${baseUrl}/api/youth-development/program/session-plan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant: 'demo',
        email: 'parent@example.com',
        child_id: 'child-real-1',
        week_number: 1,
        scheduled_sessions: [{ session_id: '', day: 'monday', time: '17:30', status: 'planned' }],
      }),
    });
    assert.equal(sessionPlan.status, 200);
    const payload = await sessionPlan.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'scheduled_sessions_invalid');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/youth-development/program/week-execution persists reflection/observation and supports resume progression controls', async () => {
  const app = express();
  app.use(express.json());
  let executionState = {
    week_status: 'not_started',
    completed_step_keys: [],
    active_step_index: 0,
    reflection_note: '',
    observation_note: '',
    reflection_saved: false,
    observation_saved: false,
    resume_ready: false,
    next_week_available: false,
  };
  app.use(createYouthDevelopmentRouter({
    saveProgramWeekExecution: async ({ actionType, stepKey, note }) => {
      if (actionType === 'start_week') executionState = { ...executionState, week_status: 'in_progress', resume_ready: true };
      if (actionType === 'save_reflection') executionState = { ...executionState, reflection_note: note, reflection_saved: true, resume_ready: true };
      if (actionType === 'save_observation') executionState = { ...executionState, observation_note: note, observation_saved: true, resume_ready: true };
      if (actionType === 'mark_step_complete') executionState = { ...executionState, completed_step_keys: [...new Set([...executionState.completed_step_keys, stepKey])] };
      if (executionState.completed_step_keys.length >= 4 && executionState.reflection_saved && executionState.observation_saved) {
        executionState = { ...executionState, week_status: 'completed', next_week_available: true };
      }
      return { ok: true, execution_state: executionState, bridge_state: { current_week: 1 } };
    },
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const start = await fetch(`${baseUrl}/api/youth-development/program/week-execution`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', email: 'parent@example.com', child_id: 'child-real-1', week_number: 1, action_type: 'start_week' }),
    });
    assert.equal(start.status, 200);
    const startPayload = await start.json();
    assert.equal(startPayload.execution_state.week_status, 'in_progress');
    assert.equal(startPayload.execution_state.resume_ready, true);

    const reflection = await fetch(`${baseUrl}/api/youth-development/program/week-execution`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', email: 'parent@example.com', child_id: 'child-real-1', week_number: 1, action_type: 'save_reflection', note: 'Reflection note saved.' }),
    });
    const reflectionPayload = await reflection.json();
    assert.equal(reflectionPayload.execution_state.reflection_saved, true);
    assert.equal(reflectionPayload.execution_state.reflection_note, 'Reflection note saved.');

    const observation = await fetch(`${baseUrl}/api/youth-development/program/week-execution`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', email: 'parent@example.com', child_id: 'child-real-1', week_number: 1, action_type: 'save_observation', note: 'Observation note saved.' }),
    });
    const observationPayload = await observation.json();
    assert.equal(observationPayload.execution_state.observation_saved, true);
    assert.equal(observationPayload.execution_state.observation_note, 'Observation note saved.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /api/youth-development/program/week-content enforces child scope for multi-child accounts', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    getProgramBridgeState: async () => ({ ok: true, launch_allowed: true, has_enrollment: true, current_week: 1 }),
    listYouthChildProfiles: async () => ([
      { child_id: 'child-a', child_name: 'A' },
      { child_id: 'child-b', child_name: 'B' },
    ]),
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/program/week-content?tenant=demo&email=parent@example.com`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.state, 'child_scope_required');
    assert.equal(Array.isArray(payload.child_scope_options), true);
    assert.equal(payload.child_scope_options.length, 2);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/youth-development/program/week-execution rejects invalid payloads with explicit contract errors', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    saveProgramWeekExecution: async () => ({ ok: true }),
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/program/week-execution`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', email: 'parent@example.com', child_id: 'child-real-1', week_number: 1, action_type: 'save_reflection' }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'week_execution_contract_invalid');
    assert.equal(Array.isArray(payload.messages), true);
    assert.match(payload.messages.join(' '), /note is required/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/youth-development/program/week-execution normalizes legacy continue_next_step action and keeps child scope', async () => {
  const app = express();
  app.use(express.json());
  let seenAction = null;
  let seenChild = null;
  app.use(createYouthDevelopmentRouter({
    saveProgramWeekExecution: async ({ actionType, childId }) => {
      seenAction = actionType;
      seenChild = childId;
      return { ok: true, execution_state: { week_status: 'in_progress' } };
    },
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/program/week-execution`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant: 'demo',
        email: 'parent@example.com',
        child_id: 'child-real-1',
        week_number: 1,
        action_type: 'continue_next_step',
      }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(seenAction, 'continue_to_next_step');
    assert.equal(seenChild, 'child-real-1');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/youth-development/program/week-execution validates and forwards newly contracted high-risk actions', async () => {
  const app = express();
  app.use(express.json());
  let seenAction = null;
  let seenPayload = null;
  app.use(createYouthDevelopmentRouter({
    saveProgramWeekExecution: async ({ actionType, actionPayload }) => {
      seenAction = actionType;
      seenPayload = actionPayload;
      return { ok: true, execution_state: { week_status: 'in_progress' } };
    },
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/program/week-execution`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant: 'demo',
        email: 'parent@example.com',
        child_id: 'child-real-1',
        week_number: 1,
        action_type: 'route_external_support',
        support_channel: 'Phone',
        destination_team: 'Crisis_Response',
        routing_reason: 'Immediate follow up needed',
        urgency_level: 'Urgent',
      }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(seenAction, 'route_external_support');
    assert.equal(seenPayload.support_channel, 'phone');
    assert.equal(seenPayload.destination_team, 'crisis_response');
    assert.equal(seenPayload.urgency_level, 'urgent');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/youth-development/program/week-execution rejects incomplete newly contracted side-effect actions', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    saveProgramWeekExecution: async () => ({ ok: true }),
  }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/program/week-execution`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant: 'demo',
        email: 'parent@example.com',
        child_id: 'child-real-1',
        week_number: 1,
        action_type: 'create_case_profile',
      }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'week_execution_contract_invalid');
    assert.match(payload.messages.join(' '), /case_profile_type is required/);
    assert.match(payload.messages.join(' '), /initiated_by is required/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /api/youth-development/program/week-execution/audit returns coverage summary and unresolved observed actions', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({}));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/program/week-execution/audit?observed_actions=unknown_route_action`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.audit.contracted_count >= 10, true);
    assert.equal(payload.audit.aliases_count >= 1, true);
    assert.equal(payload.audit.uncontracted_count >= 1, true);
    assert.equal(Array.isArray(payload.audit.highest_risk_remaining_gaps), true);
    assert.equal(
      payload.audit.highest_risk_remaining_gaps.some((entry) => entry.action_type === 'unknown_route_action'),
      true
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /api/youth-development/program/connectivity-audit returns major parent/program controls and statuses', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({}));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/program/connectivity-audit`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.contract, 'parent_program_connectivity_audit_v1');
    assert.ok(payload.totals.controls >= 21);
    const labels = payload.controls.map((entry) => entry.label);
    assert.ok(labels.includes('Build Your Weekly Plan'));
    assert.ok(labels.includes('Preferred Days Selector'));
    assert.ok(labels.includes('Setup Required Message'));
    assert.ok(labels.includes('No Sessions Yet Message'));
    assert.ok(labels.includes('Lesson Plan Empty State'));
    assert.ok(labels.includes('Progress Empty State'));
    assert.ok(labels.includes('Start Today’s Session'));
    assert.ok(labels.includes('Resume Session'));
    assert.ok(labels.includes('Save Reflection'));
    assert.ok(labels.includes('Continue Next Week'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
