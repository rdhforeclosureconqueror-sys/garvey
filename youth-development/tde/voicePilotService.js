"use strict";

const { CALIBRATION_VARIABLES } = require("./constants");

const ROLLOUT_MODES = Object.freeze(["enabled", "hidden", "fallback_only", "preview_only"]);

function resolveVoiceRolloutMode(value) {
  const requested = String(value || process.env.TDE_VOICE_ROLLOUT_MODE || "enabled").trim().toLowerCase();
  return ROLLOUT_MODES.includes(requested) ? requested : "enabled";
}

function createVoicePilotService(options = {}) {
  function evaluateVisibility(context = {}) {
    const mode = resolveVoiceRolloutMode(context.rollout_mode || options.rollout_mode);
    const featureFlagEnabled = context.feature_flag_enabled !== false;
    const previewAllowed = context.preview_mode === true || context.is_internal_preview === true;
    const gatewayAvailability = String(context.gateway_status || "provider_unavailable") === "connected";
    const supportedAgeBands = Array.isArray(context.supported_age_bands)
      ? context.supported_age_bands
      : Array.isArray(CALIBRATION_VARIABLES.voice_architecture.age_band_voice_supported)
        ? CALIBRATION_VARIABLES.voice_architecture.age_band_voice_supported
        : ["8-10", "11-13", "14-16"];
    const ageBand = String(context.age_band || "").trim();
    const ageBandSupported = ageBand ? supportedAgeBands.includes(ageBand) : true;
    const voiceReadyContentPresent = context.voice_ready_content_present !== false;

    const reasons = [];

    if (!featureFlagEnabled) reasons.push("feature_flag_disabled");
    if (!ageBandSupported) reasons.push("age_band_not_supported");
    if (!voiceReadyContentPresent) reasons.push("voice_ready_content_missing");

    let visibility = "enabled";
    if (mode === "hidden") visibility = "hidden";
    else if (mode === "preview_only") visibility = previewAllowed ? "preview_only" : "hidden";
    else if (mode === "fallback_only") visibility = "fallback_only";

    if (mode === "preview_only" && !previewAllowed) reasons.push("preview_only_mode");
    if (!gatewayAvailability) reasons.push("gateway_unavailable");

    const shown = visibility !== "hidden" && featureFlagEnabled && ageBandSupported && voiceReadyContentPresent;
    const playbackMode = !shown
      ? "hidden"
      : visibility === "fallback_only"
        ? "fallback_only"
        : !gatewayAvailability
          ? "fallback_only"
          : visibility === "preview_only"
            ? "preview_only"
            : "enabled";

    return {
      ok: true,
      deterministic: true,
      extension_only: true,
      rollout_mode: mode,
      visibility,
      playback_mode: playbackMode,
      voice_shown: shown,
      checks: {
        feature_flag_enabled: featureFlagEnabled,
        preview_mode_allowed: previewAllowed,
        gateway_available: gatewayAvailability,
        age_band_supported: ageBandSupported,
        voice_ready_content_present: voiceReadyContentPresent,
      },
      reasons,
    };
  }

  function getPilotStatus(context = {}) {
    const decision = evaluateVisibility(context);
    return {
      ok: true,
      deterministic: true,
      extension_only: true,
      child_id: context.child_id || null,
      parent_report_id: context.parent_report_id || null,
      age_band: context.age_band || null,
      voice_decision: decision,
    };
  }

  return {
    evaluateVisibility,
    getPilotStatus,
    resolveVoiceRolloutMode,
  };
}

module.exports = {
  createVoicePilotService,
  resolveVoiceRolloutMode,
  ROLLOUT_MODES,
};
