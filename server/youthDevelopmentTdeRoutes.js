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
  getParentExperience,
  getRoadmapForChild,
  getSupportActionsForChild,
  getTrustContent,
} = require("../youth-development/tde/parentExperienceService");
const {
  getRecommendations,
  getInterventionSummary,
  getReadiness,
  getRollout,
  getCheckinSummary,
  getInsights,
  getPersonalizationSummary,
  getPatternHistory,
  getAdaptiveRecommendationExplanation,
  getGrowthTrajectory,
  getMilestoneComparison,
} = require("../youth-development/tde/phase9ExtensionService");
const {
  enrollInProgram,
  recordWeeklyProgress,
  listProgramPhases,
  listProgramWeeks,
  getProgramWeek,
  listProgramCheckpoints,
} = require("../youth-development/tde/programService");
const { listActivitiesByComponent, getComponentTypeByActivityId } = require("../youth-development/tde/activityBankService");
const {
  saveCommitmentPlan,
  getCommitmentPlan,
  planSession,
  completeSession,
  getAdherence,
} = require("../youth-development/tde/interventionEngine");
const { COMMITMENT_PLAN_CONTRACT } = require("../youth-development/tde/commitmentPlanContract");
const { SESSION_EVIDENCE_CONTRACT, validateSessionEvidenceContract } = require("../youth-development/tde/sessionEvidenceContract");
const { INTERVENTION_ENVIRONMENT_EXTENSION_CONTRACT } = require("../youth-development/tde/interventionEnvironmentContract");
const { DEVELOPMENT_CHECKIN_CONTRACT, VOICE_READY_SCHEMA_RULES } = require("../youth-development/tde/developmentCheckinContract");
const { runDevelopmentCheckin, listDevelopmentCheckins } = require("../youth-development/tde/developmentCheckinService");
const { createVoiceService } = require("../youth-development/tde/voiceService");

function createYouthDevelopmentTdeRouter(options = {}) {
  const router = express.Router();
  const repository = options.repository || createTdePersistenceRepository(options.pool || null);
  const voiceService = options.voiceService || createVoiceService({
    provider_options: options.voice_provider_options || {},
  });

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
  router.get("/contracts/development-checkin", (_req, res) => res.status(200).json({
    ok: true,
    deterministic: true,
    extension_only: true,
    contract: DEVELOPMENT_CHECKIN_CONTRACT,
  }));
  router.get("/contracts/voice", (_req, res) => res.status(200).json({
    ok: true,
    deterministic: true,
    extension_only: true,
    contract: VOICE_READY_SCHEMA_RULES,
  }));

  router.get("/voice/config", async (_req, res) => {
    const result = await voiceService.getConfig();
    return res.status(200).json(result);
  });

  router.get("/voice/checkin/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await voiceService.getChildCheckinPlayback(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/voice/sections/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await voiceService.getParentSectionPlayback(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/voice/status/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await voiceService.getVoiceAvailabilityStatus(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/voice/analytics/summary", async (req, res) => {
    const childId = String(req.query?.child_id || "").trim();
    const result = voiceService.getVoiceAnalyticsSummary({ child_id: childId || undefined });
    return res.status(200).json(result);
  });

  router.get("/voice/pilot-status/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await voiceService.getVoicePilotStatus(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/voice/eligibility/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await voiceService.getVoiceEligibility(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/contracts/intervention", (_req, res) => res.status(200).json({
    ok: true,
    deterministic: true,
    extension_only: true,
    contracts: {
      commitment_plan: COMMITMENT_PLAN_CONTRACT,
      session_evidence: SESSION_EVIDENCE_CONTRACT,
      environment_extension: INTERVENTION_ENVIRONMENT_EXTENSION_CONTRACT,
    },
  }));

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


  router.get("/parent-experience/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getParentExperience(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/roadmap/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getRoadmapForChild(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/support-actions/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getSupportActionsForChild(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/trust-content", (_req, res) => {
    return res.status(200).json(getTrustContent());
  });

  router.post("/commitment", async (req, res) => {
    const result = await saveCommitmentPlan(req.body || {}, repository);
    const status = result.ok ? 200 : 400;
    return res.status(status).json(result);
  });

  router.get("/commitment/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getCommitmentPlan(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/activity-bank/:componentType", (req, res) => {
    const result = listActivitiesByComponent(req.params.componentType);
    if (!result.ok) return res.status(400).json({ ok: false, error: "component_type_invalid", required_components: result.required_components });
    return res.status(200).json(result);
  });

  router.post("/session/validate", (req, res) => {
    const result = validateSessionEvidenceContract(req.body || {}, {
      component_by_activity_id: (activityId) => getComponentTypeByActivityId(activityId),
    });
    const status = result.ok ? 200 : 400;
    return res.status(status).json({ ...result, deterministic: true, extension_only: true });
  });

  router.post("/session/plan", (req, res) => {
    const result = planSession(req.body || {});
    const status = result.ok ? 200 : 400;
    return res.status(status).json(result);
  });

  router.post("/session/complete", async (req, res) => {
    const result = await completeSession(req.body || {}, repository, {
      component_by_activity_id: (activityId) => getComponentTypeByActivityId(activityId),
    });
    const status = result.ok ? 200 : 400;
    return res.status(status).json(result);
  });


  router.post("/checkin/run", async (req, res) => {
    const result = await runDevelopmentCheckin(req.body || {}, repository);
    const status = result.ok ? 200 : 400;
    return res.status(status).json(result);
  });

  router.get("/checkin/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await listDevelopmentCheckins(childId, repository);
    return res.status(200).json(result);
  });


  router.get("/insights/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getInsights(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/personalization/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getPersonalizationSummary(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/pattern-history/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getPatternHistory(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/checkin-summary/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getCheckinSummary(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/adherence/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getAdherence(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/recommendations/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getRecommendations(childId, repository);
    return res.status(200).json(result);
  });


  router.get("/growth-trajectory/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getGrowthTrajectory(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/milestone-comparison/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getMilestoneComparison(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/recommendations/:childId/explanation", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getAdaptiveRecommendationExplanation(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/intervention-summary/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getInterventionSummary(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/readiness/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getReadiness(childId, repository);
    return res.status(200).json(result);
  });

  router.get("/rollout/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await getRollout(childId, repository);
    return res.status(200).json(result);
  });

  return router;
}

module.exports = {
  createYouthDevelopmentTdeRouter,
};
