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
const { registerReadablePlayableContentBlocks } = require("./contentRegistryService");

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
  const context = buildRecommendationInputs(snapshot, commitmentPlan, sessions, confidenceContext, sufficiencyContext, {
    transfer_strength_status: checkinSummary.changes_since_prior_checkin?.transfer_attempt_quality_latest <= 1.8 ? "weak" : "stable",
    reflection_quality_status: checkinSummary.changes_since_prior_checkin?.reflection_quality_delta > 0 ? "improving" : "mixed",
    cross_source_disagreement_present: checkinSummary.cross_source_disagreement?.present === true,
    evidence_sufficiency_status: checkinSummary.evidence_sufficiency?.status || "limited",
  });
  const recommendationPayload = generateRecommendations({
    child_id: childId,
    ...context,
    personalization_modifiers: personalization.modifiers,
  }, options);

  const contentRegistration = registerReadablePlayableContentBlocks(
    (recommendationPayload.recommendations || []).map((entry) => ({
      section_key: "recommendation_item",
      text_content: entry.parent_language,
      voice_ready: true,
      source_module: "recommendation_service",
      readability_level: "parent_standard",
    })),
    { child_id: childId, scope: "recommendations" }
  );

  return {
    ...recommendationPayload,
    content_registration: contentRegistration,
  };
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

async function getAdaptiveRecommendationExplanation(childId, repository, options = {}) {
  const recommendations = await getRecommendations(childId, repository, options);
  const personalization = await getPersonalizationSummary(childId, repository);
  return buildAdaptiveRecommendationExplanation(recommendations, personalization);
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
  const insightPayload = buildInsightLayer(snapshot, { child_id: childId });
  const contentRegistration = registerReadablePlayableContentBlocks(
    (insightPayload.pillar_insights || []).map((entry) => ({
      section_key: "insight_item",
      text_content: entry?.pillar_summary?.strengthening || "Insight is still forming.",
      voice_ready: true,
      source_module: "insight_service",
      readability_level: "parent_standard",
    })),
    { child_id: childId, scope: "insights" }
  );

  return {
    ...insightPayload,
    content_registration: contentRegistration,
  };
}

async function getCheckinSummary(childId, repository) {
  const snapshot = await repository.getProgramSnapshot(childId);
  const currentWeek = snapshot?.enrollment?.current_week || snapshot?.progress_records?.at(-1)?.week_number || 1;
  const summary = summarizeDevelopmentCheckins(
    Array.isArray(snapshot.development_checkins) ? snapshot.development_checkins : [],
    { current_week: currentWeek }
  );
  const payload = {
    child_id: childId,
    ...summary,
  };
  const contentRegistration = registerReadablePlayableContentBlocks([
    {
      section_key: "checkin_interpretation",
      text_content: summary?.changes_since_prior_checkin?.interpretation || "Check-in interpretation is pending additional evidence.",
      voice_ready: true,
      source_module: "development_checkin_service",
      readability_level: "child_friendly",
    },
  ], {
    child_id: childId,
    scope: "checkin_summary",
  });

  return {
    ...payload,
    content_registration: contentRegistration,
  };
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
};
