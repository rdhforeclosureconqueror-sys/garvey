const test = require('node:test');
const assert = require('node:assert/strict');
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

test('program page renders parent planner, calendar, and lesson-plan surfaces', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({}));
  const { server, baseUrl } = await withServer(app);
  try {
    const html = await (await fetch(`${baseUrl}/youth-development/program`)).text();
    assert.match(html, /Today’s Session/);
    assert.match(html, /Next Scheduled Session/);
    assert.match(html, /This Week at a Glance/);
    assert.match(html, /Parent Progress \+ Adherence Dashboard/);
    assert.match(html, /Current week completion/);
    assert.match(html, /Week-over-week view loading/);
    assert.match(html, /Loading last 4 weeks completion bars/);
    assert.match(html, /Consistency trend loading/);
    assert.match(html, /Phase progress marker loading/);
    assert.match(html, /Determining next best action/);
    assert.match(html, /Weekly Planner Calendar \+ adherence/);
    assert.match(html, /Teacher-Style Lesson Plan/);
    assert.match(html, /Open Scheduled Session/);
    assert.match(html, /View Lesson Plan/);
    assert.match(html, /Resume Session/);
    assert.match(html, /Return to Weekly Overview/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('week-content payload includes planner schedule, lesson-plan blocks, and accountability context', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    getProgramBridgeState: async () => ({
      ok: true,
      child_id: 'child-1',
      launch_allowed: true,
      setup_needed: false,
      has_enrollment: true,
      current_week: 4,
      current_phase_name: 'Foundation',
      next_recommended_action: 'Continue Week 4',
      cta: { label: 'Continue Program', href: '/youth-development/program?child_id=child-1' },
      parent_program_state: { child_scope: { selected_child_id: 'child-1' }, cta: { label: 'Continue Program', href: '/youth-development/program?child_id=child-1' } },
    }),
    getProgramWeekExecution: async () => ({
      week_number: 4,
      week_status: 'in_progress',
      active_step_key: 'stretch_challenge',
      completed_step_keys: ['core_activity'],
      reflection_note: '',
      observation_note: '',
      reflection_saved: false,
      observation_saved: false,
      resume_ready: true,
      next_week_available: false,
    }),
    getProgramWeekPlanning: async () => ({
      commitment_plan: {
        days_per_week: 3,
        preferred_days: ['monday', 'wednesday', 'friday'],
        preferred_time: '17:30',
        session_duration_minutes: 30,
        start_date: '2026-04-13',
      },
      scheduled_sessions: [
        { session_id: 'wk4-mon', day: 'monday', day_label: 'Monday', time: '17:30', status: 'completed', core_activity_title: 'Guided skill practice' },
        { session_id: 'wk4-wed', day: 'wednesday', day_label: 'Wednesday', time: '17:30', status: 'planned', core_activity_title: 'Scenario decision lab' },
        { session_id: 'wk4-fri', day: 'friday', day_label: 'Friday', time: '17:30', status: 'planned', core_activity_title: 'Project build cycle' },
      ],
      accountability: {
        planned_this_week: 3,
        completed_this_week: 1,
        consistency_ratio: 0.33,
        consistency_label: 'early',
        last_week_completion_percent: 66.7,
        current_streak_weeks: 2,
        week_over_week: {
          comparison_available: true,
          current_week_completion_percent: 33.3,
          prior_week_completion_percent: 66.7,
          delta_points: -33.4,
          direction: 'down',
        },
        streak_contract: {
          contract_version: 'program_streak_contract_v1',
          threshold_percent: 80,
          current_streak_weeks: 2,
        },
        trend_history: {
          schema_version: 'multi_week_progress_history_v1',
          window_weeks: 4,
          weeks: [
            { week_number: 1, completion_percent: 100, consistency_marker: 'strong', planned_sessions: 3, completed_sessions: 3, week_status: 'complete' },
            { week_number: 2, completion_percent: 66.7, consistency_marker: 'building', planned_sessions: 3, completed_sessions: 2, week_status: 'in_progress' },
            { week_number: 3, completion_percent: 66.7, consistency_marker: 'building', planned_sessions: 3, completed_sessions: 2, week_status: 'in_progress' },
            { week_number: 4, completion_percent: 33.3, consistency_marker: 'early', planned_sessions: 3, completed_sessions: 1, week_status: 'in_progress' },
          ],
        },
        phase_progress_marker: {
          current_phase_number: 1,
          current_phase_week_index: 4,
          phase_span_weeks: 12,
          interpretation: 'Week 4 of 12 in the active phase.',
        },
      },
    }),
  }));

  const { server, baseUrl } = await withServer(app);
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/program/week-content?tenant=demo&email=parent@example.com&child_id=child-1`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.state, 'content_ready');
    assert.equal(Array.isArray(payload.week_content.scheduled_sessions), true);
    assert.equal(payload.week_content.scheduled_sessions.length, 3);
    assert.equal(Array.isArray(payload.week_content.lesson_plan_template.blocks), true);
    assert.match(JSON.stringify(payload.week_content.lesson_plan_template.blocks), /opening_routine/);
    assert.match(JSON.stringify(payload.week_content.lesson_plan_template.blocks), /stretch_challenge/);
    assert.match(JSON.stringify(payload.week_content.lesson_plan_template.blocks), /observation_close/);
    assert.equal(payload.week_content.accountability.planned_this_week, 3);
    assert.equal(payload.week_content.accountability.completed_this_week, 1);
    assert.equal(payload.week_content.accountability.last_week_completion_percent, 66.7);
    assert.equal(payload.week_content.accountability.current_streak_weeks, 2);
    assert.equal(payload.week_content.accountability.week_over_week.comparison_available, true);
    assert.equal(payload.week_content.accountability.streak_contract.contract_version, 'program_streak_contract_v1');
    assert.equal(payload.week_content.accountability.trend_history.weeks.length, 4);
    assert.equal(payload.week_content.accountability.phase_progress_marker.current_phase_week_index, 4);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('program page includes canonical next-best-action guidance labels', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({}));
  const { server, baseUrl } = await withServer(app);
  try {
    const html = await (await fetch(`${baseUrl}/youth-development/program`)).text();
    assert.match(html, /Start Today’s Session/);
    assert.match(html, /Resume Session/);
    assert.match(html, /Complete Reflection/);
    assert.match(html, /Finish this week to unlock Next Week/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
