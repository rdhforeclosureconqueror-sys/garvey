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

function buildAnswers(valueByQuestion = () => 1) {
  return Object.fromEntries(YOUTH_QUESTION_BANK.map((question) => [question.id, valueByQuestion(question)]));
}

test('GET /api/youth-development/questions returns deterministic question bank contract', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/questions`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.question_count, YOUTH_QUESTION_BANK.length);
    assert.ok(payload.question_count >= 20 && payload.question_count <= 30);

    for (const question of payload.questions) {
      assert.match(question.id, /^Q\d+$/);
      assert.ok(['focus', 'emotional_regulation', 'social', 'discipline', 'confidence'].includes(question.category));
      assert.equal(question.answers.length, 4);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/youth-development/assess completes full intake pipeline and returns renderer payload', async () => {
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
    assert.equal(payload.answers_count, YOUTH_QUESTION_BANK.length);
    assert.equal(payload.flow.completed, true);
    assert.ok(Array.isArray(payload.aggregated_trait_rows));
    assert.equal(typeof payload.rendered_html, 'string');
    assert.match(payload.rendered_html, /Parent insight narrative/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/youth-development/assess yields deterministic differences for low/high/mixed edge cases', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const lowResponse = await fetch(`${baseUrl}/api/youth-development/assess`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: buildAnswers(() => 1) }),
    });
    const highResponse = await fetch(`${baseUrl}/api/youth-development/assess`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: buildAnswers(() => 4) }),
    });
    const mixedResponse = await fetch(`${baseUrl}/api/youth-development/assess`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        answers: buildAnswers((question) => {
          if (question.category === 'confidence') return 4;
          if (question.category === 'emotional_regulation') return 1;
          return 2;
        }),
      }),
    });

    assert.equal(lowResponse.status, 200);
    assert.equal(highResponse.status, 200);
    assert.equal(mixedResponse.status, 200);

    const lowPayload = await lowResponse.json();
    const highPayload = await highResponse.json();
    const mixedPayload = await mixedResponse.json();

    assert.notEqual(
      lowPayload.page_model.insight_narrative.opening,
      highPayload.page_model.insight_narrative.opening,
      'narrative opening should vary by input set'
    );
    assert.notEqual(
      lowPayload.page_model.insight_narrative.next_step,
      mixedPayload.page_model.insight_narrative.next_step,
      'narrative conflict sentence should vary for mixed conflict profile'
    );

    const lowTop = lowPayload.interpretation.highest_trait.current_score;
    const highTop = highPayload.interpretation.highest_trait.current_score;
    assert.ok(highTop > lowTop, 'all-high answers should increase top trait score');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
