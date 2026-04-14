const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const express = require('express');
const http = require('http');

const { createArchetypeEnginesRouter } = require('../../server/archetypeEnginesRoutes');
const {
  LOVE_QUESTIONS,
  LEADERSHIP_QUESTIONS,
  LOYALTY_QUESTIONS,
  getQuestionBanks,
  scoreLoveAssessment,
  scoreEngineAssessment,
  computeLoveCompatibility,
} = require('../../server/archetypeEnginesService');

function createMockPool() {
  const state = { results: new Map(), consents: new Map() };
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
      if (normalized.startsWith('INSERT INTO engine_assessment_consents')) {
        state.consents.set(params[0], { id: params[0], engine_type: params[1], tenant_slug: params[2], accepted: params[7] === true });
      }
      if (normalized.startsWith('SELECT id FROM engine_assessment_consents')) {
        const row = state.consents.get(params[0]);
        return { rows: row && row.engine_type === params[1] && row.tenant_slug === params[2] && row.accepted ? [row] : [] };
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
  const byBank = LOVE_QUESTIONS.reduce((acc, q) => {
    const bankId = q.bankId || q.bank_id;
    acc[bankId] = (acc[bankId] || 0) + 1;
    return acc;
  }, {});
  assert.deepEqual(byBank, { BANK_1: 25, BANK_2: 25, BANK_3: 25 });
});

test('love questions keep canonical option/archetype contract', () => {
  const validArchetypes = new Set(['RS', 'AL', 'EC', 'AV', 'ES']);
  const signalByPrimary = {
    RS: 'closeness_seeking',
    AL: 'distance_regulation',
    EC: 'verbal_repair',
    AV: 'proof_based_trust',
    ES: 'novelty_activation',
  };
  for (const question of LOVE_QUESTIONS) {
    assert.equal((question.options || []).length, 4);
    for (const option of (question.options || [])) {
      assert.equal(validArchetypes.has(option.primary || option.primary_archetype), true);
      assert.equal(validArchetypes.has(option.secondary || option.secondary_archetype), true);
      assert.equal(option.signal_type || option.signalType, signalByPrimary[option.primary || option.primary_archetype]);
    }
  }
});

test('leadership and loyalty banks load as three active banks', () => {
  assert.equal(LEADERSHIP_QUESTIONS.length > 0, true);
  assert.equal(LOYALTY_QUESTIONS.length > 0, true);
  assert.equal(new Set(LEADERSHIP_QUESTIONS.map((q) => q.bankId)).size, 3);
  assert.equal(new Set(LOYALTY_QUESTIONS.map((q) => q.bankId)).size, 3);
});

test('love scoring returns primary and secondary archetypes', () => {
  const answers = Object.fromEntries(LOVE_QUESTIONS.map((q, i) => [q.id || q.question_id, ((i % 5) + 1)]));
  const scored = scoreLoveAssessment(answers);
  assert.equal(scored.questionCount, 75);
  assert.ok(scored.primaryArchetype?.code);
  assert.ok(scored.secondaryArchetype?.code);
  assert.ok(scored.balanceStates?.overall);
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
  assert.ok(scored.primaryInsight);
  assert.ok(scored.secondaryInsight);
  assert.ok(scored.balanceInsight);
  assert.ok(scored.stressInsight);
  assert.ok(scored.identityGapInsight);
  assert.ok(scored.consistencyInsight);
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
  assert.ok(scored.primaryInsight);
  assert.ok(scored.secondaryInsight);
  assert.ok(scored.balanceInsight);
  assert.ok(scored.stressInsight);
  assert.ok(scored.identityGapInsight);
  assert.ok(scored.consistencyInsight);
});

test('compatibility scoring returns bounded score', () => {
  const base = scoreLoveAssessment({});
  const other = scoreLoveAssessment(Object.fromEntries(LOVE_QUESTIONS.map((q) => [q.id || q.question_id, 5])));
  const compat = computeLoveCompatibility(base, other);
  assert.ok(compat.compatibility >= 0 && compat.compatibility <= 100);
});

test('route contracts: leadership and loyalty full assessment flows are live', async () => {
  const { server, baseUrl } = await startServer(createMockPool());
  try {
    for (const engineType of ['leadership', 'loyalty']) {
      const listRes = await fetch(`${baseUrl}/api/archetype-engines/${engineType}/archetypes?tenant=demo`);
      assert.equal(listRes.status, 200);
      const listJson = await listRes.json();
      assert.ok(listJson.archetypes[0].shortDescription);
      assert.ok(listJson.archetypes[0].coreTrait);

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
      assert.ok(scoreJson.primaryInsight);
      assert.ok(scoreJson.secondaryInsight);
      assert.ok(scoreJson.balanceInsight);
      assert.ok(scoreJson.stressInsight);
      assert.ok(scoreJson.identityGapInsight);
      assert.ok(scoreJson.consistencyInsight);

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
    const blockedStartRes = await fetch(`${baseUrl}/api/archetype-engines/love/assessment/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo' }),
    });
    assert.equal(blockedStartRes.status, 403);
    const blockedStartJson = await blockedStartRes.json();
    assert.equal(blockedStartJson.error, 'consent_required_before_assessment');

    const consentRes = await fetch(`${baseUrl}/api/archetype-engines/love/assessment/consent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', email: 'test@example.com', name: 'Test User', accepted: true, consent_version: 'v1' }),
    });
    assert.equal(consentRes.status, 200);
    const consentJson = await consentRes.json();

    const startRes = await fetch(`${baseUrl}/api/archetype-engines/love/assessment/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', consent_id: consentJson.consent_id }),
    });
    assert.equal(startRes.status, 200);
    const startJson = await startRes.json();
    assert.equal(startJson.questionBanks.activeQuestions[0].id, 'B1_Q01');
    assert.equal(startJson.questionBanks.activeQuestions[0].prompt, 'When someone you care about becomes less responsive:');
    assert.equal(startJson.questionBanks.activeQuestions.length, 25);
    assert.equal(startJson.questionBanks.selectedBankId, 'BANK_1');
    assert.equal(startJson.questionBanks.activeQuestions.at(-1).id, 'B1_Q25');

    const answers = Object.fromEntries(LOVE_QUESTIONS.map((q) => [q.id || q.question_id, 4]));
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

test('love bank rotation and progression returns canonical first questions by retake attempt', () => {
  for (const [retakeAttempt, expectedBank, expectedFirstId] of [[0, 'BANK_1', 'B1_Q01'], [1, 'BANK_2', 'B2_Q01'], [2, 'BANK_3', 'B3_Q01']]) {
    const banks = getQuestionBanks('love', { retakeAttempt });
    assert.equal(banks.selectedBankId, expectedBank);
    assert.equal(banks.activeQuestions.length, 25);
    assert.equal(banks.activeQuestions[0].id, expectedFirstId);
    assert.match(banks.activeQuestions.at(-1).id, /^B[1-3]_Q25$/);
  }
});

test('love archetype registry uses canonical names for code mapping', async () => {
  const { server, baseUrl } = await startServer(createMockPool());
  try {
    const listRes = await fetch(`${baseUrl}/api/archetype-engines/love/archetypes?tenant=demo`);
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    const byCode = Object.fromEntries((listJson.archetypes || []).map((a) => [a.code, a]));

    assert.equal(byCode.RS?.name, 'Reassurance Seeker');
    assert.equal(byCode.AL?.name, 'Autonomous Lover');
    assert.equal(byCode.EC?.name, 'Expression Connector');
    assert.equal(byCode.AV?.name, 'Action Validator');
    assert.equal(byCode.ES?.name, 'Experience Seeker');

    assert.notEqual(byCode.RS?.name, 'The Anchor');
    assert.notEqual(byCode.AL?.name, 'The Sovereign');
    assert.notEqual(byCode.EC?.name, 'The Messenger');
    assert.notEqual(byCode.AV?.name, 'The Builder');
    assert.notEqual(byCode.ES?.name, 'The Spark');

    assert.equal(byCode.RS?.slug, 'reassurance-seeker');
    assert.equal(byCode.AL?.slug, 'autonomous-lover');
    assert.equal(byCode.EC?.slug, 'expression-connector');
    assert.equal(byCode.AV?.slug, 'action-validator');
    assert.equal(byCode.ES?.slug, 'experience-seeker');

    assert.equal(byCode.RS?.imageKey, 'love-rs');
    assert.equal(byCode.AL?.imageKey, 'love-al');
    assert.equal(byCode.EC?.imageKey, 'love-ec');
    assert.equal(byCode.AV?.imageKey, 'love-av');
    assert.equal(byCode.ES?.imageKey, 'love-es');

    for (const archetype of Object.values(byCode)) {
      assert.notEqual(archetype?.slug, 'anchor');
      assert.notEqual(archetype?.slug, 'spark');
      assert.notEqual(archetype?.slug, 'mirror');
      assert.notEqual(archetype?.slug, 'builder');
      assert.notEqual(archetype?.slug, 'wave');
      assert.ok(!['love-anchor', 'love-spark', 'love-mirror', 'love-builder', 'love-wave'].includes(archetype?.imageKey));
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('love result renderer ships canonical name map', () => {
  const source = fs.readFileSync('public/archetype-engines/experience.js', 'utf8');
  assert.match(source, /LOVE_CANONICAL_LABELS/);
  assert.match(source, /browse\|assessment/);
  assert.match(source, /route\.mode === "assessment"/);
  assert.match(source, /RS:\s*"Reassurance Seeker"/);
  assert.match(source, /AL:\s*"Autonomous Lover"/);
  assert.match(source, /EC:\s*"Expression Connector"/);
  assert.match(source, /AV:\s*"Action Validator"/);
  assert.match(source, /ES:\s*"Experience Seeker"/);
});

test('experience routes keep browse and add assessment entry route', () => {
  const source = fs.readFileSync('server/index.js', 'utf8');
  assert.match(source, /app\.get\("\/archetype-engines\/:engine\/browse"/);
  assert.match(source, /app\.get\("\/archetype-engines\/:engine\/assessment"/);
});
