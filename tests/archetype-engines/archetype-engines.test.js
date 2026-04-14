const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const express = require('express');
const http = require('http');

const { createArchetypeEnginesRouter } = require('../../server/archetypeEnginesRoutes');
const {
  LOVE_QUESTIONS,
  LOVE_QUESTION_SOURCE,
  LEADERSHIP_QUESTIONS,
  LOYALTY_QUESTIONS,
  getQuestionBanks,
  scoreLoveAssessment,
  scoreEngineAssessment,
  computeLoveCompatibility,
} = require('../../server/archetypeEnginesService');

function createMockPool() {
  const state = { results: new Map(), consents: new Map(), assessments: new Map(), pageViews: [] };
  return {
    state,
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
        state.consents.set(params[0], { id: params[0], engine_type: params[1], tenant_slug: params[2], email: params[3], accepted: params[7] === true });
      }
      if (normalized.startsWith('INSERT INTO engine_assessments')) {
        state.assessments.set(params[0], {
          id: params[0],
          engine_type: params[1],
          tenant_slug: params[2],
          session_id: params[3],
          user_id: params[4],
          campaign_context: params[5],
        });
      }
      if (normalized.startsWith('INSERT INTO engine_page_views')) {
        state.pageViews.push({
          id: params[0],
          engine_type: params[1],
          tenant_slug: params[2],
          page_key: params[3],
          session_id: params[4],
          user_id: params[5],
          campaign_context: params[6],
        });
      }
      if (normalized.startsWith('SELECT id FROM engine_assessment_consents')) {
        const row = state.consents.get(params[0]);
        return { rows: row && row.engine_type === params[1] && row.tenant_slug === params[2] && row.accepted ? [row] : [] };
      }

      if (normalized.startsWith('SELECT COUNT(*)::int AS completed_count')) {
        const completed = Array.from(state.results.values()).filter((row) => {
          const asmt = state.assessments.get(row.assessment_id);
          return asmt && asmt.engine_type === 'love' && asmt.tenant_slug === params[0] && asmt.user_id === params[1];
        }).length;
        return { rows: [{ completed_count: completed }] };
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

test('love bank loads from approved source while preserving 25-question bank shape', () => {
  assert.ok(LOVE_QUESTIONS.length >= 25);
  assert.equal(LOVE_QUESTIONS.length % 25, 0);
  const byBank = LOVE_QUESTIONS.reduce((acc, q) => {
    const bankId = q.bankId || q.bank_id;
    acc[bankId] = (acc[bankId] || 0) + 1;
    return acc;
  }, {});
  for (const count of Object.values(byBank)) assert.equal(count, 25);
  assert.equal(LOVE_QUESTION_SOURCE.authored.sourceType, 'authored_bank_1');
});

test('love questions keep canonical option/archetype contract', () => {
  const validArchetypes = new Set(['RS', 'AL', 'EC', 'AV', 'ES']);
  for (const question of LOVE_QUESTIONS) {
    assert.equal((question.options || []).length, 4);
    for (const option of (question.options || [])) {
      assert.equal(validArchetypes.has(option.primary || option.primary_archetype), true);
      assert.equal(validArchetypes.has(option.secondary || option.secondary_archetype), true);
      assert.equal(typeof (option.signal_type || option.signalType), 'string');
      assert.ok((option.signal_type || option.signalType).length > 3);
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
  assert.equal(scored.questionCount, LOVE_QUESTIONS.length);
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
    assert.equal(startJson.questionSource, 'authored_bank_1');
    assert.equal(startJson.useGeneratorOnFirstAttempt, false);
    assert.ok(startJson.questionBanks.activeQuestions[0].id);
    assert.ok(startJson.questionBanks.activeQuestions[0].prompt);
    assert.equal(startJson.questionBanks.activeQuestions.length, 25);
    assert.equal(startJson.questionBanks.selectedBankId, startJson.questionBanks.activeQuestions[0].bankId);
    assert.ok(startJson.questionBanks.activeQuestions.at(-1).id);

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

test('love first attempt uses authored bank and retake uses generated validated bank only', () => {
  const first = getQuestionBanks('love', { retakeAttempt: 0 });
  assert.equal(first.questionSource, 'authored_bank_1');
  assert.equal(first.selectedBankId, 'AUTHORED_BANK_1');
  assert.equal(first.activeQuestions.length, 25);

  const retake = getQuestionBanks('love', { retakeAttempt: 1 });
  assert.equal(retake.questionSource, 'generated_validated_bank');
  if (retake.generatedBankAvailable) {
    assert.equal(retake.activeQuestions.length, 25);
    assert.ok(retake.selectedBankId);
  } else {
    assert.equal(retake.activeQuestions.length, 0);
  }
});

test('love retake isolation uses generated-only source and never falls back to authored bank', async () => {
  const { server, baseUrl } = await startServer(createMockPool());
  try {
    const consentRes = await fetch(`${baseUrl}/api/archetype-engines/love/assessment/consent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', email: 'retake@example.com', name: 'Retake User', accepted: true, consent_version: 'v1' }),
    });
    assert.equal(consentRes.status, 200);
    const consentJson = await consentRes.json();

    const firstStartRes = await fetch(`${baseUrl}/api/archetype-engines/love/assessment/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', user_id: 'retake-user-1', consent_id: consentJson.consent_id }),
    });
    assert.equal(firstStartRes.status, 200);
    const firstStartJson = await firstStartRes.json();
    assert.equal(firstStartJson.questionSource, 'authored_bank_1');
    assert.equal(firstStartJson.useGeneratorOnFirstAttempt, false);
    assert.equal(firstStartJson.questionBanks.selectedBankId, 'AUTHORED_BANK_1');

    const firstAnswers = Object.fromEntries(firstStartJson.questionBanks.activeQuestions.map((q) => [q.id, 3]));
    const firstScoreRes = await fetch(`${baseUrl}/api/archetype-engines/love/assessment/score`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', assessmentId: firstStartJson.assessmentId, answers: firstAnswers }),
    });
    assert.equal(firstScoreRes.status, 200);

    const secondStartRes = await fetch(`${baseUrl}/api/archetype-engines/love/assessment/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', user_id: 'retake-user-1', consent_id: consentJson.consent_id }),
    });

    if (secondStartRes.status === 409) {
      const secondStartErr = await secondStartRes.json();
      assert.equal(secondStartErr.error, 'generated_retake_bank_unavailable');
      assert.equal(secondStartErr.questionSource, 'generated_validated_bank');
    } else {
      assert.equal(secondStartRes.status, 200);
      const secondStartJson = await secondStartRes.json();
      assert.equal(secondStartJson.questionSource, 'generated_validated_bank');
      assert.equal(secondStartJson.useGeneratorOnFirstAttempt, false);
      assert.notEqual(secondStartJson.questionBanks.selectedBankId, 'AUTHORED_BANK_1');
      assert.equal(secondStartJson.questionBanks.activeQuestions.length, 25);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
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
    assert.equal(byCode.RS?.imageVariants?.masculine, '/archetype-card/love/Reassurance_Seeker_God.png');
    assert.equal(byCode.RS?.imageVariants?.feminine, '/archetype-card/love/Reassurance_Seeker_Goddess.png');
    assert.equal(byCode.AL?.imageVariants?.masculine, '/archetype-card/love/Autonomous_Lover_God.png');
    assert.equal(byCode.AL?.imageVariants?.feminine, '/archetype-card/love/Autonomous_Lover_Goddess.png');
    assert.equal(byCode.EC?.imageVariants?.masculine, '/archetype-card/love/Expression_Connector_God.png');
    assert.equal(byCode.EC?.imageVariants?.feminine, '/archetype-card/love/Expression_Connector_Goddess.png');
    assert.equal(byCode.AV?.imageVariants?.masculine, '/archetype-card/love/Action_Validator_God.png');
    assert.equal(byCode.AV?.imageVariants?.feminine, '/archetype-card/love/Action_Validator_Goddess.png');
    assert.equal(byCode.ES?.imageVariants?.masculine, '/archetype-card/love/Experiance_Seeker_God.png');
    assert.equal(byCode.ES?.imageVariants?.feminine, '/archetype-card/love/Experience_Seeker_goddess.png');

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
  assert.match(source, /parts\[4\] === "story"/);
  assert.match(source, /route\.mode === "assessment"/);
  assert.match(source, /RS:\s*"Reassurance Seeker"/);
  assert.match(source, /AL:\s*"Autonomous Lover"/);
  assert.match(source, /EC:\s*"Expression Connector"/);
  assert.match(source, /AV:\s*"Action Validator"/);
  assert.match(source, /ES:\s*"Experience Seeker"/);
  assert.match(source, /LOVE_IMAGE_VARIANT_KEY/);
  assert.match(source, /data-love-variant-toggle/);
  assert.match(source, /window\.localStorage\.getItem/);
});

test('assessment ui renders tappable radio options and supports progression', () => {
  const source = fs.readFileSync('public/archetype-engines/experience.js', 'utf8');
  assert.match(source, /type="radio"/);
  assert.match(source, /<label class="answer-option/);
  assert.match(source, /name="question-\$\{esc\(q\.id\)\}"/);
  assert.match(source, /id="assessmentNext"/);
  assert.match(source, /assessment\/score/);
});

test('experience routes keep browse and add assessment entry route', () => {
  const source = fs.readFileSync('server/index.js', 'utf8');
  assert.match(source, /app\.get\("\/archetype-engines\/:engine\/browse"/);
  assert.match(source, /app\.get\("\/archetype-engines\/:engine\/assessment"/);
});

test('archetype routes preserve tap and return attribution context through start and result events', async () => {
  const pool = createMockPool();
  const { server, baseUrl } = await startServer(pool);
  try {
    const archetypeRes = await fetch(`${baseUrl}/api/archetype-engines/leadership/archetypes?tenant=demo&cid=camp-1&rid=rid-1&tap_source=tap&source_type=qr&route_mode=assessment`);
    assert.equal(archetypeRes.status, 200);

    const startRes = await fetch(`${baseUrl}/api/archetype-engines/leadership/assessment/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant: 'demo',
        campaign: 'camp-1',
        rid: 'rid-1',
        tap_source: 'tap',
        source_type: 'qr',
        tap_session: 'tap-sess-9',
      }),
    });
    assert.equal(startRes.status, 200);
    const startJson = await startRes.json();
    const answers = Object.fromEntries(Object.values(startJson.questionBanks).flat().map((q) => [q.id, 'a']));

    const scoreRes = await fetch(`${baseUrl}/api/archetype-engines/leadership/assessment/score`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant: 'demo',
        assessmentId: startJson.assessmentId,
        answers,
        campaign: 'camp-1',
        rid: 'rid-1',
        source_type: 'qr',
      }),
    });
    assert.equal(scoreRes.status, 200);
    const scoreJson = await scoreRes.json();

    const resultRes = await fetch(`${baseUrl}/api/archetype-engines/leadership/results/${scoreJson.resultId}?tenant=demo&source_type=qr&tap_source=tap`);
    assert.equal(resultRes.status, 200);

    const assessment = pool.state.assessments.get(startJson.assessmentId);
    assert.equal(assessment.tenant_slug, 'demo');
    const startContext = JSON.parse(assessment.campaign_context);
    assert.equal(startContext.campaign, 'camp-1');
    assert.equal(startContext.rid, 'rid-1');
    assert.equal(startContext.tap_source, 'tap');
    assert.equal(startContext.source_type, 'qr');

    const completionEvent = pool.state.pageViews.find((row) => row.page_key === 'assessment_completed');
    assert.ok(completionEvent);
    const completionContext = JSON.parse(completionEvent.campaign_context);
    assert.equal(completionContext.result_id, scoreJson.resultId);
    assert.equal(completionContext.assessment_id, startJson.assessmentId);
    assert.equal(completionContext.source_path, 'qr');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('love consent submit infers name from email when entry context omits explicit name', async () => {
  const { server, baseUrl } = await startServer(createMockPool());
  try {
    const consentRes = await fetch(`${baseUrl}/api/archetype-engines/love/assessment/consent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', email: 'alex.rivera@example.com', accepted: true, consent_version: 'v1' }),
    });
    assert.equal(consentRes.status, 200);
    const consentJson = await consentRes.json();
    assert.ok(consentJson.consent_id);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('love assessment attribution continuity survives qr and tap entry contexts through completion', async () => {
  const pool = createMockPool();
  const { server, baseUrl } = await startServer(pool);
  try {
    const runFlow = async ({ tenant, email, sourceType, tapSource, cid, rid, tapSession }) => {
      const consentRes = await fetch(`${baseUrl}/api/archetype-engines/love/assessment/consent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenant,
          email,
          accepted: true,
          source_type: sourceType,
          tap_source: tapSource,
          cid,
          rid,
          tap_session: tapSession,
        }),
      });
      assert.equal(consentRes.status, 200);
      const consent = await consentRes.json();

      const startRes = await fetch(`${baseUrl}/api/archetype-engines/love/assessment/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenant,
          consent_id: consent.consent_id,
          source_type: sourceType,
          tap_source: tapSource,
          cid,
          rid,
          tap_session: tapSession,
        }),
      });
      assert.equal(startRes.status, 200);
      const start = await startRes.json();
      const answers = Object.fromEntries((start.questionBanks.activeQuestions || []).map((q, i) => [q.id, (i % 4) + 1]));
      const scoreRes = await fetch(`${baseUrl}/api/archetype-engines/love/assessment/score`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenant, assessmentId: start.assessmentId, answers, source_type: sourceType, tap_source: tapSource, cid, rid, tap_session: tapSession }),
      });
      assert.equal(scoreRes.status, 200);
      const score = await scoreRes.json();
      const resultRes = await fetch(`${baseUrl}/api/archetype-engines/love/results/${score.resultId}?tenant=${encodeURIComponent(tenant)}&source_type=${encodeURIComponent(sourceType)}&tap_source=${encodeURIComponent(tapSource)}`);
      assert.equal(resultRes.status, 200);
      return { start, score };
    };

    await runFlow({
      tenant: 'demo',
      email: 'qr.user@example.com',
      sourceType: 'qr',
      tapSource: 'qr',
      cid: 'camp-qr-1',
      rid: 'rid-qr-1',
      tapSession: 'sess-qr-1',
    });
    await runFlow({
      tenant: 'demo',
      email: 'tap.user@example.com',
      sourceType: 'tap',
      tapSource: 'tap',
      cid: 'camp-tap-1',
      rid: 'rid-tap-1',
      tapSession: 'sess-tap-1',
    });
    await runFlow({
      tenant: 'demo',
      email: 'return.user@example.com',
      sourceType: 'direct',
      tapSource: 'return-engine',
      cid: 'camp-ret-1',
      rid: 'rid-ret-1',
      tapSession: 'sess-ret-1',
    });

    const completionEvents = pool.state.pageViews.filter((row) => row.page_key === 'assessment_completed');
    assert.ok(completionEvents.length >= 3);
    const bySourcePath = Object.fromEntries(completionEvents.map((row) => {
      const context = JSON.parse(row.campaign_context || '{}');
      return [context.source_path, context];
    }));
    assert.equal(bySourcePath.qr?.source_type, 'qr');
    assert.equal(bySourcePath.tap?.source_type, 'tap');
    assert.equal(bySourcePath['return-engine']?.source_type, 'direct');
    assert.equal(bySourcePath.qr?.campaign, 'camp-qr-1');
    assert.equal(bySourcePath.tap?.campaign, 'camp-tap-1');
    assert.equal(bySourcePath['return-engine']?.campaign, 'camp-ret-1');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('love insights vary materially across different profile payloads', () => {
  const lowAnswers = Object.fromEntries(LOVE_QUESTIONS.map((q) => [q.id || q.question_id, 1]));
  const highAnswers = Object.fromEntries(LOVE_QUESTIONS.map((q) => [q.id || q.question_id, 4]));
  const lowResult = scoreEngineAssessment('love', lowAnswers);
  const highResult = scoreEngineAssessment('love', highAnswers);

  const changedInsights = [
    lowResult.primaryInsight !== highResult.primaryInsight,
    lowResult.secondaryInsight !== highResult.secondaryInsight,
    lowResult.balanceInsight !== highResult.balanceInsight,
    lowResult.stressInsight !== highResult.stressInsight,
    lowResult.identityGapInsight !== highResult.identityGapInsight,
    lowResult.consistencyInsight !== highResult.consistencyInsight,
  ].filter(Boolean).length;

  assert.ok(changedInsights >= 3);
});

test('dashboard analytics include separated archetype and VOC assessment families', () => {
  const source = fs.readFileSync('server/index.js', 'utf8');
  assert.match(source, /assessment_families/);
  assert.match(source, /voc:/);
  assert.match(source, /love:/);
  assert.match(source, /leadership:/);
  assert.match(source, /loyalty:/);
});

test('dashboard UI renders separate family labels for VOC, Love, Leadership, and Loyalty', () => {
  const source = fs.readFileSync('dashboardnew/app.js', 'utf8');
  assert.match(source, /VOC Assessments/);
  assert.match(source, /Love Assessments/);
  assert.match(source, /Leadership Assessments/);
  assert.match(source, /Loyalty Assessments/);
});
