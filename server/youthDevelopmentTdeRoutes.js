"use strict";

const express = require("express");
const { getTdeContracts, TDE_FEATURE_FLAGS } = require("../youth-development/tdeContracts");
const { validateSignalsPayload, validateTracePayload } = require("../youth-development/tdeValidation");

function nullPersistence() {
  return {
    writeCalibrationVersion: async () => {},
    writeSignalEvents: async () => {},
    writeTraitScoreTraces: async () => {},
    writeReportStatementTraces: async () => {},
    writeAuditLogEvents: async () => {},
  };
}

function resolveActor(req) {
  return {
    tenant_id: req.authActor?.tenantId ?? null,
    user_id: req.authActor?.userId ?? null,
    role: req.authActor?.role ?? null,
    email: req.authActor?.email ?? null,
  };
}

function createYouthDevelopmentTdeRouter({ persistence } = {}) {
  const router = express.Router();
  const store = persistence || nullPersistence();

  router.get("/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      namespace: "/api/youth-development/tde",
      status: "healthy",
      mode: "extension_only",
      persisted_governance_tables: [
        "calibration_versions",
        "signal_events",
        "trait_score_traces",
        "report_statement_traces",
        "audit_log_events",
      ],
    });
  });

  router.get("/contracts", (_req, res) => {
    const contracts = getTdeContracts();
    const missing_contracts = [];
    if (!contracts.signal_schema) missing_contracts.push("signal_schema");
    if (!contracts.trait_mapping_schema) missing_contracts.push("trait_mapping_schema");
    if (!contracts.traceability_schema) missing_contracts.push("traceability_schema");
    if (!contracts.calibration_schema) missing_contracts.push("calibration_schema");
    if (!contracts.audit_log_schema) missing_contracts.push("audit_log_schema");
    if (!contracts.feature_flags) missing_contracts.push("feature_flags");

    return res.status(200).json({ ok: true, contracts, missing_contracts });
  });

  router.get("/feature-flags", (_req, res) => {
    return res.status(200).json({
      ok: true,
      feature_flags: TDE_FEATURE_FLAGS,
    });
  });

  router.post("/signals/validate", async (req, res) => {
    const validation = validateSignalsPayload(req.body || {});
    const actor = resolveActor(req);
    const tenant_id = actor.tenant_id;
    try {
      if (validation.normalizedSignals.length) {
        await store.writeSignalEvents({ tenant_id, signals: validation.normalizedSignals });
      }
      if (validation.auditEvents.length) {
        await store.writeAuditLogEvents({ tenant_id, actor, events: validation.auditEvents });
      }
      if (validation.errors.length) {
        await store.writeAuditLogEvents({
          tenant_id,
          actor,
          events: [{ event_type: "signal_validation_failed", severity: "warn", errors: validation.errors }],
        });
      }
    } catch (err) {
      return res.status(500).json({ ok: false, error: "tde_signal_persistence_failed", message: String(err.message || err) });
    }

    if (!validation.ok) {
      return res.status(400).json({ ok: false, error: "invalid_signal_contract", validation_errors: validation.errors });
    }

    return res.status(200).json({
      ok: true,
      normalized_signal_count: validation.normalizedSignals.length,
      audit_event_count: validation.auditEvents.length,
    });
  });

  router.post("/trace/validate", async (req, res) => {
    const validation = validateTracePayload(req.body || {});
    const actor = resolveActor(req);
    const tenant_id = actor.tenant_id;

    try {
      if (validation.result) {
        await store.writeTraitScoreTraces({
          tenant_id,
          rows: validation.result.reported_trait_rows,
          trace_ref: validation.result.trace_ref,
          calibration_version: validation.result.calibration_version,
        });
        await store.writeTraitScoreTraces({
          tenant_id,
          rows: validation.result.internal_partial_rows,
          trace_ref: validation.result.trace_ref,
          calibration_version: validation.result.calibration_version,
        });
      }
      if (validation.auditEvents.length) {
        await store.writeAuditLogEvents({ tenant_id, actor, events: validation.auditEvents });
      }
      if (validation.errors.length) {
        await store.writeAuditLogEvents({
          tenant_id,
          actor,
          events: [{ event_type: "trace_validation_failed", severity: "warn", errors: validation.errors }],
        });
      }
    } catch (err) {
      return res.status(500).json({ ok: false, error: "tde_trace_persistence_failed", message: String(err.message || err) });
    }

    if (!validation.ok) {
      return res.status(400).json({ ok: false, error: "invalid_trace_contract", validation_errors: validation.errors });
    }

    return res.status(200).json({
      ok: true,
      trace: validation.result,
      audit_event_count: validation.auditEvents.length,
    });
  });

  return router;
}

module.exports = {
  createYouthDevelopmentTdeRouter,
};
