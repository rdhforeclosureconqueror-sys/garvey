"use strict";

const express = require("express");
const {
  validateAndNormalizeTaskSessionPayload,
  runTaskSessionPipeline,
  validateDirectSignalsPayload,
  runSignalsPipeline,
} = require("../youth-development/intake/intakeAdapter");
const { TRAIT_MAPPING_CONTRACT } = require("../youth-development/measurement/traitMappingContract");

function createYouthDevelopmentIntakeRouter() {
  const router = express.Router();

  router.post("/task-session", (req, res) => {
    const validation = validateAndNormalizeTaskSessionPayload(req.body || {});
    if (!validation.ok) {
      return res.status(400).json({
        ok: false,
        error: "invalid_task_session_payload",
        validation_errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    try {
      const payload = runTaskSessionPipeline(validation.value);
      return res.status(200).json({
        ok: true,
        mode: "task_session",
        ...payload,
        warnings: [...validation.warnings, ...payload.warnings],
      });
    } catch (err) {
      return res.status(400).json({
        ok: false,
        error: "task_session_processing_failed",
        message: String(err?.message || err),
        warnings: validation.warnings,
      });
    }
  });

  router.post("/signals", (req, res) => {
    const validation = validateDirectSignalsPayload(req.body || {});
    if (!validation.ok) {
      return res.status(400).json({
        ok: false,
        error: "invalid_signals_payload",
        validation_errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    try {
      const payload = runSignalsPipeline(validation.value);
      return res.status(200).json({
        ok: true,
        mode: "signals",
        ...payload,
        warnings: [...validation.warnings, ...payload.warnings],
      });
    } catch (err) {
      return res.status(400).json({
        ok: false,
        error: "signals_processing_failed",
        message: String(err?.message || err),
        warnings: validation.warnings,
      });
    }
  });

  router.get("/contracts/trait-mapping", (_req, res) => {
    return res.status(200).json({
      ok: true,
      contract_type: "trait_mapping",
      ...TRAIT_MAPPING_CONTRACT,
    });
  });

  return router;
}

module.exports = {
  createYouthDevelopmentIntakeRouter,
};
