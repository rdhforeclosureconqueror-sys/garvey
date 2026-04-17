"use strict";

const express = require("express");
const { isTdeExtensionEnabled } = require("../youth-development/tdeFeatureFlags");
const { extractSignalsFromEvidence } = require("../youth-development/tde/signalExtractionService");
const { scoreTraitsFromSignals } = require("../youth-development/tde/traitScoringService");
const { generateTraceableStatements } = require("../youth-development/tde/reportStatementGenerator");
const { runTdePipeline } = require("../youth-development/tde/pipelineService");
const { createTdePersistenceRepository } = require("../youth-development/tde/persistenceRepository");
const { TDE_TRAIT_MAPPING_CONTRACTS } = require("../youth-development/tde/traitMappingContracts");
const { OBSERVER_CONSENT_CONTRACT } = require("../youth-development/tde/observerContracts");
const { captureObserverConsent } = require("../youth-development/tde/observerService");
const { ENVIRONMENT_HOOK_EVENT_CONTRACT } = require("../youth-development/tde/environmentContracts");
const { captureEnvironmentHook } = require("../youth-development/tde/environmentService");
const { VALIDATION_SCHEMA, generateValidationExport } = require("../youth-development/tde/validationExportService");
const { getParentProgressSummary } = require("../youth-development/tde/parentSummaryService");
const {
  enrollInProgram,
  recordWeeklyProgress,
  listProgramPhases,
  listProgramWeeks,
  getProgramWeek,
  listProgramCheckpoints,
} = require("../youth-development/tde/programService");

function createYouthDevelopmentTdeRouter(options = {}) {
  const router = express.Router();
  const repository = options.repository || createTdePersistenceRepository(options.pool || null);

  router.use((req, res, next) => {
    if (!isTdeExtensionEnabled(req)) {
      return res.status(404).json({ ok: false, error: "not_found" });
    }
    return next();
  });

  router.get("/contracts/trait-mapping", (_req, res) => res.status(200).json({ ok: true, ...TDE_TRAIT_MAPPING_CONTRACTS }));
  router.get("/observer/contracts", (_req, res) => res.status(200).json({ ok: true, contract: OBSERVER_CONSENT_CONTRACT, deterministic: true }));
  router.get("/environment/contracts", (_req, res) => res.status(200).json({ ok: true, contract: ENVIRONMENT_HOOK_EVENT_CONTRACT, deterministic: true }));
  router.get("/exports/validation-schema", (_req, res) => res.status(200).json({ ok: true, ...VALIDATION_SCHEMA }));

  router.post("/signals/extract", (req, res) => {
    const result = extractSignalsFromEvidence(req.body || {});
    return res.status(200).json({ ok: true, ...result, deterministic: true });
  });

  router.post("/score/traits", (req, res) => {
    const signals = Array.isArray(req.body?.normalized_signals) ? req.body.normalized_signals : [];
    const result = scoreTraitsFromSignals(signals);
    return res.status(200).json({ ok: true, ...result, deterministic: true });
  });

  router.post("/report/statements", (req, res) => {
    const traits = Array.isArray(req.body?.trait_scores) ? req.body.trait_scores : [];
    const signals = Array.isArray(req.body?.normalized_signals) ? req.body.normalized_signals : [];
    const calibrationVersion = req.body?.calibration_version;
    const result = generateTraceableStatements(traits, signals, { calibration_version: calibrationVersion });
    return res.status(200).json({ ok: true, ...result, deterministic: true });
  });

  router.post("/pipeline/run", async (req, res) => {
    try {
      const result = await runTdePipeline(req.body || {}, repository);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ ok: false, error: "tde_pipeline_failed", message: String(err?.message || err) });
    }
  });

  router.get("/program/phases", (_req, res) => {
    return res.status(200).json(listProgramPhases());
  });

  router.get("/program/weeks", (_req, res) => {
    return res.status(200).json(listProgramWeeks());
  });

  router.get("/program/weeks/:weekNumber", (req, res) => {
    const week = getProgramWeek(req.params.weekNumber);
    if (!week) {
      return res.status(404).json({ ok: false, error: "week_not_found" });
    }
    return res.status(200).json({ ok: true, week, deterministic: true });
  });

  router.post("/program/enroll", async (req, res) => {
    try {
      const result = await enrollInProgram(req.body || {}, repository);
      return res.status(200).json({ ...result, deterministic: true });
    } catch (err) {
      return res.status(400).json({ ok: false, error: "enrollment_failed", message: String(err?.message || err) });
    }
  });

  router.post("/program/progress", async (req, res) => {
    try {
      const result = await recordWeeklyProgress(req.body || {}, repository);
      return res.status(200).json({ ...result, deterministic: true });
    } catch (err) {
      return res.status(400).json({ ok: false, error: "progress_record_failed", message: String(err?.message || err) });
    }
  });

  router.get("/program/checkpoints", (_req, res) => {
    return res.status(200).json(listProgramCheckpoints());
  });

  router.post("/observer/consent", async (req, res) => {
    const result = await captureObserverConsent(req.body || {}, repository);
    const status = result.ok ? 200 : 400;
    return res.status(status).json(result);
  });

  router.post("/environment/hooks", async (req, res) => {
    const result = await captureEnvironmentHook(req.body || {}, repository);
    const status = result.ok ? 200 : 400;
    return res.status(status).json(result);
  });

  router.post("/exports/validation-data", async (req, res) => {
    const result = await generateValidationExport(req.body || {}, repository);
    const status = result.ok ? 200 : 400;
    return res.status(status).json(result);
  });

  router.get("/summary/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getParentProgressSummary(childId, repository);
    return res.status(200).json(result);
  });

  return router;
}

module.exports = {
  createYouthDevelopmentTdeRouter,
};
