"use strict";

const crypto = require("node:crypto");
const express = require("express");
const { DEFAULT_SKILL_WORLD_TTS_URL } = require("./skillWorldAudioRoutes");
const { registerVoiceReadableContentBlock } = require("../youth-development/tde/voiceContentRegistry");

function normalizeBaseUrl(options = {}) {
  return String(
    options.voice_repo_base_url
      || options.tts_url
      || process.env.ASSESSMENT_TTS_URL
      || process.env.SKILL_WORLD_TTS_URL
      || process.env.VOICE_REPO_BASE_URL
      || process.env.VOICE_GATEWAY_BASE_URL
      || DEFAULT_SKILL_WORLD_TTS_URL
  )
    .trim()
    .replace(/\/+$/, "");
}

function endpointDiagnostic(baseUrl) {
  return baseUrl ? null : "missing_voice_endpoint";
}

function tokenDiagnostic() {
  return (process.env.ASSESSMENT_TTS_TOKEN || process.env.SKILL_WORLD_TTS_TOKEN || process.env.VOICE_GATEWAY_TOKEN || "").trim()
    ? null
    : "missing_token_or_key";
}

function createAssessmentVoiceRouter(options = {}) {
  const router = express.Router();
  const fetchImpl = options.fetch_impl || fetch;
  const voiceRepoBaseUrl = normalizeBaseUrl(options);
  const voiceToken = String(options.tts_token || process.env.ASSESSMENT_TTS_TOKEN || process.env.SKILL_WORLD_TTS_TOKEN || process.env.VOICE_GATEWAY_TOKEN || "").trim();
  const audioStore = new Map();
  const audioTtlMs = Math.max(15_000, Number(options.audio_ttl_ms || 5 * 60_000));

  function setCachedAudio(entry) {
    const token = `avs_${crypto.randomUUID()}`;
    audioStore.set(token, { ...entry, created_at: Date.now() });
    return token;
  }

  function sweepAudioCache() {
    const now = Date.now();
    for (const [token, payload] of audioStore.entries()) {
      if ((now - Number(payload.created_at || 0)) > audioTtlMs) audioStore.delete(token);
    }
  }

  async function synthesizeViaSpeak(payload = {}) {
    if (!voiceRepoBaseUrl) {
      return {
        ok: false,
        provider_status: "provider_unavailable",
        fallback_reason: "missing_voice_endpoint",
        diagnostic_code: "missing_voice_endpoint",
        playable_text: String(payload.text || "").trim(),
      };
    }

    const headers = { "content-type": "application/json" };
    if (voiceToken) headers["x-internal-token"] = voiceToken;

    const response = await fetchImpl(`${voiceRepoBaseUrl}/speak`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!response) {
      return {
        ok: false,
        provider_status: "provider_unavailable",
        fallback_reason: "failed_tts_request",
        diagnostic_code: "failed_tts_request",
        playable_text: String(payload.text || "").trim(),
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        provider_status: "provider_unavailable",
        fallback_reason: response.status === 401 ? "missing_token_or_key" : `failed_tts_request_http_${response.status}`,
        diagnostic_code: response.status === 401 ? "missing_token_or_key" : "failed_tts_request",
        playable_text: String(payload.text || "").trim(),
      };
    }

    const contentType = String(response.headers.get("content-type") || "").trim();
    if (!/^audio\//i.test(contentType)) {
      return {
        ok: false,
        provider_status: "fallback",
        fallback_reason: "failed_tts_request_non_audio_response",
        diagnostic_code: "failed_tts_request",
        playable_text: String(payload.text || "").trim(),
      };
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) {
      return {
        ok: false,
        provider_status: "fallback",
        fallback_reason: "failed_tts_request_empty_audio",
        diagnostic_code: "failed_tts_request",
        playable_text: String(payload.text || "").trim(),
      };
    }

    const token = setCachedAudio({ content_type: contentType, bytes });
    return {
      ok: true,
      provider_status: "available",
      provider: "skill-world-openai-voice-pipeline",
      playable_text: String(payload.text || "").trim(),
      stream_token: token,
      content_type: contentType,
      bytes_length: bytes.length,
    };
  }

  router.get("/config", async (_req, res) => {
    return res.status(200).json({
      ok: true,
      voice_availability_status: voiceRepoBaseUrl ? "voice_available" : "voice_fallback_active",
      provider_ready: Boolean(voiceRepoBaseUrl),
      provider: "skill-world-openai-voice-pipeline",
      tts_url_configured: Boolean(voiceRepoBaseUrl),
      token_configured: Boolean(voiceToken),
      diagnostics: [endpointDiagnostic(voiceRepoBaseUrl), tokenDiagnostic()].filter(Boolean),
      fallback_provider: "browser_speech_synthesis",
      mode: voiceRepoBaseUrl ? "provider_preferred" : "fallback_only",
      upstream_route: "/speak",
      upstream_url: `${voiceRepoBaseUrl || "[missing_voice_endpoint]"}/speak`,
      upstream_method: "POST",
      upstream_response: "raw_audio_bytes",
    });
  });

  router.post("/warmup", async (req, res) => {
    sweepAudioCache();
    const surface = String(req.body?.surface || "assessment").trim().toLowerCase();
    const scopeId = String(req.body?.scope_id || `${surface}_scope`).trim();
    const preflight = req.body?.preflight === true;
    const warmText = String(req.body?.warm_text || "Voice readiness warm-up.").trim();
    let providerPayload = null;
    if (preflight) {
      providerPayload = await synthesizeViaSpeak({
        text: warmText,
        voice: req.body?.voice,
        format: req.body?.format || "mp3",
      });
    }
    const providerReady = preflight
      ? Boolean(providerPayload?.provider_status === "available" && providerPayload?.stream_token)
      : Boolean(voiceRepoBaseUrl);
    return res.status(200).json({
      ok: true,
      endpoint: "/api/assessment/voice/warmup",
      warmup_mode: preflight ? "provider_preflight" : "provider_config_only",
      surface,
      scope_id: scopeId,
      provider_ready: providerReady,
      provider_status: providerPayload?.provider_status || (voiceRepoBaseUrl ? "available" : "provider_unavailable"),
      upstream_route: "/speak",
      upstream_url: `${voiceRepoBaseUrl || "[missing_voice_endpoint]"}/speak`,
      upstream_method: "POST",
      voice_mode: providerReady ? "provider_audio" : "fallback_browser_speech",
      fallback_reason: providerReady ? null : (providerPayload?.fallback_reason || endpointDiagnostic(voiceRepoBaseUrl) || tokenDiagnostic() || "provider_audio_unavailable"),
      diagnostics: [providerPayload?.diagnostic_code, endpointDiagnostic(voiceRepoBaseUrl), tokenDiagnostic()].filter(Boolean),
      preflight_audio_url: providerPayload?.stream_token ? `/api/assessment/voice/stream/${providerPayload.stream_token}` : null,
      provider_audio_content_type: providerPayload?.content_type || null,
      provider_audio_bytes: Number(providerPayload?.bytes_length || 0),
    });
  });

  router.post("/section", async (req, res) => {
    sweepAudioCache();

    const surface = String(req.body?.surface || "assessment").trim().toLowerCase();
    const scopeId = String(req.body?.scope_id || req.body?.tenant || req.body?.child_id || `${surface}_scope`).trim();
    const sectionKey = String(req.body?.section_key || "section").trim();
    const sectionLabel = String(req.body?.section_label || sectionKey).trim();
    const block = registerVoiceReadableContentBlock({
      section_key: sectionKey,
      text_content: String(req.body?.text_content || req.body?.voice_text || "").trim(),
      voice_text: String(req.body?.voice_text || req.body?.text_content || "").trim(),
      voice_ready: req.body?.voice_ready !== false,
      voice_chunk_id: req.body?.voice_chunk_id,
    }, { child_id: scopeId, scope: `assessment_${surface}` });

    if (!block.voice_text) {
      return res.status(400).json({
        ok: false,
        error: "empty_text_payload",
        diagnostic_code: "empty_text_payload",
        provider_status: "fallback",
        provider_ready: false,
        voice_mode: "fallback_browser_speech",
        fallback_reason: "empty_text_payload",
        playable_text: "",
        audio_url: null,
        readable_without_voice: true,
      });
    }

    const providerPayload = await synthesizeViaSpeak({
      text: block.voice_text,
      voice: req.body?.voice,
      format: req.body?.format,
      speed: req.body?.speed,
      pitch: req.body?.pitch,
    });

    const providerReady = providerPayload.provider_status === "available" && providerPayload.stream_token;

    return res.status(200).json({
      ok: true,
      surface,
      scope_id: scopeId,
      section_key: block.section_key,
      section_label: sectionLabel,
      voice_chunk_id: block.voice_chunk_id,
      endpoint: "/api/assessment/voice/section",
      upstream_route: "/speak",
      upstream_url: `${voiceRepoBaseUrl || "[missing_voice_endpoint]"}/speak`,
      upstream_method: "POST",
      provider_status: providerPayload.provider_status,
      provider_ready: Boolean(providerReady),
      voice_mode: providerReady ? "provider_audio" : "fallback_browser_speech",
      fallback_reason: providerReady ? null : (providerPayload.fallback_reason || endpointDiagnostic(voiceRepoBaseUrl) || tokenDiagnostic() || "provider_audio_unavailable"),
      diagnostics: [providerPayload.diagnostic_code, endpointDiagnostic(voiceRepoBaseUrl), tokenDiagnostic(), providerReady ? null : "browser_fallback_used"].filter(Boolean),
      playable_text: String(providerPayload.playable_text || block.voice_text || "").trim(),
      audio_url: providerReady ? `/api/assessment/voice/stream/${providerPayload.stream_token}` : null,
      asset_ref: null,
      replay_token: providerPayload.stream_token || null,
      readable_without_voice: true,
      provider: providerPayload.provider || (providerReady ? "skill-world-openai-voice-pipeline" : "browser_speech_synthesis"),
      provider_audio_content_type: providerPayload.content_type || null,
      provider_audio_bytes: Number(providerPayload.bytes_length || 0),
    });
  });

  router.get("/stream/:token", (req, res) => {
    sweepAudioCache();
    const token = String(req.params.token || "").trim();
    const payload = audioStore.get(token);
    if (!payload) return res.status(404).json({ ok: false, error: "audio_not_found" });

    res.setHeader("content-type", payload.content_type);
    res.setHeader("cache-control", "no-store");
    return res.status(200).send(payload.bytes);
  });

  return router;
}

module.exports = { createAssessmentVoiceRouter };
