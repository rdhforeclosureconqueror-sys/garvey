const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createYouthDevelopmentTdeRouter } = require('../../server/youthDevelopmentTdeRoutes');
const { normalizeCommitmentPlan, validateCommitmentPlan } = require('../../youth-development/tde/commitmentPlanContract');
const { validateSessionEvidenceContract } = require('../../youth-development/tde/sessionEvidenceContract');
const { normalizeInterventionEvidenceToSignals } = require('../../youth-development/tde/interventionSignalIntegrationService');
const { extractSignalsFromEvidence } = require('../../youth-development/tde/signalExtractionService');
const { scoreTraitsFromSignals } = require('../../youth-development/tde/traitScoringService');

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

function componentByActivityId(activityId) {
  const map = {
    rbr_breathe_count_01: 'RULE_BASED_REGULATION',
    attn_body_scan_01: 'ATTENTION_MINDFULNESS',
    chal_focus_ladder_01: 'CHALLENGE_SUSTAINED_FOCUS',
    refl_coach_prompt_01: 'REFLECTION_COACHING',
  };
  return map[activityId] || null;
}

test('standalone commitment and session contracts validate and reject invalid payloads', () => {
  const normalized = normalizeCommitmentPlan({
    child_id: 'child-p8',
    phase: 1,
    committed_days_per_week: 3,
    preferred_days: ['mon', 'wed', 'fri'],
    preferred_time_window: '17:00-19:00',
    target_session_length: 30,
    facilitator_role: 'parent',
  });
  const validCommitment = validateCommitmentPlan(normalized);
  assert.equal(validCommitment.ok, true);

  const invalidCommitment = validateCommitmentPlan(normalizeCommitmentPlan({
    child_id: 'child-p8',
    phase: 0,
    committed_days_per_week: 9,
    preferred_days: ['mon', 'mon'],
    preferred_time_window: '',
    target_session_length: 0,
    facilitator_role: 'unknown',
  }));
  assert.equal(invalidCommitment.ok, false);
  assert.ok(invalidCommitment.errors.includes('phase_invalid'));

  const validSession = validateSessionEvidenceContract({
    child_id: 'child-p8',
    session_id: 'sess-p8-1',
    selected_activity_ids: ['rbr_breathe_count_01', 'attn_body_scan_01', 'chal_focus_ladder_01', 'refl_coach_prompt_01'],
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
    frustration_recovery_level: 'recovered_with_prompt',
    focus_duration_minutes: 20,
    prompting_needed: 'low',
    child_choice_count: 3,
    reflection_response: 'I stuck with it',
    notes: 'solid work',
  }, { component_by_activity_id: componentByActivityId });
  assert.equal(validSession.ok, true);
  assert.equal(validSession.validity_status, 'VALID');

  const invalidSession = validateSessionEvidenceContract({
    child_id: 'child-p8',
    session_id: 'sess-p8-2',
    selected_activity_ids: ['rbr_breathe_count_01', 'attn_body_scan_01', 'chal_focus_ladder_01'],
    component_completion_flags: {
      RULE_BASED_REGULATION: true,
      ATTENTION_MINDFULNESS: true,
      CHALLENGE_SUSTAINED_FOCUS: true,
      REFLECTION_COACHING: false,
    },
    duration_minutes: 20,
    challenge_level: 'moderate',
    parent_coaching_style: 'supportive',
    child_effort_rating: 4,
    frustration_recovery_level: 'recovered_with_prompt',
    focus_duration_minutes: 15,
    prompting_needed: 'low',
    child_choice_count: 2,
    reflection_response: '',
    notes: 'missing reflection',
  }, { component_by_activity_id: componentByActivityId });

  assert.equal(invalidSession.ok, false);
  assert.ok(invalidSession.errors.includes('selected_activity_ids_must_include_4_entries'));
  assert.ok(invalidSession.errors.some((entry) => entry.startsWith('missing_required_category:REFLECTION_COACHING')));
});

test('deterministic intervention-to-signal transformation and no intervention-only reported trait scores', () => {
  const payload = {
    child_id: 'child-p8',
    session_id: 'sess-p8-3',
    completed_at: '2026-04-12T10:00:00.000Z',
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
    reflection_response: 'I used a plan',
    notes: 'steady',
  };

  const first = normalizeInterventionEvidenceToSignals(payload, { component_by_activity_id: componentByActivityId });
  const second = normalizeInterventionEvidenceToSignals(payload, { component_by_activity_id: componentByActivityId });
  assert.equal(first.ok, true);
  assert.deepEqual(first, second);

  const extracted = extractSignalsFromEvidence({
    child_id: 'child-p8',
    session_id: payload.session_id,
    evidence: first.intervention_signal_evidence,
  });
  const scored = scoreTraitsFromSignals(extracted.extracted_signals);
  const scoredWithAdherence = scoreTraitsFromSignals(extracted.extracted_signals, {
    adherence_context: {
      adherence_status: 'WEAK',
      missed_planned_sessions: 2,
    },
  });
  const scoredWithMissedSessions = scoreTraitsFromSignals(extracted.extracted_signals, {
    adherence_context: {
      adherence_status: 'MODERATE',
      missed_planned_sessions: 2,
    },
  });

  const srBase = scored.trait_results.find((entry) => entry.trait_code === 'SR');
  const srAdjusted = scoredWithAdherence.trait_results.find((entry) => entry.trait_code === 'SR');
  const srMissed = scoredWithMissedSessions.trait_results.find((entry) => entry.trait_code === 'SR');

  assert.equal(srBase.reported_trait_score, null);
  assert.equal(srBase.evidence_sufficiency_status, 'INSUFFICIENT_NON_SESSION_SOURCE');
  assert.equal(srAdjusted.reported_trait_score, null);
  assert.ok(srAdjusted.confidence_score < srBase.confidence_score);
  assert.equal(srAdjusted.confidence_context.interpretive_guard, 'weak_adherence_not_child_limitation');
  assert.ok(srMissed.confidence_score < srBase.confidence_score);
  assert.equal(srMissed.confidence_context.confidence_adjustment_reason, 'missing_planned_sessions_reduce_interpretive_confidence');
});

test('phase8 contract endpoints are additive-safe and live youth v1 route remains accessible', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();

  try {
    const contractsRes = await fetch(`${app.baseUrl}/api/youth-development/tde/contracts/intervention`);
    assert.equal(contractsRes.status, 200);
    const contracts = await contractsRes.json();
    assert.equal(contracts.ok, true);

    const validateRes = await fetch(`${app.baseUrl}/api/youth-development/tde/session/validate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        child_id: 'child-p8-route',
        session_id: 'sess-p8-route',
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
        focus_duration_minutes: 19,
        prompting_needed: 'low',
        child_choice_count: 2,
        reflection_response: 'good',
        notes: 'good',
      }),
    });
    assert.equal(validateRes.status, 200);

    const traitContractRes = await fetch(`${app.baseUrl}/api/youth-development/tde/contracts/trait-mapping`);
    assert.equal(traitContractRes.status, 200);

    const root = express();
    root.use('/api/youth-development/tde', createYouthDevelopmentTdeRouter());
    root.get('/api/youth-development/assess', (_req, res) => res.status(200).json({ ok: true }));
    const server = root.listen(0);
    const port = server.address().port;
    const liveV1Res = await fetch(`http://127.0.0.1:${port}/api/youth-development/assess`);
    assert.equal(liveV1Res.status, 200);
    await new Promise((resolve) => server.close(resolve));
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});
