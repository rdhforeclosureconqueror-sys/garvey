"use strict";

const { deterministicId } = require("./constants");

const GATEWAY_MODE_EXTERNAL = "external_gateway";

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
  const mode = String(options.gateway_mode || process.env.VOICE_GATEWAY_MODE || GATEWAY_MODE_EXTERNAL).trim().toLowerCase();
  const baseUrl = String(
    options.gateway_base_url
    || process.env.VOICE_REPO_BASE_URL
    || process.env.VOICE_GATEWAY_BASE_URL
    || ""
  ).trim().replace(/\/+$/, "");
  const timeoutMs = Math.max(100, Number(options.gateway_timeout_ms || process.env.VOICE_GATEWAY_TIMEOUT_MS || 5000));
  const gatewayToken = String(options.gateway_token || process.env.VOICE_GATEWAY_TOKEN || "").trim();

  let lastGatewayHealthStatus = "not_checked";

  function isAvailable() {
    return mode === GATEWAY_MODE_EXTERNAL && Boolean(baseUrl);
  }

  function getGatewayConfig() {
    return {
      mode,
      base_url: baseUrl || null,
      timeout_ms: timeoutMs,
      token_configured: Boolean(gatewayToken),
      auth_required: false,
      provider_path: "external_gateway",
      upstream_route: "/speak",
    };
  }

  function normalizeFallback(payload = {}, status, errorMessage, overrides = {}) {
    return {
      ok: false,
      status,
      provider: "external_gateway",
      provider_status: status === "provider_unavailable" ? "temporarily_unavailable" : "fallback_active",
      fallback_active: true,
      fallback_reason: errorMessage || null,
      playable_text: String(payload.voice_text || "").trim(),
      audio_url: null,
      asset_ref: null,
      replay_token: deterministicId("voice_replay", {
        provider: "external_gateway",
        voice_chunk_id: payload.voice_chunk_id,
        chunk_index: payload.chunk_index,
      }),
      chunk_index: Number(payload.chunk_index || 0),
      expires_at: null,
      error: errorMessage || null,
      diagnostics: {
        last_gateway_health_status: lastGatewayHealthStatus,
        missing_playable_asset: true,
      },
      ...overrides,
    };
  }

  function toDataAudioUrl(contentType, bytes) {
    if (!bytes || !bytes.length) return null;
    return `data:${contentType || "audio/mpeg"};base64,${Buffer.from(bytes).toString("base64")}`;
  }

  async function callGateway(payload = {}) {
    if (!isAvailable()) {
      return normalizeFallback(payload, "provider_unavailable", "voice_gateway_unavailable");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}/speak`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(gatewayToken ? { authorization: `Bearer ${gatewayToken}` } : {}),
        },
        body: JSON.stringify({
          text: String(payload.voice_text || payload.text_content || "").trim(),
          voice: payload.voice || undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const status = response.status >= 400 && response.status < 500 ? "invalid_request" : "fallback";
        return normalizeFallback(payload, status, `voice_repo_http_${response.status}`, {
          diagnostics: {
            last_gateway_health_status: lastGatewayHealthStatus,
            gateway_http_status: response.status,
            missing_playable_asset: true,
            upstream_route: "/speak",
          },
        });
      }

      const contentType = String(response.headers.get("content-type") || "").toLowerCase();
      if (!contentType.startsWith("audio/")) {
        return normalizeFallback(payload, "fallback", "malformed_gateway_success_missing_playable_asset", {
          diagnostics: {
            last_gateway_health_status: lastGatewayHealthStatus,
            malformed_gateway_payload: true,
            missing_playable_asset: true,
            upstream_route: "/speak",
          },
        });
      }
      const audioBytes = Buffer.from(await response.arrayBuffer());
      const audioUrl = toDataAudioUrl(contentType || "audio/mpeg", audioBytes);
      if (!audioUrl) return normalizeFallback(payload, "fallback", "voice_repo_empty_audio");

      return {
        ok: true,
        status: "ready",
        provider: "openai-via-upstream-speak",
        provider_status: "available",
        fallback_active: false,
        fallback_reason: null,
        playable_text: String(payload.voice_text || payload.text_content || "").trim(),
        audio_url: audioUrl,
        asset_ref: null,
        replay_token: deterministicId("voice_replay", { payload, provider: "openai-via-upstream-speak" }),
        chunk_index: Number(payload.chunk_index ?? 0),
        expires_at: null,
        diagnostics: {
          last_gateway_health_status: lastGatewayHealthStatus,
          missing_playable_asset: false,
          upstream_route: "/speak",
          provider_audio_bytes: audioBytes.length,
          provider_audio_content_type: contentType || "audio/mpeg",
        },
      };
    } catch (err) {
      const timeoutTriggered = err && (err.name === "AbortError" || String(err.message || "").toLowerCase().includes("aborted"));
      return normalizeFallback(payload, timeoutTriggered ? "fallback" : "provider_unavailable", timeoutTriggered ? "voice_gateway_timeout" : "voice_gateway_request_failed");
    } finally {
      clearTimeout(timeout);
    }
  }

  async function synthesizeCheckin(payload = {}) {
    return callGateway(payload);
  }

  async function synthesizeReportSection(payload = {}) {
    return callGateway(payload);
  }

  async function resolveAssetReference(payload = {}) {
    const assetRef = String(payload.asset_ref || "").trim();
    if (!assetRef) {
      return { ok: false, status: "invalid_request", error: "asset_ref_required", audio_url: null, asset_ref: null };
    }
    if (/^https?:\/\//i.test(assetRef)) {
      return {
        ok: true,
        status: "ready",
        provider: "external_gateway",
        provider_status: "available",
        audio_url: assetRef,
        asset_ref: assetRef,
      };
    }
    return { ok: false, status: "invalid_request", error: "voice_asset_resolution_not_supported", audio_url: null, asset_ref: assetRef };
  }

  async function getConnectivity() {
    if (!isAvailable()) {
      lastGatewayHealthStatus = "provider_unavailable";
      return {
        status: "provider_unavailable",
        checked_at: new Date().toISOString(),
        detail: "voice_gateway_base_url_missing",
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/health`, {
        method: "GET",
        headers: {
          ...(gatewayToken ? { authorization: `Bearer ${gatewayToken}` } : {}),
        },
        signal: controller.signal,
      });

      const body = await response.json().catch(() => ({}));
      lastGatewayHealthStatus = response.ok ? "connected" : "degraded";
      return {
        status: response.ok ? "connected" : "degraded",
        checked_at: new Date().toISOString(),
        gateway_status: body?.status || null,
      };
    } catch (_err) {
      lastGatewayHealthStatus = "provider_unavailable";
      return {
        status: "provider_unavailable",
        checked_at: new Date().toISOString(),
        detail: "voice_gateway_health_unreachable",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  function getDiagnostics() {
    return {
      last_gateway_health_status: lastGatewayHealthStatus,
    };
  }

  return {
    provider: "external_gateway",
    mode,
    isAvailable,
    getGatewayConfig,
    getConnectivity,
    getDiagnostics,
    synthesizeCheckin,
    synthesizeReportSection,
    resolveAssetReference,
    chunkText,
  };
}

module.exports = {
  createVoiceProviderAdapter,
  chunkText,
};
