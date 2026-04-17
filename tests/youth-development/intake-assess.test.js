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
