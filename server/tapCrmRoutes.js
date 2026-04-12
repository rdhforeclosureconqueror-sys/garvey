"use strict";

const express = require("express");
const { pool } = require("./db");
const crypto = require("crypto");
const { ACTIONS, ROLES, deriveActor, evaluatePolicy } = require("./accessControl");
const { getTapCrmMode } = require("./tapCrmFeature");
const {
  normalizeTemplateId,
  resolveTemplateRuntime,
  cloneTemplateForIndustry,
  listTemplates,
  listModules,
  listAddOns,
  resolveAddOnRuntime,
  resolveServiceCustomFields,
  MODULE_REGISTRY,
  buildBarberPilotBaselineConfig,
} = require("./tapCrmTemplates");

const OWNER_CONSOLE_ROUTE_NAMESPACE = "tap-crm";
const TAP_EVENT_TYPES = new Set([
  "tap_open",
  "tap_resolved",
  "checkin_click",
  "booking_open",
  "booking_submit",
  "pay_click",
  "tip_click",
  "return_engine_click",
  "primary_action_click",
  "secondary_action_click",
  "tap_button_click",
]);
const BOOKING_STATUS = {
  REQUESTED: "requested",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
};
const BOOKING_ACTIVE_BLOCKING_STATUSES = new Set([BOOKING_STATUS.REQUESTED, BOOKING_STATUS.CONFIRMED]);
const BOOKING_NOTIFICATION_TYPE = "booking";

function checkTapAccess(req, action) {
  if (!req.authActor) {
    return {
      ok: false,
      status: 401,
      body: {
        error: "authentication_required",
        details: "Tap In owner access requires a signed-in Garvey business owner session.",
      },
    };
  }

  const actor = deriveActor(req);
  if (!actor.isAdmin && actor.role !== ROLES.BUSINESS_OWNER) {
    return {
      ok: false,
      status: 403,
      body: {
        error: "owner_session_required",
        details: "Tap In owner console is only available to Garvey business owners.",
      },
    };
  }

  const tenant = String(req.query.tenant || req.body?.tenant || actor.tenantSlug || "").trim().toLowerCase();
  if (!tenant) {
    return {
      ok: false,
      status: 400,
      body: { error: "tenant is required" },
    };
  }

  if (!actor.isAdmin && !actor.onboardingComplete) {
    return {
      ok: false,
      status: 409,
      body: {
        error: "garvey_onboarding_required",
        details: "Complete Garvey business onboarding before using Tap In.",
        redirect_to: `/intake.html?assessment=business_owner&tenant=${encodeURIComponent(tenant)}&email=${encodeURIComponent(actor.email || "")}`,
      },
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

function cloneJson(value, fallback = {}) {
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return fallback;
  }
}

function normalizeActionItems(items, fallbackLabel) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item = {}, index) => ({
      label: String(item.label || "").trim() || `${fallbackLabel} ${index + 1}`,
      url: String(item.url || "").trim() || "#",
    }))
    .filter((item) => item.label && item.url);
}

function buildOwnerConsolePayload({ tenant, role }) {
  return {
    ok: true,
    route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
    tenant,
    role,
    screens: [
      "business_setup",
      "primary_action_editor",
      "secondary_action_editor",
      "tag_manager",
      "analytics_summary",
      "template_selector",
      "module_registry",
      "module_config_editor",
      "add_on_registry",
      "custom_fields_editor",
      "admin_overrides",
      "pilot_readiness",
      "pilot_bootstrap",
      "tap_crm_dashboard_landing",
    ],
  };
}

async function getTenantRecord(db, tenantSlug) {
  const found = await db.query(
    `SELECT id, slug
     FROM tenants
     WHERE LOWER(slug) = $1
     LIMIT 1`,
    [String(tenantSlug || "").trim().toLowerCase()]
  );
  return found.rows[0] || null;
}

async function getBusinessConfig(db, tenantId) {
  const existing = await db.query(
    `SELECT id, hub_status, disabled_reason, config
     FROM tap_crm_business_config
     WHERE tenant_id = $1
     LIMIT 1`,
    [tenantId]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const inserted = await db.query(
    `INSERT INTO tap_crm_business_config (tenant_id, hub_status, disabled_reason, config)
     VALUES ($1, 'active', '', '{}'::jsonb)
     RETURNING id, hub_status, disabled_reason, config`,
    [tenantId]
  );
  return inserted.rows[0];
}

async function saveBusinessConfig(db, tenantId, config) {
  const updated = await db.query(
    `UPDATE tap_crm_business_config
     SET config = $2::jsonb,
         updated_at = NOW()
     WHERE tenant_id = $1
     RETURNING id, hub_status, disabled_reason, config`,
    [tenantId, JSON.stringify(config || {})]
  );
  return updated.rows[0] || null;
}

async function resolvePreferredCampaignForTenant(db, tenantId) {
  const result = await db.query(
    `SELECT id, slug, source, medium
     FROM campaigns
     WHERE tenant_id = $1
     ORDER BY
       CASE WHEN source = 'owner-default' THEN 0 ELSE 1 END ASC,
       created_at ASC
     LIMIT 1`,
    [tenantId]
  );
  return result.rows[0] || null;
}

async function withTenantScope(db, tenantSlug) {
  const tenantRecord = await getTenantRecord(db, tenantSlug);
  if (!tenantRecord) {
    return { ok: false, status: 404, body: { error: "tenant_not_found" } };
  }

  const businessConfig = await getBusinessConfig(db, tenantRecord.id);
  return {
    ok: true,
    tenantId: tenantRecord.id,
    tenantSlug: tenantRecord.slug,
    businessConfig,
  };
}

function normalizeTagCode(value) {
  return String(value || "").trim().toLowerCase();
}

function buildTapAttributionMeta(requestMeta = {}) {
  const source = String(requestMeta.source || "tap-public").trim().toLowerCase() || "tap-public";
  const tapSessionId = String(requestMeta.tap_session_id || "").trim() || crypto.randomUUID();
  return {
    source,
    tap_session_id: tapSessionId,
  };
}

function normalizeTagKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeTagStatusValue(value, fallback = "active") {
  const normalized = String(value || fallback).trim().toLowerCase();
  if (normalized === "active" || normalized === "inactive" || normalized === "disabled") {
    return normalized;
  }
  return fallback;
}

function normalizeDestinationPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "/tap-crm";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function parseDateOnly(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return raw;
}

function parseYearMonth(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month, key: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}` };
}

function parseTimeOnly(value) {
  const raw = String(value || "").trim();
  if (!/^\d{2}:\d{2}$/.test(raw)) return null;
  return raw;
}

function buildDefaultSlotConfig() {
  return {
    start: "09:00",
    end: "17:00",
    interval_minutes: 30,
    working_days: [1, 2, 3, 4, 5, 6],
  };
}

function buildTimeSlots({ start, end, intervalMinutes }) {
  const [startHour, startMinute] = String(start || "09:00").split(":").map((part) => Number(part));
  const [endHour, endMinute] = String(end || "17:00").split(":").map((part) => Number(part));
  const beginTotal = (startHour * 60) + startMinute;
  const endTotal = (endHour * 60) + endMinute;
  const interval = Number(intervalMinutes) > 0 ? Number(intervalMinutes) : 30;
  const slots = [];
  for (let minute = beginTotal; minute < endTotal; minute += interval) {
    const h = Math.floor(minute / 60);
    const m = minute % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}

function normalizeBookingStatus(value, fallback = BOOKING_STATUS.REQUESTED) {
  const normalized = String(value || fallback).trim().toLowerCase();
  if (normalized === BOOKING_STATUS.REQUESTED || normalized === BOOKING_STATUS.CONFIRMED || normalized === BOOKING_STATUS.CANCELLED) {
    return normalized;
  }
  return fallback;
}

async function insertTapNotification(db, { tenantId, type, title, payload = {} }) {
  const inserted = await db.query(
    `INSERT INTO tap_crm_notifications (tenant_id, type, title, payload_json)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id, tenant_id, type, title, payload_json, is_new, acknowledged_at, created_at`,
    [tenantId, String(type || "system"), String(title || "Notification"), JSON.stringify(payload || {})]
  );
  return inserted.rows[0] || null;
}

function describeTagConflict(err) {
  const constraint = String((err && err.constraint) || "").toLowerCase();
  const detail = String((err && err.detail) || "");
  const normalizedDetail = detail.toLowerCase();

  let field = "unknown";
  if (
    constraint.includes("tenant_tag_code")
    || constraint.includes("tag_code")
    || normalizedDetail.includes("(tag_code)")
  ) {
    field = "code";
  } else if (
    constraint.includes("tenant_id_key_key")
    || constraint.includes("_key_")
    || normalizedDetail.includes("(key)")
  ) {
    field = "key";
  } else if (
    constraint.includes("tenant_label")
    || constraint.includes("label")
    || normalizedDetail.includes("lower(label)")
    || normalizedDetail.includes("(label)")
  ) {
    field = "label";
  }

  const valueMatch = detail.match(/\)=\(([^)]+)\)/);
  const duplicateValue = valueMatch ? String(valueMatch[1] || "").trim() : "";
  const fieldLabel = field === "code" ? "tag code" : field;
  const message = field === "unknown"
    ? "This tag already exists for this tenant. Update the existing tag instead of creating a new one."
    : `Duplicate ${fieldLabel}: "${duplicateValue || "existing value"}" is already used for this tenant.`;

  return {
    field,
    duplicate_value: duplicateValue,
    message,
  };
}

function isNonEmptyObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0;
}

function evaluatePilotReadiness({ config, tags }) {
  const selectedTemplateId = normalizeTemplateId(config.selected_template_id || "");
  const businessSetupReady = isNonEmptyObject(config.business_setup);
  const primaryActionReady = Array.isArray(config.actions && config.actions.primary) && config.actions.primary.length > 0;
  const activeTagCount = (Array.isArray(tags) ? tags : []).filter((tag) => String(tag.status || "").toLowerCase() === "active").length;
  const onboardingState = cloneJson(config.onboarding, {});
  const firstBusinessSetupReady = onboardingState.first_business_setup_complete === true || businessSetupReady;

  return {
    ready: selectedTemplateId === "barber" && businessSetupReady && primaryActionReady && activeTagCount > 0 && firstBusinessSetupReady,
    checklist: {
      barber_template_selected: selectedTemplateId === "barber",
      business_setup_configured: businessSetupReady,
      primary_action_configured: primaryActionReady,
      active_tag_registered: activeTagCount > 0,
      first_business_onboarding_ready: firstBusinessSetupReady,
    },
    active_tag_count: activeTagCount,
    selected_template_id: selectedTemplateId || "default",
  };
}

function isAdminOverrideActor(actor) {
  return !!(actor && actor.isAdmin === true);
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
  eventType = "tap_resolved",
  outcome,
  reason,
  tapSessionId = "",
  requestMeta,
}) {
  await db.query(
    `INSERT INTO tap_crm_tap_events (
      tenant_id,
      tag_id,
      tag_code,
      event_type,
      outcome,
      reason,
      tap_session_id,
      request_meta
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [tenantId, tagId, tagCode, eventType, outcome, reason, String(tapSessionId || "").trim(), JSON.stringify(requestMeta || {})]
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

  const attribution = buildTapAttributionMeta(requestMeta);
  await logTapEvent(db, {
    tagCode: normalizedTagCode,
    eventType: "tap_open",
    outcome: "received",
    reason: "tap_open",
    tapSessionId: attribution.tap_session_id,
    requestMeta: {
      ...requestMeta,
      ...attribution,
    },
  });

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
      eventType: "tap_resolved",
      outcome: "rejected",
      reason: "tag_not_found",
      tapSessionId: attribution.tap_session_id,
      requestMeta: {
        ...requestMeta,
        ...attribution,
      },
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
      eventType: "tap_resolved",
      outcome: "rejected",
      reason: status.reason,
      tapSessionId: attribution.tap_session_id,
      requestMeta: {
        ...requestMeta,
        ...attribution,
      },
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
    eventType: "tap_resolved",
    outcome: "accepted",
    reason: "resolved",
    tapSessionId: attribution.tap_session_id,
    requestMeta: {
      ...requestMeta,
      ...attribution,
    },
  });

  const preferredCampaign = await resolvePreferredCampaignForTenant(db, row.tenant_id);

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
        campaign_slug: preferredCampaign?.slug || "",
        campaign_source: preferredCampaign?.source || "",
        attribution,
      },
      business_config: row.business_config || {},
      template_runtime: resolveTemplateRuntime(cloneJson(row.business_config || {}, {})),
    },
  };
}

async function getPublicTagContext(db, tagCode) {
  const normalizedTagCode = normalizeTagCode(tagCode);
  if (!normalizedTagCode) {
    return { ok: false, status: 400, body: { error: "tag_code_required" } };
  }

  const lookup = await db.query(
    `SELECT
       tg.id AS tag_id,
       tg.tenant_id,
       tg.tag_code,
       tg.status AS tag_status,
       t.slug AS tenant_slug,
       bc.hub_status,
       bc.config AS business_config
     FROM tap_crm_tags tg
     JOIN tenants t ON t.id = tg.tenant_id
     LEFT JOIN tap_crm_business_config bc ON bc.tenant_id = tg.tenant_id
     WHERE LOWER(tg.tag_code) = $1
     LIMIT 1`,
    [normalizedTagCode]
  );

  const row = lookup.rows[0];
  if (!row) return { ok: false, status: 404, body: { error: "tag_not_found" } };
  const status = evaluateTagStatus({ tagStatus: row.tag_status, businessStatus: row.hub_status });
  if (!status.ok) {
    return { ok: false, status: status.status, body: { error: status.code, tag_code: row.tag_code, tenant: row.tenant_slug } };
  }
  return { ok: true, row };
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
      route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
      tenant: access.tenant,
      landing: {
        title: "Tap CRM dashboard",
        owner_console: "/dashboard/tap-crm",
        sections: [
          "business_setup",
          "primary_action_editor",
          "secondary_action_editor",
          "tag_manager",
          "analytics_summary",
          "template_selector",
          "add_on_registry",
          "pilot_readiness",
        ],
      },
      summary: {
        total_contacts: 0,
        active_pipeline: 0,
        conversions_30d: 0,
      },
      stage_breakdown: [],
      tasks_due_today: [],
    });
  });

  router.get("/console/landing", (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_VIEW);
    if (!access.ok) {
      return res.status(access.status).json(access.body);
    }
    return res.json(buildOwnerConsolePayload({ tenant: access.tenant, role: access.actor.role }));
  });

  router.get("/console/business-setup", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const config = cloneJson(scoped.businessConfig.config, {});
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        business_setup: cloneJson(config.business_setup, {}),
      });
    } catch (err) {
      console.error("tap_crm_business_setup_get_failed", err);
      return res.status(500).json({ error: "tap_crm_business_setup_get_failed" });
    }
  });

  router.put("/console/business-setup", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const businessSetup = cloneJson(req.body || {}, {});
      const baseConfig = cloneJson(scoped.businessConfig.config, {});
      baseConfig.business_setup = businessSetup;
      const saved = await saveBusinessConfig(pool, scoped.tenantId, baseConfig);
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        business_setup: cloneJson(saved.config.business_setup, {}),
      });
    } catch (err) {
      console.error("tap_crm_business_setup_put_failed", err);
      return res.status(500).json({ error: "tap_crm_business_setup_put_failed" });
    }
  });

  router.get("/console/actions/primary", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const config = cloneJson(scoped.businessConfig.config, {});
      const primaryActions = normalizeActionItems(config.actions && config.actions.primary, "Primary action");
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        primary_actions: primaryActions,
      });
    } catch (err) {
      console.error("tap_crm_primary_actions_get_failed", err);
      return res.status(500).json({ error: "tap_crm_primary_actions_get_failed" });
    }
  });

  router.put("/console/actions/primary", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const baseConfig = cloneJson(scoped.businessConfig.config, {});
      baseConfig.actions = baseConfig.actions || {};
      baseConfig.actions.primary = normalizeActionItems(req.body && req.body.primary_actions, "Primary action");
      const saved = await saveBusinessConfig(pool, scoped.tenantId, baseConfig);
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        primary_actions: cloneJson(saved.config.actions.primary, []),
      });
    } catch (err) {
      console.error("tap_crm_primary_actions_put_failed", err);
      return res.status(500).json({ error: "tap_crm_primary_actions_put_failed" });
    }
  });

  router.get("/console/actions/secondary", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const config = cloneJson(scoped.businessConfig.config, {});
      const secondaryActions = normalizeActionItems(config.actions && config.actions.secondary, "Secondary action");
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        secondary_actions: secondaryActions,
      });
    } catch (err) {
      console.error("tap_crm_secondary_actions_get_failed", err);
      return res.status(500).json({ error: "tap_crm_secondary_actions_get_failed" });
    }
  });

  router.put("/console/actions/secondary", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const baseConfig = cloneJson(scoped.businessConfig.config, {});
      baseConfig.actions = baseConfig.actions || {};
      baseConfig.actions.secondary = normalizeActionItems(req.body && req.body.secondary_actions, "Secondary action");
      const saved = await saveBusinessConfig(pool, scoped.tenantId, baseConfig);
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        secondary_actions: cloneJson(saved.config.actions.secondary, []),
      });
    } catch (err) {
      console.error("tap_crm_secondary_actions_put_failed", err);
      return res.status(500).json({ error: "tap_crm_secondary_actions_put_failed" });
    }
  });

  router.get("/console/tags", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_TAGS_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const tags = await pool.query(
        `SELECT id, key, label, tag_code, status, destination_path, disabled_reason, last_tap_at
         FROM tap_crm_tags
         WHERE tenant_id = $1
         ORDER BY id DESC`,
        [scoped.tenantId]
      );
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        tags: tags.rows,
      });
    } catch (err) {
      console.error("tap_crm_tags_get_failed", err);
      return res.status(500).json({ error: "tap_crm_tags_get_failed" });
    }
  });

  router.post("/console/tags", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_TAGS_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);

      const input = req.body && typeof req.body === "object" ? req.body : {};
      const key = normalizeTagKey(input.key || input.tag_code || input.label);
      const label = String(input.label || input.purpose || "").trim();
      const tagCode = normalizeTagCode(input.tag_code || key);
      const status = normalizeTagStatusValue(input.status, "active");
      const destinationPath = normalizeDestinationPath(input.destination_path);
      const disabledReason = String(input.disabled_reason || "").trim();

      if (!key) return res.status(400).json({ error: "tag_key_required" });
      if (!label) return res.status(400).json({ error: "tag_label_required" });
      if (!tagCode) return res.status(400).json({ error: "tag_code_required" });

      const created = await pool.query(
        `INSERT INTO tap_crm_tags (tenant_id, key, label, tag_code, status, destination_path, disabled_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, key, label, tag_code, status, destination_path, disabled_reason, last_tap_at`,
        [scoped.tenantId, key, label, tagCode, status, destinationPath, status === "disabled" ? disabledReason : ""]
      );
      return res.status(201).json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        tag: created.rows[0],
      });
    } catch (err) {
      if (err && err.code === "23505") {
        const conflict = describeTagConflict(err);
        return res.status(409).json({
          error: "tag_conflict",
          conflict_field: conflict.field,
          conflict_value: conflict.duplicate_value,
          message: conflict.message,
        });
      }
      console.error("tap_crm_tags_post_failed", err);
      return res.status(500).json({ error: "tap_crm_tags_post_failed" });
    }
  });

  router.put("/console/tags/:tagId", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_TAGS_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);

      const tagId = Number(req.params.tagId);
      if (!Number.isInteger(tagId) || tagId <= 0) {
        return res.status(400).json({ error: "invalid_tag_id" });
      }

      const existing = await pool.query(
        `SELECT id, key, label, tag_code, status, destination_path, disabled_reason, last_tap_at
         FROM tap_crm_tags
         WHERE id = $1 AND tenant_id = $2
         LIMIT 1`,
        [tagId, scoped.tenantId]
      );
      const current = existing.rows[0];
      if (!current) return res.status(404).json({ error: "tag_not_found" });

      const input = req.body && typeof req.body === "object" ? req.body : {};
      const nextStatus = normalizeTagStatusValue(input.status, current.status || "active");
      const next = {
        key: normalizeTagKey(input.key !== undefined ? input.key : current.key) || current.key,
        label: String(
          input.label !== undefined
            ? input.label
            : input.purpose !== undefined
              ? input.purpose
              : current.label
        ).trim(),
        tag_code: normalizeTagCode(input.tag_code !== undefined ? input.tag_code : current.tag_code) || current.tag_code,
        status: nextStatus,
        destination_path: normalizeDestinationPath(
          input.destination_path !== undefined ? input.destination_path : current.destination_path
        ),
        disabled_reason: String(
          nextStatus === "disabled"
            ? (input.disabled_reason !== undefined ? input.disabled_reason : current.disabled_reason)
            : ""
        ).trim(),
      };

      if (!next.label) return res.status(400).json({ error: "tag_label_required" });

      const updated = await pool.query(
        `UPDATE tap_crm_tags
         SET key = $3,
             label = $4,
             tag_code = $5,
             status = $6,
             destination_path = $7,
             disabled_reason = $8
         WHERE id = $1 AND tenant_id = $2
         RETURNING id, key, label, tag_code, status, destination_path, disabled_reason, last_tap_at`,
        [tagId, scoped.tenantId, next.key, next.label, next.tag_code, next.status, next.destination_path, next.disabled_reason]
      );

      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        tag: updated.rows[0],
      });
    } catch (err) {
      if (err && err.code === "23505") {
        const conflict = describeTagConflict(err);
        return res.status(409).json({
          error: "tag_conflict",
          conflict_field: conflict.field,
          conflict_value: conflict.duplicate_value,
          message: conflict.message,
        });
      }
      console.error("tap_crm_tags_put_failed", err);
      return res.status(500).json({ error: "tap_crm_tags_put_failed" });
    }
  });

  router.get("/console/analytics/summary", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_ANALYTICS_VIEW);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const metrics = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE event_type = 'tap_resolved' AND outcome = 'accepted')::INT AS total_taps,
           COUNT(*) FILTER (WHERE event_type = 'tap_resolved' AND outcome = 'rejected')::INT AS rejected_taps,
           COUNT(*) FILTER (WHERE event_type = 'return_engine_click')::INT AS return_engine_click_count,
           COUNT(*) FILTER (WHERE event_type = 'pay_click')::INT AS pay_click_count,
           COUNT(*) FILTER (WHERE event_type = 'tip_click')::INT AS tip_click_count,
           MAX(event_timestamp) FILTER (WHERE event_type = 'tap_resolved') AS last_tap_at,
           MAX(event_timestamp) AS last_action_at
         FROM tap_crm_tap_events
         WHERE tenant_id = $1`,
        [scoped.tenantId]
      );
      const actionTypeCounts = await pool.query(
        `SELECT event_type, COUNT(*)::INT AS count
         FROM tap_crm_tap_events
         WHERE tenant_id = $1
         GROUP BY event_type
         ORDER BY count DESC, event_type ASC`,
        [scoped.tenantId]
      );
      const topTags = await pool.query(
        `SELECT tag_code, COUNT(*)::INT AS usage_count
         FROM tap_crm_tap_events
         WHERE tenant_id = $1
           AND COALESCE(tag_code, '') <> ''
         GROUP BY tag_code
         ORDER BY usage_count DESC, tag_code ASC
         LIMIT 5`,
        [scoped.tenantId]
      );
      const recentEvents = await pool.query(
        `SELECT
           event_type,
           tag_code,
           tap_session_id,
           outcome,
           reason,
           event_timestamp,
           request_meta
         FROM tap_crm_tap_events
         WHERE tenant_id = $1
         ORDER BY event_timestamp DESC
         LIMIT 25`,
        [scoped.tenantId]
      );
      const summary = metrics.rows[0] || {};
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        analytics_summary: {
          total_taps: Number(summary.total_taps || 0),
          rejected_taps: Number(summary.rejected_taps || 0),
          return_engine_click_count: Number(summary.return_engine_click_count || 0),
          pay_click_count: Number(summary.pay_click_count || 0),
          tip_click_count: Number(summary.tip_click_count || 0),
          last_tap_at: summary.last_tap_at || null,
          last_action_at: summary.last_action_at || null,
          counts_by_action_type: actionTypeCounts.rows.map((row) => ({
            event_type: row.event_type,
            count: Number(row.count || 0),
          })),
          top_used_tags: topTags.rows.map((row) => ({
            tag_code: row.tag_code,
            usage_count: Number(row.usage_count || 0),
          })),
          recent_events: recentEvents.rows.map((row) => ({
            event_type: row.event_type,
            tag_code: row.tag_code,
            tap_session_id: row.tap_session_id,
            outcome: row.outcome,
            reason: row.reason,
            timestamp: row.event_timestamp,
            request_meta: cloneJson(row.request_meta, {}),
          })),
        },
      });
    } catch (err) {
      console.error("tap_crm_analytics_summary_failed", err);
      return res.status(500).json({ error: "tap_crm_analytics_summary_failed" });
    }
  });

  router.get("/console/templates/selector", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_TEMPLATES_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const config = cloneJson(scoped.businessConfig.config, {});
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        template_selector: {
          selected_template_id: String(config.selected_template_id || ""),
          available_templates: listTemplates(),
          effective_template: resolveTemplateRuntime(config),
        },
      });
    } catch (err) {
      console.error("tap_crm_template_selector_get_failed", err);
      return res.status(500).json({ error: "tap_crm_template_selector_get_failed" });
    }
  });

  router.put("/console/templates/selector", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_TEMPLATES_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const selectedTemplateId = normalizeTemplateId(req.body && req.body.selected_template_id || "");
      if (!selectedTemplateId) {
        return res.status(400).json({ error: "selected_template_id_required" });
      }

      const templates = listTemplates();
      if (!templates.some((template) => template.id === selectedTemplateId)) {
        return res.status(400).json({ error: "unknown_template_id", selected_template_id: selectedTemplateId });
      }

      const baseConfig = cloneJson(scoped.businessConfig.config, {});
      baseConfig.selected_template_id = selectedTemplateId;
      const saved = await saveBusinessConfig(pool, scoped.tenantId, baseConfig);
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        selected_template_id: selectedTemplateId,
        effective_template: resolveTemplateRuntime(cloneJson(saved.config, {})),
      });
    } catch (err) {
      console.error("tap_crm_template_selector_put_failed", err);
      return res.status(500).json({ error: "tap_crm_template_selector_put_failed" });
    }
  });

  router.get("/console/modules/registry", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_TEMPLATES_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const config = cloneJson(scoped.businessConfig.config, {});
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        modules: resolveTemplateRuntime(config).modules,
        module_registry: listModules(),
      });
    } catch (err) {
      console.error("tap_crm_module_registry_get_failed", err);
      return res.status(500).json({ error: "tap_crm_module_registry_get_failed" });
    }
  });

  router.get("/console/modules/:moduleId", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_TEMPLATES_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const moduleId = String(req.params.moduleId || "").trim().toLowerCase();
      if (!MODULE_REGISTRY[moduleId]) {
        return res.status(404).json({ error: "module_not_found", module_id: moduleId });
      }
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const config = cloneJson(scoped.businessConfig.config, {});
      const moduleState = resolveTemplateRuntime(config).modules.find((module) => module.module_id === moduleId);
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        module: moduleState,
      });
    } catch (err) {
      console.error("tap_crm_module_get_failed", err);
      return res.status(500).json({ error: "tap_crm_module_get_failed" });
    }
  });

  router.get("/console/add-ons/registry", (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_VIEW);
    if (!access.ok) return res.status(access.status).json(access.body);
    return res.json({
      ok: true,
      route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
      tenant: access.tenant,
      add_ons: listAddOns(),
    });
  });

  router.get("/console/add-ons/runtime", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_VIEW);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        add_ons: resolveAddOnRuntime(cloneJson(scoped.businessConfig.config, {})),
      });
    } catch (err) {
      console.error("tap_crm_add_on_runtime_get_failed", err);
      return res.status(500).json({ error: "tap_crm_add_on_runtime_get_failed" });
    }
  });

  router.get("/console/template-clones/:industryId", (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_TEMPLATES_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    return res.json({
      ok: true,
      route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
      tenant: access.tenant,
      clone: cloneTemplateForIndustry({
        templateId: String(req.query.template || "default"),
        industryId: String(req.params.industryId || ""),
      }),
    });
  });

  router.get("/console/custom-fields/:serviceType", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_TEMPLATES_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        service_type: String(req.params.serviceType || ""),
        custom_fields: resolveServiceCustomFields(
          cloneJson(scoped.businessConfig.config, {}),
          String(req.params.serviceType || "")
        ),
      });
    } catch (err) {
      console.error("tap_crm_custom_fields_get_failed", err);
      return res.status(500).json({ error: "tap_crm_custom_fields_get_failed" });
    }
  });

  router.get("/console/admin/overrides", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    if (!isAdminOverrideActor(access.actor)) {
      return res.status(403).json({ error: "admin_override_required" });
    }
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const config = cloneJson(scoped.businessConfig.config, {});
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        admin_overrides: cloneJson(config.admin_overrides, {}),
      });
    } catch (err) {
      console.error("tap_crm_admin_overrides_get_failed", err);
      return res.status(500).json({ error: "tap_crm_admin_overrides_get_failed" });
    }
  });

  router.put("/console/admin/overrides", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    if (!isAdminOverrideActor(access.actor)) {
      return res.status(403).json({ error: "admin_override_required" });
    }
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const config = cloneJson(scoped.businessConfig.config, {});
      config.admin_overrides = req.body && typeof req.body === "object" ? cloneJson(req.body, {}) : {};
      const saved = await saveBusinessConfig(pool, scoped.tenantId, config);
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        admin_overrides: cloneJson(saved.config && saved.config.admin_overrides, {}),
      });
    } catch (err) {
      console.error("tap_crm_admin_overrides_put_failed", err);
      return res.status(500).json({ error: "tap_crm_admin_overrides_put_failed" });
    }
  });

  router.get("/console/pilot/readiness", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const config = buildBarberPilotBaselineConfig(cloneJson(scoped.businessConfig.config, {}));
      const tags = await pool.query(
        `SELECT id, tag_code, status
         FROM tap_crm_tags
         WHERE tenant_id = $1
         ORDER BY id DESC`,
        [scoped.tenantId]
      );
      const readiness = evaluatePilotReadiness({ config, tags: tags.rows });
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        pilot: {
          track: "barber",
          readiness,
          onboarding: cloneJson(config.onboarding, {}),
          recommended_next_steps: Object.entries(readiness.checklist)
            .filter(([, done]) => done !== true)
            .map(([key]) => key),
        },
      });
    } catch (err) {
      console.error("tap_crm_pilot_readiness_get_failed", err);
      return res.status(500).json({ error: "tap_crm_pilot_readiness_get_failed" });
    }
  });

  router.post("/console/pilot/bootstrap", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);

      const baseConfig = buildBarberPilotBaselineConfig(cloneJson(scoped.businessConfig.config, {}));
      baseConfig.selected_template_id = "barber";
      baseConfig.onboarding = baseConfig.onboarding || {};
      baseConfig.onboarding.first_business_setup_complete = baseConfig.onboarding.first_business_setup_complete === true;
      baseConfig.onboarding.pilot_ready = false;

      const shouldSeedTag = req.body && req.body.seed_default_tag !== false;
      let seededTag = null;
      if (shouldSeedTag) {
        const existingTag = await pool.query(
          `SELECT id, key, label, tag_code, status
           FROM tap_crm_tags
           WHERE tenant_id = $1
           ORDER BY id DESC
           LIMIT 1`,
          [scoped.tenantId]
        );
        if (!existingTag.rows[0]) {
          const tenantSlug = String(scoped.tenantSlug || "").trim().toLowerCase();
          const tagCode = `${tenantSlug}-welcome`;
          const created = await pool.query(
            `INSERT INTO tap_crm_tags (tenant_id, key, label, tag_code, status, destination_path, disabled_reason)
             VALUES ($1, $2, $3, $4, 'active', '/tap-crm', '')
             RETURNING id, key, label, tag_code, status`,
            [scoped.tenantId, "welcome-chair", "Welcome Chair", tagCode]
          );
          seededTag = created.rows[0] || null;
        }
      }

      const saved = await saveBusinessConfig(pool, scoped.tenantId, baseConfig);
      const tags = await pool.query(
        `SELECT id, tag_code, status
         FROM tap_crm_tags
         WHERE tenant_id = $1`,
        [scoped.tenantId]
      );
      const readiness = evaluatePilotReadiness({ config: cloneJson(saved.config, {}), tags: tags.rows });

      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        pilot_bootstrap: {
          template: "barber",
          seeded_tag: seededTag,
          readiness,
        },
      });
    } catch (err) {
      console.error("tap_crm_pilot_bootstrap_failed", err);
      return res.status(500).json({ error: "tap_crm_pilot_bootstrap_failed" });
    }
  });

  router.put("/console/modules/:moduleId", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_TEMPLATES_MANAGE);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const moduleId = String(req.params.moduleId || "").trim().toLowerCase();
      if (!MODULE_REGISTRY[moduleId]) {
        return res.status(404).json({ error: "module_not_found", module_id: moduleId });
      }
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);

      const baseConfig = cloneJson(scoped.businessConfig.config, {});
      baseConfig.module_overrides = baseConfig.module_overrides || {};
      const current = cloneJson(baseConfig.module_overrides[moduleId], {});
      const next = {
        ...current,
        enabled: req.body && req.body.enabled !== undefined ? req.body.enabled === true : current.enabled,
        config: req.body && req.body.config && typeof req.body.config === "object"
          ? cloneJson(req.body.config, {})
          : cloneJson(current.config, {}),
      };
      baseConfig.module_overrides[moduleId] = next;

      const saved = await saveBusinessConfig(pool, scoped.tenantId, baseConfig);
      const moduleState = resolveTemplateRuntime(cloneJson(saved.config, {})).modules.find((module) => module.module_id === moduleId);
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        module: moduleState,
      });
    } catch (err) {
      console.error("tap_crm_module_put_failed", err);
      return res.status(500).json({ error: "tap_crm_module_put_failed" });
    }
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

  router.post("/public/tags/:tagCode/events", express.json(), async (req, res) => {
    try {
      const scoped = await getPublicTagContext(pool, req.params.tagCode);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);

      const eventType = String(req.body && req.body.event_type || "").trim().toLowerCase();
      if (!TAP_EVENT_TYPES.has(eventType)) {
        return res.status(400).json({ error: "invalid_event_type" });
      }
      if (eventType === "tap_open" || eventType === "tap_resolved") {
        return res.status(400).json({ error: "reserved_event_type" });
      }

      const tapSessionId = String(req.body && req.body.tap_session_id || "").trim();
      await logTapEvent(pool, {
        tenantId: scoped.row.tenant_id,
        tagId: scoped.row.tag_id,
        tagCode: scoped.row.tag_code,
        eventType,
        outcome: "accepted",
        reason: String(req.body && req.body.reason || "tap_hub_action").trim(),
        tapSessionId,
        requestMeta: {
          ip: req.ip,
          user_agent: req.headers["user-agent"] || "",
          source: "tap_hub_ui",
          tenant: scoped.row.tenant_slug,
          tag_code: scoped.row.tag_code,
          tag_id: scoped.row.tag_id,
          tap_session_id: tapSessionId,
          metadata: cloneJson(req.body && req.body.metadata, {}),
        },
      });

      return res.status(202).json({
        ok: true,
        tenant: scoped.row.tenant_slug,
        tag_code: scoped.row.tag_code,
        tag_id: scoped.row.tag_id,
        tap_session_id: tapSessionId || null,
        event_type: eventType,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("tap_crm_public_event_log_failed", err);
      return res.status(500).json({ error: "tap_crm_public_event_log_failed" });
    }
  });

  router.get("/console/notifications", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_ANALYTICS_VIEW);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const notifications = await pool.query(
        `SELECT id, type, title, payload_json, is_new, acknowledged_at, created_at
         FROM tap_crm_notifications
         WHERE tenant_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 50`,
        [scoped.tenantId]
      );
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        notifications: notifications.rows.map((row) => ({
          id: Number(row.id),
          type: row.type || "system",
          title: row.title || "Notification",
          payload: cloneJson(row.payload_json, {}),
          is_new: row.is_new === true,
          acknowledged_at: row.acknowledged_at || null,
          created_at: row.created_at || null,
        })),
      });
    } catch (err) {
      console.error("tap_crm_notifications_get_failed", err);
      return res.status(500).json({ error: "tap_crm_notifications_get_failed" });
    }
  });

  router.post("/console/notifications/:notificationId/ack", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_ANALYTICS_VIEW);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const notificationId = Number(req.params.notificationId);
      if (!Number.isInteger(notificationId) || notificationId <= 0) {
        return res.status(400).json({ error: "invalid_notification_id" });
      }
      const acknowledged = await pool.query(
        `UPDATE tap_crm_notifications
         SET is_new = FALSE,
             acknowledged_at = COALESCE(acknowledged_at, NOW())
         WHERE id = $1
           AND tenant_id = $2
         RETURNING id, is_new, acknowledged_at`,
        [notificationId, scoped.tenantId]
      );
      if (!acknowledged.rows[0]) {
        return res.status(404).json({ error: "notification_not_found" });
      }
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        notification: acknowledged.rows[0],
      });
    } catch (err) {
      console.error("tap_crm_notifications_ack_failed", err);
      return res.status(500).json({ error: "tap_crm_notifications_ack_failed" });
    }
  });

  router.get("/console/bookings/requests", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_ANALYTICS_VIEW);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const requests = await pool.query(
        `SELECT id, tag_code, booking_date, slot_time, customer_name, status, created_at
         FROM tap_crm_bookings
         WHERE tenant_id = $1
           AND status = $2
         ORDER BY created_at DESC, id DESC
         LIMIT 20`,
        [scoped.tenantId, BOOKING_STATUS.REQUESTED]
      );
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        requests: requests.rows.map((row) => ({
          id: Number(row.id),
          customer_name: row.customer_name || "",
          booking_date: row.booking_date,
          booking_time: row.slot_time || "",
          tag_code: row.tag_code || "",
          status: normalizeBookingStatus(row.status, BOOKING_STATUS.REQUESTED),
          created_at: row.created_at || null,
        })),
      });
    } catch (err) {
      console.error("tap_crm_booking_requests_get_failed", err);
      return res.status(500).json({ error: "tap_crm_booking_requests_get_failed" });
    }
  });

  router.post("/console/bookings/:bookingId/accept", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_ANALYTICS_VIEW);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const bookingId = Number(req.params.bookingId);
      if (!Number.isInteger(bookingId) || bookingId <= 0) {
        return res.status(400).json({ error: "invalid_booking_id" });
      }
      const updated = await pool.query(
        `UPDATE tap_crm_bookings
         SET status = $3,
             updated_at = NOW()
         WHERE id = $1
           AND tenant_id = $2
           AND status = $4
         RETURNING id, tag_code, booking_date, slot_time, customer_name, status, created_at`,
        [bookingId, scoped.tenantId, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.REQUESTED]
      );
      if (!updated.rows[0]) {
        return res.status(409).json({ error: "booking_not_request_or_not_found" });
      }
      const booking = updated.rows[0];
      await insertTapNotification(pool, {
        tenantId: scoped.tenantId,
        type: BOOKING_NOTIFICATION_TYPE,
        title: "Booking request accepted",
        payload: {
          booking_id: Number(booking.id),
          customer_name: booking.customer_name || "",
          booking_date: booking.booking_date,
          booking_time: booking.slot_time || "",
          tag_code: booking.tag_code || "",
          status: BOOKING_STATUS.CONFIRMED,
          event: "booking_request_accepted",
        },
      });
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        booking: {
          id: Number(booking.id),
          customer_name: booking.customer_name || "",
          booking_date: booking.booking_date,
          booking_time: booking.slot_time || "",
          tag_code: booking.tag_code || "",
          status: BOOKING_STATUS.CONFIRMED,
          created_at: booking.created_at || null,
        },
      });
    } catch (err) {
      console.error("tap_crm_booking_accept_failed", err);
      return res.status(500).json({ error: "tap_crm_booking_accept_failed" });
    }
  });

  router.get("/console/bookings/calendar", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_ANALYTICS_VIEW);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);

      const parsedMonth = parseYearMonth(req.query.month);
      const now = new Date();
      const year = parsedMonth ? parsedMonth.year : now.getUTCFullYear();
      const month = parsedMonth ? parsedMonth.month : now.getUTCMonth() + 1;
      const monthStart = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
      const monthEndDate = new Date(Date.UTC(year, month, 0));
      const monthEnd = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(monthEndDate.getUTCDate()).padStart(2, "0")}`;

      const config = cloneJson(scoped.businessConfig && scoped.businessConfig.config, {});
      const bookingConfig = config.booking && typeof config.booking === "object" ? config.booking : {};
      const defaultSlots = buildDefaultSlotConfig();
      const slotConfig = {
        start: parseTimeOnly(bookingConfig.start) || defaultSlots.start,
        end: parseTimeOnly(bookingConfig.end) || defaultSlots.end,
        interval_minutes: Number(bookingConfig.interval_minutes) > 0 ? Number(bookingConfig.interval_minutes) : defaultSlots.interval_minutes,
        working_days: Array.isArray(bookingConfig.working_days) ? bookingConfig.working_days.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v >= 0 && v <= 6) : defaultSlots.working_days,
      };
      const allSlots = buildTimeSlots({
        start: slotConfig.start,
        end: slotConfig.end,
        intervalMinutes: slotConfig.interval_minutes,
      });

      const bookings = await pool.query(
        `SELECT
           id,
           tag_code,
           booking_date,
           slot_time,
           customer_name,
           status,
           created_at
         FROM tap_crm_bookings
         WHERE tenant_id = $1
           AND booking_date >= $2::date
           AND booking_date <= $3::date
           AND status = $4
         ORDER BY booking_date ASC, slot_time ASC, id ASC`,
        [scoped.tenantId, monthStart, monthEnd, BOOKING_STATUS.CONFIRMED]
      );

      const byDate = new Map();
      bookings.rows.forEach((row) => {
        const date = row.booking_date;
        if (!byDate.has(date)) byDate.set(date, []);
        byDate.get(date).push({
          id: Number(row.id),
          customer_name: row.customer_name || "",
          booking_date: row.booking_date,
          booking_time: row.slot_time || "",
          tag_code: row.tag_code || "",
          status: normalizeBookingStatus(row.status, BOOKING_STATUS.CONFIRMED),
          created_at: row.created_at || null,
        });
      });

      const days = [];
      for (let d = 1; d <= monthEndDate.getUTCDate(); d += 1) {
        const dateKey = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const appointments = byDate.get(dateKey) || [];
        const blocked = appointments.map((item) => item.booking_time).filter(Boolean);
        const dayIndex = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
        const isWorkingDay = slotConfig.working_days.includes(dayIndex);
        const availableSlots = isWorkingDay ? allSlots.filter((slot) => blocked.indexOf(slot) === -1) : [];
        days.push({
          date: dateKey,
          booking_count: appointments.length,
          appointments,
          available_slots: availableSlots,
          blocked_slots: blocked,
          status: appointments.length > 0 ? BOOKING_STATUS.CONFIRMED : (isWorkingDay ? "free" : "off"),
        });
      }

      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        calendar: {
          month: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`,
          slot_config: slotConfig,
          days,
        },
      });
    } catch (err) {
      console.error("tap_crm_bookings_calendar_failed", err);
      return res.status(500).json({ error: "tap_crm_bookings_calendar_failed" });
    }
  });

  router.get("/public/tags/:tagCode/booking/availability", async (req, res) => {
    try {
      const targetDate = parseDateOnly(req.query.date);
      if (!targetDate) {
        return res.status(400).json({ error: "invalid_date", detail: "Use YYYY-MM-DD date format." });
      }
      const scoped = await getPublicTagContext(pool, req.params.tagCode);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);

      const config = cloneJson(scoped.row.business_config || {}, {});
      const bookingConfig = config.booking && typeof config.booking === "object" ? config.booking : {};
      const defaultSlots = buildDefaultSlotConfig();
      const slotConfig = {
        start: parseTimeOnly(bookingConfig.start) || defaultSlots.start,
        end: parseTimeOnly(bookingConfig.end) || defaultSlots.end,
        interval_minutes: Number(bookingConfig.interval_minutes) > 0 ? Number(bookingConfig.interval_minutes) : defaultSlots.interval_minutes,
        working_days: Array.isArray(bookingConfig.working_days) ? bookingConfig.working_days.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v >= 0 && v <= 6) : defaultSlots.working_days,
      };

      const weekday = new Date(`${targetDate}T00:00:00.000Z`).getUTCDay();
      const candidateSlots = slotConfig.working_days.includes(weekday)
        ? buildTimeSlots({ start: slotConfig.start, end: slotConfig.end, intervalMinutes: slotConfig.interval_minutes })
        : [];

      const booked = await pool.query(
        `SELECT slot_time
         FROM tap_crm_bookings
         WHERE tenant_id = $1
           AND booking_date = $2::date
           AND status = ANY($3::text[])`,
        [scoped.row.tenant_id, targetDate, Array.from(BOOKING_ACTIVE_BLOCKING_STATUSES)]
      );
      const bookedSet = new Set(booked.rows.map((row) => String(row.slot_time || "")));
      const slots = candidateSlots.map((slot) => ({
        time: slot,
        status: bookedSet.has(slot) ? "unavailable" : "available",
      }));
      return res.json({
        ok: true,
        tenant: scoped.row.tenant_slug,
        tag_code: scoped.row.tag_code,
        date: targetDate,
        slots,
      });
    } catch (err) {
      console.error("tap_crm_booking_availability_failed", err);
      return res.status(500).json({ error: "tap_crm_booking_availability_failed" });
    }
  });

  router.post("/public/tags/:tagCode/booking/reservations", express.json(), async (req, res) => {
    try {
      const scoped = await getPublicTagContext(pool, req.params.tagCode);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const bookingDate = parseDateOnly(req.body && req.body.date);
      const slotTime = parseTimeOnly(req.body && req.body.time);
      if (!bookingDate || !slotTime) {
        return res.status(400).json({ error: "invalid_booking_payload", detail: "date (YYYY-MM-DD) and time (HH:MM) are required." });
      }

      const created = await pool.query(
        `INSERT INTO tap_crm_bookings (
          tenant_id,
          tag_id,
          tag_code,
          booking_date,
          slot_time,
          customer_name,
          customer_phone,
          notes,
          status
        ) VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9)
        ON CONFLICT (tenant_id, booking_date, slot_time) DO NOTHING
        RETURNING id, booking_date, slot_time, status, created_at`,
        [
          scoped.row.tenant_id,
          scoped.row.tag_id,
          scoped.row.tag_code,
          bookingDate,
          slotTime,
          String(req.body && req.body.customer_name || "").trim(),
          String(req.body && req.body.customer_phone || "").trim(),
          String(req.body && req.body.notes || "").trim(),
          BOOKING_STATUS.REQUESTED,
        ]
      );
      if (!created.rows[0]) {
        return res.status(409).json({ error: "slot_unavailable", date: bookingDate, time: slotTime });
      }
      await insertTapNotification(pool, {
        tenantId: scoped.row.tenant_id,
        type: BOOKING_NOTIFICATION_TYPE,
        title: "New booking request",
        payload: {
          booking_id: Number(created.rows[0].id),
          customer_name: String(req.body && req.body.customer_name || "").trim(),
          booking_date: bookingDate,
          booking_time: slotTime,
          tag_code: scoped.row.tag_code || "",
          status: BOOKING_STATUS.REQUESTED,
          event: "booking_request_created",
        },
      });
      return res.status(201).json({
        ok: true,
        reservation: {
          ...created.rows[0],
          status: BOOKING_STATUS.REQUESTED,
        },
      });
    } catch (err) {
      console.error("tap_crm_booking_reservation_failed", err);
      return res.status(500).json({ error: "tap_crm_booking_reservation_failed" });
    }
  });

  return router;
}

module.exports = {
  createTapCrmRouter,
  checkTapAccess,
  normalizeActionItems,
  buildOwnerConsolePayload,
  normalizeTagCode,
  normalizeTagKey,
  normalizeTagStatusValue,
  normalizeDestinationPath,
  describeTagConflict,
  isAdminOverrideActor,
  evaluateTagStatus,
  resolvePublicTap,
};
