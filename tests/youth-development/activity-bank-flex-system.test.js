'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

const { ACTIVITY_CATEGORIES, listActivitiesByComponent } = require('../../youth-development/tde/activityBankService');
const { buildSessionPlan, normalizeParentCustomization } = require('../../youth-development/tde/sessionBuilderService');
const { normalizeCommitmentPlan, validateCommitmentPlan } = require('../../youth-development/tde/commitmentPlanContract');
const { createYouthDevelopmentTdeRouter } = require('../../server/youthDevelopmentTdeRoutes');
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

test('activity bank supports layered categories and variation payloads', () => {
  const core = listActivitiesByComponent('RULE_BASED_REGULATION');
  const opening = listActivitiesByComponent('OPENING_ROUTINE');

  assert.equal(core.ok, true);
  assert.equal(opening.ok, true);
  assert.ok(Array.isArray(core.categories.core_activities));
  assert.ok(core.categories.core_activities.includes('focus_control'));
  assert.ok(core.categories.stretch_activities.includes('transfer_challenge'));
  assert.ok(core.categories.opening_routine.includes('attention_reset'));

  const example = core.activities[0];
  assert.ok(example.category);
  assert.ok(example.subcategory);
  assert.ok(Array.isArray(example.variations));
  assert.ok(example.variations.length >= 2);
  assert.ok(example.variations.every((variation) => variation.variation_id && variation.instructions));

  const coveredSubcategories = new Set(
    ['RULE_BASED_REGULATION', 'ATTENTION_MINDFULNESS', 'CHALLENGE_SUSTAINED_FOCUS', 'REFLECTION_COACHING', 'OPENING_ROUTINE', 'TRANSITION_ROUTINE', 'CLOSING_ROUTINE', 'OBSERVATION_SUPPORT']
      .flatMap((componentType) => listActivitiesByComponent(componentType).activities.map((activity) => activity.subcategory))
  );
  Object.values(ACTIVITY_CATEGORIES).flat().forEach((subcategory) => {
    assert.equal(coveredSubcategories.has(subcategory), true, `missing ${subcategory}`);
  });
});

test('session builder returns deterministic alternatives and parent customization influence', () => {
  const custom = normalizeParentCustomization({ difficulty_level: 'challenging', session_length: 45, energy_type: 'high-energy', weekly_frequency: '5x' });
  assert.equal(custom.difficulty_level, 'challenging');
  assert.equal(custom.session_length, 45);
  assert.equal(custom.energy_type, 'high-energy');
  assert.equal(custom.weekly_frequency, '5x');

  const result = buildSessionPlan({ child_id: 'child-flex-1', phase_number: 2, parent_customization: custom });
  assert.equal(result.ok, true);
  assert.equal(result.session_plan.parent_customization.energy_type, 'high-energy');
  assert.equal(Array.isArray(result.session_plan.selected_variation_ids), true);
  assert.equal(result.session_plan.selected_activity_ids.length, 4);
  assert.ok(result.session_plan.component_choices.RULE_BASED_REGULATION.available_alternatives.length >= 1);
  assert.ok(result.session_plan.component_choices.CHALLENGE_SUSTAINED_FOCUS.available_alternatives.length >= 1);
});

test('commitment contract accepts additive parent customization fields', () => {
  const normalized = normalizeCommitmentPlan({
    child_id: 'child-flex-2',
    phase: 1,
    committed_days_per_week: 3,
    preferred_days: ['mon', 'wed', 'fri'],
    preferred_time_window: '17:00-18:00',
    target_session_length: 30,
    facilitator_role: 'parent',
    parent_customization: {
      difficulty_level: 'easy',
      session_length: 15,
      energy_type: 'calm',
      weekly_frequency: '2x',
    },
  });
  const valid = validateCommitmentPlan(normalized);
  assert.equal(valid.ok, true);
  assert.equal(normalized.parent_customization.weekly_frequency, '2x');
  assert.equal(normalized.difficulty_level, 'easy');
});

test('planner week-content exposes alternatives/variations and TDE depth audit endpoint', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({
    getProgramBridgeState: async () => ({
      ok: true,
      child_id: 'child-flex-ui',
      launch_allowed: true,
      setup_needed: false,
      has_enrollment: true,
      current_week: 2,
      current_phase_name: 'Foundation',
      next_recommended_action: 'Continue Week 2',
      cta: { label: 'Continue Program', href: '/youth-development/program?child_id=child-flex-ui' },
      parent_program_state: { child_scope: { selected_child_id: 'child-flex-ui' } },
    }),
    getProgramWeekPlanning: async () => ({
      commitment_plan: {
        committed_days_per_week: 3,
        preferred_days: ['monday', 'wednesday', 'friday'],
        target_session_length: 30,
        session_duration_minutes: 30,
        parent_customization: { difficulty_level: 'moderate', session_length: 30, energy_type: 'balanced', weekly_frequency: '3x' },
      },
      scheduled_sessions: [{ session_id: 'wk2-1', day: 'monday', time: '17:30', status: 'planned' }],
      accountability: { planned_this_week: 3, completed_this_week: 1, consistency_label: 'early' },
    }),
  }));
  app.use('/api/youth-development/tde', createYouthDevelopmentTdeRouter());

  const { server, baseUrl } = await withServer(app);
  try {
    const weekRes = await fetch(`${baseUrl}/api/youth-development/program/week-content?tenant=demo&email=parent@example.com&child_id=child-flex-ui`);
    const weekPayload = await weekRes.json();
    assert.equal(weekRes.status, 200);
    assert.equal(weekPayload.ok, true);
    assert.ok(weekPayload.week_content.activity_bank_surface.session_plan.component_choices.CHALLENGE_SUSTAINED_FOCUS);
    assert.ok(Array.isArray(weekPayload.week_content.activity_bank_surface.selected_path.core_activity.available_variations));

    const auditRes = await fetch(`${baseUrl}/api/youth-development/tde/activity-bank/audit/depth`);
    const audit = await auditRes.json();
    assert.equal(auditRes.status, 200);
    assert.equal(audit.ok, true);
    assert.ok(audit.total_activities_per_category.core_activities >= 5);
    assert.equal(Array.isArray(audit.missing_subcategories), true);
    assert.equal(Array.isArray(audit.activities_below_minimum_variation_threshold), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    delete process.env.TDE_EXTENSION_MODE;
  }
});
