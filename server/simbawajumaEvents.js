"use strict";

const crypto = require("crypto");
const { pool: defaultPool } = require("./db");

const PROVIDER = "simbawajuma";

function signBody(body, secret) {
  return crypto.createHmac("sha256", String(secret || "")).update(body).digest("hex");
}

function resolveWebhookUrl(env = process.env) {
  const explicit = String(env.SIMBAWAJUMAA_WEBHOOK_URL || env.SIMBA_CALLBACK_URL || env.GARVEY_CALLBACK_URL || "").trim();
  if (explicit) return explicit;
  const base = String(env.SIMBA_BASE_URL || "").trim().replace(/\/+$/, "");
  return base ? `${base}/garvey/callback` : "";
}

function resolveWebhookSecret(env = process.env) {
  return String(env.SIMBAWAJUMAA_WEBHOOK_SECRET || env.SIMBA_CALLBACK_SECRET || env.GARVEY_CALLBACK_SECRET || env.WEBHOOK_SECRET || "").trim();
}

function buildDeliveryHeaders(body, env = process.env) {
  const secret = resolveWebhookSecret(env);
  const headers = { "Content-Type": "application/json" };
  const signatureValidationResult = secret ? "hmac_sha256_hex_plus_callback_secret_headers" : "unsigned_secret_not_configured";
  if (secret) {
    const digest = signBody(body, secret);
    headers["X-Garvey-Signature"] = `sha256=${digest}`;
    headers["X-Hub-Signature-256"] = `sha256=${digest}`;
    headers["X-Garvey-Callback-Secret"] = secret;
    headers.Authorization = `Bearer ${secret}`;
  }
  return { headers, signatureValidationResult, signature_algorithm: secret ? "HMAC-SHA256 over raw JSON body, hex digest, sha256= prefix" : "none" };
}

async function resolveExternalIdentity({ userId, provider = PROVIDER, pool = defaultPool }) {
  if (!userId) return null;
  const result = await pool.query(
    `SELECT provider, external_user_id, external_membership_id, email
       FROM user_external_identities
      WHERE provider = $1 AND user_id = $2
      LIMIT 1`,
    [provider, userId]
  );
  return result.rows[0] || null;
}

async function queueExternalEvent({ provider = PROVIDER, eventType, userId, externalUserId, externalMembershipId = null, email = null, payload, pool = defaultPool }) {
  const externalIdentity = await resolveExternalIdentity({ userId, provider, pool });
  const fallbackIdentity = externalUserId || email ? {
    external_user_id: String(externalUserId || email || "").trim(),
    external_membership_id: externalMembershipId || null,
    email: email || null,
  } : null;
  const identity = externalIdentity || fallbackIdentity;
  if (!identity?.external_user_id) return { queued: false, reason: "external_identity_not_found" };
  const eventPayload = {
    provider,
    external_user_id: identity.external_user_id,
    external_membership_id: identity.external_membership_id,
    email: identity.email || email || payload?.email || null,
    garvey_user_id: userId || null,
    ...payload,
  };
  const inserted = await pool.query(
    `INSERT INTO external_event_deliveries (provider, event_type, user_id, external_user_id, payload, status)
     VALUES ($1,$2,$3,$4,$5::jsonb,'queued')
     RETURNING id`,
    [provider, eventType, userId || null, identity.external_user_id, JSON.stringify(eventPayload)]
  );
  deliverExternalEvent(inserted.rows[0].id, { pool }).catch((err) => {
    console.error("external_event_delivery_async_failed", { id: inserted.rows[0].id, error: err.message });
  });
  return { queued: true, id: inserted.rows[0].id };
}

async function deliverExternalEvent(id, { pool = defaultPool } = {}) {
  const webhookUrl = resolveWebhookUrl();
  if (!webhookUrl || typeof fetch !== "function") return { delivered: false, reason: "webhook_not_configured" };
  const event = (await pool.query("SELECT * FROM external_event_deliveries WHERE id = $1", [id])).rows[0];
  if (!event) return { delivered: false, reason: "event_not_found" };
  const body = JSON.stringify(event.payload || {});
  const { headers, signatureValidationResult } = buildDeliveryHeaders(body);
  console.info("simbawajuma_callback_step", { step: "payload_built", id, assessment_id: event.payload?.assessment_id || null, result_id: event.payload?.result_id || null, member_email: event.payload?.email || null });
  console.info("simbawajuma_callback_step", { step: "callback_signed", id, signature_validation_result: signatureValidationResult });
  await pool.query("UPDATE external_event_deliveries SET status = 'sending', attempts = attempts + 1, last_attempt_at = NOW(), callback_url = $2, signature_validation_result = $3, updated_at = NOW() WHERE id = $1", [id, webhookUrl, signatureValidationResult]);
  try {
    console.info("simbawajuma_callback_step", { step: "post_sending", id, callback_url: webhookUrl });
    const response = await fetch(webhookUrl, { method: "POST", headers, body });
    const responseBody = await response.text().catch(() => "");
    const simbaAccepted = response.ok;
    console.info("simbawajuma_callback_step", { step: "response_received", id, http_status: response.status, simba_accepted: simbaAccepted });
    if (!response.ok) {
      const message = `webhook responded ${response.status}: ${responseBody.slice(0, 500)}`;
      await pool.query("UPDATE external_event_deliveries SET status = 'queued', updated_at = NOW(), http_status = $2, response_body = $3, simba_accepted = FALSE, last_error = $4 WHERE id = $1", [id, response.status, responseBody.slice(0, 4000), message]);
      return { delivered: false, reason: message, http_status: response.status, simba_accepted: false };
    }
    await pool.query("UPDATE external_event_deliveries SET status = 'delivered', delivered_at = NOW(), updated_at = NOW(), http_status = $2, response_body = $3, simba_accepted = TRUE, last_error = NULL WHERE id = $1", [id, response.status, responseBody.slice(0, 4000)]);
    return { delivered: true, http_status: response.status, simba_accepted: true };
  } catch (err) {
    await pool.query("UPDATE external_event_deliveries SET status = 'queued', last_error = $2, updated_at = NOW(), simba_accepted = COALESCE(simba_accepted, FALSE) WHERE id = $1", [id, err.message]);
    console.error("simbawajuma_callback_step", { step: "callback_exception", id, error: err.message });
    return { delivered: false, reason: err.message };
  }
}

async function retryQueuedExternalEvents({ provider = PROVIDER, limit = 25, pool = defaultPool } = {}) {
  const result = await pool.query(
    `SELECT id FROM external_event_deliveries
      WHERE provider = $1
        AND status IN ('queued','failed')
        AND (last_attempt_at IS NULL OR last_attempt_at < NOW() - INTERVAL '2 minutes')
      ORDER BY created_at ASC
      LIMIT $2`,
    [provider, Number(limit || 25)]
  );
  const outcomes = [];
  for (const row of result.rows) outcomes.push(await deliverExternalEvent(row.id, { pool }));
  return { attempted: outcomes.length, outcomes };
}

async function getExternalEventDiagnostics({ provider = PROVIDER, pool = defaultPool } = {}) {
  const [counts, lastAny, lastSuccess, lastFailure] = await Promise.all([
    pool.query(`SELECT status, COUNT(*)::int AS count FROM external_event_deliveries WHERE provider = $1 GROUP BY status`, [provider]),
    pool.query(`SELECT * FROM external_event_deliveries WHERE provider = $1 ORDER BY updated_at DESC LIMIT 1`, [provider]),
    pool.query(`SELECT * FROM external_event_deliveries WHERE provider = $1 AND status = 'delivered' ORDER BY delivered_at DESC NULLS LAST, updated_at DESC LIMIT 1`, [provider]),
    pool.query(`SELECT * FROM external_event_deliveries WHERE provider = $1 AND last_error IS NOT NULL ORDER BY updated_at DESC LIMIT 1`, [provider]),
  ]);
  const rowToDiag = (row) => row ? {
    id: row.id,
    event_type: row.event_type,
    status: row.status,
    last_callback_timestamp: row.last_attempt_at || row.updated_at,
    callback_destination_url: row.callback_url || resolveWebhookUrl() || null,
    http_status_code: row.http_status || null,
    response_body: row.response_body || null,
    signature_validation_result: row.signature_validation_result || (resolveWebhookSecret() ? 'hmac_sha256_hex_x_garvey_signature' : 'unsigned_secret_not_configured'),
    member_email: row.payload?.email || null,
    assessment_id: row.payload?.assessment_id || row.payload?.submission_id || row.payload?.assessment_type || null,
    result_id: row.payload?.result_id || null,
    queue_status: row.status,
    retry_count: row.attempts,
    last_retry_timestamp: row.last_attempt_at || null,
    last_callback_exception: row.last_error || null,
    simba_accepted: row.simba_accepted === null || row.simba_accepted === undefined ? row.status === 'delivered' : row.simba_accepted,
    member: row.payload?.member_id || row.external_user_id || row.payload?.email || null,
    error_message: row.last_error,
    updated_at: row.updated_at,
  } : null;
  const resolvedUrl = resolveWebhookUrl();
  return {
    callback: {
      current_callback_url: String(process.env.SIMBAWAJUMAA_WEBHOOK_URL || process.env.SIMBA_CALLBACK_URL || process.env.GARVEY_CALLBACK_URL || "").trim() || null,
      resolved_callback_url: resolvedUrl || null,
      http_method: "POST",
      signature_algorithm: resolveWebhookSecret() ? "HMAC-SHA256 over raw JSON body, hex digest, sha256= prefix; callback secret also sent as direct secret headers for legacy Simba callback receivers" : "unsigned (no callback secret configured)",
      configured_headers: ["Content-Type", ...(resolveWebhookSecret() ? ["X-Garvey-Signature", "X-Hub-Signature-256", "X-Garvey-Callback-Secret", "Authorization: Bearer <secret>"] : [])],
      env_variable_match: "Simba's Garvey callback secret must equal Garvey SIMBAWAJUMAA_WEBHOOK_SECRET (fallbacks: SIMBA_CALLBACK_SECRET, GARVEY_CALLBACK_SECRET, WEBHOOK_SECRET).",
    },
    environment_present: {
      SIMBAWAJUMAA_WEBHOOK_URL: Boolean(process.env.SIMBAWAJUMAA_WEBHOOK_URL),
      SIMBA_CALLBACK_URL: Boolean(process.env.SIMBA_CALLBACK_URL),
      GARVEY_CALLBACK_URL: Boolean(process.env.GARVEY_CALLBACK_URL),
      SIMBA_BASE_URL: Boolean(process.env.SIMBA_BASE_URL),
      SIMBAWAJUMAA_WEBHOOK_SECRET: Boolean(process.env.SIMBAWAJUMAA_WEBHOOK_SECRET),
      SIMBA_CALLBACK_SECRET: Boolean(process.env.SIMBA_CALLBACK_SECRET),
      GARVEY_CALLBACK_SECRET: Boolean(process.env.GARVEY_CALLBACK_SECRET),
      WEBHOOK_SECRET: Boolean(process.env.WEBHOOK_SECRET),
    },
    queued_callbacks: counts.rows.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {}),
    queue_size: counts.rows.filter((r) => ["queued", "failed"].includes(r.status)).reduce((sum, r) => sum + Number(r.count || 0), 0),
    last_callback: rowToDiag(lastAny.rows[0]),
    last_success: rowToDiag(lastSuccess.rows[0]),
    last_failure: rowToDiag(lastFailure.rows[0]),
    payload_preview: lastAny.rows[0]?.payload ? JSON.stringify(lastAny.rows[0].payload).slice(0, 1200) : null,
    retry_behavior: "Queued/failed events retry every SIMBAWAJUMAA_RETRY_INTERVAL_MS (default 120000 ms); each retry selects events older than 2 minutes, oldest first, limit 25.",
  };
}

module.exports = { PROVIDER, queueExternalEvent, deliverExternalEvent, retryQueuedExternalEvents, getExternalEventDiagnostics, signBody, resolveWebhookUrl, resolveWebhookSecret, buildDeliveryHeaders };
