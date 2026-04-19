"use strict";

const { buildInterventionSummary } = require("./interventionSummaryService");
const { buildRecommendationInputs, generateRecommendations } = require("./recommendationService");
const { evaluateInterventionReadiness, buildRolloutBridge } = require("./readinessRolloutService");
const { summarizeDevelopmentCheckins } = require("./developmentCheckinService");
const { buildInsightLayer } = require("./insightService");
const {
  buildPatternHistory,
  buildPersonalizationModifiers,
  buildAdaptiveRecommendationExplanation,
} = require("./personalizationService");
const { buildGrowthTrajectory: buildGrowthTrajectoryModel, buildMilestoneComparison: buildMilestoneComparisonModel } = require("./growthTrajectoryService");
const { buildParentCoachingSummary, buildParentGuidance } = require("./parentCoachingService");
const {
  normalizeRecommendationsPayload,
  normalizeInsightsPayload,
  normalizeCheckinSummaryPayload,
  normalizeExplanationPayload,
} = require("./uiDisplayContractService");

function buildConfidenceContext(snapshot = {}) {
  const progressRecords = Array.isArray(snapshot.progress_records) ? snapshot.progress_records : [];
  return {
    confidence_label: progressRecords.length >= 6 ? "moderate" : "early-signal",
  };
}

function buildSufficiencyContext(snapshot = {}) {
  const grantedCount = (Array.isArray(snapshot.observer_consents) ? snapshot.observer_consents : []).filter((entry) => entry.consent_status === "granted").length;
  const environmentCount = Array.isArray(snapshot.environment_hooks) ? snapshot.environment_hooks.length : 0;
  const checkpointCount = (Array.isArray(snapshot.progress_records) ? snapshot.progress_records : []).filter((entry) => Boolean(entry.checkpoint_record)).length;
  const status = grantedCount > 0 && environmentCount > 0 && checkpointCount > 0 ? "sufficient" : "limited";
  return { status };
}

async function getInterventionSummary(childId, repository) {
  const snapshot = await repository.getProgramSnapshot(childId);
  const commitmentPlan = snapshot.commitment_plan || await repository.getCommitmentPlan(childId);
  const sessions = Array.isArray(snapshot.intervention_sessions) && snapshot.intervention_sessions.length
    ? snapshot.intervention_sessions
    : await repository.listInterventionSessions(childId);
  return buildInterventionSummary(childId, snapshot, commitmentPlan, sessions);
}

async function getRecommendations(childId, repository, options = {}) {
  const snapshot = await repository.getProgramSnapshot(childId);
  const commitmentPlan = snapshot.commitment_plan || await repository.getCommitmentPlan(childId);
  const sessions = Array.isArray(snapshot.intervention_sessions) && snapshot.intervention_sessions.length
    ? snapshot.intervention_sessions
    : await repository.listInterventionSessions(childId);

  const insights = buildInsightLayer(snapshot, { child_id: childId });
  const patternHistory = buildPatternHistory(snapshot, { child_id: childId });
  const personalization = buildPersonalizationModifiers(snapshot, insights, {
    child_id: childId,
    pattern_history: patternHistory,
  });

  const confidenceContext = buildConfidenceContext(snapshot);
  const sufficiencyContext = buildSufficiencyContext(snapshot);
  const checkinSummary = summarizeDevelopmentCheckins(
    Array.isArray(snapshot.development_checkins) ? snapshot.development_checkins : [],
    { current_week: snapshot?.enrollment?.current_week || snapshot?.progress_records?.at(-1)?.week_number || 1 }
  );
  const growthTrajectory = buildGrowthTrajectoryModel(snapshot, { insights, pattern_history: patternHistory }, { child_id: childId });
  const context = buildRecommendationInputs(snapshot, commitmentPlan, sessions, confidenceContext, sufficiencyContext, {
    transfer_strength_status: checkinSummary.changes_since_prior_checkin?.transfer_attempt_quality_latest <= 1.8 ? "weak" : "stable",
    reflection_quality_status: checkinSummary.changes_since_prior_checkin?.reflection_quality_delta > 0 ? "improving" : "mixed",
    cross_source_disagreement_present: checkinSummary.cross_source_disagreement?.present === true,
    evidence_sufficiency_status: checkinSummary.evidence_sufficiency?.status || "limited",
  }, {
    trajectory_state: growthTrajectory.trajectory_state,
    trajectory_confidence: growthTrajectory?.confidence_context?.confidence_label || "low",
  });
  const recommendations = generateRecommendations({
    child_id: childId,
    ...context,
    personalization_modifiers: personalization.modifiers,
  }, options);
  return normalizeRecommendationsPayload(recommendations);
}

async function getPersonalizationSummary(childId, repository) {
  const snapshot = await repository.getProgramSnapshot(childId);
  const insights = buildInsightLayer(snapshot, { child_id: childId });
  return buildPersonalizationModifiers(snapshot, insights, { child_id: childId });
}

async function getPatternHistory(childId, repository) {
  const snapshot = await repository.getProgramSnapshot(childId);
  const history = buildPatternHistory(snapshot, { child_id: childId });
  return {
    ok: true,
    child_id: childId,
    deterministic: true,
    extension_only: true,
    pattern_history_schema_version: history.pattern_history_schema_version,
    confidence_context: history.confidence_context,
    pattern_history: history.pattern_history,
    missing_contracts: history.missing_contracts,
    contracts_status: history.contracts_status,
  };
}


async function getGrowthTrajectory(childId, repository) {
  const snapshot = await repository.getProgramSnapshot(childId);
  const insights = buildInsightLayer(snapshot, { child_id: childId });
  const patternHistory = buildPatternHistory(snapshot, { child_id: childId });
  const milestoneComparison = buildMilestoneComparisonModel(snapshot, { child_id: childId });
  return buildGrowthTrajectoryModel(snapshot, {
    insights,
    pattern_history: patternHistory,
    milestone_comparison: milestoneComparison,
  }, { child_id: childId });
}

async function getMilestoneComparison(childId, repository) {
  const snapshot = await repository.getProgramSnapshot(childId);
  return buildMilestoneComparisonModel(snapshot, { child_id: childId });
}


async function getParentCoachingSummary(childId, repository) {
  const snapshot = await repository.getProgramSnapshot(childId);
  const insights = buildInsightLayer(snapshot, { child_id: childId });
  const patternHistory = buildPatternHistory(snapshot, { child_id: childId });
  const trajectory = buildGrowthTrajectoryModel(snapshot, { insights, pattern_history: patternHistory }, { child_id: childId });
  return buildParentCoachingSummary(snapshot, { insights, trajectory }, { child_id: childId });
}

async function getParentGuidance(childId, repository) {
  const summary = await getParentCoachingSummary(childId, repository);
  return buildParentGuidance(summary);
}
async function getAdaptiveRecommendationExplanation(childId, repository, options = {}) {
  const recommendations = await getRecommendations(childId, repository, options);
  const personalization = await getPersonalizationSummary(childId, repository);
  return normalizeExplanationPayload(buildAdaptiveRecommendationExplanation(recommendations, personalization));
}

async function getReadiness(childId, repository) {
  const snapshot = await repository.getProgramSnapshot(childId);
  const commitmentPlan = snapshot.commitment_plan || await repository.getCommitmentPlan(childId);
  const sessions = Array.isArray(snapshot.intervention_sessions) && snapshot.intervention_sessions.length
    ? snapshot.intervention_sessions
    : await repository.listInterventionSessions(childId);
  const checkinSummary = summarizeDevelopmentCheckins(
    Array.isArray(snapshot.development_checkins) ? snapshot.development_checkins : [],
    { current_week: snapshot?.enrollment?.current_week || snapshot?.progress_records?.at(-1)?.week_number || 1 }
  );
  const readinessSnapshot = {
    ...snapshot,
    checkin_context: {
      history_count: checkinSummary.checkin_history_count,
      consistency_status: checkinSummary.evidence_sufficiency?.consistency_present ? "sufficient" : "limited",
      traceability_status: checkinSummary.evidence_sufficiency?.traceability_complete ? "sufficient" : "limited",
      cross_source_agreement_status: checkinSummary.cross_source_disagreement?.present ? "limited" : "sufficient",
    },
  };
  return {
    child_id: childId,
    ...evaluateInterventionReadiness(readinessSnapshot, commitmentPlan, sessions),
  };
}

async function getRollout(childId, repository) {
  const readiness = await getReadiness(childId, repository);
  return {
    ok: true,
    extension_only: true,
    deterministic: true,
    child_id: childId,
    readiness,
    rollout: buildRolloutBridge(readiness, { voice_rollout_mode: process.env.TDE_VOICE_ROLLOUT_MODE }),
  };
}


async function getInsights(childId, repository) {
  const snapshot = await repository.getProgramSnapshot(childId);
  return normalizeInsightsPayload(buildInsightLayer(snapshot, { child_id: childId }));
}

async function getCheckinSummary(childId, repository) {
  const snapshot = await repository.getProgramSnapshot(childId);
  const currentWeek = snapshot?.enrollment?.current_week || snapshot?.progress_records?.at(-1)?.week_number || 1;
  const summary = summarizeDevelopmentCheckins(
    Array.isArray(snapshot.development_checkins) ? snapshot.development_checkins : [],
    { current_week: currentWeek }
  );
  return normalizeCheckinSummaryPayload({
    child_id: childId,
    ...summary,
  });
}

module.exports = {
  getInterventionSummary,
  getRecommendations,
  getReadiness,
  getRollout,
  getCheckinSummary,
  getInsights,
  getPersonalizationSummary,
  getPatternHistory,
  getAdaptiveRecommendationExplanation,
  getGrowthTrajectory,
  getMilestoneComparison,
  getParentCoachingSummary,
  getParentGuidance,
};
