const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createYouthDevelopmentTdeRouter } = require('../../server/youthDevelopmentTdeRoutes');
const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');
const {
  getAdminOverview,
  buildCalibrationState,
  buildEvidenceQualityState,
  buildValidationReadinessState,
} = require('../../youth-development/tde/adminOperationsService');
const { buildCalibrationSummary } = require('../../youth-development/tde/validationOperationsService');

function mountApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/youth-development/tde', createYouthDevelopmentTdeRouter());
  app.use(createYouthDevelopmentRouter());
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  return {
    baseUrl,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function seedPhase23Data(baseUrl) {
  const enrollmentRes = await fetch(`${baseUrl}/api/youth-development/tde/program/enroll`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      child_id: 'child-phase23',
      child_profile_tde: { child_id: 'child-phase23', profile_version: 'phase3-v1' },
      active_domain_interests: ['quant_reasoning'],
      current_trait_targets: ['SR', 'PS'],
      current_environment_targets: ['challenge_fit'],
    }),
  });
  const enrollment = await enrollmentRes.json();

  await fetch(`${baseUrl}/api/youth-development/tde/program/progress`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      enrollment_id: enrollment.enrollment.enrollment_id,
      child_id: 'child-phase23',
      week_number: 5,
      completion_status: 'complete',
      trait_signal_summary: { SR: 0.63, PS: 0.57 },
      completed_at: '2026-04-18T00:00:00.000Z',
    }),
  });

  await fetch(`${baseUrl}/api/youth-development/tde/observer/consent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      child_id: 'child-phase23',
      observer_id: 'obs-phase23-parent',
      observer_role: 'parent',
      relationship_duration: '2 years',
      consent_status: 'granted',
      consent_captured_at: '2026-04-18T00:00:00.000Z',
      consent_source: 'parent_portal_checkbox',
      provenance_source_type: 'parent_portal',
      provenance_source_ref: 'portal-form-phase23',
      submission_context: 'pilot_rollout',
      tenant_id: 'tenant-phase23',
      audit_ref: 'audit-phase23-consent',
    }),
  });

  await fetch(`${baseUrl}/api/youth-development/tde/environment/hooks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      child_id: 'child-phase23',
      event_id: 'env-phase23-1',
      environment_factor: 'challenge_fit',
      event_type: 'rating',
      source_type: 'observer',
      source_ref: 'obs-phase23-parent',
      raw_value: 0.68,
      normalized_value: 0.68,
      confidence_weight: 0.75,
      timestamp: '2026-04-18T00:00:00.000Z',
      calibration_version: 'tde-calibration-v0',
      trace_ref: 'trace-env-phase23-1',
    }),
  });

  await fetch(`${baseUrl}/api/youth-development/tde/checkin/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      child_id: 'child-phase23',
      program_week: 5,
      completed_at: '2026-04-18T00:00:00.000Z',
      responses: {
        child: [],
        parent: {
          parent_id: 'obs-phase23-parent',
          response_text: 'Steady consistency this week with slight challenge avoidance.',
          value: 3,
          confidence_weight: 0.75,
          observed_at: '2026-04-18T00:00:00.000Z',
        },
      },
    }),
  });
}

test('phase23 deterministic admin overview output with fixed voice config', async () => {
  const repository = {
    getProgramSnapshot: async () => ({
      enrollment: { child_id: 'child-phase23', current_week: 5, calibration_version: 'tde-calibration-v0' },
      observer_consents: [{ observer_role: 'parent', consent_status: 'granted' }],
      environment_hooks: [{ event_id: 'env-1', source_type: 'observer', trace_ref: 'trace-env-1', normalized_value: 0.6 }],
      development_checkins: [{ evidence_map: [{ evidence_id: 'ev-1', prompt_id: 'p-1', trace_ref: 'trace-1', value: 3, source_actor: 'parent' }], checkin_due: false }],
      progress_records: [{ progress_id: 'pr-1', week_number: 5, trait_signal_summary: { SR: 0.6 } }],
      intervention_sessions: [],
    }),
    listValidationExportLogs: async () => [],
    listCalibrationVersions: async () => ['tde-calibration-v0'],
    getCommitmentPlan: async () => null,
    listInterventionSessions: async () => [],
  };
  const voiceService = {
    getConfig: async () => ({
      voice_rollout_mode: 'enabled',
      voice_playback_mode: 'enabled',
      voice_availability_status: 'voice_available',
      pilot_visibility: { voice_shown: true },
    }),
  };

  const first = await getAdminOverview({ repository, voiceService, child_id: 'child-phase23' });
  const second = await getAdminOverview({ repository, voiceService, child_id: 'child-phase23' });
  assert.deepEqual(first, second);
  assert.equal(first.admin_overview.hidden_rollout_behavior, 'none');
  assert.equal(first.admin_overview.hidden_calibration_behavior, 'none');
});

test('phase23 rollout visibility summary surfaces preview/fallback/eligibility states', () => {
  const rollout = {
    rollout: {
      voice_rollout: { mode: 'preview_only', playback_mode: 'fallback_only' },
      tde_availability: 'available',
      explanation: 'rollout explanation',
    },
    readiness: { readiness_status: 'partially_ready' },
  };
  const voiceConfig = { voice_availability_status: 'voice_fallback_active', pilot_visibility: { voice_shown: false } };
  const result = require('../../youth-development/tde/adminOperationsService').buildRolloutVisibilitySummary(rollout, voiceConfig);

  assert.equal(result.current_rollout_mode, 'preview_only');
  assert.ok(result.preview_only_surfaces.includes('voice_checkin_playback'));
  assert.ok(result.fallback_only_surfaces.includes('voice_parent_sections'));
  assert.equal(result.voice_availability_status, 'voice_fallback_active');
  assert.equal(result.no_hidden_rollout_behavior, true);
});

test('phase23 calibration visibility integrity mirrors phase22 calibration metadata', () => {
  const calibration = buildCalibrationSummary({ calibration_versions: ['tde-calibration-v0'] });
  const state = buildCalibrationState(calibration);

  assert.ok(state.active_calibration_groups.length > 0);
  assert.ok(state.modules_depending_on_calibration_variables.length > 0);
  assert.ok(state.major_output_areas_influenced_by_calibration.length > 0);
  assert.equal(state.no_silent_calibration_mutation, true);
});

test('phase23 evidence-quality overview correctness surfaces burden categories', () => {
  const evidence = {
    evidence_quality: {
      source_sufficiency: { status: 'limited' },
      source_diversity: { status: 'narrow' },
      sparse_data_flags: ['sparse_total_evidence'],
      traceability_completeness: { status: 'incomplete', traceability_ratio: 0.5 },
      missing_contract_burden: {
        missing_contracts: ['observer_consent_records_required'],
        missing_contract_count: 1,
        burden_level: 'low',
      },
    },
  };
  const validation = {
    validation_readiness: {
      status: 'needs_data_reinforcement',
      readiness_reasoning: 'need more streams',
      missing_contracts: ['observer_consent_records_required'],
      validation_export_refs: [],
    },
  };

  const evidenceState = buildEvidenceQualityState(evidence, 'child-phase23');
  const validationState = buildValidationReadinessState(validation, 'child-phase23');

  assert.equal(evidenceState.sufficiency_burden, 'elevated');
  assert.equal(evidenceState.traceability_burden, 'elevated');
  assert.equal(evidenceState.source_diversity_weakness, 'present');
  assert.equal(validationState.missing_contract_burden.missing_contract_count, 1);
});

test('phase23 additive admin routes are extension-safe and do not regress live youth v1 routes', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();
  try {
    await seedPhase23Data(app.baseUrl);

    const overviewRes = await fetch(`${app.baseUrl}/api/youth-development/tde/admin/overview?child_id=child-phase23`);
    const overview = await overviewRes.json();
    assert.equal(overviewRes.status, 200);
    assert.equal(overview.ok, true);
    assert.equal(overview.admin_overview.hidden_rollout_behavior, 'none');

    const rolloutRes = await fetch(`${app.baseUrl}/api/youth-development/tde/admin/rollout-status?child_id=child-phase23`);
    const rollout = await rolloutRes.json();
    assert.equal(rolloutRes.status, 200);
    assert.equal(rollout.ok, true);

    const flagsRes = await fetch(`${app.baseUrl}/api/youth-development/tde/admin/feature-flags`);
    const flags = await flagsRes.json();
    assert.equal(flagsRes.status, 200);
    assert.equal(flags.ok, true);

    const validationRes = await fetch(`${app.baseUrl}/api/youth-development/tde/admin/validation-status?child_id=child-phase23`);
    const validation = await validationRes.json();
    assert.equal(validationRes.status, 200);
    assert.equal(validation.ok, true);

    const evidenceRes = await fetch(`${app.baseUrl}/api/youth-development/tde/admin/evidence-quality-overview?child_id=child-phase23`);
    const evidence = await evidenceRes.json();
    assert.equal(evidenceRes.status, 200);
    assert.equal(evidence.ok, true);

    delete process.env.TDE_EXTENSION_MODE;
    const liveYouthRes = await fetch(`${app.baseUrl}/api/youth-development/assess`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: [] }),
    });
    const liveYouthPayload = await liveYouthRes.json();
    assert.equal(liveYouthRes.status, 200);
    assert.equal(liveYouthPayload.ok, true);
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});
