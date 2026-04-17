const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createYouthDevelopmentTdeRouter } = require('../../server/youthDevelopmentTdeRoutes');
const { buildParentProgressSummary } = require('../../youth-development/tde/parentSummaryService');

function mountApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/youth-development/tde', createYouthDevelopmentTdeRouter());
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  return {
    baseUrl,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test('phase-4 observer consent contract and validation behavior are explicit', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();
  try {
    const contractRes = await fetch(`${app.baseUrl}/api/youth-development/tde/observer/contracts`);
    assert.equal(contractRes.status, 200);
    const contract = await contractRes.json();
    assert.equal(contract.contract.contract_type, 'observer_consent_provenance');

    const invalidRes = await fetch(`${app.baseUrl}/api/youth-development/tde/observer/consent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ child_id: 'child-gap' }),
    });
    const invalid = await invalidRes.json();
    assert.equal(invalidRes.status, 400);
    assert.equal(invalid.ok, false);
    assert.ok(invalid.missing_contracts.includes('observer_id_required'));

    const validRes = await fetch(`${app.baseUrl}/api/youth-development/tde/observer/consent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        child_id: 'child-gap',
        observer_id: 'obs-1',
        observer_role: 'parent',
        relationship_duration: '5 years',
        consent_status: 'granted',
        consent_captured_at: '2026-04-17T00:00:00.000Z',
        consent_source: 'parent_portal_checkbox',
        provenance_source_type: 'parent_portal',
        provenance_source_ref: 'portal-form-77',
        submission_context: 'program_enrollment',
        tenant_id: 'tenant-1',
        audit_ref: 'audit-1',
      }),
    });
    const valid = await validRes.json();
    assert.equal(validRes.status, 200);
    assert.equal(valid.ok, true);
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});

test('phase-4 environment event taxonomy and environment/child separation are enforced', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();
  try {
    const contractRes = await fetch(`${app.baseUrl}/api/youth-development/tde/environment/contracts`);
    const contract = await contractRes.json();
    assert.equal(contractRes.status, 200);
    assert.equal(contract.contract.contract_type, 'environment_target_hook_event');

    const invalidRes = await fetch(`${app.baseUrl}/api/youth-development/tde/environment/hooks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ child_id: 'child-env', environment_factor: 'invalid_factor' }),
    });
    const invalid = await invalidRes.json();
    assert.equal(invalidRes.status, 400);
    assert.ok(invalid.validation_errors.includes('environment_factor_invalid'));

    const validRes = await fetch(`${app.baseUrl}/api/youth-development/tde/environment/hooks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        child_id: 'child-env',
        event_id: 'env-1',
        environment_factor: 'challenge_fit',
        event_type: 'rating',
        source_type: 'observer',
        source_ref: 'obs-1',
        raw_value: 0.8,
        normalized_value: 0.8,
        confidence_weight: 0.7,
        timestamp: '2026-04-17T00:00:00.000Z',
        calibration_version: 'tde-calibration-v0',
        trace_ref: 'trace-env-1',
      }),
    });
    const valid = await validRes.json();
    assert.equal(validRes.status, 200);
    assert.equal(valid.separation_guard, 'environment_only_signal');
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});

test('phase-4 validation export endpoints are additive and deterministic', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();
  try {
    const schemaRes = await fetch(`${app.baseUrl}/api/youth-development/tde/exports/validation-schema`);
    const schema = await schemaRes.json();
    assert.equal(schemaRes.status, 200);
    assert.ok(schema.supported_study_types.includes('inter_rater_reliability'));

    const exportRes = await fetch(`${app.baseUrl}/api/youth-development/tde/exports/validation-data`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        study_type: 'inter_rater_reliability',
        tenant_id: 'tenant-1',
        requested_by: 'qa-user',
        selection: { child_ids: ['child-env'] },
      }),
    });
    const payload = await exportRes.json();
    assert.equal(exportRes.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.export.study_type, 'inter_rater_reliability');

    const invalidExportRes = await fetch(`${app.baseUrl}/api/youth-development/tde/exports/validation-data`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant_id: 'tenant-1', requested_by: 'qa-user', selection: {} }),
    });
    assert.equal(invalidExportRes.status, 400);
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});

test('phase-4 parent summary read model is deterministic and extension-safe', async () => {
  const snapshot = {
    enrollment: {
      current_week: 12,
      active_domain_interests: ['systems-design'],
      current_trait_targets: ['SR', 'PS'],
      current_environment_targets: ['challenge_fit', 'mentorship_access'],
    },
    progress_records: [
      { week_number: 1, checkpoint_record: { checkpoint_id: 'cp1', checkpoint_type: 'reassessment_checkpoint' } },
      { week_number: 12, checkpoint_record: { checkpoint_id: 'cp12', checkpoint_type: 'reassessment_checkpoint' } },
    ],
    observer_consents: [{ consent_status: 'granted' }],
    environment_hooks: [{ environment_factor: 'challenge_fit' }],
  };

  const first = buildParentProgressSummary('child-1', snapshot);
  const second = buildParentProgressSummary('child-1', snapshot);
  assert.deepEqual(first, second);
  assert.equal(first.extension_only, true);
  assert.equal(first.current_week, 12);
  assert.equal(first.confidence_context.confidence_label, 'early-signal');
});
