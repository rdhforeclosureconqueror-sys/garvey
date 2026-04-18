"use strict";

const { deterministicId } = require("./constants");
const { validateSessionEvidenceContract } = require("./sessionEvidenceContract");

function normalizeInterventionEvidenceToSignals(payload = {}, options = {}) {
  const validated = validateSessionEvidenceContract(payload, options);
  if (!validated.ok) {
    return {
      ok: false,
      error: "session_evidence_invalid",
      validation_errors: validated.errors,
      validity_status: validated.validity_status,
      deterministic: true,
    };
  }

  const sessionId = String(payload.session_id || "").trim();
  const observedAt = String(payload.completed_at || new Date().toISOString());
  const evidence = [
    {
      evidence_id: deterministicId("isl", { session_id: sessionId, signal_type: "rule_adherence" }),
      source_type: "observation",
      source_id: `session:${sessionId}`,
      signal_type: "rule_adherence",
      value: validated.normalized.child_effort_rating,
      value_min: 0,
      value_max: 5,
      trait_code: "SR",
      evidence_status_tag: "INTERVENTION_SESSION_LOG",
      observed_at: observedAt,
      trace_ref: deterministicId("isl_trace", { session_id: sessionId, signal_type: "rule_adherence" }),
    },
    {
      evidence_id: deterministicId("isl", { session_id: sessionId, signal_type: "behavior_frequency" }),
      source_type: "task_event",
      source_id: `session:${sessionId}`,
      signal_type: "behavior_frequency",
      value: validated.normalized.child_choice_count,
      value_min: 0,
      value_max: 5,
      trait_code: "DE",
      evidence_status_tag: "INTERVENTION_SESSION_LOG",
      observed_at: observedAt,
      trace_ref: deterministicId("isl_trace", { session_id: sessionId, signal_type: "behavior_frequency" }),
    },
    {
      evidence_id: deterministicId("isl", { session_id: sessionId, signal_type: "reengagement_latency" }),
      source_type: "observation",
      source_id: `session:${sessionId}`,
      signal_type: "reengagement_latency",
      value: Math.max(1, Number(validated.normalized.duration_minutes || 1) - Number(validated.normalized.focus_duration_minutes || 0)),
      latency_max: Math.max(1, Number(validated.normalized.duration_minutes || 1)),
      trait_code: "PS",
      evidence_status_tag: "INTERVENTION_SESSION_LOG",
      observed_at: observedAt,
      trace_ref: deterministicId("isl_trace", { session_id: sessionId, signal_type: "reengagement_latency" }),
    },
  ];

  return {
    ok: true,
    validity_status: validated.validity_status,
    normalized_session: validated.normalized,
    intervention_signal_evidence: evidence,
    traceability_refs: validated.traceability_refs,
    deterministic: true,
    extension_only: true,
  };
}

module.exports = {
  normalizeInterventionEvidenceToSignals,
};
