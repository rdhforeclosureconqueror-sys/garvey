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
  const supportedAgeBands = Array.isArray(CALIBRATION_VARIABLES.voice_architecture.age_band_voice_supported)
    ? CALIBRATION_VARIABLES.voice_architecture.age_band_voice_supported
    : ["8-10", "11-13", "14-16"];

  async function getConfig() {
    const connectivity = await adapter.getConnectivity();
    const availabilityStatus = connectivity.status === "connected"
      ? "voice_available"
      : connectivity.status === "degraded"
        ? "voice_fallback_active"
        : "voice_temporarily_unavailable";

    return {
      ok: true,
      extension_only: true,
      deterministic: true,
      voice_enabled: adapter.isAvailable(),
      voice_availability_status: availabilityStatus,
      provider: adapter.provider,
      provider_config: adapter.getGatewayConfig(),
      connectivity,
      diagnostics: {
        ...(adapter.getDiagnostics ? adapter.getDiagnostics() : {}),
        last_fallback_reason: null,
        missing_playable_assets_detected: false,
      },
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
        supported_age_bands: supportedAgeBands,
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

  function toPlayableStatus(chunk) {
    return Boolean(chunk.available && (chunk.audio_url || chunk.asset_ref));
  }

  function summarizeChunkState(chunks = []) {
    const playableCount = chunks.filter((entry) => toPlayableStatus(entry)).length;
    const fallbackCount = chunks.filter((entry) => !toPlayableStatus(entry)).length;
    return {
      playable_count: playableCount,
      fallback_count: fallbackCount,
      playable_status: playableCount > 0 ? "ready" : "fallback_only",
      fallback_status: fallbackCount > 0 ? "fallback_active" : "none",
      replay_available: chunks.some((entry) => Boolean(entry.replay_token)),
      provider_status: chunks.every((entry) => entry.provider_status === "available") ? "available" : "fallback_active",
      missing_playable_assets: chunks
        .filter((entry) => !toPlayableStatus(entry))
        .map((entry) => entry.chunk_id),
      last_fallback_reason: chunks.find((entry) => entry.fallback_reason)?.fallback_reason || null,
    };
  }

  async function hydrateChildChunk(entry) {
    const synth = await adapter.synthesizeCheckin(entry.request);
    const available = Boolean(synth.ok && (synth.audio_url || synth.asset_ref));
    return {
      ...entry,
      available,
      playable: available,
      status: synth.status,
      provider: synth.provider,
      provider_name: synth.provider,
      provider_status: synth.provider_status || (available ? "available" : "fallback_active"),
      fallback_status: available ? "none" : "fallback_active",
      fallback_reason: synth.fallback_reason || synth.error || null,
      playable_text: synth.playable_text || entry.text,
      audio_url: synth.audio_url,
      asset_ref: synth.asset_ref,
      audio_ref: synth.asset_ref || synth.audio_url || null,
      replay_token: synth.replay_token || null,
      expires_at: synth.expires_at || null,
      chunk_index: synth.chunk_index,
      error: synth.error || null,
      diagnostics: synth.diagnostics || null,
    };
  }

  async function hydrateParentChunk(entry) {
    const synth = await adapter.synthesizeReportSection(entry.request);
    const available = Boolean(synth.ok && (synth.audio_url || synth.asset_ref));
    return {
      ...entry,
      available,
      playable: available,
      status: synth.status,
      provider: synth.provider,
      provider_name: synth.provider,
      provider_status: synth.provider_status || (available ? "available" : "fallback_active"),
      fallback_status: available ? "none" : "fallback_active",
      fallback_reason: synth.fallback_reason || synth.error || null,
      playable_text: synth.playable_text || entry.text,
      audio_url: synth.audio_url,
      asset_ref: synth.asset_ref,
      audio_ref: synth.asset_ref || synth.audio_url || null,
      replay_token: synth.replay_token || null,
      expires_at: synth.expires_at || null,
      chunk_index: synth.chunk_index,
      error: synth.error || null,
      diagnostics: synth.diagnostics || null,
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
        voice_state: {
          availability: adapter.isAvailable() ? "voice_available" : "voice_temporarily_unavailable",
          checkin_prompt_ready_for_playback: false,
        },
        diagnostics: {
          ...(adapter.getDiagnostics ? adapter.getDiagnostics() : {}),
          last_fallback_reason: "development_checkin_history_required",
          missing_playable_asset_indicators: [],
        },
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

      const chunkState = summarizeChunkState(hydratedChunks);

      prompts.push({
        prompt_id: prompt.prompt_id,
        prompt_type: prompt.prompt_type,
        prompt_key: row.key,
        age_band: ageBand,
        age_band_voice_supported: supportedAgeBands.includes(ageBand),
        voice_pacing: voicePacing,
        playback_id: playbackId,
        replay_supported: true,
        replay_available: chunkState.replay_available,
        voice_required: false,
        uses_voice_text_only: true,
        playable_status: chunkState.playable_status,
        fallback_status: chunkState.fallback_status,
        provider_status: chunkState.provider_status,
        playable_text_fallback: hydratedChunks[0]?.playable_text || voiceText,
        chunk_count: hydratedChunks.length,
        chunk_metadata: hydratedChunks.map((chunk) => ({
          chunk_id: chunk.chunk_id,
          chunk_index: chunk.chunk_index,
          playable: chunk.playable,
          status: chunk.status,
          provider_status: chunk.provider_status,
        })),
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

    const allChunks = prompts.flatMap((entry) => entry.chunks || []);
    const allMissingPlayable = allChunks.filter((entry) => !entry.playable).map((entry) => entry.chunk_id);
    const hasReadyPrompt = prompts.some((entry) => entry.playable_status === "ready");

    return {
      ok: true,
      extension_only: true,
      deterministic: true,
      child_id: childId,
      checkin_id: latestCheckin.checkin_id,
      voice_enabled: adapter.isAvailable(),
      one_prompt_at_a_time: true,
      voice_state: {
        availability: hasReadyPrompt ? "voice_available" : "voice_fallback_active",
        checkin_prompt_ready_for_playback: hasReadyPrompt,
      },
      diagnostics: {
        ...(adapter.getDiagnostics ? adapter.getDiagnostics() : {}),
        last_fallback_reason: allChunks.find((entry) => entry.fallback_reason)?.fallback_reason || null,
        missing_playable_asset_indicators: allMissingPlayable,
      },
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

      const chunkState = summarizeChunkState(hydratedChunks);

      playbackSections.push({
        section_key: sectionKey,
        playback_id: playbackId,
        replay_supported: true,
        replay_available: chunkState.replay_available,
        voice_required: false,
        readable_without_voice: true,
        voice_ready: Boolean(section.voice_ready),
        playable_status: chunkState.playable_status,
        fallback_status: chunkState.fallback_status,
        provider_status: chunkState.provider_status,
        playable_text_fallback: hydratedChunks[0]?.playable_text || voiceText,
        audio_reference_metadata: hydratedChunks.map((chunk) => ({
          chunk_id: chunk.chunk_id,
          chunk_index: chunk.chunk_index,
          audio_ref: chunk.audio_ref,
          provider_status: chunk.provider_status,
          playable: chunk.playable,
        })),
        chunk_count: hydratedChunks.length,
        chunk_metadata: hydratedChunks.map((chunk) => ({
          chunk_id: chunk.chunk_id,
          chunk_index: chunk.chunk_index,
          playable: chunk.playable,
          status: chunk.status,
          provider_status: chunk.provider_status,
        })),
        chunks: hydratedChunks,
      });

      cache.set(playbackId, {
        scope: "parent_section",
        child_id: childId,
        section_key: sectionKey,
        chunks: hydratedChunks,
      });
    }

    const allChunks = playbackSections.flatMap((entry) => entry.chunks || []);
    const allMissingPlayable = allChunks.filter((entry) => !entry.playable).map((entry) => entry.chunk_id);
    const hasReadySection = playbackSections.some((entry) => entry.playable_status === "ready");

    return {
      ok: true,
      extension_only: true,
      deterministic: true,
      child_id: childId,
      voice_enabled: adapter.isAvailable(),
      full_report_playback_allowed: false,
      voice_state: {
        availability: hasReadySection ? "voice_available" : "voice_fallback_active",
        parent_section_ready_for_playback: hasReadySection,
      },
      diagnostics: {
        ...(adapter.getDiagnostics ? adapter.getDiagnostics() : {}),
        last_fallback_reason: allChunks.find((entry) => entry.fallback_reason)?.fallback_reason || null,
        missing_playable_asset_indicators: allMissingPlayable,
      },
      sections: playbackSections,
      missing_contracts: playbackSections.length === PARENT_SECTION_ORDER.length ? [] : ["parent_report_sections_contract_incomplete"],
    };
  }

  async function getVoiceAvailabilityStatus(childId, repository) {
    const [config, checkin, sections] = await Promise.all([
      getConfig(),
      getChildCheckinPlayback(childId, repository),
      getParentSectionPlayback(childId, repository),
    ]);

    return {
      ok: true,
      extension_only: true,
      deterministic: true,
      child_id: childId,
      voice_status: {
        voice_available: config.voice_availability_status === "voice_available",
        voice_fallback_active: checkin.voice_state.availability === "voice_fallback_active" || sections.voice_state.availability === "voice_fallback_active",
        voice_temporarily_unavailable: config.voice_availability_status === "voice_temporarily_unavailable",
        checkin_prompt_ready_for_playback: Boolean(checkin.voice_state.checkin_prompt_ready_for_playback),
        parent_section_ready_for_playback: Boolean(sections.voice_state.parent_section_ready_for_playback),
      },
      provider_status: {
        connectivity: config.connectivity?.status || "provider_unavailable",
        checkin_provider_state: checkin.prompts.every((entry) => entry.provider_status === "available") ? "available" : "fallback_active",
        parent_provider_state: sections.sections.every((entry) => entry.provider_status === "available") ? "available" : "fallback_active",
      },
      diagnostics: {
        ...(adapter.getDiagnostics ? adapter.getDiagnostics() : {}),
        last_fallback_reason: checkin.diagnostics?.last_fallback_reason || sections.diagnostics?.last_fallback_reason || null,
        missing_playable_asset_indicators: [
          ...(checkin.diagnostics?.missing_playable_asset_indicators || []),
          ...(sections.diagnostics?.missing_playable_asset_indicators || []),
        ],
      },
      missing_contracts: [...new Set([...(checkin.missing_contracts || []), ...(sections.missing_contracts || [])])],
    };
  }

  function getCachedPlayback(playbackId) {
    return cache.get(String(playbackId || "").trim()) || null;
  }

  return {
    getConfig,
    getChildCheckinPlayback,
    getParentSectionPlayback,
    getVoiceAvailabilityStatus,
    getCachedPlayback,
    parentSectionOrder: PARENT_SECTION_ORDER,
  };
}

module.exports = {
  createVoiceService,
  PARENT_SECTION_ORDER,
  CHILD_PROMPT_ORDER,
};
