const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computeAgeBandFromDob,
  validateSignalsPayload,
  validateTracePayload,
} = require('../../youth-development/tdeValidation');

test('computeAgeBandFromDob is deterministic and stable for same inputs', () => {
  const a = computeAgeBandFromDob('2018-02-01', '2026-02-01T00:00:00.000Z');
  const b = computeAgeBandFromDob('2018-02-01', '2026-02-01T00:00:00.000Z');
  assert.equal(a, '8-9');
  assert.equal(b, '8-9');
});

test('signal validation enforces required governance fields and bounded values', () => {
  const validation = validateSignalsPayload({
    signals: [
      {
        signal_id: 'sig-1',
        trait_code: 'SR',
        signal_type: 'strategy_use_presence',
        normalized_value: 1.4,
        confidence_weight: -0.1,
        timestamp: '2026-04-17T00:00:00.000Z',
      },
    ],
  });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /normalized_value must be between 0 and 1/);
  assert.match(validation.errors.join(' '), /confidence_weight must be between 0 and 1/);
  assert.match(validation.errors.join(' '), /evidence_status_tag is required/);
  assert.match(validation.errors.join(' '), /calibration_version is required/);
  assert.match(validation.errors.join(' '), /trace_ref is required/);
});

test('signal validation preserves computed vs supplied age-band mismatch as audit event and keeps computed authoritative', () => {
  const validation = validateSignalsPayload({
    signals: [
      {
        signal_id: 'sig-2',
        trait_code: 'SR',
        signal_type: 'strategy_use_presence',
        normalized_value: 0.8,
        confidence_weight: 0.7,
        evidence_status_tag: 'RESEARCH_BACKED_CONSTRUCT',
        calibration_version: 'tde-calibration-v0',
        trace_ref: { event: 'x' },
        dob: '2018-02-01',
        assessment_date: '2026-04-01T00:00:00.000Z',
        age_band: '13-15',
        timestamp: '2026-04-01T00:00:00.000Z',
      },
    ],
  });

  assert.equal(validation.ok, true);
  assert.equal(validation.normalizedSignals[0].age_band, '8-9');
  assert.equal(validation.normalizedSignals[0].supplied_age_band, '13-15');
  assert.equal(validation.auditEvents.length, 1);
  assert.equal(validation.auditEvents[0].event_type, 'age_band_mismatch_detected');
});

test('trace validation enforces source diversity default behavior (no reported score when diversity < 2)', () => {
  const validation = validateTracePayload({
    trace_ref: { run_id: 'r1' },
    calibration_version: 'tde-calibration-v0',
    trait_rows: [
      { trait_code: 'SR', value: 71, source_types: ['task_event'] },
      { trait_code: 'CQ', value: 62, source_types: ['task_event', 'observation'] },
    ],
  });

  assert.equal(validation.ok, true);
  assert.equal(validation.result.reported_trait_rows.length, 1);
  assert.equal(validation.result.reported_trait_rows[0].trait_code, 'CQ');
  assert.equal(validation.result.internal_partial_rows.length, 1);
  assert.equal(validation.result.internal_partial_rows[0].status, 'insufficient_source_diversity');
  assert.equal(validation.auditEvents[0].event_type, 'insufficient_source_diversity');
});
