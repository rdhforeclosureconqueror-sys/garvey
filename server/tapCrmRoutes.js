"use strict";

const express = require("express");
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

  return router;
}

module.exports = {
  createTapCrmRouter,
  checkTapAccess,
};
