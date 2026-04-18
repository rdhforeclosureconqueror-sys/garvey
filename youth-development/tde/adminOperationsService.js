"use strict";

const { DEFAULT_CALIBRATION_VERSION } = require("./constants");
const {
  getValidationSummary,
  getEvidenceQualitySummary,
  getCalibrationSummary,
} = require("./validationOperationsService");
const { getReadiness, getRollout } = require("./phase9ExtensionService");
const { resolveVoiceRolloutMode } = require("./voicePilotService");

const ADMIN_SCHEMA_VERSION = "phase23-v1";

function normalizeBooleanFlag(value, { defaultValue = false } = {}) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return defaultValue;
  return !(normalized === "0" || normalized === "false" || normalized === "off" || normalized === "no");
}

function getFeatureFlagState() {
  const extensionMode = String(process.env.TDE_EXTENSION_MODE || "off").trim().toLowerCase() || "off";
  const voiceFeatureEnabled = normalizeBooleanFlag(process.env.TDE_VOICE_FEATURE_ENABLED, { defaultValue: true });
  const voicePreviewEnabled = normalizeBooleanFlag(process.env.TDE_VOICE_PREVIEW_MODE, { defaultValue: false });
  const voiceRolloutMode = resolveVoiceRolloutMode(process.env.TDE_VOICE_ROLLOUT_MODE);

  return {
    tde_extension_mode: extensionMode,
    tde_extension_enabled: extensionMode !== "off",
    voice_feature_enabled: voiceFeatureEnabled,
    voice_preview_mode_enabled: voicePreviewEnabled,
    voice_rollout_mode: voiceRolloutMode,
    controllable_in_phase23: [
      "TDE_EXTENSION_MODE",
      "TDE_VOICE_FEATURE_ENABLED",
      "TDE_VOICE_PREVIEW_MODE",
      "TDE_VOICE_ROLLOUT_MODE",
    ],
    control_surface_mode: "env_config_view_only",
    hidden_behavior: "none",
  };
}

function buildRolloutVisibilitySummary(rollout = null, voiceConfig = null) {
  const rolloutMode = String(rollout?.rollout?.voice_rollout?.mode || voiceConfig?.voice_rollout_mode || resolveVoiceRolloutMode()).trim();
  const playbackMode = String(rollout?.rollout?.voice_rollout?.playback_mode || voiceConfig?.voice_playback_mode || "enabled").trim();
  const readinessStatus = String(rollout?.readiness?.readiness_status || "not_ready").trim();
  const tdeAvailability = String(rollout?.rollout?.tde_availability || "withheld").trim();

  return {
    current_rollout_mode: rolloutMode,
    preview_only_surfaces: rolloutMode === "preview_only" ? ["voice_checkin_playback", "voice_parent_sections"] : [],
    fallback_only_surfaces: playbackMode === "fallback_only" ? ["voice_checkin_playback", "voice_parent_sections"] : [],
    enabled_surfaces: tdeAvailability === "available"
      ? ["tde_summary", "tde_recommendations", "tde_intervention_summary"]
      : [],
    hidden_surfaces: rolloutMode === "hidden" ? ["voice_checkin_playback", "voice_parent_sections"] : [],
    voice_availability_status: String(voiceConfig?.voice_availability_status || "voice_temporarily_unavailable"),
    pilot_eligibility_summary: {
      tde_extension_eligible: tdeAvailability === "available",
      voice_child_eligible: voiceConfig?.pilot_visibility?.voice_shown === true,
      voice_parent_eligible: voiceConfig?.pilot_visibility?.voice_shown === true,
      readiness_status: readinessStatus,
      rollout_notes: rollout?.rollout?.explanation || "Rollout visibility is derived from additive readiness and voice config metadata.",
    },
    no_hidden_rollout_behavior: true,
  };
}

function buildMissingContractBurdenFromValidation(validation = null, fallback = []) {
  const missing = Array.isArray(validation?.validation_readiness?.missing_contracts)
    ? validation.validation_readiness.missing_contracts
    : fallback;
  const uniqueMissing = [...new Set(missing.map((entry) => String(entry || "").trim()).filter(Boolean))].sort();
  return {
    missing_contracts: uniqueMissing,
    missing_contract_count: uniqueMissing.length,
    burden_level: uniqueMissing.length >= 5 ? "high" : uniqueMissing.length >= 2 ? "moderate" : uniqueMissing.length ? "low" : "none",
  };
}

function buildValidationReadinessState(validation = null, childId = "") {
  if (!validation) {
    return {
      status: "scope_required",
      child_id_scope: childId || null,
      summary: "Validation readiness requires child_id scope for snapshot-derived metrics.",
      missing_contract_burden: buildMissingContractBurdenFromValidation(null, ["child_id_scope_required_for_validation_snapshot"]),
    };
  }

  return {
    status: validation.validation_readiness?.status || "needs_data_reinforcement",
    child_id_scope: childId || null,
    summary: validation.validation_readiness?.readiness_reasoning || "Validation readiness summary unavailable.",
    missing_contract_burden: buildMissingContractBurdenFromValidation(validation),
    validation_export_refs: validation.validation_readiness?.validation_export_refs || [],
  };
}

function buildEvidenceQualityState(evidence = null, childId = "") {
  if (!evidence) {
    return {
      status: "scope_required",
      child_id_scope: childId || null,
      sufficiency_burden: "unknown",
      traceability_burden: "unknown",
      source_diversity_weakness: "unknown",
      sparse_data_prevalence: "unknown",
      missing_contract_burden: {
        missing_contracts: ["child_id_scope_required_for_evidence_quality_snapshot"],
        missing_contract_count: 1,
        burden_level: "low",
      },
    };
  }

  const quality = evidence.evidence_quality || {};
  return {
    status: "available",
    child_id_scope: childId || null,
    sufficiency_burden: quality.source_sufficiency?.status === "sufficient" ? "low" : "elevated",
    traceability_burden: quality.traceability_completeness?.status === "complete" ? "low" : "elevated",
    source_diversity_weakness: quality.source_diversity?.status === "narrow" ? "present" : "not_present",
    sparse_data_prevalence: Array.isArray(quality.sparse_data_flags) && quality.sparse_data_flags.length > 0 ? "present" : "not_present",
    missing_contract_burden: quality.missing_contract_burden || {
      missing_contracts: [],
      missing_contract_count: 0,
      burden_level: "none",
    },
    traceability_ratio: quality.traceability_completeness?.traceability_ratio ?? 0,
  };
}

function buildCalibrationState(calibration = null) {
  const summary = calibration?.calibration_summary || {};
  const dependencyRows = Array.isArray(summary.outputs_relying_on_calibration_variables)
    ? summary.outputs_relying_on_calibration_variables
    : [];

  return {
    active_calibration_groups: Array.isArray(summary.major_threshold_groups)
      ? summary.major_threshold_groups.map((entry) => entry.group)
      : [],
    active_calibration_versions: Array.isArray(summary.active_calibration_versions)
      ? summary.active_calibration_versions
      : [DEFAULT_CALIBRATION_VERSION],
    key_threshold_families: Array.isArray(summary.major_threshold_groups)
      ? summary.major_threshold_groups.map((entry) => ({
        group: entry.group,
        variable_count: entry.variable_count,
      }))
      : [],
    modules_depending_on_calibration_variables: dependencyRows.map((entry) => entry.module),
    major_output_areas_influenced_by_calibration: [...new Set(dependencyRows.flatMap((entry) => entry.outputs || []))].sort(),
    no_silent_calibration_mutation: true,
  };
}

async function getScopedChildId(options = {}) {
  return String(options.child_id || "").trim();
}

async function getAdminOverview(options = {}) {
  const repository = options.repository;
  const childId = await getScopedChildId(options);
  const voiceService = options.voiceService;

  const feature_flags = getFeatureFlagState();
  const [validation, evidence, calibration, readiness, rollout, voiceConfig] = await Promise.all([
    childId ? getValidationSummary(childId, repository) : Promise.resolve(null),
    childId ? getEvidenceQualitySummary(childId, repository) : Promise.resolve(null),
    getCalibrationSummary(repository),
    childId ? getReadiness(childId, repository) : Promise.resolve(null),
    childId ? getRollout(childId, repository) : Promise.resolve(null),
    voiceService?.getConfig ? voiceService.getConfig() : Promise.resolve(null),
  ]);

  return {
    ok: true,
    deterministic: true,
    extension_only: true,
    schema_version: ADMIN_SCHEMA_VERSION,
    child_id_scope: childId || null,
    admin_overview: {
      rollout_status: buildRolloutVisibilitySummary(rollout ? { readiness, rollout: rollout.rollout } : null, voiceConfig),
      feature_flag_state: feature_flags,
      calibration_state: buildCalibrationState(calibration),
      validation_readiness_state: buildValidationReadinessState(validation, childId),
      evidence_quality_state: buildEvidenceQualityState(evidence, childId),
      missing_contract_burden: buildMissingContractBurdenFromValidation(
        validation,
        childId ? [] : ["child_id_scope_required_for_validation_snapshot"]
      ),
      control_mode: "operator_visibility_with_explicit_env_controls",
      hidden_rollout_behavior: "none",
      hidden_calibration_behavior: "none",
    },
  };
}

async function getAdminRolloutStatus(options = {}) {
  const repository = options.repository;
  const childId = await getScopedChildId(options);
  const voiceService = options.voiceService;
  const voiceConfig = voiceService?.getConfig ? await voiceService.getConfig() : null;
  const readiness = childId ? await getReadiness(childId, repository) : null;
  const rollout = childId ? await getRollout(childId, repository) : null;

  return {
    ok: true,
    deterministic: true,
    extension_only: true,
    schema_version: ADMIN_SCHEMA_VERSION,
    child_id_scope: childId || null,
    rollout_status: buildRolloutVisibilitySummary(rollout ? { readiness, rollout: rollout.rollout } : null, voiceConfig),
  };
}

async function getAdminFeatureFlags() {
  return {
    ok: true,
    deterministic: true,
    extension_only: true,
    schema_version: ADMIN_SCHEMA_VERSION,
    feature_flags: getFeatureFlagState(),
  };
}

async function getAdminValidationStatus(options = {}) {
  const repository = options.repository;
  const childId = await getScopedChildId(options);
  const validation = childId ? await getValidationSummary(childId, repository) : null;

  return {
    ok: true,
    deterministic: true,
    extension_only: true,
    schema_version: ADMIN_SCHEMA_VERSION,
    child_id_scope: childId || null,
    validation_status: buildValidationReadinessState(validation, childId),
    missing_contract_burden: buildMissingContractBurdenFromValidation(validation, ["child_id_scope_required_for_validation_snapshot"]),
  };
}

async function getAdminEvidenceQualityOverview(options = {}) {
  const repository = options.repository;
  const childId = await getScopedChildId(options);
  const evidence = childId ? await getEvidenceQualitySummary(childId, repository) : null;

  return {
    ok: true,
    deterministic: true,
    extension_only: true,
    schema_version: ADMIN_SCHEMA_VERSION,
    child_id_scope: childId || null,
    evidence_quality_overview: buildEvidenceQualityState(evidence, childId),
  };
}

module.exports = {
  ADMIN_SCHEMA_VERSION,
  getAdminOverview,
  getAdminRolloutStatus,
  getAdminFeatureFlags,
  getAdminValidationStatus,
  getAdminEvidenceQualityOverview,
  buildRolloutVisibilitySummary,
  buildCalibrationState,
  buildEvidenceQualityState,
  buildValidationReadinessState,
};
