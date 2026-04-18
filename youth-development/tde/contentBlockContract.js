"use strict";

const { CALIBRATION_VARIABLES, deterministicId } = require("./constants");

const UNIVERSAL_CONTENT_BLOCK_CONTRACT = Object.freeze({
  contract_name: "universal_readable_playable_content_block",
  contract_version: "phase20-v1",
  required_fields: Object.freeze([
    "content_block_id",
    "section_key",
    "text_content",
    "voice_ready",
    "voice_text",
    "voice_chunk_id",
    "playback_optional",
    "source_module",
    "registration_status",
  ]),
  optional_fields: Object.freeze([
    "age_band",
    "readability_level",
  ]),
  registration_status_values: Object.freeze(["registered", "contract_missing"]),
});

function normalizeBoolean(value, defaultValue = false) {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === 1 || value === "true") return true;
  if (value === "0" || value === 0 || value === "false") return false;
  return defaultValue;
}

function toRegistrationBase(input = {}, options = {}) {
  const sectionKey = String(input.section_key || input.prompt_key || "").trim();
  const textContent = String(input.text_content || "").trim();
  const voiceText = String(input.voice_text || textContent).trim();
  const sourceModule = String(input.source_module || options.source_module || "unknown_module").trim() || "unknown_module";
  const childId = String(options.child_id || input.child_id || "").trim();

  const missingContracts = [
    ...(sectionKey ? [] : ["section_key_required"]),
    ...(textContent ? [] : ["text_content_required"]),
    ...(voiceText ? [] : ["voice_text_required"]),
    ...(sourceModule ? [] : ["source_module_required"]),
  ];

  const voiceReady = normalizeBoolean(input.voice_ready, true);
  const playbackOptional = normalizeBoolean(input.playback_optional, true);
  const readabilityLevel = String(
    input.readability_level
      || CALIBRATION_VARIABLES.readability_voice_architecture.default_readability_level
      || "parent_standard"
  ).trim();

  const contentBlockId = String(input.content_block_id || "").trim()
    || deterministicId("content_block", {
      child_id: childId || "unscoped",
      source_module: sourceModule,
      section_key: sectionKey || "missing_section",
      text_content: textContent,
    });

  const voiceChunkId = String(input.voice_chunk_id || "").trim()
    || deterministicId("voice_chunk", {
      content_block_id: contentBlockId,
      child_id: childId || "unscoped",
      source_module: sourceModule,
      section_key: sectionKey || "missing_section",
      voice_text: voiceText,
    });

  return {
    content_block_id: contentBlockId,
    section_key: sectionKey,
    text_content: textContent,
    voice_ready: voiceReady,
    voice_text: voiceText,
    voice_chunk_id: voiceChunkId,
    playback_optional: playbackOptional,
    age_band: input.age_band ? String(input.age_band).trim() : null,
    readability_level: readabilityLevel,
    source_module: sourceModule,
    registration_status: missingContracts.length ? "contract_missing" : "registered",
    missing_contracts: missingContracts,
    extension_only: true,
    deterministic: true,
  };
}

module.exports = {
  UNIVERSAL_CONTENT_BLOCK_CONTRACT,
  toRegistrationBase,
};
