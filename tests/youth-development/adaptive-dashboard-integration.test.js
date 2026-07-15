const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');
const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');

async function startApp(options) {
  const app = express();
  app.use(createYouthDevelopmentRouter(options));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

test('existing Youth Development Parent Dashboard consumes and renders adaptive summary shell', async () => {
  const { server, baseUrl } = await startApp({});
  try {
    const html = await (await fetch(`${baseUrl}/youth-development/parent-dashboard`)).text();
    assert.match(html, /id="adaptiveLearningPanel"/);
    assert.match(html, /hydrateAdaptiveLearning/);
    assert.match(html, /\/api\/youth-development\/parent-dashboard\/adaptive-summary/);
  } finally { server.close(); }
});

test('youth adaptive summary API excludes guest fallback and returns Princess Nia adaptive rows', async () => {
  const pool = { async query(sql) {
    if (sql.includes('FROM gates_child_profiles')) return { rows: [{ parent_profile_id: '55' }] };
    if (sql.includes('FROM skill_world_progress')) return { rows: [{ child_id: '101', skill_id: 'WORLD-A', status: 'completed', progress_percent: 100, score_percent: 88, attempts: 3, updated_at: '2026-07-15T10:00:00Z' }] };
    if (sql.includes('FROM assessment_sessions')) return { rows: [{ session_id: 's1', status: 'completed', subject: 'Math', completed_at: '2026-07-15T09:00:00Z' }] };
    return { rows: [] };
  } };
  const { server, baseUrl } = await startApp({
    pool,
    listYouthChildProfiles: async () => [{ child_id: 'guest-1', child_name: 'Guest' }, { child_id: '101', child_name: 'Princess Nia', parent_profile_id: '55' }]
  });
  try {
    const res = await fetch(`${baseUrl}/api/youth-development/parent-dashboard/adaptive-summary?tenant=demo&email=parent@example.com&child_id=101`);
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.child_id, '101');
    assert.equal(json.assessments_completed, 1);
    assert.equal(json.skill_worlds[0].status, 'completed');
    const guest = await fetch(`${baseUrl}/api/youth-development/parent-dashboard/adaptive-summary?tenant=demo&email=parent@example.com&child_id=guest-1`);
    assert.equal(guest.status, 409);
  } finally { server.close(); }
});
