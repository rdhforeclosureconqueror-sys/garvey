"use strict";

const { CALIBRATION_VARIABLES, DEFAULT_CALIBRATION_VERSION, deterministicId } = require("./constants");

function confidenceLabel(score) {
  if (!Number.isFinite(score)) return "unknown";
  if (score <= CALIBRATION_VARIABLES.confidence_label_thresholds.low_max) return "low";
  if (score <= CALIBRATION_VARIABLES.confidence_label_thresholds.medium_max) return "medium";
  return "high";
}

function scoreBand(score) {
  if (!Number.isFinite(score)) return "insufficient";
  if (score <= CALIBRATION_VARIABLES.report_statement_thresholds.low_max) return "emerging";
  if (score >= CALIBRATION_VARIABLES.report_statement_thresholds.high_min) return "strong";
  return "developing";
}

function generateTraceableStatements(traitResults = [], normalizedSignals = [], options = {}) {
  const signalById = new Map(normalizedSignals.map((signal) => [signal.signal_id, signal]));
  const statements = [];
  const skipped = [];

  for (const trait of traitResults) {
    if (!Number.isFinite(trait?.reported_trait_score)) continue;

    const sourceSignals = (trait.source_signals || []).map((id) => signalById.get(id)).filter(Boolean);
    const traceable = sourceSignals.length >= 2
      && sourceSignals.every((signal) => signal.signal_id && signal.trace_ref && signal.source_type);

    if (!traceable) {
      skipped.push({ trait_code: trait.trait_code, reason: "traceability_requirements_not_met" });
      continue;
    }

    const statement = {
      statement_id: deterministicId("stmt", {
        trait_code: trait.trait_code,
        score: trait.reported_trait_score,
        signals: sourceSignals.map((signal) => signal.signal_id),
      }),
      trait_code: trait.trait_code,
      environment_factor: null,
      statement_text: `${trait.trait_name} appears ${scoreBand(trait.reported_trait_score)} with ${confidenceLabel(trait.confidence_score)} confidence based on multi-source evidence.`,
      source_signals: sourceSignals.map((signal) => ({
        signal_id: signal.signal_id,
        trace_ref: signal.trace_ref,
        source_type: signal.source_type,
      })),
      rule_used: "trait_statement_v1_calibration_variable",
      confidence_context: {
        confidence_score: trait.confidence_score,
        confidence_label: confidenceLabel(trait.confidence_score),
        evidence_sufficiency_status: trait.evidence_sufficiency_status,
        adherence_quality: trait.confidence_context?.adherence_quality || "UNKNOWN",
        missed_planned_sessions: trait.confidence_context?.missed_planned_sessions || 0,
        adherence_note: trait.confidence_context?.confidence_adjustment_reason || null,
        interpretive_guard: "weak_adherence_not_child_limitation",
      },
      calibration_version: String(options.calibration_version || DEFAULT_CALIBRATION_VERSION),
    };

    statements.push(statement);
  }

  return {
    statements,
    skipped,
  };
}

module.exports = {
  generateTraceableStatements,
};
