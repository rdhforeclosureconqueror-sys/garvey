"use strict";

const crypto = require("node:crypto");

const EVIDENCE_STATUS_TAG = Object.freeze({
  RESEARCH_BACKED_CONSTRUCT: "RESEARCH_BACKED_CONSTRUCT",
  OPERATIONAL_SYSTEM_CONSTRUCT: "OPERATIONAL_SYSTEM_CONSTRUCT",
  CALIBRATION_VARIABLE: "CALIBRATION_VARIABLE",
});

const TRAIT_EVIDENCE_STATUS = Object.freeze({
  SR: EVIDENCE_STATUS_TAG.RESEARCH_BACKED_CONSTRUCT,
  CQ: EVIDENCE_STATUS_TAG.RESEARCH_BACKED_CONSTRUCT,
  CR: EVIDENCE_STATUS_TAG.RESEARCH_BACKED_CONSTRUCT,
  RS: EVIDENCE_STATUS_TAG.RESEARCH_BACKED_CONSTRUCT,
  PS: EVIDENCE_STATUS_TAG.RESEARCH_BACKED_CONSTRUCT,
  FB: EVIDENCE_STATUS_TAG.OPERATIONAL_SYSTEM_CONSTRUCT,
  DE: EVIDENCE_STATUS_TAG.RESEARCH_BACKED_CONSTRUCT,
});

const SOURCE_TYPE_BY_EVIDENCE_SOURCE = Object.freeze({
  child_task: "task_event",
  child_scenario: "item_response",
  child_retry: "task_event",
  parent_observation: "observation",
  teacher_observation: "observation",
  assessor_observation: "observation",
});

const DEFAULT_CALIBRATION_VERSION = "tde-calibration-v0";

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function resolveEvidenceStatusTag(traitCode, explicitTag) {
  if (explicitTag && Object.values(EVIDENCE_STATUS_TAG).includes(explicitTag)) {
    return explicitTag;
  }

  return TRAIT_EVIDENCE_STATUS[traitCode] || EVIDENCE_STATUS_TAG.CALIBRATION_VARIABLE;
}

function resolveSourceType(evidenceSource) {
  return SOURCE_TYPE_BY_EVIDENCE_SOURCE[evidenceSource] || "unknown";
}

function createDeterministicSignalId(parts) {
  const joined = parts.map((part) => String(part ?? "")).join("|");
  return `sig_${crypto.createHash("sha1").update(joined).digest("hex").slice(0, 16)}`;
}

module.exports = {
  EVIDENCE_STATUS_TAG,
  TRAIT_EVIDENCE_STATUS,
  SOURCE_TYPE_BY_EVIDENCE_SOURCE,
  DEFAULT_CALIBRATION_VERSION,
  clamp01,
  resolveEvidenceStatusTag,
  resolveSourceType,
  createDeterministicSignalId,
};
