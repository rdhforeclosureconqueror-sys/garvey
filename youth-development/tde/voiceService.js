"use strict";

const { CALIBRATION_VARIABLES, deterministicId } = require("./constants");
const { createVoiceProviderAdapter } = require("./voiceProviderAdapter");
const { buildParentExperienceViewModel } = require("./parentExperienceService");
const { createVoiceAnalyticsService } = require("./voiceAnalyticsService");
const { createVoicePilotService } = require("./voicePilotService");
const { registerVoiceReadableContentBlocks } = require("./voiceContentRegistry");
const { normalizeVoiceDisplay } = require("./uiDisplayContractService");

const PARENT_SECTION_ORDER = Object.freeze(["summary", "strengths", "growth", "still_building", "environment", "next_steps"]);
const CHILD_PROMPT_ORDER = Object.freeze(["performance_prompt", "reflection_prompt", "optional_transfer_prompt"]);

function createVoiceService(options = {}) {
  const adapter = options.adapter || createVoiceProviderAdapter(options.provider_options || {});
  const cache = options.cache || new Map();
  const analytics = options.analytics || createVoiceAnalyticsService();
  const pilotService = options.pilotService || createVoicePilotService();

  const maxChunkLength = Number(CALIBRATION_VARIABLES.voice_architecture.voice_chunk_max_length || 180);
  const maxSentencesPerChunk = Number(CALIBRATION_VARIABLES.voice_architecture.voice_max_sentences_per_chunk || 2);
  const supportedAgeBands = Array.isArray(CALIBRATION_VARIABLES.voice_architecture.age_band_voice_supported)
    ? CALIBRATION_VARIABLES.voice_architecture.age_band_voice_supported
    : ["8-10", "11-13", "14-16"];

  async function getConfig() {
    const connectivity = await adapter.getConnectivity();
    const voicePreviewMode = String(process.env.TDE_VOICE_PREVIEW_MODE || "off").trim().toLowerCase() === "on";
    const visibility = pilotService.evaluateVisibility({
      gateway_status: connectivity.status,
      preview_mode: voicePreviewMode,
      feature_flag_enabled: String(process.env.TDE_VOICE_FEATURE_ENABLED || "on").trim().toLowerCase() !== "off",
      voice_ready_content_present: true,
    });
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
      voice_rollout_mode: visibility.rollout_mode,
      voice_playback_mode: visibility.playback_mode,
      voice_availability_status: availabilityStatus,
      provider: adapter.provider,
      provider_config: adapter.getGatewayConfig(),
      connectivity,
      diagnostics: {
        ...(adapter.getDiagnostics ? adapter.getDiagnostics() : {}),
        last_fallback_reason: null,
        missing_playable_assets_detected: false,
      },
      pilot_visibility: visibility,
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
    analytics.record("child_checkin_playback_requested", { child_id: childId });
    const snapshot = await repository.getProgramSnapshot(childId);
    const latestCheckin = readLatestCheckin(snapshot);

    if (!latestCheckin) {
      return normalizeVoiceDisplay({
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
      }, { displayTitle: "Voice Check-in", displayLabel: "voice_checkin_panel" });
    }

    const promptRows = CHILD_PROMPT_ORDER
      .map((promptKey) => ({ key: promptKey, prompt: latestCheckin?.prompts?.[promptKey] || null }))
      .filter((entry) => Boolean(entry.prompt));
    const promptRegistrations = registerVoiceReadableContentBlocks(
      promptRows.map((row) => ({
        section_key: row.key,
        text_content: String(row.prompt?.voice_text || row.prompt?.prompt_text || "").trim(),
        voice_ready: Boolean(row.prompt?.voice_ready),
        voice_text: String(row.prompt?.voice_text || "").trim(),
        voice_chunk_id: row.prompt?.voice_chunk_id,
        age_band: row.prompt?.age_band || latestCheckin.age_band || "8-10",
        playback_optional: true,
      })),
      { scope: "development_checkin_prompt", child_id: childId }
    );
    const connectivity = await adapter.getConnectivity();
    const voicePreviewMode = String(process.env.TDE_VOICE_PREVIEW_MODE || "off").trim().toLowerCase() === "on";
    const decision = pilotService.evaluateVisibility({
      child_id: childId,
      age_band: latestCheckin.age_band || promptRows[0]?.prompt?.age_band || "8-10",
      gateway_status: connectivity.status,
      voice_ready_content_present: promptRegistrations.voice_ready_content_present,
      preview_mode: voicePreviewMode,
      feature_flag_enabled: String(process.env.TDE_VOICE_FEATURE_ENABLED || "on").trim().toLowerCase() !== "off",
      supported_age_bands: supportedAgeBands,
    });
    if (!decision.voice_shown) analytics.record("voice_not_shown_unavailable_or_unsupported", { child_id: childId });

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
      if (chunkState.fallback_status === "fallback_active") analytics.record("fallback_used", { child_id: childId });
      if (chunkState.provider_status !== "available") analytics.record("provider_unavailable", { child_id: childId });
      if (hydratedChunks.some((chunk) => chunk.fallback_reason === "malformed_gateway_success_missing_playable_asset")) {
        analytics.record("malformed_gateway_downgrade_used", { child_id: childId });
      }

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

    return normalizeVoiceDisplay({
      ok: true,
      extension_only: true,
      deterministic: true,
      child_id: childId,
      checkin_id: latestCheckin.checkin_id,
      voice_enabled: adapter.isAvailable(),
      voice_visibility: decision,
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
      readability_registration: promptRegistrations,
      prompts,
      missing_contracts: prompts.length ? [] : ["voice_ready_prompt_schema_required"],
    }, { displayTitle: "Voice Check-in", displayLabel: "voice_checkin_panel" });
  }

  async function getParentSectionPlayback(childId, repository) {
    analytics.record("parent_section_playback_requested", { child_id: childId });
    const snapshot = await repository.getProgramSnapshot(childId);
    const parentExperience = buildParentExperienceViewModel(childId, snapshot);
    const sections = parentExperience?.report_sections || {};
    const connectivity = await adapter.getConnectivity();
    const sectionRegistrations = registerVoiceReadableContentBlocks(
      Object.entries(sections).map(([sectionKey, section]) => ({
        section_key: sectionKey,
        text_content: String(section.text_content || "").trim(),
        voice_ready: Boolean(section.voice_ready),
        voice_text: String(section.voice_text || section.text_content || "").trim(),
        voice_chunk_id: section.voice_chunk_id,
        playback_optional: true,
      })),
      { scope: "parent_report_section", child_id: childId }
    );
    const voicePreviewMode = String(process.env.TDE_VOICE_PREVIEW_MODE || "off").trim().toLowerCase() === "on";
    const decision = pilotService.evaluateVisibility({
      child_id: childId,
      gateway_status: connectivity.status,
      voice_ready_content_present: sectionRegistrations.voice_ready_content_present,
      preview_mode: voicePreviewMode,
      feature_flag_enabled: String(process.env.TDE_VOICE_FEATURE_ENABLED || "on").trim().toLowerCase() !== "off",
    });
    if (!decision.voice_shown) analytics.record("voice_not_shown_unavailable_or_unsupported", { child_id: childId });

    const playbackSections = [];

    for (const sectionKey of PARENT_SECTION_ORDER) {
      const section = sections[sectionKey] || null;
      if (!section) continue;
      const voiceText = String(section.voice_text || section.text_content || "").trim();
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
      if (chunkState.fallback_status === "fallback_active") analytics.record("fallback_used", { child_id: childId });
      if (chunkState.provider_status !== "available") analytics.record("provider_unavailable", { child_id: childId });
      if (hydratedChunks.some((chunk) => chunk.fallback_reason === "malformed_gateway_success_missing_playable_asset")) {
        analytics.record("malformed_gateway_downgrade_used", { child_id: childId });
      }

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

    return normalizeVoiceDisplay({
      ok: true,
      extension_only: true,
      deterministic: true,
      child_id: childId,
      voice_enabled: adapter.isAvailable(),
      voice_visibility: decision,
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
      readability_registration: sectionRegistrations,
      sections: playbackSections,
      missing_contracts: playbackSections.length === PARENT_SECTION_ORDER.length ? [] : ["parent_report_sections_contract_incomplete"],
    }, { displayTitle: "Voice Parent Sections", displayLabel: "voice_parent_sections_panel" });
  }

  async function getVoiceAvailabilityStatus(childId, repository) {
    const [config, checkin, sections] = await Promise.all([
      getConfig(),
      getChildCheckinPlayback(childId, repository),
      getParentSectionPlayback(childId, repository),
    ]);

    return normalizeVoiceDisplay({
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
      display_items: [
        config.voice_availability_status,
        checkin.voice_state?.availability || "unknown",
        sections.voice_state?.availability || "unknown",
      ],
    }, { displayTitle: "Voice Status", displayLabel: "voice_status_panel", defaultReadiness: config.voice_availability_status });
  }

  function getCachedPlayback(playbackId) {
    const cached = cache.get(String(playbackId || "").trim()) || null;
    if (cached?.child_id) analytics.record("child_replay_requested", { child_id: cached.child_id });
    return cached;
  }

  function getVoiceAnalyticsSummary(options = {}) {
    return analytics.getSummary(options);
  }

  async function getVoicePilotStatus(childId, repository) {
    const [config, checkin, sections] = await Promise.all([
      getConfig(),
      getChildCheckinPlayback(childId, repository),
      getParentSectionPlayback(childId, repository),
    ]);
    return normalizeVoiceDisplay({
      ok: true,
      extension_only: true,
      deterministic: true,
      child_id: childId,
      rollout_mode: config.voice_rollout_mode,
      playback_mode: config.voice_playback_mode,
      checkin_visibility: checkin.voice_visibility,
      parent_visibility: sections.voice_visibility,
      eligibility: {
        child_voice_eligible: Boolean(checkin.voice_visibility?.voice_shown),
        parent_report_voice_eligible: Boolean(sections.voice_visibility?.voice_shown),
      },
      missing_contracts: [...new Set([...(checkin.missing_contracts || []), ...(sections.missing_contracts || [])])],
      voice_readiness_status: (checkin.voice_visibility?.voice_shown || sections.voice_visibility?.voice_shown) ? "voice_ready" : "voice_not_ready",
    }, { displayTitle: "Voice Pilot Status", displayLabel: "voice_pilot_panel" });
  }

  async function getVoiceEligibility(childId, repository) {
    const status = await getVoicePilotStatus(childId, repository);
    return normalizeVoiceDisplay({
      ok: true,
      extension_only: true,
      deterministic: true,
      child_id: childId,
      account_voice_eligibility: status.eligibility,
      rollout_mode: status.rollout_mode,
      playback_mode: status.playback_mode,
      voice_readiness_status: status.eligibility?.child_voice_eligible || status.eligibility?.parent_report_voice_eligible ? "voice_ready" : "voice_not_ready",
    }, { displayTitle: "Voice Eligibility", displayLabel: "voice_eligibility_panel" });
  }

  async function resolveAssetReference({ child_id: childId, asset_ref: assetRef } = {}) {
    const normalizedAssetRef = String(assetRef || "").trim();
    if (!normalizedAssetRef) {
      return { ok: false, error: "asset_ref_required", audio_url: null, asset_ref: null };
    }
    if (!adapter.resolveAssetReference) {
      return { ok: false, error: "asset_ref_resolution_not_supported", audio_url: null, asset_ref: normalizedAssetRef };
    }
    const resolved = await adapter.resolveAssetReference({ child_id: childId, asset_ref: normalizedAssetRef });
    return normalizeVoiceDisplay({
      ok: Boolean(resolved.ok && (resolved.audio_url || resolved.asset_ref)),
      extension_only: true,
      deterministic: true,
      child_id: childId || null,
      asset_ref: normalizedAssetRef,
      audio_url: resolved.audio_url || null,
      provider_status: resolved.provider_status || (resolved.ok ? "available" : "fallback_active"),
      diagnostics: resolved.diagnostics || null,
      error: resolved.error || null,
    }, { displayTitle: "Voice Asset Resolution", displayLabel: "voice_asset_resolution" });
  }

  return {
    getConfig,
    getChildCheckinPlayback,
    getParentSectionPlayback,
    getVoiceAvailabilityStatus,
    getCachedPlayback,
    getVoiceAnalyticsSummary,
    getVoicePilotStatus,
    getVoiceEligibility,
    resolveAssetReference,
    parentSectionOrder: PARENT_SECTION_ORDER,
  };
}

module.exports = {
  createVoiceService,
  PARENT_SECTION_ORDER,
  CHILD_PROMPT_ORDER,
};
