const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');
const fs = require('node:fs');
const path = require('node:path');
const { createAdaptiveV2Router } = require('../../server/adaptiveV2Routes');
const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');

const runtime = fs.readFileSync(path.join(__dirname, '../../public/gamehub/skill-world/index.html'), 'utf8');

function createPool() {
  const progress = [];
  return {
    progress,
    async query(sql, params = []) {
      if (sql.includes('INSERT INTO skill_world_progress')) {
        const row = {
          child_id: String(params[0]), parent_profile_id: String(params[1]), auth_user_id: String(params[2]),
          learner_display_name: params[3], skill_id: params[4], mode: params[5], status: params[6],
          progress_percent: params[7], attempts: params[8], correct: params[9], score_percent: params[10],
          hints_used: params[11], last_step: params[12], profile: JSON.parse(params[13]),
          state_snapshot: JSON.parse(params[14]), created_at: '2026-07-21T10:00:00Z', updated_at: '2026-07-21T10:00:00Z'
        };
        const prior = progress.findIndex((item) => item.child_id === row.child_id && item.skill_id === row.skill_id && item.mode === row.mode);
        if (prior >= 0) progress[prior] = row; else progress.push(row);
        return { rows: [] };
      }
      if (sql.includes('FROM skill_world_progress')) {
        return { rows: progress.filter((row) => row.child_id === String(params[0]) && (!sql.includes('skill_id=$2') || row.skill_id === params[1])) };
      }
      return { rows: [] };
    }
  };
}

async function startApp() {
  const pool = createPool();
  const listYouthChildProfiles = async ({ accountCtx }) => accountCtx.tenant === 'demo' && accountCtx.email === 'parent@example.com'
    ? [{ child_id: '101', child_name: 'Princess Nia', parent_profile_id: '55' }]
    : [];
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.authActor = { userId: 77, email: 'parent@example.com', tenantSlug: 'demo' }; next(); });
  app.use(createAdaptiveV2Router({ pool, listYouthChildProfiles }));
  app.use(createYouthDevelopmentRouter({ pool, listYouthChildProfiles }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  return { pool, server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

test('Skill World reconstructs only launch context and never sends explicit Youth launches to Gates', () => {
  assert.match(runtime, /const allowed=\['child_id','child_display_name','program_context','source_registry','return_url','tenant'\]/);
  assert.match(runtime, /ctx\.program_context==='youth_development'\|\|ctx\.source_registry==='youth_development'/);
  assert.match(runtime, /return \{\.\.\.ctx,child_id:''\};try\{const res=await fetch\('\/api\/gates\/canonical-learners'/);
  assert.match(runtime, /source_registry:learnerCtx\.source_registry/);
  assert.match(runtime, /contextQuery\(ctx\)/);
  assert.doesNotMatch(runtime, /params\.get\('parent_profile_id'\)|params\.get\('auth_user_id'\)|params\.get\('token_hash'\)|params\.get\('session_token'\)/);
});

test('Youth Skill World save, reload, and dashboard summary retain Princess Nia normalized ownership', async () => {
  const { pool, server, baseUrl } = await startApp();
  try {
    const context = { program_context: 'youth_development', source_registry: 'youth_development', tenant: 'demo' };
    const saved = await fetch(`${baseUrl}/api/skill-world/progress`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...context, child_id: '101', skill_id: 'G1M_NS_001', mode: 'mission', status: 'in_progress', progress_percent: 50, attempts: 2, correct: 1, score_percent: 50, last_step: '3', state_snapshot: { stepIndex: 3 } })
    });
    assert.equal(saved.status, 200);
    assert.equal(pool.progress.length, 1);
    assert.deepEqual({ child_id: pool.progress[0].child_id, learner_display_name: pool.progress[0].learner_display_name, parent_profile_id: pool.progress[0].parent_profile_id }, { child_id: '101', learner_display_name: 'Princess Nia', parent_profile_id: '55' });

    const loaded = await fetch(`${baseUrl}/api/skill-world/progress/101/G1M_NS_001?program_context=youth_development&source_registry=youth_development&tenant=demo`);
    const restored = await loaded.json();
    assert.equal(loaded.status, 200);
    assert.equal(restored.progress.state_snapshot.stepIndex, 3);

    const dashboard = await fetch(`${baseUrl}/api/youth-development/parent-dashboard/adaptive-summary?tenant=demo&child_id=101`);
    const summary = await dashboard.json();
    assert.equal(dashboard.status, 200);
    assert.equal(summary.empty_state, false);
    assert.equal(summary.overall_status_label, 'Adaptive learning in progress');
    assert.equal(summary.skill_worlds[0].skill_id, 'G1M_NS_001');
    assert.equal(summary.next_recommendation.title, 'Continue G1m Ns 001 Skill World');
  } finally { server.close(); }
});

test('explicit Youth persistence rejects a child outside the authenticated family', async () => {
  const { server, baseUrl } = await startApp();
  try {
    const response = await fetch(`${baseUrl}/api/skill-world/progress`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ program_context: 'youth_development', source_registry: 'youth_development', tenant: 'demo', child_id: '999', skill_id: 'G1M_NS_001' }) });
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error, 'youth_development_child_profile_not_found');
  } finally { server.close(); }
});
