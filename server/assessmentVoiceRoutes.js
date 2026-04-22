"use strict";

const crypto = require("node:crypto");
const express = require("express");
const { registerVoiceReadableContentBlock } = require("../youth-development/tde/voiceContentRegistry");

function normalizeBaseUrl(options = {}) {
  return String(options.voice_repo_base_url || process.env.VOICE_REPO_BASE_URL || process.env.VOICE_GATEWAY_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");
}

function createAssessmentVoiceRouter(options = {}) {
  const router = express.Router();
  const fetchImpl = options.fetch_impl || fetch;
  const voiceRepoBaseUrl = normalizeBaseUrl(options);
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
        fallback_reason: "voice_repo_base_url_missing",
        playable_text: String(payload.text || "").trim(),
      };
    }

    const response = await fetchImpl(`${voiceRepoBaseUrl}/speak`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!response) {
      return {
        ok: false,
        provider_status: "provider_unavailable",
        fallback_reason: "voice_repo_unreachable",
        playable_text: String(payload.text || "").trim(),
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        provider_status: "provider_unavailable",
        fallback_reason: `voice_repo_http_${response.status}`,
        playable_text: String(payload.text || "").trim(),
      };
    }

    const contentType = String(response.headers.get("content-type") || "").trim();
    if (!/^audio\//i.test(contentType)) {
      return {
        ok: false,
        provider_status: "fallback",
        fallback_reason: "voice_repo_non_audio_response",
        playable_text: String(payload.text || "").trim(),
      };
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) {
      return {
        ok: false,
        provider_status: "fallback",
        fallback_reason: "voice_repo_empty_audio",
        playable_text: String(payload.text || "").trim(),
      };
    }

    const token = setCachedAudio({ content_type: contentType, bytes });
    return {
      ok: true,
      provider_status: "available",
      provider: "openai-via-upstream-speak",
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
      provider: "openai-via-upstream-speak",
      fallback_provider: "browser_speech_synthesis",
      mode: voiceRepoBaseUrl ? "provider_preferred" : "fallback_only",
      upstream_route: "/speak",
      upstream_method: "POST",
      upstream_response: "raw_audio_bytes",
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
      upstream_method: "POST",
      provider_status: providerPayload.provider_status,
      provider_ready: Boolean(providerReady),
      voice_mode: providerReady ? "provider_audio" : "fallback_browser_speech",
      fallback_reason: providerReady ? null : (providerPayload.fallback_reason || "provider_audio_unavailable"),
      playable_text: String(providerPayload.playable_text || block.voice_text || "").trim(),
      audio_url: providerReady ? `/api/assessment/voice/stream/${providerPayload.stream_token}` : null,
      asset_ref: null,
      replay_token: providerPayload.stream_token || null,
      readable_without_voice: true,
      provider: providerPayload.provider || (providerReady ? "openai-via-upstream-speak" : "browser_speech_synthesis"),
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
