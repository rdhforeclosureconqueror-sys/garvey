"use strict";

const { deterministicId } = require("./constants");
const { PROGRAM_PHASES, PROGRAM_WEEKS, PROGRAM_CHECKPOINTS, PROGRAM_MODEL_CONTRACTS } = require("./programRail");

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeWeekNumber(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 36) return null;
  return parsed;
}

function buildEnrollmentRecord(payload = {}) {
  const childId = String(payload.child_id || payload.childId || "").trim();
  if (!childId) throw new Error("child_id_required");
  const startDate = toIsoOrNull(payload.program_start_date) || new Date().toISOString();
  return {
    enrollment_id: String(payload.enrollment_id || deterministicId("enr", { child_id: childId, start_date: startDate })).trim(),
    child_id: childId,
    program_start_date: startDate,
    current_week: normalizeWeekNumber(payload.current_week) || 1,
    program_status: String(payload.program_status || "active").trim().toLowerCase(),
    child_profile_tde: payload.child_profile_tde || null,
    observer_records: Array.isArray(payload.observer_records) ? payload.observer_records : [],
    active_domain_interests: Array.isArray(payload.active_domain_interests) ? payload.active_domain_interests : [],
    current_trait_targets: Array.isArray(payload.current_trait_targets) ? payload.current_trait_targets : [],
    current_environment_targets: Array.isArray(payload.current_environment_targets) ? payload.current_environment_targets : [],
    created_at: new Date().toISOString(),
  };
}

function buildProgressRecord(payload = {}) {
  const enrollmentId = String(payload.enrollment_id || "").trim();
  const childId = String(payload.child_id || "").trim();
  const weekNumber = normalizeWeekNumber(payload.week_number);
  if (!enrollmentId) throw new Error("enrollment_id_required");
  if (!childId) throw new Error("child_id_required");
  if (!weekNumber) throw new Error("week_number_invalid");

  const checkpoint = PROGRAM_CHECKPOINTS.find((item) => item.week_number === weekNumber) || null;
  return {
    progress_id: String(payload.progress_id || deterministicId("wpr", { enrollment_id: enrollmentId, week_number: weekNumber, child_id: childId })).trim(),
    enrollment_id: enrollmentId,
    child_id: childId,
    week_number: weekNumber,
    completion_status: String(payload.completion_status || "in_progress").trim().toLowerCase(),
    trait_signal_summary: payload.trait_signal_summary || {},
    session_record: payload.session_record || null,
    checkpoint_record: payload.checkpoint_record || checkpoint,
    observer_records: Array.isArray(payload.observer_records) ? payload.observer_records : [],
    current_environment_targets: Array.isArray(payload.current_environment_targets) ? payload.current_environment_targets : [],
    updated_at: new Date().toISOString(),
  };
}

async function enrollInProgram(payload, repository) {
  const enrollment = buildEnrollmentRecord(payload);
  const persisted = await repository.persistProgramEnrollment(enrollment);
  return {
    ok: true,
    enrollment,
    persistence: persisted,
  };
}

async function recordWeeklyProgress(payload, repository) {
  const progress = buildProgressRecord(payload);
  const persisted = await repository.persistWeeklyProgress(progress);
  return {
    ok: true,
    progress,
    persistence: persisted,
  };
}

function listProgramPhases() {
  return {
    ok: true,
    phases: PROGRAM_PHASES,
    model_contracts: PROGRAM_MODEL_CONTRACTS,
    deterministic: true,
  };
}

function listProgramWeeks() {
  return {
    ok: true,
    weeks: PROGRAM_WEEKS,
    deterministic: true,
  };
}

function getProgramWeek(weekNumber) {
  const parsed = normalizeWeekNumber(weekNumber);
  if (!parsed) return null;
  return PROGRAM_WEEKS.find((week) => week.week_number === parsed) || null;
}

function listProgramCheckpoints() {
  return {
    ok: true,
    checkpoints: PROGRAM_CHECKPOINTS,
    deterministic: true,
  };
}

module.exports = {
  enrollInProgram,
  recordWeeklyProgress,
  listProgramPhases,
  listProgramWeeks,
  getProgramWeek,
  listProgramCheckpoints,
};
