"use strict";

const { CALIBRATION_VARIABLES, TRAIT_DEFINITIONS } = require("./constants");

const PILLAR_ORDER = Object.freeze(["SR", "CQ", "CR", "RS", "PS", "FB", "DE"]);

function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric <= 0) return 0;
  if (numeric >= 1) return 1;
  return numeric;
}

function average(rows = []) {
  if (!rows.length) return 0;
  return rows.reduce((sum, row) => sum + clamp01(row.normalized_value), 0) / rows.length;
}

function toIso(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text;
}

function normalizeScore(value, max = 4) {
  const numeric = Number(value);
  const maxNumeric = Number(max);
  if (!Number.isFinite(numeric) || !Number.isFinite(maxNumeric) || maxNumeric <= 0) return 0;
  return clamp01(numeric / maxNumeric);
}

function normalizeEvidence(evidence = {}, fallback = {}) {
  return {
    trait_code: String(evidence.trait_code || fallback.trait_code || "").trim(),
    normalized_value: Number.isFinite(Number(evidence.normalized_value))
      ? clamp01(Number(evidence.normalized_value))
      : normalizeScore(evidence.value, evidence.value_max || 4),
    source_stream: String(fallback.source_stream || evidence.source_type || "unknown_source").trim(),
    observed_at: toIso(evidence.observed_at || fallback.observed_at),
    trace_ref: String(evidence.trace_ref || "").trim(),
    evidence_ref: String(evidence.evidence_id || evidence.event_id || evidence.prompt_id || fallback.evidence_ref || "").trim(),
    source_id: String(evidence.source_id || fallback.source_id || "").trim(),
    source_actor: String(evidence.source_actor || fallback.source_actor || "").trim() || null,
    rule_path: String(fallback.rule_path || "").trim(),
  };
}

function collectSourceSignals(snapshot = {}) {
  const signals = [];
  const missingContracts = [];

  const interventionSessions = Array.isArray(snapshot.intervention_sessions) ? snapshot.intervention_sessions : [];
  for (const session of interventionSessions) {
    const evidence = Array.isArray(session.intervention_signal_evidence) ? session.intervention_signal_evidence : [];
    if (!evidence.length) {
      missingContracts.push("intervention_signal_evidence_missing");
    }
    for (const row of evidence) {
      signals.push(normalizeEvidence(row, {
        source_stream: "intervention_sessions",
        observed_at: session.completed_at,
        source_id: session.session_id,
        rule_path: "insight_layer/source/intervention_sessions",
      }));
    }
  }

  const developmentCheckins = Array.isArray(snapshot.development_checkins) ? snapshot.development_checkins : [];
  for (const checkin of developmentCheckins) {
    const evidenceMap = Array.isArray(checkin.evidence_map) ? checkin.evidence_map : [];
    if (!evidenceMap.length) {
      missingContracts.push("development_checkin_evidence_map_missing");
    }
    for (const row of evidenceMap) {
      signals.push(normalizeEvidence(row, {
        source_stream: row.source_actor === "parent" ? "parent_observations" : "development_checkins",
        observed_at: checkin.completed_at,
        source_id: checkin.checkin_id,
        source_actor: row.source_actor,
        rule_path: row.source_actor === "parent"
          ? "insight_layer/source/parent_observations"
          : "insight_layer/source/development_checkins",
      }));
    }
  }

  const progressRecords = Array.isArray(snapshot.progress_records) ? snapshot.progress_records : [];
  for (const progress of progressRecords) {
    const summary = progress?.trait_signal_summary && typeof progress.trait_signal_summary === "object"
      ? progress.trait_signal_summary
      : null;
    if (!summary) continue;

    for (const [traitCode, traitScore] of Object.entries(summary)) {
      signals.push(normalizeEvidence({
        trait_code: traitCode,
        normalized_value: traitScore,
        trace_ref: `progress:${progress.progress_id || progress.week_number}:${traitCode}`,
        evidence_id: `progress_trait:${progress.progress_id || progress.week_number}:${traitCode}`,
      }, {
        source_stream: "milestone_assessments",
        observed_at: progress.completed_at,
        source_id: progress.progress_id,
        rule_path: "insight_layer/source/milestone_assessments",
      }));
    }
  }

  const environmentHooks = Array.isArray(snapshot.environment_hooks) ? snapshot.environment_hooks : [];
  if (!environmentHooks.length) {
    missingContracts.push("environment_signals_missing");
  }
  for (const env of environmentHooks) {
    const taggedTrait = String(env.trait_code || env?.event_payload?.trait_code || "").trim();
    signals.push(normalizeEvidence({
      trait_code: taggedTrait,
      normalized_value: env.normalized_value,
      trace_ref: env.trace_ref,
      event_id: env.event_id,
      source_id: env.source_ref,
    }, {
      source_stream: "environment_signals",
      observed_at: env.timestamp,
      source_id: env.event_id,
      rule_path: "insight_layer/source/environment_signals",
    }));
  }

  return {
    signals,
    missing_contracts: [...new Set(missingContracts)].sort(),
  };
}

function buildConfidenceContext(rows = [], sourceCount = 0) {
  const calibration = CALIBRATION_VARIABLES.insight_layer || {};
  const sparseMax = Number(calibration.sparse_data_max_signals || 6);
  const moderateMin = Number(calibration.moderate_data_min_signals || 12);
  const highMin = Number(calibration.high_data_min_signals || 24);
  const minSourcesForModerate = Number(calibration.minimum_source_streams_for_moderate || 3);

  const signalCount = rows.length;
  let label = "low";
  if (signalCount >= highMin && sourceCount >= minSourcesForModerate + 1) label = "high";
  else if (signalCount >= moderateMin && sourceCount >= minSourcesForModerate) label = "moderate";
  else if (signalCount > sparseMax) label = "emerging";

  return {
    confidence_label: label,
    signal_count: signalCount,
    source_stream_count: sourceCount,
    sparse_data: signalCount <= sparseMax,
    rule_path: "insight_layer/confidence_context/v1",
  };
}

function toTrace(rows = [], limit = 5) {
  return rows.slice(0, limit).map((row) => ({
    source_stream: row.source_stream,
    source_id: row.source_id || null,
    evidence_ref: row.evidence_ref || null,
    trace_ref: row.trace_ref || null,
    observed_at: row.observed_at || null,
    rule_path: row.rule_path,
  }));
}

function summarizePillar(pillarCode, allRows, confidenceContext) {
  const calibration = CALIBRATION_VARIABLES.insight_layer || {};
  const strengthenMin = Number(calibration.strengthening_min_average || 0.62);
  const hinderMax = Number(calibration.hindering_max_average || 0.42);
  const inconsistencyGap = Number(calibration.inconsistency_gap_threshold || 0.28);

  const pillarRows = allRows.filter((row) => row.trait_code === pillarCode);
  const childRows = pillarRows.filter((row) => row.source_stream !== "environment_signals");
  const environmentRows = allRows.filter((row) => row.source_stream === "environment_signals" && (!row.trait_code || row.trait_code === pillarCode));

  const childAverage = average(childRows);
  const environmentAverage = average(environmentRows);
  const sourceAverages = new Map();
  for (const row of pillarRows) {
    if (!sourceAverages.has(row.source_stream)) sourceAverages.set(row.source_stream, []);
    sourceAverages.get(row.source_stream).push(row);
  }
  const perSource = [...sourceAverages.entries()].map(([source, rows]) => ({ source, score: average(rows), rows }));
  const sourceScores = perSource.map((entry) => entry.score);
  const spread = sourceScores.length > 1 ? Math.max(...sourceScores) - Math.min(...sourceScores) : 0;

  const strengthening = childAverage >= strengthenMin
    ? `Child-side ${TRAIT_DEFINITIONS[pillarCode].name} pattern appears to be strengthening across available sources.`
    : `Child-side ${TRAIT_DEFINITIONS[pillarCode].name} strengthening is not yet consistent.`;

  const inconsistent = spread >= inconsistencyGap
    ? `Cross-source variation is elevated for ${TRAIT_DEFINITIONS[pillarCode].name}; interpretation should stay provisional.`
    : `Cross-source variation is currently limited for ${TRAIT_DEFINITIONS[pillarCode].name}.`;

  const helps = environmentAverage >= strengthenMin
    ? `Environment signals linked to ${TRAIT_DEFINITIONS[pillarCode].name} appear supportive in the current window.`
    : `Environment supports linked to ${TRAIT_DEFINITIONS[pillarCode].name} are not yet consistently enabling.`;

  const hinders = environmentAverage > 0 && environmentAverage <= hinderMax
    ? `Environment friction is present and may limit expression of ${TRAIT_DEFINITIONS[pillarCode].name}.`
    : `No strong environment hindrance signal is currently isolated for ${TRAIT_DEFINITIONS[pillarCode].name}.`;

  return {
    pillar_code: pillarCode,
    pillar_name: TRAIT_DEFINITIONS[pillarCode].name,
    child_pattern: {
      summary: strengthening,
      average_signal: Number(childAverage.toFixed(3)),
      source_count: [...new Set(childRows.map((row) => row.source_stream))].length,
      traceability: toTrace(childRows),
      rule_path: "insight_layer/pillar/child_pattern/v1",
    },
    environment_pattern: {
      summary: `${helps} ${hinders}`,
      average_signal: Number(environmentAverage.toFixed(3)),
      source_count: [...new Set(environmentRows.map((row) => row.source_stream))].length,
      traceability: toTrace(environmentRows),
      rule_path: "insight_layer/pillar/environment_pattern/v1",
    },
    consistency_adherence_pattern: {
      summary: inconsistent,
      cross_source_spread: Number(spread.toFixed(3)),
      source_breakdown: perSource.map((entry) => ({
        source_stream: entry.source,
        average_signal: Number(entry.score.toFixed(3)),
        traceability: toTrace(entry.rows, 2),
      })),
      rule_path: "insight_layer/pillar/consistency_pattern/v1",
    },
    pillar_summary: {
      strengthening,
      inconsistent,
      context_helpful: helps,
      context_hindering: hinders,
      confidence_limitations: confidenceContext.sparse_data
        ? "Sparse cross-source evidence lowers confidence; continue data collection before strong conclusions."
        : "Confidence remains bounded by source consistency and traceability coverage.",
      confidence_label: confidenceContext.confidence_label,
      rule_path: "insight_layer/pillar/summary/v1",
    },
  };
}

function buildInsightLayer(snapshot = {}, options = {}) {
  const childId = String(options.child_id || snapshot?.enrollment?.child_id || "").trim();
  const { signals, missing_contracts } = collectSourceSignals(snapshot);
  const sourceStreamCount = new Set(signals.map((row) => row.source_stream)).size;
  const confidenceContext = buildConfidenceContext(signals, sourceStreamCount);

  const pillarInsights = PILLAR_ORDER.map((pillarCode) => summarizePillar(pillarCode, signals, confidenceContext));
  const traceableSignals = signals.filter((row) => row.trace_ref && row.evidence_ref).length;

  return {
    ok: true,
    child_id: childId,
    deterministic: true,
    extension_only: true,
    insight_schema_version: "phase17-v1",
    confidence_context: confidenceContext,
    cross_source_insight_summary: {
      source_streams: [...new Set(signals.map((row) => row.source_stream))].sort(),
      traceability_ratio: signals.length ? Number((traceableSignals / signals.length).toFixed(3)) : 0,
      total_signals: signals.length,
      rule_path: "insight_layer/cross_source_summary/v1",
    },
    pillar_insights: pillarInsights,
    missing_contracts,
    contracts_status: missing_contracts.length ? "incomplete" : "complete",
  };
}

module.exports = {
  buildInsightLayer,
};
