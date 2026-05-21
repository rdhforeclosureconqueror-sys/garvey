"use strict";

const crypto = require("crypto");

function buildTimelineEventId({ child_id, parent_user_id, event_type, gate_number = null, source_type = "unknown", source_id = null, occurred_at = null }) {
  const key = [child_id, parent_user_id, event_type, gate_number == null ? "" : gate_number, source_type, source_id == null ? "" : source_id, occurred_at ? new Date(occurred_at).toISOString() : ""].join("|");
  return `gte_${crypto.createHash("sha256").update(key).digest("hex").slice(0, 24)}`;
}

async function recordDevelopmentTimelineEvent(pool, event) {
  const timeline_event_id = event.timeline_event_id || buildTimelineEventId(event);
  const occurredAt = event.occurred_at ? new Date(event.occurred_at).toISOString() : new Date().toISOString();
  const payload = event.payload && typeof event.payload === "object" ? event.payload : {};
  const result = await pool.query(
    `INSERT INTO gates_development_timeline (
      timeline_event_id, child_id, parent_user_id, event_type, gate_number, gate_key,
      title, summary, payload, source_type, source_id, occurred_at, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,NOW())
    ON CONFLICT (timeline_event_id) DO NOTHING
    RETURNING id, timeline_event_id`,
    [timeline_event_id, event.child_id, event.parent_user_id, event.event_type, event.gate_number || null, event.gate_key || null, event.title, event.summary, JSON.stringify(payload), event.source_type || "system", event.source_id || null, occurredAt]
  );
  const inserted = result.rowCount > 0;
  console.info(JSON.stringify({ ts: new Date().toISOString(), event: inserted ? "gates_timeline_event_recorded" : "gates_timeline_event_skipped_duplicate", child_id: String(event.child_id), parent_user_id: Number(event.parent_user_id), event_type: event.event_type, gate_number: event.gate_number || null, source_type: event.source_type || "system", source_id: event.source_id || null }));
  return { inserted, timeline_event_id };
}

async function listDevelopmentTimeline(pool, { child_id, parent_user_id, limit = 20 }) {
  const result = await pool.query(`SELECT timeline_event_id, child_id, parent_user_id, event_type, gate_number, gate_key, title, summary, payload, source_type, source_id, occurred_at, created_at FROM gates_development_timeline WHERE child_id = $1 AND parent_user_id = $2 ORDER BY occurred_at DESC, id DESC LIMIT $3`, [child_id, parent_user_id, Math.max(1, Math.min(100, Number(limit) || 20))]);
  return result.rows;
}

function summarizeTimelineForChild(timeline) {
  const rows = Array.isArray(timeline) ? timeline : [];
  const gates = new Set(rows.map((row) => Number(row.gate_number)).filter(Number.isInteger));
  return {
    total_events: rows.length,
    latest_event: rows[0] || null,
    gates_touched: Array.from(gates).sort((a, b) => a - b),
    recent_growth_theme: rows[0]?.title || null,
  };
}

module.exports = { buildTimelineEventId, recordDevelopmentTimelineEvent, listDevelopmentTimeline, summarizeTimelineForChild };
