const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');

function mountApp(options = {}) {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter(options));
  const server = app.listen(0);
  const port = server.address().port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test('live voice sections endpoint is mounted on youth-development namespace and returns 200 without TDE mount', async () => {
  const app = mountApp({
    getVoiceSectionsForChild: async ({ childId }) => ({
      ok: true,
      child_id: childId,
      display_status: 'voice_available',
      sections: [{ section_key: 'weeklyGoals', voice_text: 'Goals voice text' }],
    }),
  });
  try {
    const res = await fetch(`${app.baseUrl}/api/youth-development/voice/sections/child-live`);
    assert.equal(res.status, 200);
    const payload = await res.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.child_id, 'child-live');
    assert.equal(payload.sections.length, 1);
    assert.equal(payload.diagnostics.route, '/api/youth-development/voice/sections/:childId');
  } finally {
    await app.close();
  }
});

test('program launch endpoint returns route diagnostics for button action tracing', async () => {
  const app = mountApp({
    launchProgramForChild: async () => ({ ok: false, error: 'program_enrollment_required' }),
  });
  try {
    const res = await fetch(`${app.baseUrl}/api/youth-development/program/launch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: 'demo', email: 'parent@example.com', child_id: 'child-live' }),
    });
    assert.equal(res.status, 200);
    const payload = await res.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'program_enrollment_required');
    assert.equal(payload.diagnostics.route, '/api/youth-development/program/launch');
    assert.equal(payload.diagnostics.scope.requested_child_id, 'child-live');
  } finally {
    await app.close();
  }
});

test('dashboard and program pages call canonical non-TDE voice endpoint', async () => {
  const app = mountApp();
  try {
    const dashboardHtml = await (await fetch(`${app.baseUrl}/youth-development/parent-dashboard`)).text();
    const programHtml = await (await fetch(`${app.baseUrl}/youth-development/program`)).text();
    assert.match(dashboardHtml, /\/api\/youth-development\/voice\/sections\//);
    assert.match(programHtml, /\/api\/youth-development\/voice\/sections\//);
    assert.doesNotMatch(dashboardHtml, /\/api\/youth-development\/tde\/voice\/sections\//);
    assert.doesNotMatch(programHtml, /\/api\/youth-development\/tde\/voice\/sections\//);
    assert.match(programHtml, /Program launch failed:/);
    assert.match(programHtml, /\[program-launch-debug\] response/);
  } finally {
    await app.close();
  }
});
