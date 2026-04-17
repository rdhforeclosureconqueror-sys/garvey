"use strict";

const { PROGRAM_WEEKS } = require("./programRail");

function buildDataSufficiencyStatus(consents, hooks, progressRecords) {
  const grantedCount = consents.filter((entry) => entry.consent_status === "granted").length;
  const environmentCount = hooks.length;
  const checkpointCount = progressRecords.filter((entry) => entry.checkpoint_record).length;
  const status = grantedCount > 0 && environmentCount > 0 && checkpointCount > 0 ? "sufficient" : "limited";
  return {
    status,
    observer_consent_count: consents.length,
    granted_observer_consent_count: grantedCount,
    environment_event_count: environmentCount,
    checkpoint_count: checkpointCount,
    missing_contracts: [
      ...(grantedCount === 0 ? ["observer_consent_granted_required"] : []),
      ...(environmentCount === 0 ? ["environment_hooks_required"] : []),
    ],
  };
}

function buildParentProgressSummary(childId, snapshot = {}) {
  const enrollment = snapshot.enrollment || null;
  const progressRecords = Array.isArray(snapshot.progress_records) ? [...snapshot.progress_records] : [];
  progressRecords.sort((a, b) => Number(a.week_number) - Number(b.week_number));
  const environmentHooks = Array.isArray(snapshot.environment_hooks) ? snapshot.environment_hooks : [];
  const observerConsents = Array.isArray(snapshot.observer_consents) ? snapshot.observer_consents : [];

  const currentWeek = enrollment?.current_week || progressRecords.at(-1)?.week_number || 1;
  const currentWeekRecord = PROGRAM_WEEKS.find((week) => week.week_number === Number(currentWeek)) || PROGRAM_WEEKS[0];

  const completedCheckpoints = progressRecords
    .filter((record) => record.checkpoint_record)
    .map((record) => ({
      checkpoint_id: record.checkpoint_record.checkpoint_id,
      week_number: record.week_number,
      checkpoint_type: record.checkpoint_record.checkpoint_type,
    }));

  const nextCheckpoint = PROGRAM_WEEKS.find((week) => week.week_number >= Number(currentWeek) && week.checkpoint_flag)
    || PROGRAM_WEEKS.at(-1);

  const strongestLevers = Array.isArray(enrollment?.active_domain_interests) ? enrollment.active_domain_interests.slice(0, 3) : [];
  const traitsBuilding = Array.isArray(enrollment?.current_trait_targets) ? enrollment.current_trait_targets : [];
  const environmentFocusAreas = Array.isArray(enrollment?.current_environment_targets) ? enrollment.current_environment_targets : [];

  const confidenceContext = {
    confidence_label: progressRecords.length >= 4 ? "moderate" : "early-signal",
    rationale: progressRecords.length >= 4
      ? "Multiple weekly signals and checkpoints are present."
      : "Summary based on early extension data; additional observations will improve certainty.",
    environment_signal_count: environmentHooks.length,
    observer_consent_count: observerConsents.length,
  };

  const summary = {
    ok: true,
    child_id: childId,
    extension_only: true,
    deterministic: true,
    current_phase: currentWeekRecord.phase_number,
    current_week: Number(currentWeekRecord.week_number),
    completed_checkpoints: completedCheckpoints,
    next_checkpoint: {
      week_number: nextCheckpoint.week_number,
      phase_number: nextCheckpoint.phase_number,
      objective: nextCheckpoint.goal_label,
    },
    strongest_current_developmental_levers: strongestLevers,
    traits_currently_building: traitsBuilding,
    current_environment_focus_areas: environmentFocusAreas,
    next_step_support_actions: [
      "Sustain challenge-fit activities aligned to current targets.",
      "Capture one observer check-in with consent and provenance metadata.",
      "Review environment hooks at next checkpoint for support adjustments.",
    ],
    confidence_context: confidenceContext,
    data_sufficiency_status: buildDataSufficiencyStatus(observerConsents, environmentHooks, progressRecords),
  };

  return summary;
}

async function getParentProgressSummary(childId, repository) {
  const snapshot = await repository.getProgramSnapshot(childId);
  return buildParentProgressSummary(childId, snapshot);
}

module.exports = {
  buildParentProgressSummary,
  getParentProgressSummary,
};
