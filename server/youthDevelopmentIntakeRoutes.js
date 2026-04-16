"use strict";

const express = require("express");
const {
  validateAndNormalizeTaskSessionPayload,
  runTaskSessionPipeline,
  validateDirectSignalsPayload,
  runSignalsPipeline,
} = require("../youth-development/intake/intakeAdapter");

function createYouthDevelopmentIntakeRouter() {
  const router = express.Router();

  router.post("/api/youth-development/intake/task-session", (req, res) => {
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

  router.post("/api/youth-development/intake/signals", (req, res) => {
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

  return router;
}

module.exports = {
  createYouthDevelopmentIntakeRouter,
};
