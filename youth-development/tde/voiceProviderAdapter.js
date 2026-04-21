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
  const baseUrl = String(options.gateway_base_url || process.env.VOICE_GATEWAY_BASE_URL || "").trim().replace(/\/+$/, "");
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

  async function callGateway(endpointPath, payload = {}) {
    if (!isAvailable()) {
      return normalizeFallback(payload, "provider_unavailable", "voice_gateway_unavailable");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}${endpointPath}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(gatewayToken ? { authorization: `Bearer ${gatewayToken}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const status = response.status >= 400 && response.status < 500 ? "invalid_request" : "fallback";
        return normalizeFallback(payload, status, String(body?.error || `gateway_http_${response.status}`), {
          diagnostics: {
            last_gateway_health_status: lastGatewayHealthStatus,
            gateway_http_status: response.status,
            missing_playable_asset: true,
          },
        });
      }

      const audioUrl = typeof body.audio_url === "string" ? body.audio_url : null;
      const assetRef = typeof body.asset_ref === "string" ? body.asset_ref : null;
      if (!audioUrl && !assetRef) {
        return normalizeFallback(payload, "fallback", "malformed_gateway_success_missing_playable_asset", {
          diagnostics: {
            last_gateway_health_status: lastGatewayHealthStatus,
            malformed_gateway_payload: true,
            missing_playable_asset: true,
          },
        });
      }

      return {
        ok: true,
        status: String(body.status || "ready"),
        provider: String(body.provider || body.provider_name || "external_gateway"),
        provider_status: "available",
        fallback_active: false,
        fallback_reason: null,
        playable_text: String(body.playable_text || payload.voice_text || "").trim(),
        audio_url: audioUrl,
        asset_ref: assetRef,
        replay_token: typeof body.replay_token === "string"
          ? body.replay_token
          : deterministicId("voice_replay", { payload, provider: body.provider || "external_gateway" }),
        chunk_index: Number(body.chunk_index ?? payload.chunk_index ?? 0),
        expires_at: body.expires_at || null,
        diagnostics: {
          last_gateway_health_status: lastGatewayHealthStatus,
          missing_playable_asset: false,
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
    return callGateway("/internal/voice/checkin-prompt", payload);
  }

  async function synthesizeReportSection(payload = {}) {
    return callGateway("/internal/voice/report-section", payload);
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
    const resolved = await callGateway("/internal/voice/resolve-asset", {
      child_id: payload.child_id,
      asset_ref: assetRef,
    });
    return {
      ok: Boolean(resolved.ok && (resolved.audio_url || resolved.asset_ref)),
      status: resolved.status,
      provider: resolved.provider,
      provider_status: resolved.provider_status,
      error: resolved.error || resolved.fallback_reason || null,
      audio_url: resolved.audio_url || null,
      asset_ref: resolved.asset_ref || assetRef,
      diagnostics: resolved.diagnostics || null,
    };
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
      const response = await fetch(`${baseUrl}/internal/voice/health`, {
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
