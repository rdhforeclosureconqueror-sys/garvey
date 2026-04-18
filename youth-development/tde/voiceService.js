"use strict";

const { CALIBRATION_VARIABLES, deterministicId } = require("./constants");
const { createVoiceProviderAdapter } = require("./voiceProviderAdapter");
const { buildParentExperienceViewModel } = require("./parentExperienceService");

const PARENT_SECTION_ORDER = Object.freeze(["summary", "strengths", "growth", "still_building", "environment", "next_steps"]);
const CHILD_PROMPT_ORDER = Object.freeze(["performance_prompt", "reflection_prompt", "optional_transfer_prompt"]);

function createVoiceService(options = {}) {
  const adapter = options.adapter || createVoiceProviderAdapter(options.provider_options || {});
  const cache = options.cache || new Map();

  const maxChunkLength = Number(CALIBRATION_VARIABLES.voice_architecture.voice_chunk_max_length || 180);
  const maxSentencesPerChunk = Number(CALIBRATION_VARIABLES.voice_architecture.voice_max_sentences_per_chunk || 2);

  async function getConfig() {
    const connectivity = await adapter.getConnectivity();
    return {
      ok: true,
      extension_only: true,
      deterministic: true,
      voice_enabled: adapter.isAvailable(),
      provider: adapter.provider,
      provider_config: adapter.getGatewayConfig(),
      connectivity,
      constraints: {
        chunk_max_length: maxChunkLength,
        max_sentences_per_chunk: maxSentencesPerChunk,
        replay_supported: true,
        section_level_playback: true,
        full_report_blob_blocked: true,
      },
      child_checkin: {
        one_prompt_at_a_time: true,
        uses_voice_text_only: true,
        short_chunk_only: true,
        required_for_completion: false,
      },
      parent_report: {
        sections: PARENT_SECTION_ORDER,
        full_report_playback_allowed: false,
        required_for_completion: false,
      },
    };
  }

  function toChunkMetadata(playbackId, sectionKey, text, baseRequest = {}) {
    const chunks = adapter.chunkText(text, {
      max_chars: maxChunkLength,
      max_sentences_per_chunk: maxSentencesPerChunk,
    });

    return chunks.map((chunkText, chunkIndex) => {
      const chunkId = deterministicId("voice_chunk", { playback_id: playbackId, section_key: sectionKey, chunk_index: chunkIndex, chunkText });
      return {
        chunk_id: chunkId,
        chunk_index: chunkIndex,
        text: chunkText,
        max_chars: maxChunkLength,
        replayable: true,
        request: {
          ...baseRequest,
          voice_text: chunkText,
          voice_chunk_id: chunkId,
          chunk_index: chunkIndex,
        },
      };
    });
  }

  async function hydrateChildChunk(entry) {
    const synth = await adapter.synthesizeCheckin(entry.request);
    return {
      ...entry,
      available: Boolean(synth.ok && (synth.audio_url || synth.asset_ref)),
      status: synth.status,
      provider: synth.provider,
      provider_name: synth.provider,
      playable_text: synth.playable_text || entry.text,
      audio_url: synth.audio_url,
      asset_ref: synth.asset_ref,
      audio_ref: synth.asset_ref || synth.audio_url || null,
      replay_token: synth.replay_token || null,
      expires_at: synth.expires_at || null,
      chunk_index: synth.chunk_index,
      error: synth.error || null,
    };
  }

  async function hydrateParentChunk(entry) {
    const synth = await adapter.synthesizeReportSection(entry.request);
    return {
      ...entry,
      available: Boolean(synth.ok && (synth.audio_url || synth.asset_ref)),
      status: synth.status,
      provider: synth.provider,
      provider_name: synth.provider,
      playable_text: synth.playable_text || entry.text,
      audio_url: synth.audio_url,
      asset_ref: synth.asset_ref,
      audio_ref: synth.asset_ref || synth.audio_url || null,
      replay_token: synth.replay_token || null,
      expires_at: synth.expires_at || null,
      chunk_index: synth.chunk_index,
      error: synth.error || null,
    };
  }

  function readLatestCheckin(snapshot) {
    const checkins = Array.isArray(snapshot?.development_checkins) ? snapshot.development_checkins : [];
    const sorted = [...checkins].sort((a, b) => `${a.completed_at || ""}`.localeCompare(`${b.completed_at || ""}`));
    return sorted.at(-1) || null;
  }

  async function getChildCheckinPlayback(childId, repository) {
    const snapshot = await repository.getProgramSnapshot(childId);
    const latestCheckin = readLatestCheckin(snapshot);

    if (!latestCheckin) {
      return {
        ok: true,
        extension_only: true,
        deterministic: true,
        child_id: childId,
        voice_enabled: adapter.isAvailable(),
        prompts: [],
        missing_contracts: ["development_checkin_history_required"],
      };
    }

    const promptRows = CHILD_PROMPT_ORDER
      .map((promptKey) => ({ key: promptKey, prompt: latestCheckin?.prompts?.[promptKey] || null }))
      .filter((entry) => Boolean(entry.prompt));

    const prompts = [];
    for (const row of promptRows) {
      const prompt = row.prompt;
      const voiceText = String(prompt.voice_text || "").trim();
      const playbackId = deterministicId("checkin_playback", { child_id: childId, checkin_id: latestCheckin.checkin_id, prompt_id: prompt.prompt_id });
      const ageBand = String(prompt.age_band || latestCheckin.age_band || "8-10");
      const voicePacing = String(prompt.voice_pacing || "short");
      const chunkMetadata = toChunkMetadata(playbackId, row.key, voiceText, {
        child_id: childId,
        age_band: ageBand,
        prompt_id: prompt.prompt_id,
        voice_pacing: voicePacing,
      });

      const hydratedChunks = [];
      for (const entry of chunkMetadata) {
        hydratedChunks.push(await hydrateChildChunk(entry));
      }

      prompts.push({
        prompt_id: prompt.prompt_id,
        prompt_type: prompt.prompt_type,
        prompt_key: row.key,
        age_band: ageBand,
        voice_pacing: voicePacing,
        playback_id: playbackId,
        replay_supported: true,
        voice_required: false,
        uses_voice_text_only: true,
        chunk_count: hydratedChunks.length,
        chunks: hydratedChunks,
      });

      cache.set(playbackId, {
        scope: "child_checkin",
        child_id: childId,
        checkin_id: latestCheckin.checkin_id,
        prompt_id: prompt.prompt_id,
        chunks: hydratedChunks,
      });
    }

    return {
      ok: true,
      extension_only: true,
      deterministic: true,
      child_id: childId,
      checkin_id: latestCheckin.checkin_id,
      voice_enabled: adapter.isAvailable(),
      one_prompt_at_a_time: true,
      prompts,
      missing_contracts: prompts.length ? [] : ["voice_ready_prompt_schema_required"],
    };
  }

  async function getParentSectionPlayback(childId, repository) {
    const snapshot = await repository.getProgramSnapshot(childId);
    const parentExperience = buildParentExperienceViewModel(childId, snapshot);
    const sections = parentExperience?.report_sections || {};

    const playbackSections = [];

    for (const sectionKey of PARENT_SECTION_ORDER) {
      const section = sections[sectionKey] || null;
      if (!section) continue;
      const voiceText = String(section.text_content || "").trim();
      const playbackId = deterministicId("parent_playback", { child_id: childId, section_key: sectionKey, voice_chunk_id: section.voice_chunk_id });
      const chunkMetadata = toChunkMetadata(playbackId, sectionKey, voiceText, {
        child_id: childId,
        section_key: sectionKey,
      });

      const hydratedChunks = [];
      for (const entry of chunkMetadata) {
        hydratedChunks.push(await hydrateParentChunk(entry));
      }

      playbackSections.push({
        section_key: sectionKey,
        playback_id: playbackId,
        replay_supported: true,
        voice_required: false,
        readable_without_voice: true,
        voice_ready: Boolean(section.voice_ready),
        chunk_count: hydratedChunks.length,
        chunks: hydratedChunks,
      });

      cache.set(playbackId, {
        scope: "parent_section",
        child_id: childId,
        section_key: sectionKey,
        chunks: hydratedChunks,
      });
    }

    return {
      ok: true,
      extension_only: true,
      deterministic: true,
      child_id: childId,
      voice_enabled: adapter.isAvailable(),
      full_report_playback_allowed: false,
      sections: playbackSections,
      missing_contracts: playbackSections.length === PARENT_SECTION_ORDER.length ? [] : ["parent_report_sections_contract_incomplete"],
    };
  }

  function getCachedPlayback(playbackId) {
    return cache.get(String(playbackId || "").trim()) || null;
  }

  return {
    getConfig,
    getChildCheckinPlayback,
    getParentSectionPlayback,
    getCachedPlayback,
    parentSectionOrder: PARENT_SECTION_ORDER,
  };
}

module.exports = {
  createVoiceService,
  PARENT_SECTION_ORDER,
  CHILD_PROMPT_ORDER,
};
