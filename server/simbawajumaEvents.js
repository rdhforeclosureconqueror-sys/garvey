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

async function queueExternalEvent({ provider = PROVIDER, eventType, userId, payload, pool = defaultPool }) {
  const externalIdentity = await resolveExternalIdentity({ userId, provider, pool });
  if (!externalIdentity) return { queued: false, reason: "external_identity_not_found" };
  const eventPayload = {
    provider,
    external_user_id: externalIdentity.external_user_id,
    external_membership_id: externalIdentity.external_membership_id,
    garvey_user_id: userId,
    ...payload,
  };
  const inserted = await pool.query(
    `INSERT INTO external_event_deliveries (provider, event_type, user_id, external_user_id, payload, status)
     VALUES ($1,$2,$3,$4,$5::jsonb,'queued')
     RETURNING id`,
    [provider, eventType, userId, externalIdentity.external_user_id, JSON.stringify(eventPayload)]
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
    await pool.query("UPDATE external_event_deliveries SET status = 'failed', last_error = $2, updated_at = NOW() WHERE id = $1", [id, err.message]);
    return { delivered: false, reason: err.message };
  }
}

module.exports = { PROVIDER, queueExternalEvent, deliverExternalEvent, signBody };
