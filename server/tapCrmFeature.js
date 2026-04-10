"use strict";

const FEATURE_MODES = new Set(["off", "internal", "on"]);

function getTapCrmMode() {
  const raw = String(process.env.TAP_CRM_MODE || process.env.TAP_CRM || "off")
    .trim()
    .toLowerCase();
  return FEATURE_MODES.has(raw) ? raw : "off";
}

function isTapCrmEnabled() {
  return getTapCrmMode() !== "off";
}

module.exports = {
  getTapCrmMode,
  isTapCrmEnabled,
};
