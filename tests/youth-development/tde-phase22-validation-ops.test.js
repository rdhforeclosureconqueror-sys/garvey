const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createYouthDevelopmentTdeRouter } = require('../../server/youthDevelopmentTdeRoutes');
const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');
const {
  buildValidationSummaryFromSnapshot,
  buildEvidenceQualitySummaryFromSnapshot,
  buildCalibrationSummary,
} = require('../../youth-development/tde/validationOperationsService');

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

async function seedValidationData(baseUrl) {
  const enrollmentRes = await fetch(`${baseUrl}/api/youth-development/tde/program/enroll`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      child_id: 'child-phase22',
      child_profile_tde: { child_id: 'child-phase22', profile_version: 'phase3-v1' },
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
      child_id: 'child-phase22',
      week_number: 4,
      completion_status: 'complete',
      trait_signal_summary: { SR: 0.61, PS: 0.58 },
      completed_at: '2026-04-17T00:00:00.000Z',
    }),
  });

  await fetch(`${baseUrl}/api/youth-development/tde/observer/consent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      child_id: 'child-phase22',
      observer_id: 'obs-p1',
      observer_role: 'parent',
      relationship_duration: '3 years',
      consent_status: 'granted',
      consent_captured_at: '2026-04-17T00:00:00.000Z',
      consent_source: 'parent_portal_checkbox',
      provenance_source_type: 'parent_portal',
      provenance_source_ref: 'portal-form-phase22',
      submission_context: 'validation_study',
      tenant_id: 'tenant-phase22',
      audit_ref: 'audit-phase22-consent',
    }),
  });

  await fetch(`${baseUrl}/api/youth-development/tde/environment/hooks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      child_id: 'child-phase22',
      event_id: 'env-phase22-1',
      environment_factor: 'challenge_fit',
      event_type: 'rating',
      source_type: 'observer',
      source_ref: 'obs-p1',
      raw_value: 0.7,
      normalized_value: 0.7,
      confidence_weight: 0.75,
      timestamp: '2026-04-17T00:00:00.000Z',
      calibration_version: 'tde-calibration-v0',
      trace_ref: 'trace-env-phase22-1',
    }),
  });

  await fetch(`${baseUrl}/api/youth-development/tde/checkin/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      child_id: 'child-phase22',
      program_week: 4,
      completed_at: '2026-04-17T00:00:00.000Z',
      responses: {
        child: [
          { prompt_id: 'invalid-ignored', response_text: 'ignored' },
        ],
        parent: {
          parent_id: 'obs-p1',
          response_text: 'Observed steady persistence and better planning this week.',
          value: 3,
          confidence_weight: 0.8,
          observed_at: '2026-04-17T00:00:00.000Z',
        },
      },
    }),
  });

  await fetch(`${baseUrl}/api/youth-development/tde/exports/validation-data`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      job_id: 'phase22-export-1',
      study_type: 'inter_rater_reliability',
      tenant_id: 'tenant-phase22',
      requested_by: 'phase22-test',
      audit_ref: 'audit-phase22-export-1',
      selection: { child_ids: ['child-phase22'] },
    }),
  });
}

test('phase22 deterministic validation summary output from snapshot builder', () => {
  const snapshot = {
    enrollment: { child_id: 'child-phase22', calibration_version: 'tde-calibration-v0', current_week: 4 },
    observer_consents: [{ observer_role: 'parent', consent_status: 'granted' }],
    environment_hooks: [{ event_id: 'env-1', source_type: 'observer', trace_ref: 'trace-env-1', normalized_value: 0.7 }],
    development_checkins: [{
      checkin_due: true,
      evidence_map: [{
        evidence_id: 'ev-1',
        prompt_id: 'p-1',
        trace_ref: 'trace-1',
        value: 3,
        signal_type: 'improvement_delta',
        source_actor: 'parent',
      }],
    }],
    intervention_sessions: [],
    progress_records: [{
      week_number: 4,
      progress_id: 'pr-1',
      trait_signal_summary: { SR: 0.61 },
    }],
  };

  const first = buildValidationSummaryFromSnapshot('child-phase22', snapshot, { validation_exports: [] });
  const second = buildValidationSummaryFromSnapshot('child-phase22', snapshot, { validation_exports: [] });
  assert.deepEqual(first, second);
  assert.equal(first.validation_readiness.distinction_guard, 'validation_readiness_describes_evidence_not_child_ability');
});

test('phase22 evidence quality surfacing includes required reliability dimensions', () => {
  const summary = buildEvidenceQualitySummaryFromSnapshot({
    enrollment: { child_id: 'child-phase22', current_week: 2 },
    observer_consents: [],
    environment_hooks: [],
    development_checkins: [],
    intervention_sessions: [],
    progress_records: [],
  }, { child_id: 'child-phase22' });

  assert.equal(summary.ok, true);
  assert.equal(summary.evidence_quality.distinction_guard, 'evidence_quality_not_child_ability');
  assert.ok(Array.isArray(summary.evidence_quality.sparse_data_flags));
  assert.ok(Array.isArray(summary.evidence_quality.missing_contract_burden.missing_contracts));
  assert.equal(summary.evidence_quality.traceability_completeness.status, 'incomplete');
});

test('phase22 calibration summary integrity and explicit no-hidden-tuning guarantee', () => {
  const summary = buildCalibrationSummary({ calibration_versions: ['tde-calibration-v0'] });
  assert.equal(summary.ok, true);
  assert.deepEqual(summary.calibration_summary.active_calibration_versions, ['tde-calibration-v0']);
  assert.equal(summary.calibration_summary.hidden_tuning_behavior, 'none');
  assert.ok(summary.calibration_summary.outputs_relying_on_calibration_variables.length > 0);
});

test('phase22 additive routes are extension-safe and do not regress live youth v1 routes', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();
  try {
    await seedValidationData(app.baseUrl);

    const validationRes = await fetch(`${app.baseUrl}/api/youth-development/tde/validation/summary/child-phase22`);
    const validation = await validationRes.json();
    assert.equal(validationRes.status, 200);
    assert.equal(validation.ok, true);
    assert.equal(validation.validation_readiness.distinction_guard, 'validation_readiness_describes_evidence_not_child_ability');

    const evidenceRes = await fetch(`${app.baseUrl}/api/youth-development/tde/evidence-quality/child-phase22`);
    const evidence = await evidenceRes.json();
    assert.equal(evidenceRes.status, 200);
    assert.equal(evidence.ok, true);

    const calibrationRes = await fetch(`${app.baseUrl}/api/youth-development/tde/calibration/summary`);
    const calibration = await calibrationRes.json();
    assert.equal(calibrationRes.status, 200);
    assert.equal(calibration.ok, true);

    const existingSummaryRes = await fetch(`${app.baseUrl}/api/youth-development/tde/summary/child-phase22`);
    assert.equal(existingSummaryRes.status, 200);

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
