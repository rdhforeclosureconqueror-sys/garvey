"use strict";

const express = require("express");
const { createVoiceProviderAdapter } = require("../youth-development/tde/voiceProviderAdapter");
const { registerVoiceReadableContentBlock } = require("../youth-development/tde/voiceContentRegistry");

function createAssessmentVoiceRouter(options = {}) {
  const router = express.Router();
  const adapter = options.adapter || createVoiceProviderAdapter(options.provider_options || {});

  router.get("/config", async (_req, res) => {
    const health = await adapter.health();
    const available = adapter.isAvailable() && health.gateway_reachable !== false;
    return res.status(200).json({
      ok: true,
      voice_availability_status: available ? "voice_available" : "voice_fallback_active",
      provider_ready: available,
      provider: health.provider || "openai-via-gateway",
      fallback_provider: "browser_speech_synthesis",
      mode: available ? "provider_preferred" : "fallback_only",
    });
  });

  router.post("/section", async (req, res) => {
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

    const providerPayload = await adapter.synthesizeReportSection({
      child_id: scopeId,
      section_key: block.section_key,
      section_title: sectionLabel,
      voice_text: block.voice_text,
      voice_chunk_id: block.voice_chunk_id,
      voice_pacing: "short",
      playback_id: `assessment_${surface}_${block.voice_chunk_id}`,
      metadata: {
        assessment_surface: surface,
        section_label: sectionLabel,
      },
    });

    const providerReady = providerPayload.provider_status === "available" && (providerPayload.audio_url || providerPayload.asset_ref);

    return res.status(200).json({
      ok: true,
      surface,
      scope_id: scopeId,
      section_key: block.section_key,
      section_label: sectionLabel,
      voice_chunk_id: block.voice_chunk_id,
      endpoint: "/api/assessment/voice/section",
      provider_status: providerPayload.provider_status,
      provider_ready: Boolean(providerReady),
      voice_mode: providerReady ? "provider_audio" : "fallback_browser_speech",
      fallback_reason: providerReady ? null : (providerPayload.fallback_reason || "provider_audio_unavailable"),
      playable_text: String(providerPayload.playable_text || block.voice_text || "").trim(),
      audio_url: providerPayload.audio_url || null,
      asset_ref: providerPayload.asset_ref || null,
      replay_token: providerPayload.replay_token || null,
      readable_without_voice: true,
      provider: providerPayload.provider || (providerReady ? "openai-via-gateway" : "browser_speech_synthesis"),
    });
  });

  router.get("/assets/resolve", async (req, res) => {
    const assetRef = String(req.query.asset_ref || "").trim();
    if (!assetRef) return res.status(400).json({ ok: false, error: "asset_ref_required" });
    const scopeId = String(req.query.scope_id || req.query.child_id || "assessment_scope").trim();
    const resolved = await adapter.resolveAsset({ child_id: scopeId, asset_ref: assetRef });
    return res.status(resolved.resolved ? 200 : 404).json({ ok: resolved.resolved, ...resolved });
  });

  return router;
}

module.exports = { createAssessmentVoiceRouter };
