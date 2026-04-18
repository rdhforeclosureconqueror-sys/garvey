"use strict";

const { deterministicId } = require("./constants");

function chunkText(text, options = {}) {
  const normalized = String(text || "").trim();
  if (!normalized) return [];

  const maxChars = Math.max(60, Number(options.max_chars || 180));
  const maxSentences = Math.max(1, Number(options.max_sentences_per_chunk || 2));
  const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks = [];

  let cursor = 0;
  while (cursor < sentences.length) {
    let chunk = "";
    let sentenceCount = 0;

    while (cursor < sentences.length && sentenceCount < maxSentences) {
      const next = sentences[cursor];
      const proposal = chunk ? `${chunk} ${next}` : next;
      if (proposal.length <= maxChars || !chunk) {
        chunk = proposal;
        sentenceCount += 1;
        cursor += 1;
      } else {
        break;
      }
    }

    if (!chunk) {
      chunk = sentences[cursor].slice(0, maxChars);
      cursor += 1;
    }
    chunks.push(chunk.trim());
  }

  return chunks;
}

function createVoiceProviderAdapter(options = {}) {
  const provider = String(options.provider || process.env.TDE_VOICE_PROVIDER || "none").trim().toLowerCase();
  const simulateLatencyMs = Math.max(0, Number(options.simulate_latency_ms || 0));

  const synthesize = async ({ text, playback_id, chunk_index, section_key, voice_profile }) => {
    const trimmedText = String(text || "").trim();
    if (!trimmedText) {
      return {
        ok: false,
        available: false,
        provider,
        error: "text_required",
      };
    }

    if (simulateLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, simulateLatencyMs));
    }

    if (provider === "none" || provider === "disabled") {
      return {
        ok: false,
        available: false,
        provider,
        error: "voice_provider_unavailable",
      };
    }

    return {
      ok: true,
      available: true,
      provider,
      audio_ref: `voice://${provider}/${deterministicId("audio", {
        playback_id,
        chunk_index,
        section_key,
        voice_profile,
        text: trimmedText,
      })}`,
      replay_token: deterministicId("replay", { playback_id, chunk_index, section_key, provider }),
      duration_ms: Math.max(1800, trimmedText.length * 22),
      format: "audio/mpeg",
    };
  };

  return {
    provider,
    isAvailable: () => provider !== "none" && provider !== "disabled",
    synthesize,
    chunkText,
  };
}

module.exports = {
  createVoiceProviderAdapter,
  chunkText,
};
