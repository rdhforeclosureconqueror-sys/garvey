"use strict";

const FEATURE_MODES = new Set(["off", "internal", "on"]);

function normalizeTapCrmMode(rawValue) {
  const raw = String(rawValue || "")
    .trim()
    .toLowerCase();
  if (!raw) return "off";
  if (FEATURE_MODES.has(raw)) return raw;
  if (["1", "true", "yes", "enabled"].includes(raw)) return "on";
  if (["0", "false", "no", "disabled"].includes(raw)) return "off";
  return "off";
}

function getTapCrmMode() {
  return normalizeTapCrmMode(process.env.TAP_CRM_MODE || process.env.TAP_CRM || "off");
}

function isTapCrmEnabled() {
  return getTapCrmMode() !== "off";
}

module.exports = {
  getTapCrmMode,
  isTapCrmEnabled,
};
