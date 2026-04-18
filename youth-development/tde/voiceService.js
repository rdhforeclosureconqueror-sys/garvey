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

  function getConfig() {
    return {
      ok: true,
      extension_only: true,
      deterministic: true,
      voice_enabled: adapter.isAvailable(),
      provider: adapter.provider,
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

  function toChunkMetadata(playbackId, sectionKey, text, voiceProfile) {
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
          playback_id: playbackId,
          section_key: sectionKey,
          chunk_index: chunkIndex,
          text: chunkText,
          voice_profile: voiceProfile,
        },
      };
    });
  }

  async function maybeHydrateAudio(chunks) {
    if (!adapter.isAvailable()) {
      return chunks.map((entry) => ({
        ...entry,
        available: false,
        provider: adapter.provider,
        audio_ref: null,
      }));
    }

    const out = [];
    for (const entry of chunks) {
      const synth = await adapter.synthesize(entry.request);
      out.push({
        ...entry,
        available: Boolean(synth.ok),
        provider: synth.provider,
        audio_ref: synth.ok ? synth.audio_ref : null,
        replay_token: synth.ok ? synth.replay_token : null,
        duration_ms: synth.ok ? synth.duration_ms : null,
        format: synth.ok ? synth.format : null,
      });
    }
    return out;
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
      const voiceProfile = {
        age_band: String(prompt.age_band || latestCheckin.age_band || "8-10"),
        voice_pacing: String(prompt.voice_pacing || "short"),
      };
      const chunkMetadata = toChunkMetadata(playbackId, row.key, voiceText, voiceProfile);
      const hydratedChunks = await maybeHydrateAudio(chunkMetadata);

      prompts.push({
        prompt_id: prompt.prompt_id,
        prompt_type: prompt.prompt_type,
        prompt_key: row.key,
        age_band: voiceProfile.age_band,
        voice_pacing: voiceProfile.voice_pacing,
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
      const chunkMetadata = toChunkMetadata(playbackId, sectionKey, voiceText, { voice_pacing: "short" });
      const hydratedChunks = await maybeHydrateAudio(chunkMetadata);

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
