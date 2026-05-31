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
    const text = String(req.body?.text || "").trim();
    if (!text) {
      return res.status(400).json({ ok: false, error: "text_required" });
    }
    if (text.length > MAX_SKILL_WORLD_TEXT_LENGTH) {
      return res.status(400).json({ ok: false, error: "text_too_long", max_length: MAX_SKILL_WORLD_TEXT_LENGTH });
    }

    const format = normalizeFormat(req.body?.format);
    if (!ALLOWED_AUDIO_FORMATS.has(format)) {
      return res.status(400).json({ ok: false, error: "invalid_format", allowed_formats: Array.from(ALLOWED_AUDIO_FORMATS) });
    }

    const voice = normalizeVoice(req.body?.voice);
    const speed = normalizeNumber(req.body?.speed, 0.9);
    const pitch = normalizeNumber(req.body?.pitch, 0);
    const hash = createSkillWorldAudioHash({ text, voice, format, speed, pitch });
    const fileName = `${hash}.${format}`;
    const filePath = path.join(cacheRoot, fileName);
    const audioUrl = `${publicUrlPrefix}/${fileName}`;

    await ensureCacheRoot();

    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile() && stat.size > 0) {
        return res.status(200).json({ audio_url: audioUrl, cached: true });
      }
    } catch (err) {
      if (err?.code !== "ENOENT") throw err;
    }

    const headers = { "content-type": "application/json" };
    const ttsToken = String(process.env.SKILL_WORLD_TTS_TOKEN || "").trim();
    if (ttsToken) {
      headers["x-internal-token"] = ttsToken;
    }

    const upstreamResponse = await fetchImpl(ttsUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ text, voice, format, speed, pitch }),
    });

    if (upstreamResponse?.status === 401) {
      return res.status(401).json({
        ok: false,
        error: "tts_upstream_auth_failed",
        status: 401,
        fallback: "browser_speech",
      });
    }

    if (!upstreamResponse?.ok) {
      return res.status(502).json({ ok: false, error: "tts_upstream_failed", status: upstreamResponse?.status || 0 });
    }

    const audioBytes = Buffer.from(await upstreamResponse.arrayBuffer());
    if (!audioBytes.length) {
      return res.status(502).json({ ok: false, error: "tts_upstream_empty_audio" });
    }

    await fs.writeFile(filePath, audioBytes);
    return res.status(200).json({ audio_url: audioUrl, cached: false });
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
