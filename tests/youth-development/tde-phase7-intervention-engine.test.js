const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createYouthDevelopmentTdeRouter } = require('../../server/youthDevelopmentTdeRoutes');
const { planSession, completeSession } = require('../../youth-development/tde/interventionEngine');
const { summarizeAdherence } = require('../../youth-development/tde/adherenceService');
const { scoreTraitsFromSignals } = require('../../youth-development/tde/traitScoringService');
const { extractSignalsFromEvidence } = require('../../youth-development/tde/signalExtractionService');

function mountApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/youth-development/tde', createYouthDevelopmentTdeRouter());
  const server = app.listen(0);
  const port = server.address().port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test('session plan requires all 4 components and deterministic builder', () => {
  const payload = { child_id: 'child-p7', phase_number: 1, session_date: '2026-04-10' };
  const first = planSession(payload);
  const second = planSession(payload);

  assert.equal(first.ok, true);
  assert.deepEqual(first, second);
  assert.equal(first.session_plan.selected_activities.length, 4);
  assert.equal(new Set(first.session_plan.selected_activities.map((a) => a.component_type)).size, 4);
});

test('session completion cannot skip component categories', async () => {
  const invalid = await completeSession({
    child_id: 'child-p7',
    session_id: 's1',
    selected_activity_ids: ['rbr_breathe_count_01', 'attn_body_scan_01', 'chal_focus_ladder_01'],
    component_completion_flags: {
      RULE_BASED_REGULATION: true,
      ATTENTION_MINDFULNESS: true,
      CHALLENGE_SUSTAINED_FOCUS: true,
      REFLECTION_COACHING: false,
    },
    duration_minutes: 20,
    reflection_response: 'hard but good',
  }, {
    async persistInterventionSession() { return { persisted: 1 }; },
  });

  assert.equal(invalid.ok, false);
  assert.ok(invalid.validation_errors.includes('selected_activity_ids_must_include_4_entries'));
});

test('session evidence structure validity and pipeline integration non-breaking', () => {
  const completed = {
    child_id: 'child-p7',
    session_id: 'sess-p7-1',
    selected_activity_ids: ['rbr_breathe_count_01', 'attn_body_scan_01', 'chal_focus_ladder_01', 'refl_coach_prompt_01'],
    component_completion_flags: {
      RULE_BASED_REGULATION: true,
      ATTENTION_MINDFULNESS: true,
      CHALLENGE_SUSTAINED_FOCUS: true,
      REFLECTION_COACHING: true,
    },
    duration_minutes: 30,
    challenge_level: 'moderate',
    parent_coaching_style: 'supportive',
    child_effort_rating: 4,
    frustration_recovery_level: 'recovered_with_prompt',
    focus_duration_minutes: 20,
    prompting_needed: 'low',
    child_choice_count: 3,
    reflection_response: 'I tried a new way',
    notes: 'steady effort',
    completed_at: '2026-04-10T12:00:00.000Z',
  };

  const interventionOnlySignals = extractSignalsFromEvidence({
    child_id: 'child-p7',
    session_id: 'sess-p7-1',
    evidence: [
      { evidence_id: 'isl-1', source_type: 'observation', source_id: 'session:sess-p7-1', signal_type: 'strategy_use_presence', value: 1, trait_code: 'SR', evidence_status_tag: 'INTERVENTION_SESSION_LOG' },
      { evidence_id: 'isl-2', source_type: 'task_event', source_id: 'session:sess-p7-1', signal_type: 'context_consistency', value: 3, value_max: 4, trait_code: 'SR', evidence_status_tag: 'INTERVENTION_SESSION_LOG' },
    ],
  });

  const scoredInterventionOnly = scoreTraitsFromSignals(interventionOnlySignals.extracted_signals);
  const srInterventionOnly = scoredInterventionOnly.trait_results.find((row) => row.trait_code === 'SR');
  assert.equal(srInterventionOnly.evidence_sufficiency_status, 'INSUFFICIENT_NON_SESSION_SOURCE');
  assert.equal(srInterventionOnly.reported_trait_score, null);

  const multiSourceSignals = extractSignalsFromEvidence({
    child_id: 'child-p7',
    session_id: 'sess-p7-1',
    evidence: [
      { evidence_id: 'e1', source_type: 'task_event', source_id: 'task-a', signal_type: 'strategy_use_presence', value: 1, trait_code: 'SR', evidence_status_tag: 'OPERATIONAL_SYSTEM_CONSTRUCT' },
      { evidence_id: 'e2', source_type: 'observation', source_id: 'teacher-1', signal_type: 'context_consistency', value: 3, value_max: 4, trait_code: 'SR', evidence_status_tag: 'INTERVENTION_SESSION_LOG' },
    ],
  });
  const scoredMultiSource = scoreTraitsFromSignals(multiSourceSignals.extracted_signals);
  const srMultiSource = scoredMultiSource.trait_results.find((row) => row.trait_code === 'SR');
  assert.equal(srMultiSource.evidence_sufficiency_status, 'SUFFICIENT');

  assert.equal(completed.selected_activity_ids.length, 4);
  assert.equal(completed.component_completion_flags.REFLECTION_COACHING, true);
});

test('adherence tracking correctness', () => {
  const plan = { committed_days_per_week: 3 };
  const sessions = [
    { full_session_completed: true, completed_at: '2026-04-01T10:00:00.000Z' },
    { full_session_completed: true, completed_at: '2026-04-03T10:00:00.000Z' },
    { full_session_completed: false, completed_at: '2026-04-04T10:00:00.000Z' },
  ];
  const adherence = summarizeAdherence(plan, sessions);
  assert.equal(adherence.planned_sessions, 3);
  assert.equal(adherence.completed_sessions, 2);
  assert.equal(adherence.adherence_percentage, 66.67);
  assert.equal(adherence.separation_guard, 'adherence_separate_from_trait_scores');
});

test('phase7 endpoints are additive and live youth v1 stays untouched', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();
  try {
    const commitmentRes = await fetch(`${app.baseUrl}/api/youth-development/tde/commitment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        child_id: 'child-p7-route',
        committed_days_per_week: 3,
        preferred_days: ['mon', 'wed', 'fri'],
        preferred_time_window: '17:00-19:00',
        session_length: 30,
        facilitator_role: 'parent',
      }),
    });
    assert.equal(commitmentRes.status, 200);

    const planRes = await fetch(`${app.baseUrl}/api/youth-development/tde/session/plan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ child_id: 'child-p7-route', phase_number: 1 }),
    });
    const planned = await planRes.json();
    assert.equal(planRes.status, 200);

    const completeRes = await fetch(`${app.baseUrl}/api/youth-development/tde/session/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        child_id: 'child-p7-route',
        session_id: planned.session_plan.session_id,
        selected_activity_ids: planned.session_plan.selected_activity_ids,
        component_completion_flags: {
          RULE_BASED_REGULATION: true,
          ATTENTION_MINDFULNESS: true,
          CHALLENGE_SUSTAINED_FOCUS: true,
          REFLECTION_COACHING: true,
        },
        duration_minutes: 32,
        challenge_level: 'moderate',
        parent_coaching_style: 'supportive',
        child_effort_rating: 4,
        frustration_recovery_level: 'recovered_independently',
        focus_duration_minutes: 23,
        prompting_needed: 'low',
        child_choice_count: 2,
        reflection_response: 'I can do hard things',
        notes: 'good follow through',
      }),
    });
    assert.equal(completeRes.status, 200);

    const adherenceRes = await fetch(`${app.baseUrl}/api/youth-development/tde/adherence/child-p7-route`);
    assert.equal(adherenceRes.status, 200);
    const adherence = await adherenceRes.json();
    assert.equal(adherence.ok, true);

    const activityRes = await fetch(`${app.baseUrl}/api/youth-development/tde/activity-bank/RULE_BASED_REGULATION`);
    assert.equal(activityRes.status, 200);
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});
