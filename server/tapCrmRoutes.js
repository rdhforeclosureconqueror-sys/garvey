"use strict";

const express = require("express");
const { pool } = require("./db");
const { ACTIONS, deriveActor, evaluatePolicy } = require("./accessControl");
const { getTapCrmMode } = require("./tapCrmFeature");
const {
  normalizeTemplateId,
  resolveTemplateRuntime,
  listTemplates,
  listModules,
  MODULE_REGISTRY,
  buildBarberPilotBaselineConfig,
} = require("./tapCrmTemplates");

const OWNER_CONSOLE_ROUTE_NAMESPACE = "tap-crm";

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
      template_runtime: resolveTemplateRuntime(cloneJson(row.business_config || {}, {})),
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

  router.get("/console/analytics/summary", async (req, res) => {
    const access = checkTapAccess(req, ACTIONS.TAP_ANALYTICS_VIEW);
    if (!access.ok) return res.status(access.status).json(access.body);
    try {
      const scoped = await withTenantScope(pool, access.tenant);
      if (!scoped.ok) return res.status(scoped.status).json(scoped.body);
      const metrics = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE outcome = 'accepted')::INT AS accepted_taps,
           COUNT(*) FILTER (WHERE outcome = 'rejected')::INT AS rejected_taps,
           COUNT(*)::INT AS total_taps
         FROM tap_crm_tap_events
         WHERE tenant_id = $1`,
        [scoped.tenantId]
      );
      return res.json({
        ok: true,
        route_namespace: OWNER_CONSOLE_ROUTE_NAMESPACE,
        tenant: scoped.tenantSlug,
        analytics_summary: metrics.rows[0] || { accepted_taps: 0, rejected_taps: 0, total_taps: 0 },
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

  return router;
}

module.exports = {
  createTapCrmRouter,
  checkTapAccess,
  normalizeActionItems,
  buildOwnerConsolePayload,
  normalizeTagCode,
  evaluateTagStatus,
  resolvePublicTap,
};
