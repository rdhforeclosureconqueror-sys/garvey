"use strict";

const { buildInterventionSummary } = require("./interventionSummaryService");
const { buildRecommendationInputs, generateRecommendations } = require("./recommendationService");
const { evaluateInterventionReadiness, buildRolloutBridge } = require("./readinessRolloutService");

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

  const confidenceContext = buildConfidenceContext(snapshot);
  const sufficiencyContext = buildSufficiencyContext(snapshot);
  const context = buildRecommendationInputs(snapshot, commitmentPlan, sessions, confidenceContext, sufficiencyContext);
  return generateRecommendations({ child_id: childId, ...context }, options);
}

async function getReadiness(childId, repository) {
  const snapshot = await repository.getProgramSnapshot(childId);
  const commitmentPlan = snapshot.commitment_plan || await repository.getCommitmentPlan(childId);
  const sessions = Array.isArray(snapshot.intervention_sessions) && snapshot.intervention_sessions.length
    ? snapshot.intervention_sessions
    : await repository.listInterventionSessions(childId);
  return {
    child_id: childId,
    ...evaluateInterventionReadiness(snapshot, commitmentPlan, sessions),
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
    rollout: buildRolloutBridge(readiness),
  };
}

module.exports = {
  getInterventionSummary,
  getRecommendations,
  getReadiness,
  getRollout,
};
