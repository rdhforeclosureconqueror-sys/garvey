const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const express = require('express');
const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');

function withServer(app) {
  const server = http.createServer(app);
  return new Promise((resolve) => {
    server.listen(0, () => {
      const addr = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

test('canonical youth entry shell exposes parent flow links and internal operator mount', () => {
  const html = fs.readFileSync('public/youth-development.html', 'utf8');
  assert.match(html, /Start Intake Walkthrough/);
  assert.match(html, /href="\/youth-development\/intake"/);
  assert.match(html, /href="\/youth-development\/parent-dashboard"/);
  assert.match(html, /href="\/youth-development\/program"/);
  assert.match(html, /id="tdeOperatorConsole"/);
  assert.match(html, /TDE Operator Console \(Internal Testing Only\)/);
  assert.match(html, /<script src="\/js\/tde-operator-console\.js" defer><\/script>/);
  assert.doesNotMatch(html, /window\.location\.replace\(/);
});

test('parent-facing youth pages use canonical CTA taxonomy and remove drift labels', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    getProgramBridgeState: async ({ childId }) => ({
      ok: true,
      child_id: childId || 'child-demo-1',
      launch_allowed: true,
      setup_needed: false,
      has_enrollment: true,
      current_week: 3,
      current_phase_name: 'Foundation',
      next_recommended_action: 'Continue Week 3',
      cta: { label: 'Continue Program', href: '/youth-development/program?child_id=child-demo-1' },
      parent_program_state: {
        child_scope: { selected_child_id: childId || 'child-demo-1' },
        program_status: 'active',
        current_week: 3,
        next_action: 'Continue Week 3',
        blocked_reason: null,
        cta: { label: 'Continue Program', action: 'continue_program', href: '/youth-development/program?child_id=child-demo-1' },
      },
    }),
    getProgramWeekExecution: async () => ({
      week_number: 3,
      week_status: 'in_progress',
      active_step_key: 'reflection_checkin',
      blocked_reason: null,
      completed_step_keys: ['core_activity', 'stretch_challenge'],
      reflection_note: '',
      observation_note: '',
      reflection_saved: false,
      observation_saved: false,
      resume_ready: true,
      next_week_available: false,
    }),
  }));
  const { server, baseUrl } = await withServer(app);
  try {
    const intakeHtml = await (await fetch(`${baseUrl}/youth-development/intake`)).text();
    assert.match(intakeHtml, /View Dashboard/);
    assert.doesNotMatch(intakeHtml, /Resume \/ View Youth Results/);
    assert.doesNotMatch(intakeHtml, /Start \/ Continue Program/);

    const dashboardHtml = await (await fetch(`${baseUrl}/youth-development/parent-dashboard`)).text();
    assert.match(dashboardHtml, /Start Program/);
    assert.match(dashboardHtml, /data-voice-control="snapshotCards"/);
    assert.match(dashboardHtml, /data-voice-control="topStrengths"/);
    assert.match(dashboardHtml, /data-voice-control="areasToStrengthen"/);
    assert.match(dashboardHtml, /data-voice-control="weeklySupport"/);
    assert.match(dashboardHtml, /data-voice-card="/);
    assert.match(dashboardHtml, /Return to Dashboard|View Saved Dashboard/);
    assert.doesNotMatch(dashboardHtml, /Continue Development Plan/);

    const programHtml = await (await fetch(`${baseUrl}/youth-development/program`)).text();
    assert.match(programHtml, /Return to Dashboard/);
    assert.match(programHtml, /Save Reflection/);
    assert.match(programHtml, /Save Observation/);
    assert.match(programHtml, /Today’s Session/);
    assert.match(programHtml, /Next Scheduled Session/);
    assert.match(programHtml, /This Week at a Glance/);
    assert.match(programHtml, /id="readWeeklyGoalsBtn"/);
    assert.match(programHtml, /id="readProgramSupportBtn"/);
    assert.match(programHtml, /id="readProgressSummaryBtn"/);
    assert.match(programHtml, /id="commitTimeHourInput"/);
    assert.match(programHtml, /id="commitTimeMinuteInput"/);
    assert.match(programHtml, /id="commitTimeMeridiemInput"/);
    assert.match(programHtml, /syncPreferredTimePickerFromValue/);
    assert.doesNotMatch(programHtml, /Back to Parent Dashboard/);
    assert.doesNotMatch(programHtml, /Next week preview/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('connectivity audit contract includes parent-facing voice controls and preferred-time picker mapping', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({}));
  const { server, baseUrl } = await withServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/program/connectivity-audit`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    const labels = (payload.controls || []).map((row) => row.label);
    assert.ok(labels.includes('Snapshot Cards Read-Aloud'));
    assert.ok(labels.includes('Weekly Goals Read-Aloud'));
    assert.ok(labels.includes('Program Support Read-Aloud'));
    assert.ok(labels.includes('Progress Summary Read-Aloud'));
    assert.ok(labels.includes('Preferred Time Picker'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('internal preview/test routes are gated in production unless explicit internal override is present', async () => {
  const priorNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({}));
  const { server, baseUrl } = await withServer(app);
  try {
    const blockedTest = await fetch(`${baseUrl}/youth-development/intake/test`);
    assert.equal(blockedTest.status, 404);

    const blockedPreviewHtml = await fetch(`${baseUrl}/youth-development/parent-dashboard/preview`);
    assert.equal(blockedPreviewHtml.status, 404);

    const blockedPreviewJson = await fetch(`${baseUrl}/api/youth-development/parent-dashboard/preview`);
    assert.equal(blockedPreviewJson.status, 404);

    const allowedTest = await fetch(`${baseUrl}/youth-development/intake/test?internal=1`);
    assert.equal(allowedTest.status, 200);

    const allowedPreview = await fetch(`${baseUrl}/api/youth-development/parent-dashboard/preview?internal=1`);
    assert.equal(allowedPreview.status, 200);
    const payload = await allowedPreview.json();
    assert.equal(payload.preview, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (priorNodeEnv == null) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = priorNodeEnv;
  }
});
