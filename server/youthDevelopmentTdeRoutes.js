"use strict";

const express = require("express");
const { isTdeExtensionEnabled } = require("../youth-development/tdeFeatureFlags");
const { extractSignalsFromEvidence } = require("../youth-development/tde/signalExtractionService");
const { scoreTraitsFromSignals } = require("../youth-development/tde/traitScoringService");
const { generateTraceableStatements } = require("../youth-development/tde/reportStatementGenerator");
const { runTdePipeline } = require("../youth-development/tde/pipelineService");
const { createTdePersistenceRepository } = require("../youth-development/tde/persistenceRepository");
const { TDE_TRAIT_MAPPING_CONTRACTS } = require("../youth-development/tde/traitMappingContracts");

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

  return router;
}

module.exports = {
  createYouthDevelopmentTdeRouter,
};
