"use strict";

const { deterministicId } = require("./constants");

function normalizeBoolean(value, defaultValue = false) {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === 1 || value === "true") return true;
  if (value === "0" || value === 0 || value === "false") return false;
  return defaultValue;
}

function registerVoiceReadableContentBlock(input = {}, options = {}) {
  const scope = String(options.scope || input.scope || "tde_content").trim() || "tde_content";
  const sectionKey = String(input.section_key || input.prompt_key || "").trim();
  const textContent = String(input.text_content || "").trim();
  const voiceText = String(input.voice_text || textContent).trim();
  const childId = String(options.child_id || input.child_id || "").trim();

  const missingContracts = [
    ...(sectionKey ? [] : ["section_key_required"]),
    ...(textContent ? [] : ["text_content_required"]),
    ...(voiceText ? [] : ["voice_text_required"]),
  ];

  const voiceReady = normalizeBoolean(input.voice_ready, true);
  const playbackOptional = normalizeBoolean(input.playback_optional, true);

  const voiceChunkId = String(input.voice_chunk_id || "").trim()
    || deterministicId("voice_chunk", {
      child_id: childId || "unscoped",
      scope,
      section_key: sectionKey || "missing_section",
      text: voiceText,
    });

  return {
    section_key: sectionKey,
    text_content: textContent,
    voice_ready: voiceReady,
    voice_text: voiceText,
    voice_chunk_id: voiceChunkId,
    playback_optional: playbackOptional,
    age_band: input.age_band ? String(input.age_band).trim() : null,
    registration_scope: scope,
    registration_status: missingContracts.length ? "contract_missing" : "registered",
    missing_contracts: missingContracts,
    extension_only: true,
    deterministic: true,
  };
}

function registerVoiceReadableContentBlocks(blocks = [], options = {}) {
  const normalized = (Array.isArray(blocks) ? blocks : []).map((entry) => registerVoiceReadableContentBlock(entry, options));
  const voiceReadyCount = normalized.filter((entry) => entry.voice_ready && entry.registration_status === "registered").length;
  const anyPlayable = normalized.some((entry) => entry.voice_ready && Boolean(entry.voice_text));

  return {
    ok: true,
    extension_only: true,
    deterministic: true,
    voice_ready_content_present: anyPlayable,
    voice_ready_content_count: voiceReadyCount,
    blocks: normalized,
    missing_contracts: [...new Set(normalized.flatMap((entry) => entry.missing_contracts || []))],
  };
}

module.exports = {
  registerVoiceReadableContentBlock,
  registerVoiceReadableContentBlocks,
};
