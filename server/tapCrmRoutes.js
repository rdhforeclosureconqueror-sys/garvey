"use strict";

const express = require("express");
const { getTapCrmMode } = require("./tapCrmFeature");

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
    const tenant = String(req.query.tenant || "").trim().toLowerCase();
    if (!tenant) {
      return res.status(400).json({ error: "tenant is required" });
    }

    return res.json({
      ok: true,
      domain: "tap_crm",
      tenant,
      summary: {
        total_contacts: 0,
        active_pipeline: 0,
        conversions_30d: 0,
      },
      stage_breakdown: [],
      tasks_due_today: [],
    });
  });

  return router;
}

module.exports = { createTapCrmRouter };
