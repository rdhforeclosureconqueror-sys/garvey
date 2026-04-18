"use strict";

const { CALIBRATION_VARIABLES, DEFAULT_CALIBRATION_VERSION } = require("./constants");
const { summarizeDevelopmentCheckins } = require("./developmentCheckinService");
const { buildInsightLayer } = require("./insightService");

const VALIDATION_OPS_SCHEMA_VERSION = "phase22-v1";

const VALIDATION_OPS_THRESHOLDS = Object.freeze({
  minimum_sources_for_sufficiency: 3,
  minimum_distinct_observer_roles: 2,
  sparse_signal_max: 6,
  minimum_traceability_ratio: 0.85,
});

const CALIBRATION_DEPENDENCY_MAP = Object.freeze([
  Object.freeze({ module: "signal_weight_profiles", rule_group: "trait_signal_weighting", outputs: ["trait_scores", "confidence_scores"] }),
  Object.freeze({ module: "confidence_formula_weights", rule_group: "confidence_weighting_formula", outputs: ["confidence_scores", "report_statements"] }),
  Object.freeze({ module: "report_statement_thresholds", rule_group: "statement_band_thresholds", outputs: ["report_statements"] }),
  Object.freeze({ module: "confidence_label_thresholds", rule_group: "confidence_labeling", outputs: ["report_statements", "insight_confidence_context"] }),
  Object.freeze({ module: "developmental_checkins", rule_group: "checkin_sufficiency_and_disagreement", outputs: ["checkin_summary", "readiness_inputs", "evidence_quality_summary"] }),
  Object.freeze({ module: "insight_layer", rule_group: "cross_source_insight_thresholds", outputs: ["insights", "validation_summary", "evidence_quality_summary"] }),
  Object.freeze({ module: "intervention_engine", rule_group: "adherence_and_session_planning", outputs: ["intervention_summary", "recommendations"] }),
  Object.freeze({ module: "growth_trajectory", rule_group: "trajectory_direction_thresholds", outputs: ["growth_trajectory", "personalization_summary"] }),
  Object.freeze({ module: "personalization_layer", rule_group: "adaptive_modifier_thresholds", outputs: ["personalization_summary", "recommendations_explanation"] }),
  Object.freeze({ module: "voice_architecture", rule_group: "voice_delivery_configuration", outputs: ["voice_sections", "voice_status"] }),
]);

function uniqueSorted(values = []) {
  return [...new Set(values.map((entry) => String(entry || "").trim()).filter(Boolean))].sort();
}

function countTraceableRows(rows = []) {
  return rows.filter((row) => Boolean(row?.trace_ref || row?.traceability_ref) && Boolean(row?.evidence_id || row?.event_id || row?.prompt_id)).length;
}

function collectEvidenceRows(snapshot = {}) {
  const checkins = Array.isArray(snapshot.development_checkins) ? snapshot.development_checkins : [];
  const environmentHooks = Array.isArray(snapshot.environment_hooks) ? snapshot.environment_hooks : [];
  const interventionSessions = Array.isArray(snapshot.intervention_sessions) ? snapshot.intervention_sessions : [];
  const progressRecords = Array.isArray(snapshot.progress_records) ? snapshot.progress_records : [];

  const checkinEvidenceRows = checkins.flatMap((entry) => (Array.isArray(entry.evidence_map) ? entry.evidence_map : []));
  const sessionEvidenceRows = interventionSessions.flatMap((entry) => (Array.isArray(entry.intervention_signal_evidence) ? entry.intervention_signal_evidence : []));
  const progressTraitRows = progressRecords.flatMap((entry) => {
    const summary = entry?.trait_signal_summary && typeof entry.trait_signal_summary === "object" ? entry.trait_signal_summary : null;
    if (!summary) return [];
    return Object.keys(summary).map((traitCode) => ({
      evidence_id: `progress_trait:${entry.progress_id || entry.week_number}:${traitCode}`,
      trace_ref: `progress:${entry.progress_id || entry.week_number}:${traitCode}`,
    }));
  });

  return {
    checkinEvidenceRows,
    sessionEvidenceRows,
    progressTraitRows,
    environmentHooks,
  };
}

function summarizeSourceSignals(snapshot = {}) {
  const { checkinEvidenceRows, sessionEvidenceRows, progressTraitRows, environmentHooks } = collectEvidenceRows(snapshot);
  const consentRows = Array.isArray(snapshot.observer_consents) ? snapshot.observer_consents : [];

  const streamCounts = {
    observer_consents: consentRows.length,
    environment_hooks: environmentHooks.length,
    development_checkins: checkinEvidenceRows.length,
    intervention_sessions: sessionEvidenceRows.length,
    milestone_progress: progressTraitRows.length,
  };

  const activeStreams = Object.entries(streamCounts).filter(([, count]) => count > 0).map(([stream]) => stream);
  const observerRoles = uniqueSorted(consentRows.map((entry) => entry?.observer_role));
  const sourceTypes = uniqueSorted([
    ...environmentHooks.map((entry) => entry?.source_type),
    ...checkinEvidenceRows.map((entry) => entry?.source_actor === "parent" ? "parent_observation" : "child_checkin"),
    ...sessionEvidenceRows.map((entry) => entry?.source_type || "intervention_session"),
  ]);

  const totalEvidenceRows = checkinEvidenceRows.length + sessionEvidenceRows.length + progressTraitRows.length + environmentHooks.length;
  const traceableRows = countTraceableRows(checkinEvidenceRows)
    + countTraceableRows(sessionEvidenceRows)
    + countTraceableRows(progressTraitRows)
    + countTraceableRows(environmentHooks);
  const traceabilityRatio = totalEvidenceRows ? Number((traceableRows / totalEvidenceRows).toFixed(3)) : 0;

  const sourceSufficiency = {
    status: activeStreams.length >= VALIDATION_OPS_THRESHOLDS.minimum_sources_for_sufficiency ? "sufficient" : "limited",
    active_stream_count: activeStreams.length,
    stream_counts: streamCounts,
    required_minimum_streams: VALIDATION_OPS_THRESHOLDS.minimum_sources_for_sufficiency,
  };

  const sourceDiversity = {
    status: observerRoles.length >= VALIDATION_OPS_THRESHOLDS.minimum_distinct_observer_roles || sourceTypes.length >= VALIDATION_OPS_THRESHOLDS.minimum_sources_for_sufficiency
      ? "diverse"
      : "narrow",
    observer_roles: observerRoles,
    source_types: sourceTypes,
    distinct_observer_role_count: observerRoles.length,
    distinct_source_type_count: sourceTypes.length,
  };

  return {
    source_sufficiency: sourceSufficiency,
    source_diversity: sourceDiversity,
    total_evidence_rows: totalEvidenceRows,
    traceability_ratio: traceabilityRatio,
    sparse_data: totalEvidenceRows <= VALIDATION_OPS_THRESHOLDS.sparse_signal_max,
    counts: streamCounts,
  };
}

function summarizeObserverDisagreement(snapshot = {}) {
  const checkins = Array.isArray(snapshot.development_checkins) ? snapshot.development_checkins : [];
  const summary = summarizeDevelopmentCheckins(checkins, {
    current_week: snapshot?.enrollment?.current_week || snapshot?.progress_records?.at(-1)?.week_number || 1,
  });
  return {
    available: checkins.length > 0,
    present: summary?.cross_source_disagreement?.present === true,
    disagreement_delta: Number(summary?.cross_source_disagreement?.disagreement_delta || 0),
    interpretation: summary?.cross_source_disagreement?.interpretation || "Observer disagreement is unavailable because checkin evidence is missing.",
    rule_path: "validation_ops/observer_disagreement/v1",
  };
}

function summarizeMissingContractBurden(snapshot = {}, insight = null, sourceSummary = null) {
  const missing = [];
  if (!snapshot?.enrollment) missing.push("program_enrollment_required_for_validation_readiness");
  if ((sourceSummary?.counts?.observer_consents || 0) === 0) missing.push("observer_consent_records_required");
  if ((sourceSummary?.counts?.environment_hooks || 0) === 0) missing.push("environment_hook_events_required");
  if ((sourceSummary?.counts?.development_checkins || 0) === 0) missing.push("development_checkin_evidence_required");
  if ((sourceSummary?.counts?.milestone_progress || 0) === 0) missing.push("milestone_progress_trait_summary_required");
  if ((sourceSummary?.traceability_ratio || 0) < VALIDATION_OPS_THRESHOLDS.minimum_traceability_ratio) {
    missing.push("traceability_ratio_below_minimum");
  }
  if (Array.isArray(insight?.missing_contracts)) missing.push(...insight.missing_contracts);

  const uniqueMissing = uniqueSorted(missing);
  return {
    missing_contracts: uniqueMissing,
    missing_contract_count: uniqueMissing.length,
    burden_level: uniqueMissing.length >= 5 ? "high" : uniqueMissing.length >= 2 ? "moderate" : uniqueMissing.length ? "low" : "none",
  };
}

function buildEvidenceQualitySummaryFromSnapshot(snapshot = {}, options = {}) {
  const childId = String(options.child_id || snapshot?.enrollment?.child_id || "").trim();
  const sourceSummary = summarizeSourceSignals(snapshot);
  const insight = buildInsightLayer(snapshot, { child_id: childId });
  const observerDisagreement = summarizeObserverDisagreement(snapshot);
  const missingContractBurden = summarizeMissingContractBurden(snapshot, insight, sourceSummary);
  const checkinSummary = summarizeDevelopmentCheckins(Array.isArray(snapshot.development_checkins) ? snapshot.development_checkins : [], {
    current_week: snapshot?.enrollment?.current_week || snapshot?.progress_records?.at(-1)?.week_number || 1,
  });

  const sparseFlags = uniqueSorted([
    ...(sourceSummary.sparse_data ? ["sparse_total_evidence"] : []),
    ...(sourceSummary.source_sufficiency.status === "limited" ? ["insufficient_source_streams"] : []),
    ...(sourceSummary.source_diversity.status === "narrow" ? ["narrow_source_diversity"] : []),
    ...(checkinSummary?.missing_data_flags || []),
  ]);

  return {
    ok: true,
    child_id: childId,
    deterministic: true,
    extension_only: true,
    schema_version: VALIDATION_OPS_SCHEMA_VERSION,
    evidence_quality: {
      source_sufficiency: sourceSummary.source_sufficiency,
      source_diversity: sourceSummary.source_diversity,
      sparse_data_flags: sparseFlags,
      observer_disagreement: observerDisagreement,
      traceability_completeness: {
        status: sourceSummary.traceability_ratio >= VALIDATION_OPS_THRESHOLDS.minimum_traceability_ratio ? "complete" : "incomplete",
        traceability_ratio: sourceSummary.traceability_ratio,
        minimum_ratio: VALIDATION_OPS_THRESHOLDS.minimum_traceability_ratio,
      },
      missing_contract_burden: missingContractBurden,
      distinction_guard: "evidence_quality_not_child_ability",
      interpretation: "Evidence quality summaries indicate data reliability and coverage, not intrinsic child capability.",
    },
    assumptions_vs_validated: {
      validated_from_available_evidence: [
        "source_sufficiency",
        "source_diversity",
        "sparse_data_flags",
        "traceability_completeness",
      ],
      still_assumptions_pending_validation: [
        "cross-setting stability without complete observer coverage",
        "causal interpretation of environment effects",
      ],
    },
  };
}

function buildReliabilityExportPackage(childId, snapshot = {}, evidenceQuality = null) {
  const eq = evidenceQuality || buildEvidenceQualitySummaryFromSnapshot(snapshot, { child_id: childId });
  const sourceCounts = eq.evidence_quality?.source_sufficiency?.stream_counts || {};
  return {
    package_contract: "tde_reliability_export_package",
    package_version: VALIDATION_OPS_SCHEMA_VERSION,
    child_id: childId,
    calibration_version: String(snapshot?.enrollment?.calibration_version || DEFAULT_CALIBRATION_VERSION),
    reliability_summary: {
      source_stream_counts: sourceCounts,
      source_sufficiency_status: eq.evidence_quality?.source_sufficiency?.status || "limited",
      source_diversity_status: eq.evidence_quality?.source_diversity?.status || "narrow",
      sparse_data_flags: eq.evidence_quality?.sparse_data_flags || [],
      traceability_ratio: eq.evidence_quality?.traceability_completeness?.traceability_ratio || 0,
      missing_contracts: eq.evidence_quality?.missing_contract_burden?.missing_contracts || [],
    },
    additive: true,
    deterministic: true,
    extension_only: true,
  };
}

function buildValidationSummaryFromSnapshot(childId, snapshot = {}, options = {}) {
  const evidenceQuality = buildEvidenceQualitySummaryFromSnapshot(snapshot, { child_id: childId });
  const insight = buildInsightLayer(snapshot, { child_id: childId });
  const reliabilityPackage = buildReliabilityExportPackage(childId, snapshot, evidenceQuality);
  const checkinSummary = summarizeDevelopmentCheckins(Array.isArray(snapshot.development_checkins) ? snapshot.development_checkins : [], {
    current_week: snapshot?.enrollment?.current_week || snapshot?.progress_records?.at(-1)?.week_number || 1,
  });

  const validationReadinessStatus =
    evidenceQuality.evidence_quality.source_sufficiency.status === "sufficient"
    && evidenceQuality.evidence_quality.traceability_completeness.status === "complete"
    && evidenceQuality.evidence_quality.missing_contract_burden.missing_contract_count <= 1
      ? "review_ready"
      : "needs_data_reinforcement";

  const validationExports = Array.isArray(options.validation_exports) ? options.validation_exports : [];
  const childExportRefs = validationExports
    .filter((entry) => Array.isArray(entry?.selection?.child_ids) && entry.selection.child_ids.map(String).includes(childId))
    .map((entry) => ({
      job_id: entry.job_id,
      study_type: entry.study_type,
      calibration_version: entry.calibration_version,
      audit_ref: entry.audit_ref,
    }))
    .sort((a, b) => `${a.job_id}`.localeCompare(`${b.job_id}`));

  return {
    ok: true,
    child_id: childId,
    deterministic: true,
    extension_only: true,
    schema_version: VALIDATION_OPS_SCHEMA_VERSION,
    validation_readiness: {
      status: validationReadinessStatus,
      readiness_reasoning: validationReadinessStatus === "review_ready"
        ? "Coverage, traceability, and contract burden satisfy current operator review minimums."
        : "Additional source coverage or contract completion is required before strong validation claims.",
      evidence_quality: evidenceQuality.evidence_quality,
      reliability_export_package: reliabilityPackage,
      calibration_review_summary: {
        calibration_version_in_use: String(snapshot?.enrollment?.calibration_version || DEFAULT_CALIBRATION_VERSION),
        threshold_groups_in_scope: ["insight_layer", "developmental_checkins", "growth_trajectory", "personalization_layer"],
        note: "Calibration review affects interpretation thresholds only and does not silently tune outputs.",
      },
      observer_disagreement: evidenceQuality.evidence_quality.observer_disagreement,
      traceability_completeness: evidenceQuality.evidence_quality.traceability_completeness,
      missing_contract_burden: evidenceQuality.evidence_quality.missing_contract_burden,
      missing_contracts: uniqueSorted([
        ...(insight?.missing_contracts || []),
        ...(evidenceQuality?.evidence_quality?.missing_contract_burden?.missing_contracts || []),
        ...(checkinSummary?.evidence_sufficiency?.missing_contracts || []),
      ]),
      validation_export_refs: childExportRefs,
      distinction_guard: "validation_readiness_describes_evidence_not_child_ability",
    },
  };
}

function listThresholdGroups() {
  return Object.entries(CALIBRATION_VARIABLES)
    .map(([group, values]) => ({
      group,
      variable_count: Object.keys(values || {}).filter((key) => !key.endsWith("_marker")).length,
      marker_count: Object.keys(values || {}).filter((key) => key.endsWith("_marker")).length,
    }))
    .sort((a, b) => `${a.group}`.localeCompare(`${b.group}`));
}

function buildCalibrationSummary(options = {}) {
  const calibrationVersions = uniqueSorted(options.calibration_versions || [DEFAULT_CALIBRATION_VERSION]);
  const thresholdGroups = listThresholdGroups();
  const outputDependency = CALIBRATION_DEPENDENCY_MAP.map((entry) => ({
    ...entry,
    outputs: uniqueSorted(entry.outputs),
  }));

  return {
    ok: true,
    deterministic: true,
    extension_only: true,
    schema_version: VALIDATION_OPS_SCHEMA_VERSION,
    calibration_summary: {
      active_calibration_versions: calibrationVersions,
      major_threshold_groups: thresholdGroups,
      impacted_modules_and_rules: outputDependency.map((entry) => ({
        module: entry.module,
        rule_group: entry.rule_group,
      })),
      outputs_relying_on_calibration_variables: outputDependency,
      hidden_tuning_behavior: "none",
      transparency_note: "Calibration summaries are explicit metadata only; no silent runtime tuning is introduced.",
    },
  };
}

async function getEvidenceQualitySummary(childId, repository) {
  const snapshot = await repository.getProgramSnapshot(childId);
  return buildEvidenceQualitySummaryFromSnapshot(snapshot, { child_id: childId });
}

async function getValidationSummary(childId, repository) {
  const [snapshot, exports] = await Promise.all([
    repository.getProgramSnapshot(childId),
    repository.listValidationExportLogs ? repository.listValidationExportLogs() : Promise.resolve([]),
  ]);
  return buildValidationSummaryFromSnapshot(childId, snapshot, { validation_exports: exports });
}

async function getCalibrationSummary(repository) {
  const versions = repository.listCalibrationVersions ? await repository.listCalibrationVersions() : [DEFAULT_CALIBRATION_VERSION];
  return buildCalibrationSummary({ calibration_versions: versions });
}

module.exports = {
  VALIDATION_OPS_SCHEMA_VERSION,
  VALIDATION_OPS_THRESHOLDS,
  buildEvidenceQualitySummaryFromSnapshot,
  buildValidationSummaryFromSnapshot,
  buildCalibrationSummary,
  buildReliabilityExportPackage,
  getEvidenceQualitySummary,
  getValidationSummary,
  getCalibrationSummary,
};
