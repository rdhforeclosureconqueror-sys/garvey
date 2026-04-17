const test = require('node:test');
const assert = require('node:assert/strict');

const { extractSignalsFromEvidence } = require('../../youth-development/tde/signalExtractionService');
const { scoreTraitsFromSignals } = require('../../youth-development/tde/traitScoringService');
const { generateTraceableStatements } = require('../../youth-development/tde/reportStatementGenerator');
const { runTdePipeline } = require('../../youth-development/tde/pipelineService');

function sampleEvidence() {
  return {
    schema_version: '2.0',
    child_id: 'child-1',
    session_id: 'sess-1',
    evidence: [
      { evidence_id: 'e1', source_type: 'task_event', source_id: 'task-a', signal_type: 'strategy_use_presence', value: 1, trait_code: 'SR', observed_at: '2026-01-01T00:00:00.000Z' },
      { evidence_id: 'e2', source_type: 'observation', source_id: 'teacher-1', signal_type: 'context_consistency', value: 3, value_max: 4, trait_code: 'SR', observed_at: '2026-01-01T00:00:01.000Z' },
      { evidence_id: 'e3', source_type: 'task_event', source_id: 'task-b', signal_type: 'attempt_quality_change', value: 3, value_max: 4, trait_code: 'PS', observed_at: '2026-01-01T00:00:02.000Z' },
      { evidence_id: 'e4', source_type: 'observation', source_id: 'teacher-2', signal_type: 'reengagement_latency', value: 20, latency_max: 60, trait_code: 'PS', observed_at: '2026-01-01T00:00:03.000Z' },
      { evidence_id: 'bad', source_type: 'task_event', source_id: 'task-c', signal_type: 'inquiry_depth', value: 'n/a', trait_code: 'CQ' },
    ],
  };
}

test('deterministic signal extraction and bounded normalization', () => {
  const input = sampleEvidence();
  const first = extractSignalsFromEvidence(input);
  const second = extractSignalsFromEvidence(input);

  assert.deepEqual(first, second);
  assert.equal(first.extracted_signals.length, 4);
  assert.equal(first.rejected_evidence.length, 1);
  for (const signal of first.extracted_signals) {
    assert.ok(signal.normalized_value >= 0 && signal.normalized_value <= 1);
    assert.ok(signal.confidence_weight >= 0 && signal.confidence_weight <= 1);
    assert.equal(typeof signal.trace_ref, 'string');
  }
});

test('minimum source diversity enforcement and confidence separate from score', () => {
  const extraction = extractSignalsFromEvidence(sampleEvidence());
  const scoring = scoreTraitsFromSignals(extraction.extracted_signals);

  const sr = scoring.trait_results.find((t) => t.trait_code === 'SR');
  assert.equal(sr.evidence_sufficiency_status, 'SUFFICIENT');
  assert.equal(typeof sr.reported_trait_score, 'number');
  assert.equal(typeof sr.confidence_score, 'number');

  const singleSource = scoreTraitsFromSignals(extraction.extracted_signals.filter((signal) => signal.source_type === 'task_event'));
  const srSingle = singleSource.trait_results.find((t) => t.trait_code === 'SR');
  assert.equal(srSingle.evidence_sufficiency_status, 'INSUFFICIENT_SOURCE_DIVERSITY');
  assert.equal(srSingle.reported_trait_score, null);
  assert.equal(typeof srSingle.internal_partial_score, 'number');
});

test('statement traceability enforcement', () => {
  const extraction = extractSignalsFromEvidence(sampleEvidence());
  const scoring = scoreTraitsFromSignals(extraction.extracted_signals);
  const statements = generateTraceableStatements(scoring.trait_results, extraction.extracted_signals, {});

  assert.ok(statements.statements.length >= 1);
  for (const stmt of statements.statements) {
    assert.ok(stmt.statement_id);
    assert.ok(stmt.trait_code);
    assert.ok(Array.isArray(stmt.source_signals));
    assert.ok(stmt.source_signals.length >= 2);
    assert.ok(stmt.rule_used);
    assert.ok(stmt.confidence_context);
  }

  const brokenSignals = extraction.extracted_signals.map((signal) => ({ ...signal, trace_ref: null }));
  const none = generateTraceableStatements(scoring.trait_results, brokenSignals, {});
  assert.equal(none.statements.length, 0);
  assert.ok(none.skipped.length >= 1);
});

test('end-to-end pipeline determinism and persistence calls', async () => {
  const calls = [];
  const repository = {
    async persistSignals(runId, signals) { calls.push(['signals', runId, signals.length]); },
    async persistTraitScores(runId, calibrationVersion, traits) { calls.push(['traits', runId, calibrationVersion, traits.length]); },
    async persistStatements(runId, calibrationVersion, statements) { calls.push(['statements', runId, calibrationVersion, statements.length]); },
    async persistCalibrationRef(runId, calibrationVersion, ref) { calls.push(['calibration', runId, calibrationVersion, ref]); },
    async persistAuditLog(runId, payload) { calls.push(['audit', runId, payload.status]); },
  };

  const input = sampleEvidence();
  const first = await runTdePipeline(input, repository);
  const second = await runTdePipeline(input, repository);

  assert.deepEqual(first, second);
  assert.equal(first.deterministic, true);
  assert.ok(first.run_id);
  assert.ok(first.extracted_signals.length > 0);
  assert.ok(calls.some((entry) => entry[0] === 'audit'));
});
