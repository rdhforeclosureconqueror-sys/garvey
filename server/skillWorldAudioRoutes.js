"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const express = require("express");

const DEFAULT_SKILL_WORLD_TTS_URL = "https://aivoice-wmrv.onrender.com/speak";
const MAX_SKILL_WORLD_TEXT_LENGTH = 1000;
const ALLOWED_AUDIO_FORMATS = new Set(["mp3", "wav"]);

function normalizeFormat(value) {
  return String(value || "mp3").trim().toLowerCase();
}

function normalizeVoice(value) {
  return String(value || "alloy").trim() || "alloy";
}

function normalizeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function createSkillWorldAudioHash({ text, voice, format, speed, pitch }) {
  const stablePayload = {
    text: String(text || ""),
    voice: normalizeVoice(voice),
    format: normalizeFormat(format),
    speed: normalizeNumber(speed, 0.9),
    pitch: normalizeNumber(pitch, 0),
  };
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stablePayload))
    .digest("hex")
    .slice(0, 32);
}

function createSkillWorldAudioRouter(options = {}) {
  const router = express.Router();
  const fetchImpl = options.fetch_impl || fetch;
  const ttsUrl = String(options.tts_url || process.env.SKILL_WORLD_TTS_URL || DEFAULT_SKILL_WORLD_TTS_URL).trim();
  const cacheRoot = path.resolve(options.cache_dir || path.join(__dirname, "..", "public", "generated-audio", "skill-world"));
  const publicUrlPrefix = String(options.public_url_prefix || "/generated-audio/skill-world").replace(/\/+$/, "");

  async function ensureCacheRoot() {
    await fs.mkdir(cacheRoot, { recursive: true });
  }

  router.post("/audio", async (req, res) => {
    const requestId = crypto.randomUUID();
    const diagnose = (stage, detail = {}) => console.info(JSON.stringify({ event: "skill_world_audio_diagnostic", request_id: requestId, stage, ...detail }));
    const fail = (status, stage, error, extra = {}) => { diagnose(stage, { status, error }); return res.status(status).json({ ok: false, error, failure_stage: stage, request_id: requestId, ...extra }); };
    diagnose("request_received", { route: "/api/skill-world/audio" });
    const text = String(req.body?.text || "").trim();
    if (!text) {
      return fail(400, "input_validation", "text_required");
    }
    if (text.length > MAX_SKILL_WORLD_TEXT_LENGTH) {
      return fail(400, "input_validation", "text_too_long", { max_length: MAX_SKILL_WORLD_TEXT_LENGTH });
    }

    const format = normalizeFormat(req.body?.format);
    if (!ALLOWED_AUDIO_FORMATS.has(format)) {
      return fail(400, "input_validation", "invalid_format", { allowed_formats: Array.from(ALLOWED_AUDIO_FORMATS) });
    }

    const voice = normalizeVoice(req.body?.voice);
    const speed = normalizeNumber(req.body?.speed, 0.9);
    const pitch = normalizeNumber(req.body?.pitch, 0);
    const hash = createSkillWorldAudioHash({ text, voice, format, speed, pitch });
    const fileName = `${hash}.${format}`;
    const filePath = path.join(cacheRoot, fileName);
    const audioUrl = `${publicUrlPrefix}/${fileName}`;

    try { await ensureCacheRoot(); } catch (error) { return fail(503, "cache_directory", "audio_cache_unavailable"); }

    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile() && stat.size > 0) {
        diagnose("cache_hit", { cached: true });
        return res.status(200).json({ audio_url: audioUrl, cached: true, request_id: requestId });
      }
    } catch (err) {
      if (err?.code !== "ENOENT") return fail(503, "cache_read", "audio_cache_read_failed");
    }

    const headers = { "content-type": "application/json" };
    const ttsToken = String(process.env.SKILL_WORLD_TTS_TOKEN || "").trim();
    if (ttsToken) {
      headers["x-internal-token"] = ttsToken;
    }

    diagnose("upstream_request", { token_configured: Boolean(ttsToken) });
    let upstreamResponse;
    try { upstreamResponse = await fetchImpl(ttsUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ text, voice, format, speed, pitch }),
      signal: AbortSignal.timeout(20000),
    }); } catch (error) { return fail(502, "upstream_connection", "tts_upstream_connection_failed", { upstream_error_type: error?.name === "TimeoutError" ? "timeout" : "connection" }); }

    if (upstreamResponse?.status === 401) {
      diagnose("upstream_auth", { status: 401, error: "tts_upstream_auth_failed" });
      if (req.get("x-garvey-voice-diagnostics") === "1") return res.status(502).json({ ok: false, error: "tts_upstream_auth_failed", failure_stage: "upstream_auth", request_id: requestId, upstream_status: 401 });
      return res.status(401).json({ ok: false, error: "tts_upstream_auth_failed", status: 401, fallback: "browser_speech" });
    }

    if (!upstreamResponse?.ok) {
      return fail(502, "upstream_response", "tts_upstream_failed", { upstream_status: upstreamResponse?.status || 0 });
    }

    let audioBytes;
    try { audioBytes = Buffer.from(await upstreamResponse.arrayBuffer()); } catch (error) { return fail(502, "upstream_audio_read", "tts_upstream_audio_read_failed"); }
    if (!audioBytes.length) {
      return fail(502, "upstream_audio_empty", "tts_upstream_empty_audio");
    }

    try { await fs.writeFile(filePath, audioBytes); } catch (error) { return fail(503, "cache_write", "audio_cache_write_failed"); }
    diagnose("audio_ready", { cached: false, bytes: audioBytes.length });
    return res.status(200).json({ audio_url: audioUrl, cached: false, request_id: requestId });
  });

  return router;
}

module.exports = {
  ALLOWED_AUDIO_FORMATS,
  DEFAULT_SKILL_WORLD_TTS_URL,
  MAX_SKILL_WORLD_TEXT_LENGTH,
  createSkillWorldAudioHash,
  createSkillWorldAudioRouter,
};
