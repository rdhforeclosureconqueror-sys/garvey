"use strict";

const crypto = require("crypto");
const { pool: defaultPool } = require("./db");

const PROVIDER = "simbawajuma";

function signBody(body, secret) {
  return crypto.createHmac("sha256", String(secret || "")).update(body).digest("hex");
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
  const webhookUrl = String(process.env.SIMBAWAJUMAA_WEBHOOK_URL || "").trim();
  if (!webhookUrl || typeof fetch !== "function") return { delivered: false, reason: "webhook_not_configured" };
  const event = (await pool.query("SELECT * FROM external_event_deliveries WHERE id = $1", [id])).rows[0];
  if (!event) return { delivered: false, reason: "event_not_found" };
  const body = JSON.stringify(event.payload || {});
  const secret = String(process.env.SIMBAWAJUMAA_WEBHOOK_SECRET || "").trim();
  const headers = { "Content-Type": "application/json" };
  if (secret) headers["X-Garvey-Signature"] = `sha256=${signBody(body, secret)}`;
  await pool.query("UPDATE external_event_deliveries SET status = 'sending', attempts = attempts + 1, last_attempt_at = NOW(), updated_at = NOW() WHERE id = $1", [id]);
  try {
    const response = await fetch(webhookUrl, { method: "POST", headers, body });
    if (!response.ok) throw new Error(`webhook responded ${response.status}`);
    await pool.query("UPDATE external_event_deliveries SET status = 'delivered', delivered_at = NOW(), updated_at = NOW(), last_error = NULL WHERE id = $1", [id]);
    return { delivered: true };
  } catch (err) {
    await pool.query("UPDATE external_event_deliveries SET status = 'queued', last_error = $2, updated_at = NOW() WHERE id = $1", [id, err.message]);
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
    assessment_id: row.payload?.assessment_id || row.payload?.assessment_type || null,
    result_id: row.payload?.result_id || null,
    member: row.payload?.member_id || row.external_user_id || row.payload?.email || null,
    retry_count: row.attempts,
    error_message: row.last_error,
    signature_validation: String(process.env.SIMBAWAJUMAA_WEBHOOK_SECRET || '').trim() ? 'signed_sha256' : 'unsigned_secret_not_configured',
    updated_at: row.updated_at,
  } : null;
  return {
    queued_callbacks: counts.rows.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {}),
    last_callback: rowToDiag(lastAny.rows[0]),
    last_success: rowToDiag(lastSuccess.rows[0]),
    last_failure: rowToDiag(lastFailure.rows[0]),
  };
}

module.exports = { PROVIDER, queueExternalEvent, deliverExternalEvent, retryQueuedExternalEvents, getExternalEventDiagnostics, signBody };
