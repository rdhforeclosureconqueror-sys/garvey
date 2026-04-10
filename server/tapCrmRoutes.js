"use strict";

const express = require("express");
const { pool } = require("./db");
const { ACTIONS, deriveActor, evaluatePolicy } = require("./accessControl");
const { getTapCrmMode } = require("./tapCrmFeature");

function checkTapAccess(req, action) {
  const actor = deriveActor(req);
  const tenant = String(req.query.tenant || "").trim().toLowerCase();
  if (!tenant) {
    return {
      ok: false,
      status: 400,
      body: { error: "tenant is required" },
    };
  }

  const policy = evaluatePolicy({
    actor,
    action,
    resourceTenantSlug: tenant,
  });

  if (!policy.allow) {
    return {
      ok: false,
      status: 403,
      body: {
        error: "forbidden",
        details: policy.reason,
      },
    };
  }

  return {
    ok: true,
    tenant,
    actor,
  };
}

function normalizeTagCode(value) {
  return String(value || "").trim().toLowerCase();
}

function evaluateTagStatus({ tagStatus, businessStatus }) {
  const tag = String(tagStatus || "inactive").toLowerCase();
  const business = String(businessStatus || "active").toLowerCase();

  if (business !== "active") {
    return {
      ok: false,
      status: 423,
      code: "business_inactive",
      reason: "business_not_active",
    };
  }

  if (tag === "disabled") {
    return {
      ok: false,
      status: 410,
      code: "tag_disabled",
      reason: "tag_disabled",
    };
  }

  if (tag === "inactive") {
    return {
      ok: false,
      status: 410,
      code: "tag_inactive",
      reason: "tag_inactive",
    };
  }

  if (tag !== "active") {
    return {
      ok: false,
      status: 400,
      code: "tag_invalid_status",
      reason: "tag_invalid_status",
    };
  }

  return { ok: true };
}

async function logTapEvent(db, {
  tenantId = null,
  tagId = null,
  tagCode,
  outcome,
  reason,
  requestMeta,
}) {
  await db.query(
    `INSERT INTO tap_crm_tap_events (
      tenant_id,
      tag_id,
      tag_code,
      outcome,
      reason,
      request_meta
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [tenantId, tagId, tagCode, outcome, reason, JSON.stringify(requestMeta || {})]
  );
}

async function resolvePublicTap(db, { tagCode, requestMeta = {} }) {
  const normalizedTagCode = normalizeTagCode(tagCode);
  if (!normalizedTagCode) {
    return {
      ok: false,
      status: 400,
      body: { error: "tag_code_required" },
    };
  }

  const lookup = await db.query(
    `SELECT
       tg.id AS tag_id,
       tg.tenant_id,
       tg.tag_code,
       tg.label,
       tg.status AS tag_status,
       tg.destination_path,
       tg.disabled_reason,
       t.slug AS tenant_slug,
       bc.hub_status,
       bc.disabled_reason AS business_disabled_reason,
       bc.config AS business_config
     FROM tap_crm_tags tg
     JOIN tenants t ON t.id = tg.tenant_id
     LEFT JOIN tap_crm_business_config bc ON bc.tenant_id = tg.tenant_id
     WHERE LOWER(tg.tag_code) = $1
     LIMIT 1`,
    [normalizedTagCode]
  );

  const row = lookup.rows[0];
  if (!row) {
    await logTapEvent(db, {
      tagCode: normalizedTagCode,
      outcome: "rejected",
      reason: "tag_not_found",
      requestMeta,
    });
    return {
      ok: false,
      status: 404,
      body: { error: "tag_not_found", tag_code: normalizedTagCode },
    };
  }

  const status = evaluateTagStatus({
    tagStatus: row.tag_status,
    businessStatus: row.hub_status,
  });

  if (!status.ok) {
    await logTapEvent(db, {
      tenantId: row.tenant_id,
      tagId: row.tag_id,
      tagCode: row.tag_code,
      outcome: "rejected",
      reason: status.reason,
      requestMeta,
    });

    return {
      ok: false,
      status: status.status,
      body: {
        error: status.code,
        tag_code: row.tag_code,
        tenant: row.tenant_slug,
      },
    };
  }

  await db.query(
    `UPDATE tap_crm_tags
     SET last_tap_at = NOW()
     WHERE id = $1`,
    [row.tag_id]
  );

  await logTapEvent(db, {
    tenantId: row.tenant_id,
    tagId: row.tag_id,
    tagCode: row.tag_code,
    outcome: "accepted",
    reason: "resolved",
    requestMeta,
  });

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      route_namespace: "tap-crm",
      resolution: {
        tenant: row.tenant_slug,
        tag_code: row.tag_code,
        label: row.label,
        destination_path: row.destination_path || "/tap-crm",
      },
      business_config: row.business_config || {},
    },
  };
}

function createTapCrmRouter() {
  const router = express.Router();

  router.get("/health", (req, res) => {
    return res.json({
      ok: true,
      domain: "tap_crm",
      mode: getTapCrmMode(),
      timestamp: new Date().toISOString(),
    });
  });

  router.get("/dashboard", (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_VIEW);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    return res.json({
      ok: true,
      domain: "tap_crm",
      tenant: access.tenant,
      summary: {
        total_contacts: 0,
        active_pipeline: 0,
        conversions_30d: 0,
      },
      stage_breakdown: [],
      tasks_due_today: [],
    });
  });

  router.get("/permissions", (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_MANAGE);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }

    return res.json({
      ok: true,
      tenant: access.tenant,
      role: access.actor.role,
      tap_permissions: {
        view: true,
        manage: true,
        tags_manage: true,
        templates_manage: true,
        analytics_view: true,
      },
    });
  });

  router.get("/public/tags/:tagCode/resolve", async (req, res) => {
    try {
      const resolved = await resolvePublicTap(pool, {
        tagCode: req.params.tagCode,
        requestMeta: {
          ip: req.ip,
          user_agent: req.headers["user-agent"] || "",
          source: "api",
        },
      });
      return res.status(resolved.status).json(resolved.body);
    } catch (err) {
      console.error("tap_crm_public_tag_resolve_failed", err);
      return res.status(500).json({ error: "tap_tag_resolution_failed" });
    }
  });

  return router;
}

module.exports = {
  createTapCrmRouter,
  checkTapAccess,
  normalizeTagCode,
  evaluateTagStatus,
  resolvePublicTap,
};
