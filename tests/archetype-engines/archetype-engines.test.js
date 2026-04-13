const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

const { createArchetypeEnginesRouter } = require('../../server/archetypeEnginesRoutes');
const {
  LOVE_QUESTIONS,
  LEADERSHIP_QUESTIONS,
  LOYALTY_QUESTIONS,
  scoreLoveAssessment,
  scoreEngineAssessment,
  computeLoveCompatibility,
} = require('../../server/archetypeEnginesService');

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
        return { rows: row && row.engine_type === params[1] ? [row] : [] };
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

test('leadership and loyalty banks load as three active banks', () => {
  assert.equal(LEADERSHIP_QUESTIONS.length > 0, true);
  assert.equal(LOYALTY_QUESTIONS.length > 0, true);
  assert.equal(new Set(LEADERSHIP_QUESTIONS.map((q) => q.bankId)).size, 3);
  assert.equal(new Set(LOYALTY_QUESTIONS.map((q) => q.bankId)).size, 3);
});

test('love scoring returns primary and secondary archetypes', () => {
  const answers = Object.fromEntries(LOVE_QUESTIONS.map((q, i) => [q.id, ((i % 5) + 1)]));
  const scored = scoreLoveAssessment(answers);
  assert.equal(scored.questionCount, 75);
  assert.ok(scored.primaryArchetype?.code);
  assert.ok(scored.secondaryArchetype?.code);
  assert.ok(['balanced', 'stretched', 'polarized'].includes(scored.balanceState));
});

test('leadership scoring returns normalized scores and hybrid logic fields', () => {
  const answers = Object.fromEntries(LEADERSHIP_QUESTIONS.map((q) => [q.id, 'c']));
  const scored = scoreEngineAssessment('leadership', answers);
  assert.ok(scored.normalizedScores);
  assert.ok(scored.primaryArchetype?.code);
  assert.ok(scored.secondaryArchetype?.code);
  assert.ok(scored.balanceStates?.overall);
  assert.ok(scored.desiredCurrentGap);
  assert.ok(scored.contradictionConsistency);
  assert.ok(scored.identityBehaviorGap);
  assert.ok(scored.stressProfile);
});

test('loyalty scoring returns normalized scores and hybrid logic fields', () => {
  const answers = Object.fromEntries(LOYALTY_QUESTIONS.map((q) => [q.id, 'b']));
  const scored = scoreEngineAssessment('loyalty', answers);
  assert.ok(scored.normalizedScores);
  assert.ok(scored.primaryArchetype?.code);
  assert.ok(scored.secondaryArchetype?.code);
  assert.ok(scored.balanceStates?.overall);
  assert.ok(scored.desiredCurrentGap);
  assert.ok(scored.contradictionConsistency);
  assert.ok(scored.identityBehaviorGap);
  assert.ok(scored.stressProfile);
});

test('compatibility scoring returns bounded score', () => {
  const base = scoreLoveAssessment({});
  const other = scoreLoveAssessment(Object.fromEntries(LOVE_QUESTIONS.map((q) => [q.id, 5])));
  const compat = computeLoveCompatibility(base, other);
  assert.ok(compat.compatibility >= 0 && compat.compatibility <= 100);
});

test('route contracts: leadership and loyalty full assessment flows are live', async () => {
  const { server, baseUrl } = await startServer(createMockPool());
  try {
    for (const engineType of ['leadership', 'loyalty']) {
      const listRes = await fetch(`${baseUrl}/api/archetype-engines/${engineType}/archetypes?tenant=demo`);
      assert.equal(listRes.status, 200);

      const startRes = await fetch(`${baseUrl}/api/archetype-engines/${engineType}/assessment/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenant: 'demo' }),
      });
      assert.equal(startRes.status, 200);
      const startJson = await startRes.json();
      assert.ok(startJson.assessmentId);
      assert.equal(Object.keys(startJson.questionBanks).length, 3);

      const answers = Object.fromEntries(
        Object.values(startJson.questionBanks)
          .flat()
          .map((q) => [q.id, 'd'])
      );

      const scoreRes = await fetch(`${baseUrl}/api/archetype-engines/${engineType}/assessment/score`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenant: 'demo', assessmentId: startJson.assessmentId, answers }),
      });
      assert.equal(scoreRes.status, 200);
      const scoreJson = await scoreRes.json();
      assert.ok(scoreJson.resultId);
      assert.ok(scoreJson.normalizedScores);

      const fetchResultRes = await fetch(`${baseUrl}/api/archetype-engines/${engineType}/results/${scoreJson.resultId}`);
      assert.equal(fetchResultRes.status, 200);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('no regression: love routes remain live', async () => {
  const { server, baseUrl } = await startServer(createMockPool());
  try {
    const startRes = await fetch(`${baseUrl}/api/archetype-engines/love/assessment/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo' }),
    });
    assert.equal(startRes.status, 200);
    const startJson = await startRes.json();

    const answers = Object.fromEntries(LOVE_QUESTIONS.map((q) => [q.id, 4]));
    const scoreRes = await fetch(`${baseUrl}/api/archetype-engines/love/assessment/score`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', assessmentId: startJson.assessmentId, answers }),
    });
    assert.equal(scoreRes.status, 200);

    const registryRes = await fetch(`${baseUrl}/api/archetype-engines/registry`);
    assert.equal(registryRes.status, 200);
    const registryJson = await registryRes.json();
    assert.equal(registryJson.engines.love.status, 'live');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
