const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

const { createArchetypeEnginesRouter } = require('../../server/archetypeEnginesRoutes');
const { LOVE_QUESTIONS, scoreLoveAssessment, computeLoveCompatibility } = require('../../server/archetypeEnginesService');

function createMockPool() {
  const state = { results: new Map() };
  return {
    async query(sql, params = []) {
      const normalized = String(sql).replace(/\s+/g, ' ').trim();
      if (normalized.startsWith('INSERT INTO engine_results')) {
        state.results.set(params[0], {
          result_id: params[0],
          assessment_id: params[1],
          engine_type: params[2],
          tenant_slug: params[3],
          result_payload: JSON.parse(params[4]),
          created_at: new Date().toISOString(),
        });
      }
      if (normalized.startsWith('SELECT result_id') && normalized.includes('FROM engine_results')) {
        const row = state.results.get(params[0]);
        return { rows: row ? [row] : [] };
      }
      return { rows: [] };
    },
  };
}

async function startServer(pool) {
  const app = express();
  app.use(express.json());
  app.use('/api/archetype-engines', createArchetypeEnginesRouter({ pool }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  return { server, baseUrl: `http://127.0.0.1:${addr.port}` };
}

test('love bank contains 75 questions', () => {
  assert.equal(LOVE_QUESTIONS.length, 75);
});

test('love scoring returns primary and secondary archetypes', () => {
  const answers = Object.fromEntries(LOVE_QUESTIONS.map((q, i) => [q.id, ((i % 5) + 1)]));
  const scored = scoreLoveAssessment(answers);
  assert.equal(scored.questionCount, 75);
  assert.ok(scored.primaryArchetype?.code);
  assert.ok(scored.secondaryArchetype?.code);
  assert.ok(['balanced', 'stretched', 'polarized'].includes(scored.balanceState));
});

test('compatibility scoring returns bounded score', () => {
  const base = scoreLoveAssessment({});
  const other = scoreLoveAssessment(Object.fromEntries(LOVE_QUESTIONS.map((q) => [q.id, 5])));
  const compat = computeLoveCompatibility(base, other);
  assert.ok(compat.compatibility >= 0 && compat.compatibility <= 100);
});

test('route contract: archetype listing and love score flow', async () => {
  const { server, baseUrl } = await startServer(createMockPool());
  try {
    const listRes = await fetch(`${baseUrl}/api/archetype-engines/love/archetypes?tenant=demo`);
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    assert.equal(Array.isArray(listJson.archetypes), true);

    const startRes = await fetch(`${baseUrl}/api/archetype-engines/love/assessment/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo' }),
    });
    assert.equal(startRes.status, 200);
    const startJson = await startRes.json();
    assert.ok(startJson.assessmentId);

    const answers = Object.fromEntries(LOVE_QUESTIONS.map((q) => [q.id, 4]));
    const scoreRes = await fetch(`${baseUrl}/api/archetype-engines/love/assessment/score`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', assessmentId: startJson.assessmentId, answers }),
    });
    assert.equal(scoreRes.status, 200);
    const scoreJson = await scoreRes.json();
    assert.ok(scoreJson.resultId);

    const fetchResultRes = await fetch(`${baseUrl}/api/archetype-engines/love/results/${scoreJson.resultId}`);
    assert.equal(fetchResultRes.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('leadership and loyalty scoring endpoints stay scaffold-only', async () => {
  const { server, baseUrl } = await startServer(createMockPool());
  try {
    const leadershipScore = await fetch(`${baseUrl}/api/archetype-engines/leadership/assessment/score`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(leadershipScore.status, 409);

    const loyaltyStart = await fetch(`${baseUrl}/api/archetype-engines/loyalty/assessment/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(loyaltyStart.status, 202);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
