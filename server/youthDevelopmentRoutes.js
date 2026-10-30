"use strict";

const express = require("express");
const { buildYouthDevelopmentResult } = require("../youth-development/measurement/resultBuilder");
const { buildYouthDevelopmentDashboard } = require("../youth-development/measurement/dashboardBuilder");
const { buildParentDashboardPageModel } = require("../youth-development/presentation/parentDashboardPageModel");
const { renderYouthDevelopmentParentDashboardPage } = require("./youthDevelopmentRenderer");
const { buildAdaptiveParentDashboardSummary, isFakeLearnerName } = require("./adaptiveParentDashboardSummary");
const {
  YOUTH_QUESTION_BANK,
  YOUTH_PARENT_INSTRUCTIONS,
  YOUTH_ANSWER_SCALE,
} = require("../youth-development/question-engine/youthQuestionBank");
const { getQuestionFlowState, validateAnswers } = require("../youth-development/question-engine/youthQuestionFlow");
const { runYouthIntakeScoring } = require("../youth-development/question-engine/youthScoringMap");
const { PROGRAM_WEEKS } = require("../youth-development/tde/programRail");
const { buildSessionPlan } = require("../youth-development/tde/sessionBuilderService");
const { listActivitiesByComponent } = require("../youth-development/tde/activityBankService");
const { getAuthoredWeekContent, auditWeeklyContentSources, STEP_SEQUENCE } = require("../youth-development/content/weeklyProgramContent");
const {
  defaultExecutionState,
  normalizeExecutionState,
  buildWeeklyExecutionCoverageReport,
  validateWeeklyExecutionActionPayload,
  WEEKLY_EXECUTION_ACTIONS,
} = require("../youth-development/tde/weeklyExecutionContract");
const {
  normalizeParentCommitmentPlan,
  validateParentCommitmentSetup,
  isParentCommitmentSetupComplete,
} = require("../youth-development/tde/parentCommitmentSetupContract");

const PREVIEW_AGGREGATED_ROWS = Object.freeze([
  Object.freeze({
    trait_code: "SR",
    baseline_score: 61,
    current_score: 82,
    change_score: 21,
    confidence_score: 86,
    evidence_mix_score: 79,
    trend_direction: "increasing",
  }),
  Object.freeze({
    trait_code: "PS",
    baseline_score: 44,
    current_score: 34,
    change_score: -10,
    confidence_score: 72,
    evidence_mix_score: 66,
    trend_direction: "decreasing",
  }),
  Object.freeze({
    trait_code: "CQ",
    baseline_score: 58,
    current_score: 63,
    change_score: 5,
    confidence_score: 49,
    evidence_mix_score: 54,
    trend_direction: "stable",
  }),
]);

const PREVIEW_OPTIONS = Object.freeze({
  generatedAt: "2026-01-01T00:00:00.000Z",
  evidenceSummary: Object.freeze({
    sources_used: Object.freeze(["child_task", "teacher_observation", "assessor_observation"]),
    confidence_caveats: Object.freeze([
      "Preview fixture only: this output is for renderer verification, not production interpretation.",
    ]),
  }),
  environmentNotes: Object.freeze([
    "Preview fixture note: this page is test-only and uses deterministic sample rows.",
  ]),
});

const INTAKE_TEST_FIXTURE = Object.freeze({
  schema_version: "1.0",
  session_id: "session-1",
  child_id: "child-1",
  submitted_at: "2026-03-01T12:00:00.000Z",
  task_results: Object.freeze([
    Object.freeze({
      task: Object.freeze({
        task_id: "YT_B1_CQ_01",
        trait_code: "CQ",
        task_class: "SCT",
        expected_signal_types: Object.freeze(["inquiry_depth", "justification_quality", "decision_quality"]),
        scoring_type: "rubric",
        evidence_source: "child_scenario",
      }),
      raw_input: Object.freeze({
        timestamp: "2026-03-01T12:01:00.000Z",
        metrics: Object.freeze({
          inquiry_depth: 3,
          justification_quality: 3,
          decision_quality: 2,
        }),
        measurement_window: "current",
        is_current: true,
      }),
    }),
  ]),
  options: Object.freeze({
    ignore_contaminated: true,
  }),
});

const ACTIVITY_LABELS = Object.freeze({
  guided_skill_practice: "Guided skill practice",
  scenario_decision_lab: "Scenario decision lab",
  project_build_cycle: "Project build cycle",
  peer_feedback_exchange: "Peer feedback exchange",
});

const STRETCH_LABELS = Object.freeze({
  complexity_increase: "Complexity increase challenge",
  time_constraint_variant: "Time-constraint variant",
  novel_domain_transfer: "Novel domain transfer",
  leadership_micro_role: "Leadership micro-role",
});

const PROGRAM_CONNECTIVITY_CONTROLS = Object.freeze([
  Object.freeze({ label: "Snapshot Cards Read-Aloud", surface: "parent dashboard snapshot cards", handler: "data-voice-card.click", endpoint: "GET /api/youth-development/voice/sections/:childId + speechSynthesis fallback", scope: "child-scoped parent dashboard", status: "working" }),
  Object.freeze({ label: "Top Strengths Read-Aloud", surface: "parent dashboard", handler: "data-voice-control=topStrengths.click", endpoint: "GET /api/youth-development/voice/sections/:childId + speechSynthesis fallback", scope: "child-scoped parent dashboard", status: "working" }),
  Object.freeze({ label: "Areas to Strengthen Read-Aloud", surface: "parent dashboard", handler: "data-voice-control=areasToStrengthen.click", endpoint: "GET /api/youth-development/voice/sections/:childId + speechSynthesis fallback", scope: "child-scoped parent dashboard", status: "working" }),
  Object.freeze({ label: "Weekly Support Read-Aloud", surface: "parent dashboard", handler: "data-voice-control=weeklySupport.click", endpoint: "GET /api/youth-development/voice/sections/:childId + speechSynthesis fallback", scope: "child-scoped parent dashboard", status: "working" }),
  Object.freeze({ label: "Weekly Goals Read-Aloud", surface: "program page / weekly goals", handler: "readWeeklyGoalsBtn.click", endpoint: "GET /api/youth-development/voice/sections/:childId + speechSynthesis fallback", scope: "tenant+email+child+week", status: "working" }),
  Object.freeze({ label: "Program Support Read-Aloud", surface: "program page / support sections", handler: "readProgramSupportBtn.click", endpoint: "GET /api/youth-development/voice/sections/:childId + speechSynthesis fallback", scope: "tenant+email+child+week", status: "working" }),
  Object.freeze({ label: "Progress Summary Read-Aloud", surface: "program page / progress dashboard", handler: "readProgressSummaryBtn.click", endpoint: "GET /api/youth-development/voice/sections/:childId + speechSynthesis fallback", scope: "tenant+email+child+week", status: "working" }),
  Object.freeze({ label: "Build Your Weekly Plan", surface: "weekly planner", handler: "saveCommitmentBtn.click", endpoint: "POST /api/youth-development/program/commitment", scope: "tenant+email+child+week", status: "working" }),
  Object.freeze({ label: "Preferred Time Picker", surface: "weekly planner setup", handler: "commitTimeHourInput.change | commitTimeMinuteInput.change | commitTimeMeridiemInput.change", endpoint: "payload.preferred_time + payload.preferred_time_window", scope: "child/week commitment setup", status: "working" }),
  Object.freeze({ label: "Preferred Days Selector", surface: "weekly planner setup", handler: "commitPreferredDaysGroup.change[data-day-checkbox]", endpoint: "payload.preferred_days[]", scope: "child/week commitment setup", status: "working" }),
  Object.freeze({ label: "Setup Required Message", surface: "weekly planner state message", handler: "derivePlannerSurfaceState(state=setup_required)", endpoint: "client-render:plannerStateCopy", scope: "child/week planner gating", status: "working" }),
  Object.freeze({ label: "No Sessions Yet Message", surface: "weekly planner + lesson plan + adherence", handler: "derivePlannerSurfaceState(state=no_sessions_yet|setup_complete_generating_sessions)", endpoint: "client-render:empty-state-copy", scope: "child/week schedule gating", status: "working" }),
  Object.freeze({ label: "Lesson Plan Empty State", surface: "lesson plan", handler: "renderLessonPlan(null, week)", endpoint: "client-render:lesson-plan-empty", scope: "child/week/session local view", status: "working" }),
  Object.freeze({ label: "Progress Empty State", surface: "parent progress dashboard", handler: "renderProgressDashboard(no sessions)", endpoint: "client-render:progress-empty", scope: "child/week accountability view", status: "working" }),
  Object.freeze({ label: "Start Today’s Session", surface: "program page / Today", handler: "startTodaySessionBtn.click", endpoint: "POST /api/youth-development/program/week-execution", scope: "tenant+email+child+week+session", status: "working" }),
  Object.freeze({ label: "Resume Session", surface: "program page / Today + lesson plan + agenda", handler: "resumeTodaySessionBtn.click | resumeSessionBtn.click | data-action=resume-session", endpoint: "POST /api/youth-development/program/week-execution", scope: "tenant+email+child+week+session", status: "working" }),
  Object.freeze({ label: "View Weekly Plan", surface: "program page / Today", handler: "viewWeeklyPlanBtn.click", endpoint: "client-scroll:#plannerCalendarGrid", scope: "child/week local view", status: "working" }),
  Object.freeze({ label: "Open Scheduled Session", surface: "weekly planner", handler: "openNextSessionBtn.click", endpoint: "client-render:lesson-plan", scope: "child/week/session local view", status: "working" }),
  Object.freeze({ label: "Open Lesson Plan", surface: "weekly planner calendar", handler: "plannerCalendarGrid.click[data-action=open-session]", endpoint: "client-render:lesson-plan", scope: "child/week/session local view", status: "working" }),
  Object.freeze({ label: "Mark Session Complete", surface: "weekly planner + lesson plan + agenda", handler: "markNextSessionCompleteBtn.click | completeSelectedSessionBtn.click | data-action=complete-session", endpoint: "POST /api/youth-development/program/session-complete", scope: "tenant+email+child+week+session", status: "working" }),
  Object.freeze({ label: "Save Reflection", surface: "current week guided experience", handler: "saveReflectionBtn.click", endpoint: "POST /api/youth-development/program/week-execution", scope: "tenant+email+child+week", status: "working" }),
  Object.freeze({ label: "Save Observation", surface: "current week guided experience", handler: "saveObservationBtn.click", endpoint: "POST /api/youth-development/program/week-execution", scope: "tenant+email+child+week", status: "working" }),
  Object.freeze({ label: "Mark Step Complete", surface: "current week guided experience", handler: "markStepCompleteBtn.click", endpoint: "POST /api/youth-development/program/week-execution", scope: "tenant+email+child+week+step", status: "working" }),
  Object.freeze({ label: "Continue to Next Step", surface: "current week guided experience", handler: "continueStepBtn.click", endpoint: "POST /api/youth-development/program/week-execution", scope: "tenant+email+child+week", status: "working" }),
  Object.freeze({ label: "Continue Next Week", surface: "current week guided experience", handler: "continueNextWeekBtn.click", endpoint: "POST /api/youth-development/program/week-execution", scope: "tenant+email+child+week", status: "working" }),
  Object.freeze({ label: "Return to Dashboard", surface: "program page", handler: "dashboardBtn.href", endpoint: "GET /youth-development/parent-dashboard", scope: "tenant+email+child", status: "working" }),
  Object.freeze({ label: "Start Program / Continue Program", surface: "intake + parent dashboard + program launch", handler: "launchBtn.click", endpoint: "POST /api/youth-development/program/launch", scope: "tenant+email+child", status: "working" }),
  Object.freeze({ label: "Previous week", surface: "current week guided experience", handler: "prevWeekBtn.click", endpoint: "client-nav:renderWeekDetails", scope: "child/week local view", status: "working" }),
  Object.freeze({ label: "Next Week", surface: "current week guided experience", handler: "nextWeekBtn.click", endpoint: "client-nav:renderWeekDetails", scope: "child/week local view", status: "working" }),
]);

const REFLECTION_LABELS = Object.freeze({
  self_explanation_journal: "Self-explanation journal",
  mentor_dialogue_prompt: "Mentor dialogue prompt",
  goal_adjustment_review: "Goal adjustment review",
});

const OBSERVATION_LABELS = Object.freeze({
  task_event_observation: "Task-event observation",
  teacher_observation_note: "Teacher observation note",
  parent_observation_note: "Parent observation note",
  self_report_observation: "Self-report observation",
});

const SUPPORT_ACTION_LABELS = Object.freeze({
  family_reflection_prompt: "Family reflection prompt",
  teacher_alignment_note: "Teacher alignment note",
  mentor_checkin: "Mentor check-in",
  routine_reset_micro_plan: "Routine reset micro-plan",
  resource_scaffold_pack: "Resource scaffold pack",
});

const CANONICAL_PARENT_ROUTES = Object.freeze({
  entry: "/youth-development/intake",
  dashboard: "/youth-development/parent-dashboard",
  program: "/youth-development/program",
});

const CANONICAL_CTA_LABELS = Object.freeze({
  startProgram: "Start Program",
  continueProgram: "View Weekly Plan",
  returnToDashboard: "Return to Dashboard",
  resumeWeekPrefix: "Resume Week",
  saveReflection: "Save Reflection",
  saveObservation: "Save Observation",
});

function safeTrim(value) {
  return String(value ?? "").trim();
}

function isCommitmentSetupComplete(commitment = {}) {
  return isParentCommitmentSetupComplete(commitment);
}

function resolvePlannerSurfaceState({ commitment = null, scheduledSessions = [], executionState = null } = {}) {
  const setupComplete = isCommitmentSetupComplete(commitment || {});
  const scheduledCount = Array.isArray(scheduledSessions) ? scheduledSessions.length : 0;
  const weekStatus = String(executionState?.week_status || "").toLowerCase();
  if (!setupComplete) {
    return {
      state: "setup_required",
      label: "Setup required",
      message: "Build Your Weekly Plan to unlock today/next session cards, planner calendar, and adherence dashboard.",
      setup_complete: false,
      scheduled_session_count: 0,
    };
  }
  if (scheduledCount <= 0 && weekStatus === "generating_sessions") {
    return {
      state: "setup_complete_generating_sessions",
      label: "Setup complete, generating sessions",
      message: "Weekly setup is complete. Sessions are being generated now.",
      setup_complete: true,
      scheduled_session_count: 0,
    };
  }
  if (scheduledCount <= 0) {
    return {
      state: "no_sessions_yet",
      label: "No sessions yet",
      message: "Commitment is saved, but no sessions are scheduled yet. Re-save Build Your Weekly Plan to regenerate this week’s sessions.",
      setup_complete: true,
      scheduled_session_count: 0,
    };
  }
  if (weekStatus === "in_progress") {
    return {
      state: "execution_in_progress",
      label: "Execution in progress",
      message: "Session execution is in progress for this week.",
      setup_complete: true,
      scheduled_session_count: scheduledCount,
    };
  }
  return {
    state: "setup_complete_with_sessions",
    label: "Planner ready",
    message: "Planner setup complete and scheduled sessions are available.",
    setup_complete: true,
    scheduled_session_count: scheduledCount,
  };
}

function normalizeAccountContext(source = {}) {
  return {
    tenant: safeTrim(source.tenant || source.tenant_slug).toLowerCase(),
    email: safeTrim(source.email).toLowerCase(),
    name: safeTrim(source.name),
    cid: safeTrim(source.cid),
    crid: safeTrim(source.crid || source.rid),
  };
}

function resolveRequestAccountContext(req, body = {}) {
  const authCtx = normalizeAccountContext({
    tenant: req.authActor?.tenantSlug,
    email: req.authActor?.email,
    name: req.authActor?.name,
  });
  const queryCtx = normalizeAccountContext(req.query || {});
  const bodyCtx = normalizeAccountContext(body || {});
  const headerCtx = normalizeAccountContext({
    tenant: req.headers["x-tenant-slug"],
    email: req.headers["x-user-email"],
    name: req.headers["x-user-name"],
  });
  if (authCtx.tenant && authCtx.email) {
    return {
      tenant: authCtx.tenant,
      email: authCtx.email,
      name: authCtx.name || bodyCtx.name || queryCtx.name || headerCtx.name,
      cid: bodyCtx.cid || queryCtx.cid,
      crid: bodyCtx.crid || queryCtx.crid,
    };
  }
  return {
    tenant: bodyCtx.tenant || queryCtx.tenant || headerCtx.tenant,
    email: bodyCtx.email || queryCtx.email || headerCtx.email,
    name: bodyCtx.name || queryCtx.name || headerCtx.name,
    cid: bodyCtx.cid || queryCtx.cid,
    crid: bodyCtx.crid || queryCtx.crid,
  };
}

function isInternalSurfaceRequestAllowed(req) {
  if (process.env.NODE_ENV !== "production") return true;
  if (req?.isAdmin === true) return true;
  if (req?.authActor?.isAdmin === true) return true;
  const internalQuery = String(req?.query?.internal || "").trim();
  return internalQuery === "1";
}

function labelFor(map, code) {
  if (!code) return null;
  return map[code] || String(code);
}

const COMPONENT_GROUPS = Object.freeze({
  core: Object.freeze(["RULE_BASED_REGULATION", "ATTENTION_MINDFULNESS"]),
  stretch: "CHALLENGE_SUSTAINED_FOCUS",
  reflection: "REFLECTION_COACHING",
  opening: "OPENING_ROUTINE",
  transition: "TRANSITION_ROUTINE",
  closing: "CLOSING_ROUTINE",
  observation: "OBSERVATION_SUPPORT",
});

const DAYS = Object.freeze(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);

function buildRoadmap(currentWeek) {
  return [currentWeek - 1, currentWeek, currentWeek + 1]
    .filter((week) => week >= 1 && week <= 36)
    .map((weekNumber) => {
      const model = PROGRAM_WEEKS.find((entry) => Number(entry.week_number) === Number(weekNumber));
      return {
        week_number: weekNumber,
        phase_name: String(model?.phase_name || "Foundation"),
        weekly_goal: String(getAuthoredWeekContent(weekNumber)?.objective || model?.weekly_goal || `Week ${weekNumber} objective unavailable.`),
        status: weekNumber < currentWeek ? "completed" : (weekNumber === currentWeek ? "current" : "upcoming"),
      };
    });
}

function normalizeActivity(activity = {}) {
  return {
    activity_id: String(activity.activity_id || ""),
    component_type: String(activity.component_type || ""),
    category: String(activity.category || ""),
    subcategory: String(activity.subcategory || ""),
    title: String(activity.title || "Untitled activity"),
    description: String(activity.description || "Activity details unavailable."),
    estimated_duration: Number(activity.estimated_duration || 0),
    materials_needed: Array.isArray(activity.materials_needed) ? activity.materials_needed : [],
    facilitation_instructions: String(activity.facilitation_instructions || ""),
    target_traits: Array.isArray(activity.target_traits) ? activity.target_traits : [],
    available_variations: Array.isArray(activity.available_variations || activity.variations)
      ? (activity.available_variations || activity.variations).map((variation) => ({
        variation_id: String(variation.variation_id || ""),
        variation_level: String(variation.variation_level || ""),
        variation_type: String(variation.variation_type || ""),
        instructions: String(variation.instructions || ""),
        duration: Number(variation.duration || 0),
        materials: Array.isArray(variation.materials) ? variation.materials : [],
      }))
      : [],
  };
}

function buildActivitySurface({ childId, phaseNumber, parentCustomization = null }) {
  const safeChildId = String(childId || "").trim() || "child-week-preview";
  const sessionPlan = buildSessionPlan({
    child_id: safeChildId,
    phase_number: Number(phaseNumber || 1),
    facilitator_role: "parent",
    parent_customization: parentCustomization || undefined,
  });
  const selectedActivities = sessionPlan?.ok === true && Array.isArray(sessionPlan.session_plan?.selected_activities)
    ? sessionPlan.session_plan.selected_activities.map((entry) => normalizeActivity(entry))
    : [];
  const pickFromSelected = (componentType) => selectedActivities.find((entry) => String(entry.component_type || entry.componentType || "").trim() === componentType);
  const coreBankOptions = COMPONENT_GROUPS.core.flatMap((componentType) => {
    const listed = listActivitiesByComponent(componentType);
    return Array.isArray(listed.activities) ? listed.activities.map((entry) => normalizeActivity(entry)) : [];
  });
  return {
    session_plan: sessionPlan?.ok === true ? {
      session_id: String(sessionPlan.session_plan.session_id || ""),
      facilitator_role: String(sessionPlan.session_plan.facilitator_role || "parent"),
      selected_activity_ids: Array.isArray(sessionPlan.session_plan.selected_activity_ids) ? sessionPlan.session_plan.selected_activity_ids : [],
      selected_variation_ids: Array.isArray(sessionPlan.session_plan.selected_variation_ids) ? sessionPlan.session_plan.selected_variation_ids : [],
      component_count: Number(sessionPlan.session_plan.component_count || selectedActivities.length || 0),
      parent_customization: sessionPlan.session_plan.parent_customization || null,
      component_choices: sessionPlan.session_plan.component_choices || {},
    } : null,
    selected_path: {
      core_activity: pickFromSelected("RULE_BASED_REGULATION") || pickFromSelected("ATTENTION_MINDFULNESS") || null,
      stretch_challenge: pickFromSelected(COMPONENT_GROUPS.stretch) || null,
      reflection: pickFromSelected(COMPONENT_GROUPS.reflection) || null,
    },
    banks: {
      core_activity: coreBankOptions,
      stretch_challenge: listActivitiesByComponent(COMPONENT_GROUPS.stretch).activities.map((entry) => normalizeActivity(entry)),
      reflection: listActivitiesByComponent(COMPONENT_GROUPS.reflection).activities.map((entry) => normalizeActivity(entry)),
      opening_routine: listActivitiesByComponent(COMPONENT_GROUPS.opening).activities.map((entry) => normalizeActivity(entry)),
      transition_routine: listActivitiesByComponent(COMPONENT_GROUPS.transition).activities.map((entry) => normalizeActivity(entry)),
      closing_routine: listActivitiesByComponent(COMPONENT_GROUPS.closing).activities.map((entry) => normalizeActivity(entry)),
      observation_support: listActivitiesByComponent(COMPONENT_GROUPS.observation).activities.map((entry) => normalizeActivity(entry)),
    },
  };
}

function auditActivityBankDepth(activitySurface = {}) {
  const banks = activitySurface.banks || {};
  const read = (key) => Array.isArray(banks[key]) ? banks[key] : [];
  const summarize = (key, minimum, requiredSubcategories) => {
    const items = read(key);
    const count = items.length;
    const activityCountsBySubcategory = items.reduce((acc, item) => {
      const subcategory = String(item?.subcategory || "uncategorized");
      acc[subcategory] = (acc[subcategory] || 0) + 1;
      return acc;
    }, {});
    const variationCountsByActivity = items.reduce((acc, item) => {
      acc[String(item.activity_id || "")] = Array.isArray(item.available_variations) ? item.available_variations.length : 0;
      return acc;
    }, {});
    const missingSubcategories = requiredSubcategories.filter((name) => !Object.prototype.hasOwnProperty.call(activityCountsBySubcategory, name));
    const subcategoriesBelowDepthThreshold = Object.entries(activityCountsBySubcategory)
      .filter(([, subCount]) => Number(subCount) < 5)
      .map(([subcategory, subCount]) => ({ subcategory, count: subCount, threshold: 5 }));
    const activitiesBelowVariationThreshold = Object.entries(variationCountsByActivity)
      .filter(([, variationCount]) => Number(variationCount) < 2)
      .map(([activity_id, variationCount]) => ({ activity_id, count: variationCount, threshold: 2 }));
    return {
      category: key,
      current_count: count,
      depth_limit: count < minimum ? `too_thin_for_weekly_planning (${count}/${minimum})` : "usable",
      activity_counts_by_subcategory: activityCountsBySubcategory,
      variation_counts_by_activity: variationCountsByActivity,
      missing_subcategories: missingSubcategories,
      subcategories_below_depth_threshold: subcategoriesBelowDepthThreshold,
      activities_below_variation_threshold: activitiesBelowVariationThreshold,
    };
  };
  return {
    generated_at: new Date().toISOString(),
    soft_targets: {
      minimum_activities_per_subcategory: 5,
      minimum_variations_per_activity: 2,
    },
    areas: [
      summarize("core_activity", 4, ["focus_control", "emotional_regulation", "task_initiation", "problem_solving", "working_memory", "cognitive_flexibility"]),
      summarize("stretch_challenge", 3, ["complexity_increase", "time_pressure", "multi_step_challenge", "distraction_resistance", "transfer_challenge"]),
      summarize("reflection", 3, ["verbal_reflection", "visual_reflection", "guided_questions", "self_rating", "story_reflection"]),
      summarize("observation_support", 2, ["parent_observation", "habit_anchor"]),
      summarize("opening_routine", 1, ["calm_entry", "energy_activation", "attention_reset", "routine_anchor"]),
      summarize("transition_routine", 1, ["reset_refocus", "movement_transition", "countdown_transition"]),
      summarize("closing_routine", 1, ["child_summary", "reinforcement"]),
    ],
  };
}

function buildSessionTemplate({ activitySurface, durationMinutes, scheduledAt, selectedActivityIds = [] }) {
  const banks = activitySurface?.banks || {};
  const selectedById = new Map();
  Object.values(banks).flat().forEach((item) => selectedById.set(item.activity_id, item));
  const picked = selectedActivityIds.map((id) => selectedById.get(id)).filter(Boolean);
  const selected = {
    opening: picked.find((item) => item.component_type === COMPONENT_GROUPS.opening) || (banks.opening_routine || [])[0] || null,
    core: picked.find((item) => COMPONENT_GROUPS.core.includes(item.component_type)) || (banks.core_activity || [])[0] || null,
    stretch: picked.find((item) => item.component_type === COMPONENT_GROUPS.stretch) || (banks.stretch_challenge || [])[0] || null,
    reflection: picked.find((item) => item.component_type === COMPONENT_GROUPS.reflection) || (banks.reflection || [])[0] || null,
    observation: picked.find((item) => item.component_type === COMPONENT_GROUPS.observation) || (banks.observation_support || [])[0] || null,
    transition: (banks.transition_routine || [])[0] || null,
    close: (banks.closing_routine || [])[0] || null,
  };
  const block = (segment, minutes, activity) => ({
    segment,
    minutes,
    activity_id: activity?.activity_id || null,
    title: activity?.title || null,
    subcategory: activity?.subcategory || null,
    available_variation_count: Array.isArray(activity?.available_variations) ? activity.available_variations.length : 0,
  });
  return {
    scheduled_at: scheduledAt || null,
    total_minutes: Number(durationMinutes || 30),
    blocks: [
      block("opening_routine", 4, selected.opening),
      block("prep_time", 3, null),
      block("core_activity", 12, selected.core),
      block("transition", 2, selected.transition),
      block("stretch_challenge", 6, selected.stretch),
      block("transition", 1, selected.transition),
      block("reflection", 4, selected.reflection),
      block("observation_close", 3, selected.observation || selected.close),
    ],
  };
}

function buildWeekContentFromRail(weekModel, bridgeState = {}, planningState = {}) {
  if (!weekModel || typeof weekModel !== "object") return null;
  const weekNumber = Number(weekModel.week_number) || 1;
  const phaseName = String(weekModel.phase_name || "Foundation");
  const phaseNumber = Number(weekModel.phase_number || 1);
  const activityLabel = labelFor(ACTIVITY_LABELS, weekModel.core_activity_type);
  const stretchLabel = labelFor(STRETCH_LABELS, weekModel.stretch_challenge_type);
  const reflectionLabel = labelFor(REFLECTION_LABELS, weekModel.reflection_loop_type);
  const observationLabel = labelFor(OBSERVATION_LABELS, weekModel.observation_entry_type);
  const authored = getAuthoredWeekContent(weekNumber);
  const supportActionLabel = weekModel.optional_support_action
    ? labelFor(SUPPORT_ACTION_LABELS, weekModel.optional_support_action)
    : "Keep the current home routine and capture one parent observation note.";
  const targetTraits = Array.isArray(weekModel.target_traits) ? weekModel.target_traits : [];
  const progressPercent = Math.max(0, Math.min(100, Math.round((weekNumber / 36) * 100)));
  const parentCustomization = planningState?.commitment_plan?.parent_customization
    || (planningState?.commitment_plan
      ? {
        difficulty_level: planningState.commitment_plan.difficulty_level,
        session_length: planningState.commitment_plan.session_length || planningState.commitment_plan.session_duration_minutes || planningState.commitment_plan.target_session_length,
        energy_type: planningState.commitment_plan.energy_type,
        weekly_frequency: planningState.commitment_plan.weekly_frequency,
      }
      : null);
  const activitySurface = buildActivitySurface({ childId: bridgeState.child_id, phaseNumber, parentCustomization });
  const commitment = planningState.commitment_plan ? normalizeParentCommitmentPlan(planningState.commitment_plan) : null;
  const setupComplete = isCommitmentSetupComplete(commitment || {});
  const plannedSessions = Array.isArray(planningState.scheduled_sessions) ? planningState.scheduled_sessions : [];
  const plannerSurfaceState = resolvePlannerSurfaceState({ commitment, scheduledSessions: plannedSessions });
  const sessionTemplate = buildSessionTemplate({
    activitySurface,
    durationMinutes: commitment?.session_duration_minutes || commitment?.target_session_length || 30,
    scheduledAt: plannedSessions[0]?.scheduled_at || null,
    selectedActivityIds: plannedSessions[0]?.selected_activity_ids || [],
  });
  const stepSequence = Array.isArray(authored?.step_sequence) ? authored.step_sequence : STEP_SEQUENCE;
  return {
    week_number: weekNumber,
    title: String(authored?.title || `Week ${weekNumber} · ${phaseName}`),
    objective: String(authored?.objective || weekModel.weekly_goal || `Week ${weekNumber} objective unavailable.`),
    phase_week_context: `Phase ${weekModel.phase_number || 1} (${phaseName}), Week ${weekNumber} of 36.`,
    week_purpose: String(authored?.week_purpose || `This week strengthens ${targetTraits.join(" + ") || "core developmental traits"} through repeatable parent-guided sessions.`),
    weekly_goals: [
      `Complete the core session flow at least 2 times this week using ${activityLabel || "the guided core activity"}.`,
      `Use ${stretchLabel || "the stretch challenge"} once after the core routine feels stable.`,
      `Capture one reflection and one parent observation before week close.`,
    ],
    content_blocks: {
      core_activity: activityLabel || "Core activity not mapped",
      stretch_challenge: stretchLabel || "Stretch challenge not mapped",
      reflection_loop: reflectionLabel || "Reflection loop not mapped",
      observation_entry: observationLabel || "Observation entry not mapped",
      optional_support_action: supportActionLabel,
    },
    parent_guidance: Array.isArray(authored?.parent_guidance) ? [...authored.parent_guidance] : [
      `Prepare materials before session start and set a predictable time window.`,
      `Name the target traits (${targetTraits.join(", ") || "current targets"}) before beginning.`,
      `Use brief coaching language and keep sessions short enough for consistency.`,
    ],
    parent_guidance_setup: `Set up ${activityLabel || "the core activity"} and cue ${targetTraits.join(" + ") || "current trait targets"} before the session.`,
    current_activity_session_plan: `Run ${activityLabel || "the core activity"}, then apply ${stretchLabel || "a stretch challenge"} to build week momentum.`,
    reflection_checkin_support: `Close with ${reflectionLabel || "a reflection loop"}, capture ${observationLabel || "an observation"}, and apply ${supportActionLabel}.`,
    session_flow: stepSequence.map((step) => ({
      step_key: step.step_key,
      step: step.label,
      detail: step.step_key === "core_activity"
        ? `Run ${activityLabel || "core activity"} and capture one quick win.`
        : step.step_key === "stretch_challenge"
          ? `Use ${stretchLabel || "stretch challenge"} for transfer and resilience practice.`
          : step.step_key === "reflection_checkin"
            ? `Prompt ${reflectionLabel || "reflection loop"} and ask child what changed.`
            : `Record ${observationLabel || "observation note"} and schedule ${supportActionLabel}.`,
    })),
    observation_support_area: `Observation focus: ${observationLabel || "Parent observation note"}. Support action: ${supportActionLabel}.`,
    parent_prompts: {
      reflection_prompt: String(authored?.reflection_prompt || "What helped your child improve this week?"),
      observation_prompt: String(authored?.observation_prompt || "What support pattern did you notice this week?"),
    },
    completion_labels: authored?.completion_labels || null,
    progression_labels: authored?.progression_labels || null,
    content_audit: auditWeeklyContentSources(),
    activity_bank_surface: activitySurface,
    bank_depth_audit: auditActivityBankDepth(activitySurface),
    planner_setup_required: !setupComplete,
    commitment_setup_status: setupComplete ? "complete" : "required",
    commitment_plan: commitment,
    scheduled_sessions: plannedSessions,
    planner_surface_state: plannerSurfaceState,
    lesson_plan_template: sessionTemplate,
    accountability: planningState.accountability || null,
    progress: {
      current_week: weekNumber,
      total_weeks: 36,
      percent_complete: progressPercent,
      completion_status: weekNumber <= 1 ? "starting" : "in_progress",
      completed_weeks_estimate: Math.max(0, weekNumber - 1),
    },
    roadmap: buildRoadmap(weekNumber),
    next_action: String(bridgeState.next_recommended_action || `Continue Week ${weekNumber}`),
  };
}

function buildProgramWeekContentState({ bridgeState, childId, childProfiles, executionState = null, planningState = null }) {
  if (!childId) {
    const options = Array.isArray(childProfiles) ? childProfiles : [];
    const multiple = options.length > 1;
    return {
      ok: true,
      state: "child_scope_required",
      state_label: multiple ? "Choose a child to continue" : "Child scope required",
      messages: multiple
        ? ["Multiple child profiles detected. Select the child to open the current week content."]
        : ["Child scope is required before week content can be loaded."],
      child_scope_options: options.map((entry) => ({
        child_id: entry.child_id || null,
        child_name: entry.child_name || null,
      })),
      next_action: "Select a child in Parent Dashboard, then continue.",
      parent_program_state: {
        child_scope: {
          required: true,
          selected_child_id: null,
        },
        program_status: "setup_required",
        current_week: null,
        next_action: "Select child scope",
        blocked_reason: "child_scope_required",
        cta: null,
      },
    };
  }
  if (!bridgeState || bridgeState.ok !== true) {
    return {
      ok: true,
      state: "bridge_unavailable",
      state_label: "Program state unavailable",
      messages: ["Program bridge state could not be resolved for this child."],
      next_action: "Return to Parent Dashboard and retry.",
      parent_program_state: {
        child_scope: {
          required: true,
          selected_child_id: childId,
        },
        program_status: "unknown",
        current_week: null,
        next_action: "Return to Parent Dashboard",
        blocked_reason: "program_bridge_unavailable",
        cta: {
          label: CANONICAL_CTA_LABELS.returnToDashboard,
          href: `${CANONICAL_PARENT_ROUTES.dashboard}?child_id=${encodeURIComponent(childId)}`,
          action: "return_to_dashboard",
        },
      },
    };
  }
  if (bridgeState.setup_needed === true || bridgeState.launch_allowed !== true) {
    return {
      ok: true,
      state: "setup_incomplete",
      state_label: "Setup incomplete",
      messages: ["Program setup is incomplete. Week content will appear after setup is complete."],
      next_action: String(bridgeState.next_recommended_action || "Complete setup"),
      parent_program_state: {
        child_scope: {
          required: true,
          selected_child_id: childId,
        },
        program_status: "setup_required",
        current_week: null,
        next_action: String(bridgeState.next_recommended_action || "Complete setup"),
        blocked_reason: String(bridgeState.reason || "setup_incomplete"),
        cta: bridgeState.cta || null,
      },
    };
  }
  if (bridgeState.has_enrollment !== true) {
    return {
      ok: true,
      state: "no_enrollment_found",
      state_label: "Enrollment not started",
      messages: ["No active enrollment found for this child. Start the program to unlock Week 1 content."],
      next_action: String(bridgeState.next_recommended_action || "Begin Week 1"),
      parent_program_state: {
        child_scope: {
          required: true,
          selected_child_id: childId,
        },
        program_status: "not_started",
        current_week: 1,
        next_action: String(bridgeState.next_recommended_action || "Start Program"),
        blocked_reason: "enrollment_missing",
        cta: bridgeState.cta || null,
      },
    };
  }
  const currentWeek = Math.max(1, Math.min(36, Number(bridgeState.current_week) || 1));
  const weekModel = PROGRAM_WEEKS.find((entry) => Number(entry.week_number) === currentWeek);
  if (!weekModel) {
    return {
      ok: true,
      state: "week_content_missing",
      state_label: "Current week content missing",
      messages: [`No rail definition was found for week ${currentWeek}.`],
      next_action: "Contact support to restore week contract wiring.",
      parent_program_state: {
        child_scope: {
          required: true,
          selected_child_id: childId,
        },
        program_status: "active",
        current_week: currentWeek,
        next_action: "Contact support",
        blocked_reason: "week_content_missing",
        cta: {
          label: CANONICAL_CTA_LABELS.returnToDashboard,
          href: `${CANONICAL_PARENT_ROUTES.dashboard}?child_id=${encodeURIComponent(childId)}`,
          action: "return_to_dashboard",
        },
      },
    };
  }
  const normalizedExecutionState = normalizeExecutionState(executionState || defaultExecutionState(), currentWeek);
  const bridgeParentState = bridgeState.parent_program_state && typeof bridgeState.parent_program_state === "object"
    ? bridgeState.parent_program_state
    : {};
  return {
    ok: true,
    state: "content_ready",
    state_label: "Week content ready",
    child_id: childId,
    current_week: currentWeek,
    week_content: buildWeekContentFromRail(weekModel, bridgeState, planningState || {}),
    execution_state: normalizedExecutionState,
    execution_contract: {
      allowed_actions: WEEKLY_EXECUTION_ACTIONS,
      child_scope_required: true,
      week_scope_required: true,
      note_required_actions: ["save_reflection", "save_observation"],
      step_required_action: "mark_step_complete",
    },
    next_action: String(bridgeState.next_recommended_action || `Continue Week ${currentWeek}`),
    parent_program_state: {
      child_scope: bridgeParentState.child_scope || {
        required: true,
        selected_child_id: childId,
      },
      program_status: String(bridgeState.program_status || "active"),
      current_phase_name: bridgeState.current_phase_name || null,
      current_week: currentWeek,
      next_action: String(bridgeState.next_recommended_action || `Continue Week ${currentWeek}`),
      blocked_reason: normalizedExecutionState.blocked_reason || null,
      cta: bridgeParentState.cta || bridgeState.cta || null,
      weekly_execution: {
        week_status: normalizedExecutionState.week_status,
        active_step_key: normalizedExecutionState.active_step_key,
        blocked_reason: normalizedExecutionState.blocked_reason || null,
      },
    },
  };
}

function renderYouthDevelopmentIntakeTestPage() {
  const fixture = JSON.stringify(INTAKE_TEST_FIXTURE, null, 2);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Youth Development Intake Test (Internal)</title>
    <style>
      :root {
        --bg: #030712;
        --panel: linear-gradient(150deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.88));
        --line: rgba(148, 163, 184, 0.38);
        --text: #e2e8f0;
        --muted: #94a3b8;
      }
      * { box-sizing: border-box; }
      body {
        font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif;
        margin: 0;
        padding: 18px;
        background: radial-gradient(circle at 5% 0%, #111827, #020617 60%);
        color: var(--text);
      }
      main { max-width: 1180px; margin: 0 auto; display: grid; gap: 12px; }
      section { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px; }
      .intro-header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: flex-start; }
      .preview-banner { font-weight: 700; color: #fed7aa; background: rgba(124, 45, 18, 0.35); border: 1px solid rgba(251, 146, 60, 0.45); border-radius: 999px; padding: 6px 10px; font-size: 12px; display: inline-block; }
      .status-ok { color: #4ade80; font-weight: 700; }
      .status-bad { color: #fca5a5; font-weight: 700; }
      textarea { width: 100%; min-height: 280px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; border-radius: 8px; border: 1px solid var(--line); background: rgba(2, 6, 23, 0.8); color: #dbeafe; padding: 10px; }
      button { border: 1px solid #22d3ee; background: linear-gradient(120deg, #0f172a, #1e293b); color: #f8fafc; border-radius: 999px; padding: 9px 14px; font-size: 13px; cursor: pointer; }
      button:hover { filter: brightness(1.08); }
      code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      pre { white-space: pre-wrap; overflow-wrap: anywhere; border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: rgba(2, 6, 23, 0.75); color: #bfdbfe; }
      .warn-list { color: #fdba74; }
      .err-list { color: #fca5a5; font-weight: 600; }
      .summary-grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid var(--line); padding: 6px; text-align: left; }
      .toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
      .preset-btn { background: rgba(15, 23, 42, 0.9); border-color: #64748b; }
      .status-panel { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
      .status-code { font-size: 32px; font-weight: 800; }
      .status-label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
      .status-note { color: #cbd5e1; font-size: 13px; }
      .callout-grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
      .callout { border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: rgba(15, 23, 42, 0.65); }
      .callout h4 { margin: 0 0 8px 0; font-size: 14px; }
      .trait-summary { border: 1px solid rgba(56, 189, 248, 0.5); background: rgba(12, 74, 110, 0.35); border-radius: 8px; padding: 10px; }
      .trait-summary h3 { margin: 0 0 8px 0; font-size: 15px; }
      .trait-summary p { margin: 4px 0; }
      .quick-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 8px; }
      .qa-card { border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: rgba(2, 6, 23, 0.5); }
      .qa-card h3 { margin: 0 0 6px 0; font-size: 14px; }
      .qa-card p { margin: 0; font-size: 13px; color: #cbd5e1; }
      .consent-wrap { display: grid; gap: 10px; border: 1px solid rgba(34, 211, 238, 0.45); border-radius: 10px; background: rgba(2, 132, 199, 0.12); padding: 12px; }
      .consent-row { display: flex; gap: 10px; align-items: flex-start; }
      .consent-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .consent-status { color: #cbd5e1; min-height: 18px; }
    </style>
  </head>
  <body>
    <style>
      body.youth-scene {
        background-image: linear-gradient(180deg,rgba(3,10,17,.68),rgba(3,10,17,.88)),var(--youth-scene-url) !important;
        background-size: cover !important;
        background-position: center top !important;
        background-attachment: fixed !important;
      }
      body.youth-scene .panel { backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
    </style>
    <script>
      (function(){
        const scenes=[
          '/adinkra-library/0DFE3FAC-312A-4FC0-BD75-A74D75470324.png',
          '/adinkra-library/7CEF4610-7396-4594-A483-D19976817873.png',
          '/adinkra-library/EC9A9306-4483-41A2-BD77-73ACEBDE601C.png'
        ];
        let i=0;
        try { i=(Number(sessionStorage.getItem('youthSceneIndex')||'-1')+1)%scenes.length;sessionStorage.setItem('youthSceneIndex',String(i)); }
        catch (_) { i=Math.floor(Math.random()*scenes.length); }
        document.body.classList.add('youth-scene');
        document.body.style.setProperty('--youth-scene-url','url("'+scenes[i]+'")');
      })();
    </script>
    <main>
      <section>
        <div class="intro-header">
          <div>
            <p class="preview-banner">Internal / preview / test-only UI. Not a production user flow.</p>
            <h1>Youth Development Intake Test Runner</h1>
            <p>Endpoint: <code id="endpointLabel">/api/youth-development/intake/task-session</code></p>
          </div>
          <div class="quick-actions" aria-label="dashboard quick actions">
            <div class="qa-card"><h3>One-click verify</h3><p>Use preset payloads and run tests without leaving this page.</p></div>
            <div class="qa-card"><h3>Visible confidence</h3><p>Track warnings, low-confidence counts, and trait trends immediately.</p></div>
          </div>
        </div>
      </section>

      <section>
        <div class="consent-wrap">
          <h2>Permission required before test start</h2>
          <p>This internal runner processes youth-development test payloads. Confirm permission before starting a run.</p>
          <label class="consent-row">
            <input id="consentCheck" type="checkbox" />
            <span>I have permission to run this youth-development test payload.</span>
          </label>
          <div class="consent-actions">
            <button id="consentAcceptButton" type="button">Accept and continue</button>
            <button id="consentDeclineButton" type="button" class="preset-btn">Decline</button>
          </div>
          <div id="consentStatus" class="consent-status" aria-live="polite">Permission is required before starting tests.</div>
        </div>
      </section>

      <section>
        <h2>Payload editor</h2>
        <p>Default payload is prefilled from the known-good fixture used in youth intake tests.</p>
        <div class="toolbar">
          <button id="presetStrongButton" class="preset-btn" type="button">Load preset: strong / high-confidence</button>
          <button id="presetSupportButton" class="preset-btn" type="button">Load preset: support-needed</button>
          <button id="presetLowConfidenceButton" class="preset-btn" type="button">Load preset: low-confidence</button>
          <button id="resetPayloadButton" class="preset-btn" type="button">Reset to known-good payload</button>
        </div>
        <textarea id="payloadEditor" aria-label="Task session payload">${fixture}</textarea>
        <p><button id="runTestButton" type="button">Run Test</button></p>
      </section>

      <section>
        <h2>Response summary</h2>
        <div class="status-panel">
          <div>
            <div class="status-label">HTTP status</div>
            <div id="statusText" class="status-code">not run</div>
          </div>
          <div id="statusNote" class="status-note">Awaiting request.</div>
        </div>
        <div class="summary-grid">
          <div><strong>Mode:</strong> <span id="modeText">-</span></div>
          <div><strong>Processed signals:</strong> <span id="signalCountText">-</span></div>
        </div>
        <div id="traitSummaryBlock" class="trait-summary">
          <h3>Trait summary (compact)</h3>
          <p><strong>Total rows:</strong> <span id="traitSummaryCount">0</span></p>
          <p><strong>Top trait:</strong> <span id="traitSummaryTop">-</span></p>
          <p><strong>Low-confidence rows (&lt;60):</strong> <span id="traitSummaryLowConfidence">0</span></p>
        </div>
        <div class="callout-grid">
          <div class="callout">
            <h4>Validation errors</h4>
            <ul id="validationErrors" class="err-list"><li>none</li></ul>
          </div>
          <div class="callout">
            <h4>Warnings / low-confidence notices</h4>
            <ul id="warningsList" class="warn-list"><li>none</li></ul>
          </div>
        </div>
      </section>

      <section>
        <h2>Trait rows</h2>
        <table>
          <thead>
            <tr>
              <th>Trait</th>
              <th>Current</th>
              <th>Change</th>
              <th>Confidence</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody id="traitRows"><tr><td colspan="5">none</td></tr></tbody>
        </table>
      </section>

      <section>
        <h2>Dashboard summary</h2>
        <pre id="dashboardSummary">not run</pre>
      </section>

      <section>
        <h2>Page-model summary</h2>
        <pre id="pageModelSummary">not run</pre>
      </section>

      <section>
        <h2>Debug output</h2>
        <details open>
          <summary>Raw JSON response (expand/collapse)</summary>
          <pre id="rawJson">not run</pre>
        </details>
      </section>
    </main>
    <script>
      (function () {
        const endpoint = "/api/youth-development/intake/task-session";
        const knownGoodPayload = ${fixture};
        const presetPayloads = {
          strong: {
            ...knownGoodPayload,
            session_id: "session-strong",
            task_results: [
              {
                ...knownGoodPayload.task_results[0],
                raw_input: {
                  ...knownGoodPayload.task_results[0].raw_input,
                  metrics: {
                    inquiry_depth: 4,
                    justification_quality: 4,
                    decision_quality: 4,
                  },
                },
              },
            ],
          },
          support: {
            ...knownGoodPayload,
            session_id: "session-support",
            task_results: [
              {
                ...knownGoodPayload.task_results[0],
                raw_input: {
                  ...knownGoodPayload.task_results[0].raw_input,
                  metrics: {
                    inquiry_depth: 1,
                    justification_quality: 1,
                    decision_quality: 1,
                  },
                },
              },
            ],
          },
          lowConfidence: {
            ...knownGoodPayload,
            session_id: "session-low-confidence",
            task_results: [
              {
                ...knownGoodPayload.task_results[0],
                raw_input: {
                  ...knownGoodPayload.task_results[0].raw_input,
                  metrics: {
                    inquiry_depth: 2,
                    justification_quality: 2,
                    decision_quality: 2,
                  },
                },
              },
            ],
          },
        };
        const runBtn = document.getElementById("runTestButton");
        const presetStrongButton = document.getElementById("presetStrongButton");
        const presetSupportButton = document.getElementById("presetSupportButton");
        const presetLowConfidenceButton = document.getElementById("presetLowConfidenceButton");
        const resetPayloadButton = document.getElementById("resetPayloadButton");
        const consentCheck = document.getElementById("consentCheck");
        const consentAcceptButton = document.getElementById("consentAcceptButton");
        const consentDeclineButton = document.getElementById("consentDeclineButton");
        const consentStatus = document.getElementById("consentStatus");
        const payloadEditor = document.getElementById("payloadEditor");
        const statusText = document.getElementById("statusText");
        const statusNote = document.getElementById("statusNote");
        const modeText = document.getElementById("modeText");
        const signalCountText = document.getElementById("signalCountText");
        const traitSummaryCount = document.getElementById("traitSummaryCount");
        const traitSummaryTop = document.getElementById("traitSummaryTop");
        const traitSummaryLowConfidence = document.getElementById("traitSummaryLowConfidence");
        const validationErrors = document.getElementById("validationErrors");
        const warningsList = document.getElementById("warningsList");
        const traitRows = document.getElementById("traitRows");
        const dashboardSummary = document.getElementById("dashboardSummary");
        const pageModelSummary = document.getElementById("pageModelSummary");
        const rawJson = document.getElementById("rawJson");
        let permissionAccepted = false;

        function setTestingEnabled(enabled) {
          permissionAccepted = enabled === true;
          [runBtn, presetStrongButton, presetSupportButton, presetLowConfidenceButton, resetPayloadButton, payloadEditor]
            .forEach((node) => {
              if (!node) return;
              node.disabled = !permissionAccepted;
            });
        }

        function resetList(container, values) {
          container.textContent = "";
          const entries = Array.isArray(values) ? values.filter(Boolean) : [];
          if (!entries.length) {
            const li = document.createElement("li");
            li.textContent = "none";
            container.appendChild(li);
            return;
          }
          entries.forEach((value) => {
            const li = document.createElement("li");
            li.textContent = String(value);
            container.appendChild(li);
          });
        }

        function renderTraitRows(rows) {
          traitRows.textContent = "";
          const sortedRows = Array.isArray(rows)
            ? rows.slice().sort((a, b) => String(a?.trait_code || "").localeCompare(String(b?.trait_code || "")))
            : [];
          if (!sortedRows.length) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.setAttribute("colspan", "5");
            td.textContent = "none";
            tr.appendChild(td);
            traitRows.appendChild(tr);
            return;
          }

          sortedRows.forEach((row) => {
            const tr = document.createElement("tr");
            [row?.trait_code, row?.current_score, row?.change_score, row?.confidence_score, row?.trend_direction].forEach((value) => {
              const td = document.createElement("td");
              td.textContent = String(value ?? "");
              tr.appendChild(td);
            });
            traitRows.appendChild(tr);
          });
        }

        function renderTraitSummary(rows) {
          const normalized = Array.isArray(rows) ? rows.slice() : [];
          traitSummaryCount.textContent = String(normalized.length);
          if (!normalized.length) {
            traitSummaryTop.textContent = "-";
            traitSummaryLowConfidence.textContent = "0";
            return;
          }

          const sortedByScore = normalized
            .filter((row) => typeof row?.current_score === "number")
            .sort((a, b) => b.current_score - a.current_score);
          const top = sortedByScore[0];
          traitSummaryTop.textContent = top
            ? String(top.trait_code) + " (" + String(top.current_score) + ")"
            : "-";
          const lowConfidenceCount = normalized.filter((row) => Number(row?.confidence_score) < 60).length;
          traitSummaryLowConfidence.textContent = String(lowConfidenceCount);
        }

        function renderSummaries(payload) {
          const dashboard = payload?.dashboard || {};
          const pageModel = payload?.page_model || {};

          const dashboardView = {
            high_priority_traits: dashboard.high_priority_traits || [],
            strengths_count: Array.isArray(dashboard.strengths) ? dashboard.strengths.length : 0,
            support_count: Array.isArray(dashboard.support_next) ? dashboard.support_next.length : 0,
            low_confidence_flags: dashboard.low_confidence_flags || [],
          };
          dashboardSummary.textContent = JSON.stringify(dashboardView, null, 2);

          const pageModelView = {
            page_title: pageModel.page_title || null,
            page_subtitle: pageModel.page_subtitle || null,
            section_order: pageModel.rendering_safety?.section_order || [],
            support_items: pageModel.support?.items || [],
          };
          pageModelSummary.textContent = JSON.stringify(pageModelView, null, 2);
        }

        async function runTest() {
          if (!permissionAccepted) {
            statusText.textContent = "permission required";
            statusText.className = "status-bad";
            statusNote.textContent = "Accept permission before starting the test.";
            if (consentStatus) consentStatus.textContent = "Permission is required before starting tests.";
            return;
          }
          statusText.textContent = "running...";
          statusText.className = "";
          statusNote.textContent = "Submitting to intake endpoint...";
          let payload = null;
          try {
            payload = JSON.parse(payloadEditor.value);
          } catch (err) {
            statusText.textContent = "invalid JSON in payload editor";
            statusText.className = "status-bad";
            statusNote.textContent = "Fix JSON before running.";
            resetList(validationErrors, [String(err && err.message ? err.message : err)]);
            return;
          }

          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const responseText = await response.text();
          let data = null;
          try {
            data = JSON.parse(responseText);
          } catch (_) {
            data = { parse_error: "Response was not valid JSON", raw: responseText };
          }

          statusText.textContent = String(response.status);
          statusText.className = response.ok ? "status-ok" : "status-bad";
          statusNote.textContent = response.ok
            ? "Request succeeded."
            : "Request failed. Check errors/warnings below.";
          modeText.textContent = String(data?.mode || "-");
          signalCountText.textContent = String(data?.processed_signal_count ?? "-");
          resetList(validationErrors, data?.validation_errors || []);
          resetList(warningsList, data?.warnings || []);
          renderTraitRows(data?.aggregated_trait_rows || []);
          renderTraitSummary(data?.aggregated_trait_rows || []);
          renderSummaries(data || {});
          rawJson.textContent = JSON.stringify(data, null, 2);
        }

        function setPayload(value) {
          payloadEditor.value = JSON.stringify(value, null, 2);
        }

        setTestingEnabled(false);
        consentAcceptButton.addEventListener("click", () => {
          if (!consentCheck.checked) {
            consentStatus.textContent = "Please accept permission to continue.";
            return;
          }
          setTestingEnabled(true);
          consentStatus.textContent = "Permission accepted. You can now run tests.";
        });
        consentDeclineButton.addEventListener("click", () => {
          consentCheck.checked = false;
          setTestingEnabled(false);
          consentStatus.textContent = "Permission declined. Testing remains locked.";
        });

        presetStrongButton.addEventListener("click", () => setPayload(presetPayloads.strong));
        presetSupportButton.addEventListener("click", () => setPayload(presetPayloads.support));
        presetLowConfidenceButton.addEventListener("click", () => setPayload(presetPayloads.lowConfidence));
        resetPayloadButton.addEventListener("click", () => setPayload(knownGoodPayload));

        runBtn.addEventListener("click", () => {
          runTest().catch((err) => {
            statusText.textContent = "request failed";
            statusText.className = "status-bad";
            statusNote.textContent = "Network/request failure before JSON response.";
            resetList(validationErrors, [String(err && err.message ? err.message : err)]);
          });
        });
      }());
    </script>
  </body>
</html>`;
}

function renderLiveYouthAssessmentPage() {
  const answerScale = JSON.stringify(YOUTH_ANSWER_SCALE);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Youth Talent Development Intake — Parent Observation Screener v1</title>
    <style>
      :root { --bg: #f8fafc; --card: #ffffff; --line: #cbd5e1; --text: #0f172a; --muted: #475569; --brand: #0f766e; }
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 24px; }
      main { max-width: 760px; margin: 0 auto; display: grid; gap: 14px; }
      section { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
      .tag { font-size: 12px; color: #115e59; background: #ccfbf1; border-radius: 999px; padding: 4px 8px; display: inline-block; margin-bottom: 8px; }
      .muted { color: var(--muted); }
      .options { display: grid; gap: 8px; margin-top: 12px; }
      button.answer { text-align: left; border: 1px solid var(--line); border-radius: 10px; padding: 12px; background: #f8fafc; cursor: pointer; }
      button.answer:hover { border-color: var(--brand); }
      .row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
      .controls { display: flex; gap: 8px; flex-wrap: wrap; }
      .controls button { border: 1px solid #0f766e; background: #f0fdfa; border-radius: 999px; padding: 8px 12px; cursor: pointer; }
      .result-card { border: 1px solid var(--line); border-radius: 10px; padding: 12px; background: #f8fafc; }
      .pill { display: inline-block; border: 1px solid #99f6e4; background: #ecfeff; border-radius: 999px; padding: 3px 8px; margin: 3px 4px 3px 0; font-size: 12px; }
    </style>
  </head>
  <body>
    <style>
      body.youth-scene {
        background-image: linear-gradient(180deg,rgba(3,10,17,.68),rgba(3,10,17,.88)),var(--youth-scene-url) !important;
        background-size: cover !important;
        background-position: center top !important;
        background-attachment: fixed !important;
      }
      body.youth-scene .panel { backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
    </style>
    <script>
      (function(){
        const scenes=[
          '/adinkra-library/0DFE3FAC-312A-4FC0-BD75-A74D75470324.png',
          '/adinkra-library/7CEF4610-7396-4594-A483-D19976817873.png',
          '/adinkra-library/EC9A9306-4483-41A2-BD77-73ACEBDE601C.png'
        ];
        let i=0;
        try { i=(Number(sessionStorage.getItem('youthSceneIndex')||'-1')+1)%scenes.length;sessionStorage.setItem('youthSceneIndex',String(i)); }
        catch (_) { i=Math.floor(Math.random()*scenes.length); }
        document.body.classList.add('youth-scene');
        document.body.style.setProperty('--youth-scene-url','url("'+scenes[i]+'")');
      })();
    </script>
    <main>
      <section>
        <p class="tag">First live bank • Parent observation • Provisional trait signals only</p>
        <h1>Youth Talent Development Intake — Parent Observation Screener v1</h1>
        <p>${YOUTH_PARENT_INSTRUCTIONS}</p>
        <p class="muted">This screener is evidence-informed and designed for developmental support. It is not a validated diagnostic tool and does not predict future success.</p>
        <div class="options" style="margin-top:12px;">
          <label>Child name (recommended for child-scoped loading)<br /><input id="childNameInput" type="text" placeholder="e.g. Maya" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;" /></label>
          <label>Child age band (optional)<br /><input id="childAgeBandInput" type="text" placeholder="e.g. 8-10" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;" /></label>
          <label>Child grade band (optional)<br /><input id="childGradeBandInput" type="text" placeholder="e.g. Grade 3-4" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;" /></label>
        </div>
      </section>
      <section>
        <div class="row"><strong id="progressLabel">Question 1 of 25</strong><span id="completionLabel" class="muted">0% complete</span></div>
        <h2 id="prompt">Loading assessment…</h2>
        <div id="options" class="options"></div>
        <p id="intakeStatus" class="muted" aria-live="polite">Answer the intake questions, then submit.</p>
        <div class="controls">
          <button id="prevBtn" type="button">Previous</button>
          <button id="nextBtn" type="button">Next</button>
          <button id="submitBtn" type="button">Submit assessment</button>
        </div>
      </section>
      <section>
        <h2>Assessment submitted</h2>
        <div id="resultCard" class="result-card">
          <p class="muted">Complete the intake and submit to generate a parent-facing dashboard.</p>
        </div>
        <div class="controls" style="margin-top:10px;">
          <a id="openLiveDashboardBtn" href="/youth-development/parent-dashboard" style="display:none;border:1px solid #0f766e;background:#0f766e;color:#fff;border-radius:999px;padding:8px 12px;text-decoration:none;">View Dashboard</a>
          <a id="startProgramBtn" href="/youth-development/program" style="display:none;border:1px solid #1d4ed8;background:#1d4ed8;color:#fff;border-radius:999px;padding:8px 12px;text-decoration:none;">Start Program</a>
        </div>
      </section>
    </main>
    <script>
      (async function () {
        const answerScale = ${answerScale};
        const progressLabel = document.getElementById("progressLabel");
        const completionLabel = document.getElementById("completionLabel");
        const promptEl = document.getElementById("prompt");
        const optionsEl = document.getElementById("options");
        const intakeStatus = document.getElementById("intakeStatus");
        const resultCard = document.getElementById("resultCard");
        const openLiveDashboardBtn = document.getElementById("openLiveDashboardBtn");
        const startProgramBtn = document.getElementById("startProgramBtn");
        const state = { questions: [], index: 0, answers: {} };
        const query = new URLSearchParams(window.location.search);
        const accountCtx = {
          tenant: (query.get("tenant") || "").trim(),
          email: (query.get("email") || "").trim().toLowerCase(),
          name: (query.get("name") || "").trim(),
          cid: (query.get("cid") || "").trim(),
          crid: (query.get("crid") || query.get("rid") || "").trim(),
          child_id: (query.get("child_id") || query.get("childId") || "").trim(),
        };
        function applyScopedChildNavigation(scopedChildId, sourceLabel) {
          const childId = String(scopedChildId || "").trim();
          if (childId) accountCtx.child_id = childId;
          if (!(accountCtx.tenant || accountCtx.email)) return;
          const dashUrl = new URL("/youth-development/parent-dashboard", window.location.origin);
          Object.entries(accountCtx).forEach(([key, value]) => { if (value) dashUrl.searchParams.set(key, value); });
          if (!accountCtx.child_id) dashUrl.searchParams.delete("child_id");
          openLiveDashboardBtn.href = dashUrl.pathname + dashUrl.search;
          const programUrl = new URL("/youth-development/program", window.location.origin);
          Object.entries(accountCtx).forEach(([key, value]) => { if (value) programUrl.searchParams.set(key, value); });
          if (!accountCtx.child_id) programUrl.searchParams.delete("child_id");
          startProgramBtn.href = programUrl.pathname + programUrl.search;
          if (accountCtx.child_id) {
            console.info("youth_assessment_client_child_scope_adopted", {
              source: String(sourceLabel || "unknown"),
              adopted_child_id: accountCtx.child_id,
            });
          }
        }
        if (accountCtx.tenant || accountCtx.email) {
          applyScopedChildNavigation(accountCtx.child_id || "", "query");
        }

        function persistLatestContinuitySnapshot(payload) {
          try {
            const scopedChildId = String((payload?.ownership?.child_profile?.child_id || payload?.child_id || "")).trim();
            const snapshot = {
              saved_child_id: scopedChildId || null,
              submission_id: payload?.ownership?.submission_id || null,
              saved_at: payload?.ownership?.saved_at || payload?.saved_at || null,
            };
            sessionStorage.setItem("youthDevelopmentLatestAssessment", JSON.stringify(payload));
            sessionStorage.setItem("youthDevelopmentLatestContinuity", JSON.stringify(snapshot));
          } catch (_err) {}
        }

        const questionResponse = await fetch("/api/youth-development/questions");
        const questionPayload = await questionResponse.json();
        state.questions = Array.isArray(questionPayload.questions) ? questionPayload.questions : [];

        function renderQuestion() {
          const current = state.questions[state.index];
          if (!current) return;
          progressLabel.textContent = "Question " + (state.index + 1) + " of " + state.questions.length;
          completionLabel.textContent = Math.round((Object.keys(state.answers).length / state.questions.length) * 100) + "% complete";
          promptEl.textContent = current.prompt;
          optionsEl.textContent = "";
          answerScale.forEach((option) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "answer";
            const selected = Number(state.answers[current.id]) === option.value;
            button.innerHTML = "<strong>" + option.value + ". " + option.label + "</strong>" + (selected ? " ✅" : "");
            button.addEventListener("click", () => {
              state.answers[current.id] = option.value;
              renderQuestion();
            });
            optionsEl.appendChild(button);
          });
        }

        document.getElementById("prevBtn").addEventListener("click", () => {
          state.index = Math.max(0, state.index - 1);
          renderQuestion();
        });
        document.getElementById("nextBtn").addEventListener("click", () => {
          state.index = Math.min(state.questions.length - 1, state.index + 1);
          renderQuestion();
        });
        document.getElementById("submitBtn").addEventListener("click", async () => {
          const answeredCount = Object.keys(state.answers).length;
          if (!answeredCount) {
            intakeStatus.textContent = "Please answer the intake questions before submitting.";
            resultCard.innerHTML = "<p><strong>Assessment not submitted.</strong></p><p class=\\"muted\\">Please answer the intake questions before submitting.</p>";
            openLiveDashboardBtn.style.display = "none";
            startProgramBtn.style.display = "none";
            return;
          }
          intakeStatus.textContent = "Submitting assessment...";
          const response = await fetch("/api/youth-development/assess", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              answers: state.answers,
              tenant: accountCtx.tenant || undefined,
              email: accountCtx.email || undefined,
              name: accountCtx.name || undefined,
              cid: accountCtx.cid || undefined,
              crid: accountCtx.crid || undefined,
              child_name: (document.getElementById("childNameInput") || {}).value || undefined,
              child_age_band: (document.getElementById("childAgeBandInput") || {}).value || undefined,
              child_grade_band: (document.getElementById("childGradeBandInput") || {}).value || undefined,
            }),
          });
          const payload = await response.json();
          if (!response.ok) {
            resultCard.innerHTML = "<p><strong>We could not submit this assessment.</strong></p><p class=\\"muted\\">" + String(payload.error || "Request failed") + "</p>";
            intakeStatus.textContent = String(payload.error || "Request failed");
            openLiveDashboardBtn.style.display = "none";
            startProgramBtn.style.display = "none";
            return;
          }
          persistLatestContinuitySnapshot(payload);
          const priorities = (payload.interpretation && payload.interpretation.priority_traits) || [];
          const highest = payload.interpretation && payload.interpretation.highest_trait;
          const completion = payload.completion && payload.completion.completion_rate_percent;
          const savedToAccount = Boolean(payload && payload.ownership && payload.ownership.account_bound);
          resultCard.innerHTML = [
            savedToAccount
              ? "<p><strong>Assessment complete.</strong> Your responses are now available in the live parent dashboard.</p>"
              : "<p><strong>Assessment scored but not saved.</strong> Sign in with tenant/email scope before continuing.</p>",
            savedToAccount
              ? "<p><strong>Saved to account:</strong> " + payload.ownership.email + "</p>"
              : "",
            payload.ownership && payload.ownership.child_profile && payload.ownership.child_profile.child_id
              ? "<p><strong>Child scope:</strong> " + (payload.ownership.child_profile.child_name || "Child") + " (" + payload.ownership.child_profile.child_id + ")</p>"
              : "<p class=\\"muted\\">Child identity is incomplete. Add child name to create a dedicated child scope.</p>",
            highest ? "<p><strong>Top current signal:</strong> " + highest.trait_name + " (" + Number(highest.current_score || 0).toFixed(1) + ")</p>" : "",
            "<p><strong>Completion:</strong> " + Number(completion || 0).toFixed(0) + "%</p>",
            priorities.length ? "<div>" + priorities.map((item) => "<span class=\\"pill\\">" + item.trait_name + " · " + Number(item.current_score || 0).toFixed(1) + "</span>").join("") + "</div>" : ""
          ].join("");
          intakeStatus.textContent = "Submitted " + payload.answers_count + " of " + payload.question_count + " answers.";
          openLiveDashboardBtn.style.display = savedToAccount ? "" : "none";
          const scopedChildId = ((((payload || {}).ownership || {}).child_profile || {}).child_id || "").trim();
          if (savedToAccount) {
            console.info("youth_assessment_client_save_response", {
              persisted_child_id: scopedChildId || null,
              submission_id: payload?.ownership?.submission_id || null,
            });
          }
          if (savedToAccount && scopedChildId) {
            applyScopedChildNavigation(scopedChildId, "assess_response");
            startProgramBtn.style.display = "";
          } else {
            startProgramBtn.style.display = "none";
          }
        });

        async function hydrateExistingAccountResult() {
          if (!accountCtx.tenant || !accountCtx.email) return;
          const endpoint = new URL("/api/youth-development/parent-dashboard/latest", window.location.origin);
          endpoint.searchParams.set("tenant", accountCtx.tenant);
          endpoint.searchParams.set("email", accountCtx.email);
          const response = await fetch(endpoint.pathname + endpoint.search);
          if (!response.ok) return;
          const latest = await response.json().catch(() => null);
          if (!latest || latest.ok !== true || latest.has_result !== true) return;
          const scopedChildId = String(latest.child_id || latest?.payload?.ownership?.child_profile?.child_id || "").trim();
          applyScopedChildNavigation(scopedChildId, "latest_lookup");
          resultCard.innerHTML = [
            "<p><strong>Existing saved youth assessment found.</strong></p>",
            "<p class=\\"muted\\">This signed-in account already has a saved result. You can reopen the parent dashboard now or retake the intake to refresh signals.</p>",
            "<p><strong>Saved account:</strong> " + accountCtx.email + "</p>"
          ].join("");
          openLiveDashboardBtn.style.display = "";
          openLiveDashboardBtn.textContent = "View Dashboard";
          startProgramBtn.style.display = "";
          const bridgeCtaLabel = latest && latest.payload && latest.payload.bridge && latest.payload.bridge.cta
            ? latest.payload.bridge.cta.label
            : "";
          startProgramBtn.textContent = String(bridgeCtaLabel || "Start Program");
        }

        renderQuestion();
        hydrateExistingAccountResult().catch(() => null);
      }());
    </script>
  </body>
</html>`;
}

function renderLiveYouthParentDashboardPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Youth Development Parent Dashboard</title>
    <style>
      :root {
        --bg: #080707;
        --panel: linear-gradient(145deg, rgba(8, 8, 7, 0.64), rgba(9, 34, 23, 0.55));
        --line: rgba(241, 196, 83, 0.62);
        --text: #fff8e8;
        --muted: #eadbc0;
        --accent: #e03131;
        --accent-2: #14964b;
        --gold: #f1c453;
        --good: #64d58a;
        --watch: #f1c453;
        --grow: #ff7a67;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at 5% 0%, rgba(214, 40, 40, 0.18), transparent 32%),
          radial-gradient(circle at 95% 12%, rgba(20, 150, 75, 0.18), transparent 35%),
          var(--bg);
        padding: 16px;
      }
      main { max-width: 880px; margin: 0 auto; display: grid; gap: 12px; }
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 20px;
        box-shadow: 0 16px 44px rgba(0, 0, 0, 0.32);
        backdrop-filter: blur(4px);
        padding: 18px;
      }
      .hero-title { margin: 0 0 8px; font-size: clamp(1.55rem, 4vw, 2.25rem); letter-spacing: -0.04em; }
      .hero-vision {
        min-height: min(78svh, 740px);
        position: relative;
        display: flex;
        align-items: flex-end;
        overflow: hidden;
        border: 1px solid rgba(241, 196, 83, 0.78);
        border-radius: 24px;
        box-shadow: 0 20px 55px rgba(0, 0, 0, 0.45);
      }
      .hero-vision-image { display: block; width: 100%; height: auto; object-fit: contain; }
      .hero-vision { display: block; min-height: 0; padding: 10px; background: #080c0a; }
      .hero-vision-content { position: absolute; inset: auto 10px 10px; text-align: center; }
      .hero-vision::after { inset: 10px; border-radius: 12px; }
      .hero-vision::after { content: ""; position: absolute; inset: 0; background: linear-gradient(0deg, rgba(5, 6, 4, 0.22) 0%, transparent 38%, rgba(5, 6, 4, 0.08) 100%); pointer-events: none; }
      .hero-vision-content { position: relative; z-index: 1; width: 100%; padding: 24px; background: none; } 
      .hero-date { display: inline-block; margin: 0; padding: 10px 16px; border: 1px solid rgba(241,196,83,.65); border-radius: 999px; background: rgba(5,8,5,.22); backdrop-filter: blur(3px); color: #fff8e8; font-size: clamp(1rem, 3vw, 1.25rem); font-weight: 700; text-shadow: 0 2px 7px rgba(0,0,0,.7); }
      .hero-kicker { margin: 0 0 8px; color: var(--gold); font-size: .78rem; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
      .muted { color: var(--muted); }
      .tiny { font-size: 12px; color: var(--muted); }
      .chip {
        display: inline-flex;
        align-items: center;
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
        margin-right: 6px;
        margin-bottom: 6px;
      }
      .grid { display: grid; gap: 10px; }
      .category-strip { grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)); }
      .genius-focus { background: rgba(5, 8, 5, 0.46); border: 1px solid rgba(241, 196, 83, 0.72); border-radius: 16px; padding: 16px; }
      .genius-focus h3 { margin: 0; font-size: 1.25rem; }
      .genius-focus .score { margin: 8px 0; font-size: 1.1rem; color: #fff2c2; }
      .genius-navigation { display: flex; justify-content: space-between; gap: 8px; margin-top: 14px; }
      .genius-navigation button { cursor: pointer; }
      .category-pill {
        border: 1px solid var(--line);
        border-radius: 12px;
        background: rgba(5, 8, 5, 0.44);
        padding: 10px;
      }
      .category-pill h3 { margin: 0 0 6px; font-size: 14px; line-height: 1.25; }
      .tech-tag { color: var(--muted); font-size: 11px; margin: 0; }
      .help-btn {
        width: 24px;
        height: 24px;
        border-radius: 999px;
        border: 1px solid rgba(241, 196, 83, 0.7);
        background: rgba(20, 150, 75, 0.48);
        color: #fff8e8;
        font-weight: 700;
        cursor: pointer;
      }
      .pill-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
      .cards { grid-template-columns: repeat(auto-fit, minmax(245px, 1fr)); }
      .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin: 10px 0; }
      .metric-card { border: 1px solid var(--line); border-radius: 12px; background: rgba(5, 8, 5, 0.44); padding: 10px; }
      .metric-card strong { display: block; font-size: 20px; color: #fff8e8; }
      .child-switcher { display: grid; gap: 8px; }
      .child-switcher-button {
        appearance: none;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: rgba(2, 6, 23, 0.52);
        color: var(--text);
        cursor: pointer;
        min-width: 150px;
        padding: 10px 12px;
        text-align: left;
      }
      .child-switcher-button:hover, .child-switcher-button:focus-visible { border-color: var(--accent); outline: none; }
      .child-switcher-button[aria-pressed="true"] { background: rgba(8, 145, 178, 0.28); border-color: var(--accent); }
      .child-switcher-button strong, .child-switcher-button span { display: block; }
      .child-switcher-button span { color: var(--muted); font-size: 12px; margin-top: 3px; }
      .child-select { width: 100%; border: 1px solid var(--gold); border-radius: 14px; background: rgba(5,8,5,.54); color: var(--text); padding: 12px; font: inherit; }
      .adaptive-table-wrap { overflow-x: auto; }
      .adaptive-table { width: 100%; border-collapse: collapse; min-width: 680px; }
      .adaptive-table th, .adaptive-table td { text-align: left; border-bottom: 1px solid var(--line); padding: 8px; vertical-align: top; }
      .adaptive-table th { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
      .activity-list { margin: 0; padding-left: 18px; display: grid; gap: 6px; }
      .learning-summary { display: grid; gap: 12px; }
      .learning-summary h3 { margin: 0; }
      .snapshot-card {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: rgba(5, 8, 5, 0.42);
        padding: 16px;
        display: grid;
        gap: 8px;
      }
      .snapshot-card p { line-height: 1.55; margin: 4px 0; }
      .snapshot-card .parent-next-step { border-top: 1px solid var(--line); margin-top: 8px; padding-top: 12px; }
      .developer-diagnostics { display: none; }
      .meter {
        height: 8px;
        border-radius: 999px;
        background: rgba(255, 248, 232, 0.22);
        overflow: hidden;
      }
      .meter > span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #d62828, #f1c453, #14964b);
      }
      .status-badge {
        display: inline-block;
        border-radius: 999px;
        border: 1px solid var(--line);
        padding: 3px 8px;
        font-size: 11px;
      }
      .status-strong { border-color: rgba(20, 150, 75, 0.9); color: #b9f5c9; }
      .status-watch { border-color: rgba(241, 196, 83, 0.9); color: #fff0ab; }
      .status-grow { border-color: rgba(214, 40, 40, 0.9); color: #ffd0c9; }
      .list { margin: 0; padding-left: 18px; display: grid; gap: 8px; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .btn {
        border: 1px solid transparent;
        border-radius: 999px;
        text-decoration: none;
        padding: 8px 12px;
        font-size: 14px;
      }
      .btn-primary { background: #c92424; color: #fff8e8; border-color: #f1c453; }
      .btn-secondary { background: rgba(20, 150, 75, 0.72); color: #fff8e8; border-color: rgba(241, 196, 83, 0.72); }
      .btn-ghost { background: rgba(5, 8, 5, 0.22); color: #fff0ab; border-color: rgba(241, 196, 83, 0.7); }
      .voice-controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 6px 0 10px; }
      .voice-controls [data-voice-action] { display: none; }
      .voice-btn { font-size: 12px; padding: 6px 10px; }
      dialog {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: #10120c;
        color: var(--text);
        max-width: 480px;
      }
      dialog::backdrop { background: rgba(8, 7, 7, 0.72); }
      @media (max-width: 640px) {
        body { padding: 12px; }
        .panel { padding: 16px; }
        .hero-vision { min-height: 0; border-radius: 20px; }
        .hero-vision-content { padding: 18px; }
        .cards { grid-template-columns: 1fr; }
        .category-strip { grid-template-columns: 1fr 1fr; }
      }
    </style>
  </head>
  <body>
    <style>
      body.youth-scene {
        background-image: linear-gradient(180deg,rgba(3,10,17,.68),rgba(3,10,17,.88)),var(--youth-scene-url) !important;
        background-size: cover !important;
        background-position: center top !important;
        background-attachment: fixed !important;
      }
      body.youth-scene .panel { backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
    </style>
    <script>
      (function(){
        const scenes=[
          '/adinkra-library/0DFE3FAC-312A-4FC0-BD75-A74D75470324.png',
          '/adinkra-library/7CEF4610-7396-4594-A483-D19976817873.png',
          '/adinkra-library/EC9A9306-4483-41A2-BD77-73ACEBDE601C.png'
        ];
        let i=0;
        try { i=(Number(sessionStorage.getItem('youthSceneIndex')||'-1')+1)%scenes.length;sessionStorage.setItem('youthSceneIndex',String(i)); }
        catch (_) { i=Math.floor(Math.random()*scenes.length); }
        document.body.classList.add('youth-scene');
        document.body.style.setProperty('--youth-scene-url','url("'+scenes[i]+'")');
      })();
    </script>
    <main>
      <section class="hero-vision" aria-label="Garvey Genius family artwork">
        <img class="hero-vision-image" src="/adinkra-library/51E31336-88D7-4ED1-8458-DD8E8949494A.png" alt="A future-focused African family looking toward a bright city" />
        <div class="hero-vision-content">
          <p class="hero-date" id="heroTodayDate" aria-label="Today's date"></p>
        </div>
      </section>
      <nav aria-label="Account" style="display:flex;justify-content:flex-end;align-items:center;gap:12px;margin:12px 0;">
        <a class="btn btn-secondary" href="/tutoring.html">Learning home</a>
        <button class="btn btn-secondary" id="parentDashboardSignOut" type="button">Sign out</button>
      </nav>
      <script>
        document.getElementById('parentDashboardSignOut').addEventListener('click', async function () {
          this.disabled = true;
          try {
            const response = await fetch('/api/gates/auth/signout', { method: 'POST', credentials: 'same-origin' });
            if (!response.ok) throw new Error('Sign out failed');
            sessionStorage.removeItem('youthDevelopmentLatestAssessment');
            location.assign('/tutoring.html');
          } catch (error) {
            this.disabled = false;
            alert('Sign out could not be confirmed. Please try again.');
          }
        });
      </script>
      <section class="panel" id="dashboardOverview">
        <p class="hero-kicker">Garvey Learning · Genius Path</p>
        <h1 id="heroTitle" class="hero-title">🌍 Youth Development Parent Dashboard</h1>
        <p id="heroSummary">Complete a youth assessment to see what your child currently shows and what helps next.</p>
        <p class="tiny">Designed for ages 6–11. Developmental snapshot only: this dashboard is provisional and should be reviewed as patterns over time.</p>
        <p class="tiny" id="completionDateLabel">Previous completion date: Not available yet.</p>
      </section>
      <script>
        document.getElementById('heroTodayDate').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
      </script>

      <section class="panel" id="childSwitcherPanel">
        <h2 style="margin-top:0;">👧🏾 Choose a child</h2>
        <p class="muted">Each child has a separate Genius snapshot, parent guidance, and adaptive-learning history.</p>
        <div id="childSwitcher" class="child-switcher" aria-label="Choose a child dashboard"></div>
      </section>

      <section class="panel" id="adaptiveLearningPanel">
        <h2>📚 Adaptive Learning</h2>
        <p id="adaptiveLearningStatus">Grade 1–6 school-skill lessons, practice, and growth snapshots.</p>
        <div class="actions">
          <a class="btn btn-secondary" id="openAdaptiveV2HubBtn" href="/youth-development/adaptive-learning">Open Adaptive V2 Lesson Hub</a>
        </div>
        <div id="adaptiveLearningSummary" class="adaptive-summary" aria-live="polite">
          <p class="muted">Select a child profile to load saved adaptive learning progress.</p>
        </div>
      </section>

      <section class="panel">
        <h2>✨ What we look at</h2>
        <p class="muted">Seven developmental categories are shown below. Tap <strong>?</strong> for plain-language definitions.</p>
        <div id="categoryStrip" class="grid category-strip"></div>
      </section>

      <section class="panel">
        <h2>🔎 Current Genius Insight</h2>
        <div class="voice-controls">
          <button class="btn btn-ghost voice-btn" type="button" data-voice-control="snapshotCards" data-voice-label="Snapshot cards">Read snapshot summary</button>
          <button class="btn btn-ghost voice-btn" type="button" data-voice-action="play" data-voice-scope="snapshotCards">Play</button>
          <button class="btn btn-ghost voice-btn" type="button" data-voice-action="pause" data-voice-scope="snapshotCards">Pause</button>
          <button class="btn btn-ghost voice-btn" type="button" data-voice-action="back10" data-voice-scope="snapshotCards">Back 10s</button>
          <button class="btn btn-ghost voice-btn" type="button" data-voice-action="forward10" data-voice-scope="snapshotCards">Forward 10s</button>
        </div>
        <p id="snapshotVoiceStatus" class="tiny muted">AI voice status checking…</p>
        <p id="dashboardVoiceDiagnostics" class="developer-diagnostics" aria-hidden="true"></p>
        <div id="snapshotCards" class="grid cards"></div>
      </section>

      <section class="panel">
        <h2>🌟 Top strengths</h2>
        <div class="voice-controls">
          <button class="btn btn-ghost voice-btn" type="button" data-voice-control="topStrengths" data-voice-label="Top strengths">Read this section</button>
          <button class="btn btn-ghost voice-btn" type="button" data-voice-action="play" data-voice-scope="topStrengths">Play</button>
          <button class="btn btn-ghost voice-btn" type="button" data-voice-action="pause" data-voice-scope="topStrengths">Pause</button>
          <button class="btn btn-ghost voice-btn" type="button" data-voice-action="back10" data-voice-scope="topStrengths">Back 10s</button>
          <button class="btn btn-ghost voice-btn" type="button" data-voice-action="forward10" data-voice-scope="topStrengths">Forward 10s</button>
          <span id="topStrengthsVoiceStatus" class="tiny muted">AI voice status checking…</span>
        </div>
        <ul id="topStrengths" class="list"><li class="muted">Complete an assessment to view strengths.</li></ul>
      </section>

      <section class="panel">
        <h2>🌱 Areas to strengthen</h2>
        <div class="voice-controls">
          <button class="btn btn-ghost voice-btn" type="button" data-voice-control="areasToStrengthen" data-voice-label="Areas to strengthen">Read this section</button>
          <button class="btn btn-ghost voice-btn" type="button" data-voice-action="play" data-voice-scope="areasToStrengthen">Play</button>
          <button class="btn btn-ghost voice-btn" type="button" data-voice-action="pause" data-voice-scope="areasToStrengthen">Pause</button>
          <button class="btn btn-ghost voice-btn" type="button" data-voice-action="back10" data-voice-scope="areasToStrengthen">Back 10s</button>
          <button class="btn btn-ghost voice-btn" type="button" data-voice-action="forward10" data-voice-scope="areasToStrengthen">Forward 10s</button>
          <span id="areasToStrengthenVoiceStatus" class="tiny muted">AI voice status checking…</span>
        </div>
        <ul id="areasToStrengthen" class="list"><li class="muted">Complete an assessment to view growth areas.</li></ul>
      </section>

      <section class="panel">
        <h2>🤝 How to support this week</h2>
        <div class="voice-controls">
          <button class="btn btn-ghost voice-btn" type="button" data-voice-control="weeklySupport" data-voice-label="How to support this week">Read this section</button>
          <button class="btn btn-ghost voice-btn" type="button" data-voice-action="play" data-voice-scope="weeklySupport">Play</button>
          <button class="btn btn-ghost voice-btn" type="button" data-voice-action="pause" data-voice-scope="weeklySupport">Pause</button>
          <button class="btn btn-ghost voice-btn" type="button" data-voice-action="back10" data-voice-scope="weeklySupport">Back 10s</button>
          <button class="btn btn-ghost voice-btn" type="button" data-voice-action="forward10" data-voice-scope="weeklySupport">Forward 10s</button>
          <span id="weeklySupportVoiceStatus" class="tiny muted">AI voice status checking…</span>
        </div>
        <ul id="weeklySupport" class="list"><li class="muted">Complete an assessment to unlock support suggestions.</li></ul>
      </section>

      <section class="panel">
        <h2>🗓️ Assessment history</h2>
        <ul id="assessmentHistory" class="list"><li class="muted">Complete an assessment to build history continuity.</li></ul>
      </section>

      <section class="panel">
        <h2>🌍 Development program</h2>
        <p id="programStatusSummary" class="muted">Complete an assessment to unlock your child-specific development program.</p>
        <ul id="programStatusList" class="list"><li class="muted">No program status yet.</li></ul>
        <div class="actions">
          <a class="btn btn-primary" id="programLaunchBtn" href="/youth-development/program" style="display:none;">Start Program</a>
        </div>
      </section>

      <section class="panel">
        <h2>🧭 Actions</h2>
        <div class="actions">
          <a class="btn btn-primary" id="viewSavedDashboardBtn" href="/youth-development/parent-dashboard">View Saved Dashboard</a>
          <a class="btn btn-secondary" id="retakeAssessmentBtn" href="/youth-development/intake">Retake Assessment</a>
          <a class="btn btn-ghost" id="openIntakeBtn" href="/youth-development/intake">Start Intake Walkthrough</a>
        </div>
      </section>
    </main>

    <dialog id="categoryHelpDialog">
      <h3 id="helpTitle" style="margin:0 0 8px;"></h3>
      <p id="helpBody" style="margin:0 0 12px;"></p>
      <button class="btn btn-primary" id="closeHelpBtn" type="button">Close</button>
    </dialog>

    <script>
      (function () {
        let payload = null;
        const query = new URLSearchParams(window.location.search);
        const accountCtx = {
          tenant: (query.get("tenant") || "").trim(),
          email: (query.get("email") || "").trim().toLowerCase(),
          child_id: (query.get("child_id") || query.get("childId") || "").trim(),
        };
        const voiceState = {
          childId: "",
          sectionMap: {},
          displayStatus: "voice_unknown",
          providerAudioAvailable: false,
          providerName: "",
          playbackState: "ready",
          statusDetail: "",
          lastPlaybackMode: "none",
        };
        const dashboardVoiceDiagnosticsState = {
          route: "",
          responsePayload: null,
          playbackMode: "pending",
          providerStatus: "unknown",
          fallbackReason: "none",
          audioSource: "unknown",
        };
        const dashboardVoicePlayback = { activeAudio: null, activeScope: "", selectionByScope: {}, fallbackScope: "" };
        const dashboardVoiceDiagnostics = document.getElementById("dashboardVoiceDiagnostics");
        const programStatusSummary = document.getElementById("programStatusSummary");
        const programStatusList = document.getElementById("programStatusList");
        const programLaunchBtn = document.getElementById("programLaunchBtn");
        const viewSavedDashboardBtn = document.getElementById("viewSavedDashboardBtn");
        const retakeAssessmentBtn = document.getElementById("retakeAssessmentBtn");
        const openIntakeBtn = document.getElementById("openIntakeBtn");
        const openAdaptiveV2HubBtn = document.getElementById("openAdaptiveV2HubBtn");
        const childSwitcherPanel = document.getElementById("childSwitcherPanel");
        const childSwitcher = document.getElementById("childSwitcher");

        function withAccountScope(pathname) {
          const url = new URL(pathname, window.location.origin);
          if (accountCtx.tenant) url.searchParams.set("tenant", accountCtx.tenant);
          if (accountCtx.email) url.searchParams.set("email", accountCtx.email);
          if (accountCtx.child_id) url.searchParams.set("child_id", accountCtx.child_id);
          return url.pathname + url.search;
        }

        function persistScopedChildOnUrl() {
          if (!accountCtx.child_id) return;
          const next = new URL(window.location.href);
          if (next.searchParams.get("child_id") === accountCtx.child_id) return;
          next.searchParams.set("child_id", accountCtx.child_id);
          window.history.replaceState({}, "", next.pathname + next.search);
        }

        function applyScopedChildContext(scopedChildId, sourceLabel) {
          const childId = String(scopedChildId || "").trim();
          if (!childId) return;
          accountCtx.child_id = childId;
          viewSavedDashboardBtn.href = withAccountScope("/youth-development/parent-dashboard");
          retakeAssessmentBtn.href = withAccountScope("/youth-development/intake");
          openIntakeBtn.href = withAccountScope("/youth-development/intake");
          programLaunchBtn.href = withAccountScope("/youth-development/program");
          if (openAdaptiveV2HubBtn) {
            const adaptiveUrl = new URL("/youth-development/adaptive-learning", window.location.origin);
            if (accountCtx.tenant) adaptiveUrl.searchParams.set("tenant", accountCtx.tenant);
            if (accountCtx.email) adaptiveUrl.searchParams.set("email", accountCtx.email);
            adaptiveUrl.searchParams.set("child_id", accountCtx.child_id);
            adaptiveUrl.searchParams.set("program_context", "youth_development");
            adaptiveUrl.searchParams.set("source_registry", "youth_development");
            adaptiveUrl.searchParams.set("return_url", "/youth-development/parent-dashboard");
            openAdaptiveV2HubBtn.href = adaptiveUrl.pathname + adaptiveUrl.search;
          }
          persistScopedChildOnUrl();
          console.info("youth_dashboard_client_child_scope_adopted", {
            source: String(sourceLabel || "unknown"),
            adopted_child_id: accountCtx.child_id,
          });
        }

        function dashboardUrlForChild(childId) {
          const url = new URL('/youth-development/parent-dashboard', window.location.origin);
          if (accountCtx.tenant) url.searchParams.set('tenant', accountCtx.tenant);
          if (accountCtx.email) url.searchParams.set('email', accountCtx.email);
          url.searchParams.set('child_id', String(childId || ''));
          return url.pathname + url.search;
        }

        function renderChildSwitcher(children, selectedChildId) {
          const entries = Array.isArray(children) ? children.filter((entry) => entry && entry.child_id) : [];
          if (!childSwitcherPanel || !childSwitcher) return;
          // Keep child management visible even when profile lookup is empty or only one child exists.
          childSwitcherPanel.hidden = false;
          if (!entries.length) {
            childSwitcher.innerHTML = '<p class="muted" role="status">No child profiles were returned for this account. Existing records have not been changed. Please verify the signed-in parent account before starting a new intake.</p>';
            return;
          }
          childSwitcher.innerHTML = '<label class="tiny" for="childDashboardSelect">Viewing a child dashboard</label><select class="child-select" id="childDashboardSelect" aria-label="Choose a child dashboard">'
            + entries.map((entry) => {
              const selected = String(entry.child_id) === String(selectedChildId || '');
              const label = String(entry.child_name || 'Child profile');
              const grade = String(entry.child_grade_band || entry.grade || 'Grade not set');
              return '<option value="' + esc(entry.child_id) + '"' + (selected ? ' selected' : '') + '>' + esc(label + ' · ' + grade) + '</option>';
            }).join('')
            + '</select>';
        }

        childSwitcher?.addEventListener('change', function (event) {
          const select = event.target.closest('#childDashboardSelect');
          if (!select) return;
          const childId = String(select.value || select.getAttribute('data-child-dashboard-id') || '').trim();
          if (childId) window.location.assign(dashboardUrlForChild(childId));
        });
        function logDashboardContinuity(eventName, details) {
          const payload = {
            event: String(eventName || "unknown"),
            at: new Date().toISOString(),
            ...(details && typeof details === "object" ? details : {}),
          };
          console.info("youth_dashboard_continuity_trace", payload);
          try {
            const prior = Array.isArray(window.__youthDashboardContinuityTrace) ? window.__youthDashboardContinuityTrace : [];
            prior.push(payload);
            window.__youthDashboardContinuityTrace = prior.slice(-30);
          } catch (_err) {}
        }
        function scopedProgramHref(href, fallbackPathname) {
          const base = String(href || "").trim() || String(fallbackPathname || "/youth-development/program");
          const url = new URL(base, window.location.origin);
          if (accountCtx.tenant) url.searchParams.set("tenant", accountCtx.tenant);
          if (accountCtx.email) url.searchParams.set("email", accountCtx.email);
          if (accountCtx.child_id) url.searchParams.set("child_id", accountCtx.child_id);
          return url.pathname + url.search;
        }

        const CATEGORY_META = {
          SR: {
            icon: "🎯",
            parentLabel: "Focus & Self-Control",
            technicalLabel: "Self-Regulation",
            helpText: "This category looks at how your child manages attention, follows through, and handles the structure of a task.",
          },
          CQ: {
            icon: "🔍",
            parentLabel: "Curiosity & Love of Learning",
            technicalLabel: "Curiosity / Exploratory Drive",
            helpText: "This category looks at how strongly your child is drawn to explore, question, and discover.",
          },
          CR: {
            icon: "💡",
            parentLabel: "Creativity & Idea Thinking",
            technicalLabel: "Creativity / Problem Finding",
            helpText: "This category looks at how your child generates ideas, experiments, and thinks beyond the first answer.",
          },
          RS: {
            icon: "🧩",
            parentLabel: "Thinking & Problem Solving",
            technicalLabel: "Reasoning / Pattern Recognition",
            helpText: "This category looks at how your child understands patterns, logic, and how ideas connect.",
          },
          PS: {
            icon: "🧗",
            parentLabel: "Effort & Resilience",
            technicalLabel: "Persistence / Challenge Tolerance",
            helpText: "This category looks at how your child handles difficulty, frustration, and productive struggle.",
          },
          FB: {
            icon: "🛠️",
            parentLabel: "Learning From Feedback",
            technicalLabel: "Feedback Responsiveness",
            helpText: "This category looks at how your child responds when shown what to improve and whether that leads to growth.",
          },
          DE: {
            icon: "🌟",
            parentLabel: "Interests & Passion Areas",
            technicalLabel: "Domain Engagement",
            helpText: "This category looks at the areas your child is naturally drawn toward and grows in with repeated interest.",
          },
        };

        const categoryOrder = ["SR", "CQ", "CR", "RS", "PS", "FB", "DE"];

        function esc(value) {
          return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
        }

        function asPercent(value) {
          const n = Number(value);
          if (!Number.isFinite(n)) return 0;
          return Math.max(0, Math.min(100, Math.round(n)));
        }

        function formatDate(value) {
          if (!value) return "Not available yet";
          const d = new Date(value);
          if (Number.isNaN(d.getTime())) return "Not available yet";
          return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
        }

        function getMeta(code) {
          return CATEGORY_META[String(code || "").toUpperCase()] || {
            icon: "✨",
            parentLabel: String(code || "Category"),
            technicalLabel: String(code || ""),
            helpText: "This category shows a developmental pattern from current parent observations.",
          };
        }

        function plain(value) {
          return String(value == null ? "" : value).replace(/_/g, " ").replace(/\s{2,}/g, " ").trim();
        }

        function cleanCopy(value) {
          const copy = plain(value)
            .replace(/^(What to keep doing|What to do next|What to support next|Progress can look like):\s*/i, "")
            .replace(/^([A-Z][A-Z ]{2,})(?=\s+(is|are|was|were)\b)/, function (match) {
              return match.toLowerCase();
            });
          return copy ? copy.charAt(0).toUpperCase() + copy.slice(1) : copy;
        }

        function statusTone(score) {
          if (score >= 70) return { klass: "status-strong", label: "Current strength" };
          if (score <= 40) return { klass: "status-grow", label: "Growth area" };
          return { klass: "status-watch", label: "Building" };
        }

        function openHelp(code) {
          const meta = getMeta(code);
          const dialog = document.getElementById("categoryHelpDialog");
          document.getElementById("helpTitle").textContent = meta.parentLabel;
          document.getElementById("helpBody").textContent = meta.helpText;
          if (dialog.showModal) dialog.showModal();
        }

        function normalizeCards(data) {
          const cards = (((data || {}).page_model || {}).trait_cards || {}).cards;
          return Array.isArray(cards) ? cards : [];
        }

        function cardByCode(cards) {
          const map = {};
          cards.forEach((card) => {
            const key = String(card.trait_code || "").toUpperCase();
            if (key) map[key] = card;
          });
          return map;
        }

        let activeGeniusIndex = 0;

        function selectedGeniusCode() {
          return categoryOrder[activeGeniusIndex] || categoryOrder[0];
        }

        function renderCategoryStrip(cardsMap) {
          const host = document.getElementById("categoryStrip");
          const code = selectedGeniusCode();
          const meta = getMeta(code);
          const card = cardsMap[code] || {};
          const score = asPercent(card.current_score);
          const tone = statusTone(score);
          host.innerHTML = [
            '<article class="genius-focus">',
              '<div class="pill-head"><div><p class="tiny">Genius area ' + String(activeGeniusIndex + 1) + ' of ' + String(categoryOrder.length) + '</p><h3>' + esc(meta.icon + ' ' + meta.parentLabel) + '</h3></div>',
              '<button class="help-btn" data-help-code="' + esc(code) + '" aria-label="Explain ' + esc(meta.parentLabel) + '">?</button></div>',
              '<p class="score"><span class="status-badge ' + tone.klass + '">' + esc(tone.label) + '</span> ' + score + '%</p>',
              '<div class="meter" aria-label="' + esc(meta.parentLabel) + ' score meter"><span style="width:' + score + '%"></span></div>',
              '<p class="muted">' + esc(meta.helpText) + '</p>',
              '<div class="genius-navigation"><button class="btn btn-ghost" type="button" data-genius-nav="previous">← Previous</button><button class="btn btn-primary" type="button" data-genius-nav="next">Next area →</button></div>',
            '</article>'
          ].join('');
        }

        function renderSnapshotCards(cardsMap) {
          const host = document.getElementById("snapshotCards");
          const code = selectedGeniusCode();
          const meta = getMeta(code);
          const card = cardsMap[code] || {};
            const score = asPercent(card.current_score);
            const tone = statusTone(score);
            const oneLine = cleanCopy(card.what_this_means || "More observations will make this snapshot more specific.");
            const whatItLooksLike = cleanCopy(card.behavior_look_fors || "Look for this across home, schoolwork, and transitions.");
            const whyItMatters = cleanCopy(card.why_it_matters || "This pattern can affect confidence, consistency, and learning momentum.");
            const whatHelpsNext = cleanCopy(card.progress_look_fors || card.emotional_context || "Keep routines predictable and practice in short repeatable blocks.");
          host.innerHTML = [
              '<article class="snapshot-card" data-snapshot-card="' + esc(code) + '">',
                '<div class="pill-head">',
                  '<div>',
                    '<h3 style="margin:0 0 4px;">' + esc(meta.parentLabel) + '</h3>',
                    '<p class="tech-tag" style="margin:0;">' + esc(meta.technicalLabel) + '</p>',
                  '</div>',
                  '<button class="help-btn" data-help-code="' + esc(code) + '" aria-label="Explain ' + esc(meta.parentLabel) + '">?</button>',
                '</div>',
                '<div class="voice-controls"><button class="btn btn-ghost voice-btn" type="button" data-voice-card="' + esc(code) + '">Listen to this insight</button></div>',
                '<div><span class="status-badge ' + tone.klass + '">' + esc(tone.label) + '</span> <span class="tiny">Score: ' + score + '%</span></div>',
                '<div class="meter" aria-label="' + esc(meta.parentLabel) + ' score meter"><span style="width:' + score + '%"></span></div>',
                '<p><strong>What your child currently shows:</strong> ' + esc(oneLine) + '</p>',
                '<p><strong>What you may notice:</strong> ' + esc(whatItLooksLike) + '</p>',
                '<div class="parent-next-step"><p><strong>What helps next:</strong> ' + esc(whatHelpsNext) + '</p><p class="tiny"><strong>Why this matters:</strong> ' + esc(whyItMatters) + '</p></div>',
              '</article>'
            ].join('');
        }

        function renderStrengths(data) {
          const host = document.getElementById("topStrengths");
          const strengths = (((data || {}).page_model || {}).strengths || {}).items || [];
          const items = strengths.slice(0, 3);
          host.innerHTML = items.length
            ? items.map((item) => {
                const meta = getMeta(item.trait_code);
                return '<li><strong>' + esc(meta.parentLabel) + ':</strong> ' + esc(cleanCopy(item.keep_doing_copy || "Keep giving practice opportunities in this area.")) + ' <span class="tiny">Keep building: ' + esc(cleanCopy(item.actionable_next_step || "Keep a predictable routine and gently raise challenge.")) + '</span></li>';
              }).join("")
            : '<li class="muted">No strengths are available yet.</li>';
        }

        function renderSupport(data) {
          const host = document.getElementById("areasToStrengthen");
          const support = (((data || {}).page_model || {}).support || {}).items || [];
          const items = support.slice(0, 3);
          host.innerHTML = items.length
            ? items.map((item) => {
                const meta = getMeta(item.trait_code);
                return '<li><strong>' + esc(meta.parentLabel) + ':</strong> ' + esc(cleanCopy(item.support_next_copy || "Choose one small skill practice this week.")) + '<br><span class="tiny"><strong>Try next:</strong> ' + esc(cleanCopy(item.actionable_next_step || "Repeat one scaffolded task 2-3 times this week.")) + '</span><br><span class="tiny"><strong>Look for:</strong> ' + esc(cleanCopy(item.progress_signal || "Fewer prompts and more independent attempts.")) + '</span></li>';
              }).join("")
            : '<li class="muted">No areas to strengthen are currently flagged.</li>';
        }

        function renderWeeklySupport(data) {
          const host = document.getElementById("weeklySupport");
          const strengths = (((data || {}).page_model || {}).strengths || {}).items || [];
          const support = (((data || {}).page_model || {}).support || {}).items || [];
          const cards = normalizeCards(data).sort((a, b) => asPercent(b.current_score) - asPercent(a.current_score));
          const topStrength = strengths[0] || cards[0] || null;
          const topGrowth = support[0] || cards[cards.length - 1] || null;
          const suggestions = [];

          suggestions.push(topStrength
            ? '<li><strong>Strength-based:</strong> Keep using ' + esc(getMeta(topStrength.trait_code).parentLabel) + ' in everyday tasks. Ask your child to explain what worked so they can repeat it.</li>'
            : '<li><strong>Strength-based:</strong> Notice one thing your child did well this week and name the exact action so they can repeat it.</li>');

          suggestions.push(topGrowth
            ? '<li><strong>Growth-based:</strong> Pick one short practice activity for ' + esc(getMeta(topGrowth.trait_code).parentLabel) + ' and repeat it 2–3 times this week with calm coaching.</li>'
            : '<li><strong>Growth-based:</strong> Pick one small challenge task and practice it in short, low-pressure rounds.</li>');

          suggestions.push('<li><strong>Environment-based:</strong> Create a predictable routine (same time, same place, short duration) so progress is easier to see across the week.</li>');

          host.innerHTML = suggestions.join('');
        }

        function renderAssessmentHistory(data) {
          const host = document.getElementById("assessmentHistory");
          const history = Array.isArray(data && data.assessment_history) ? data.assessment_history : [];
          if (!history.length) {
            host.innerHTML = '<li class="muted">No saved assessment history found for this child/account scope.</li>';
            return;
          }
          host.innerHTML = history.slice(0, 12).map((entry, idx) => {
            const highest = entry && entry.interpretation && entry.interpretation.highest_trait ? entry.interpretation.highest_trait : {};
            const lowest = entry && entry.interpretation && entry.interpretation.lowest_trait ? entry.interpretation.lowest_trait : {};
            const completed = formatDate(entry && entry.saved_at);
            const childName = String(entry?.child_profile?.child_name || "").trim();
            const rowLabel = idx === 0 ? "Latest" : ("Previous #" + String(idx));
            return '<li><strong>' + esc(rowLabel) + ' assessment:</strong> '
              + esc(completed)
              + (childName ? (' · Child: ' + esc(childName)) : '')
              + (highest && highest.trait_name ? (' · Top strength: ' + esc(highest.trait_name)) : '')
              + (lowest && lowest.trait_name ? (' · Growth focus: ' + esc(lowest.trait_name)) : '')
              + '</li>';
          }).join("");
        }

        function bindHelpButtons() {
          Array.from(document.querySelectorAll('[data-help-code]')).forEach((button) => {
            button.addEventListener('click', function () {
              openHelp(button.getAttribute('data-help-code'));
            });
          });
        }
        function bindGeniusNavigation(cardsMap) {
          Array.from(document.querySelectorAll('[data-genius-nav]')).forEach((button) => {
            button.addEventListener('click', function () {
              const direction = button.getAttribute('data-genius-nav');
              activeGeniusIndex = direction === 'previous'
                ? (activeGeniusIndex + categoryOrder.length - 1) % categoryOrder.length
                : (activeGeniusIndex + 1) % categoryOrder.length;
              renderCategoryStrip(cardsMap);
              renderSnapshotCards(cardsMap);
              bindHelpButtons();
              bindGeniusNavigation(cardsMap);
            });
          });
        }
        function parentVoiceStatusMessage() {
          if (voiceState.playbackState === "playing" && voiceState.lastPlaybackMode === "provider") return "playing AI voice (OpenAI gateway audio).";
          if (voiceState.playbackState === "paused" && voiceState.lastPlaybackMode === "provider") return "paused AI voice.";
          if (voiceState.playbackState === "playing" && voiceState.lastPlaybackMode === "fallback_tts") return "AI voice unavailable, using fallback browser speech.";
          if (voiceState.playbackState === "failed") return voiceState.statusDetail || "AI voice playback failed.";
          if (voiceState.providerAudioAvailable) return "AI voice ready (OpenAI gateway audio available).";
          if (voiceState.displayStatus === "voice_unavailable" || voiceState.displayStatus === "voice_temporarily_unavailable" || voiceState.displayStatus === "voice_fallback_active") {
            return "AI voice unavailable, using fallback browser speech when supported.";
          }
          return voiceState.childId ? "AI audio is not ready yet. Tap Read to try browser speech." : "Choose a child to enable read-aloud.";
        }
        function updateVoiceStatusCopy() {
          const summary = parentVoiceStatusMessage();
          ["snapshotVoiceStatus", "topStrengthsVoiceStatus", "areasToStrengthenVoiceStatus", "weeklySupportVoiceStatus"].forEach((id) => {
            const host = document.getElementById(id);
            if (host) host.textContent = summary;
          });
        }
        function updateDashboardVoiceDiagnostics(partial) {
          Object.assign(dashboardVoiceDiagnosticsState, partial || {});
          if (dashboardVoiceDiagnostics) {
            dashboardVoiceDiagnostics.textContent = "voice_mode: " + String(dashboardVoiceDiagnosticsState.playbackMode || "pending")
              + " · provider_status: " + String(dashboardVoiceDiagnosticsState.providerStatus || "unknown")
              + " · fallback_reason: " + String(dashboardVoiceDiagnosticsState.fallbackReason || "none")
              + " · audio_source: " + String(dashboardVoiceDiagnosticsState.audioSource || "unknown");
          }
          if (typeof window !== "undefined") {
            window.__dashboardVoiceRuntimeDiagnostics = {
              route_called: dashboardVoiceDiagnosticsState.route || null,
              response_payload: dashboardVoiceDiagnosticsState.responsePayload || null,
              playback_mode: dashboardVoiceDiagnosticsState.playbackMode || null,
              provider_status: dashboardVoiceDiagnosticsState.providerStatus || null,
              fallback_reason: dashboardVoiceDiagnosticsState.fallbackReason || null,
              audio_source: dashboardVoiceDiagnosticsState.audioSource || null,
            };
          }
        }
        function getReadableTextFromElement(id) {
          const host = document.getElementById(id);
          if (!host) return "";
          return String(host.textContent || "").replace(/\s+/g, " ").trim();
        }
        function safePlayText(text) {
          const speech = typeof window !== "undefined" ? window.speechSynthesis : null;
          const spoken = String(text || "").trim();
          if (!speech || typeof window.SpeechSynthesisUtterance !== "function" || !spoken) return false;
          try {
            speech.cancel();
            speech.speak(new window.SpeechSynthesisUtterance(spoken));
            dashboardVoicePlayback.fallbackScope = dashboardVoicePlayback.activeScope;
            return true;
          } catch (_err) {
            return false;
          }
        }
        async function resolveProviderAudioUrl(providerAudio) {
          const audioUrl = String(providerAudio?.audioUrl || "").trim();
          if (audioUrl) return audioUrl;
          const assetRef = String(providerAudio?.assetRef || "").trim();
          if (!assetRef) return "";
          if (/^https?:\\\/\\\//i.test(assetRef)) return assetRef;
          const endpoint = "/api/youth-development/voice/assets/resolve?child_id=" + encodeURIComponent(String(voiceState.childId || "")) + "&asset_ref=" + encodeURIComponent(assetRef);
          const response = await fetch(endpoint);
          const payload = response.ok ? await response.json().catch(() => null) : null;
          return String(payload?.audio_url || "").trim();
        }
        async function safePlayProviderAudio(providerAudio) {
          const src = await resolveProviderAudioUrl(providerAudio);
          if (!src) return false;
          try {
            if (dashboardVoicePlayback.activeAudio && typeof dashboardVoicePlayback.activeAudio.pause === "function") {
              dashboardVoicePlayback.activeAudio.pause();
              dashboardVoicePlayback.activeAudio.currentTime = 0;
            }
            const audio = new Audio(src);
            dashboardVoicePlayback.activeAudio = audio;
            await audio.play();
            return true;
          } catch (_err) {
            return false;
          }
        }
        async function requestProgramProviderAudio(text, sectionKey) {
          const childId = String(accountCtx.child_id || "").trim();
          const fullText = String(text || "").trim();
          if (!childId || !fullText) return null;
          const response = await fetch("/api/youth-development/voice/speak", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              child_id: childId,
              section_key: String(sectionKey || "program_section"),
              text_content: fullText,
            }),
          });
          const payload = response.ok ? await response.json().catch(() => null) : null;
          console.info("[program-voice-debug] upstream_speak", {
            route: "/api/youth-development/voice/speak",
            method: "POST",
            status: response.status,
            section_key: String(sectionKey || "program_section"),
            text_length: fullText.length,
            playback_mode: payload?.ok ? "provider_audio" : "fallback_browser_speech",
            audio_source: payload?.audio_url ? "direct_provider_audio" : "browser_speech",
            fallback_reason: payload?.fallback_reason || null,
            upstream_route: payload?.upstream_route || "/speak",
          });
          if (!payload || payload.ok !== true || !(payload.audio_url || payload.asset_ref)) return null;
          return {
            audioUrl: String(payload.audio_url || "").trim(),
            assetRef: String(payload.asset_ref || "").trim(),
            providerName: String(payload.provider || "openai-via-upstream-speak").trim(),
          };
        }
        async function requestDashboardProviderAudio(text, sectionKey) {
          const childId = String(voiceState.childId || "").trim();
          const fullText = String(text || "").trim();
          if (!childId || !fullText) return null;
          const response = await fetch("/api/youth-development/voice/speak", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              child_id: childId,
              section_key: String(sectionKey || "dashboard_section"),
              text_content: fullText,
            }),
          });
          const payload = response.ok ? await response.json().catch(() => null) : null;
          console.info("youth_dashboard_voice_upstream_speak", {
            route: "/api/youth-development/voice/speak",
            method: "POST",
            status: response.status,
            section_key: String(sectionKey || "dashboard_section"),
            text_length: fullText.length,
            playback_mode: payload?.ok ? "provider_audio" : "fallback_browser_speech",
            audio_source: payload?.audio_url ? "direct_provider_audio" : "browser_speech",
            fallback_reason: payload?.fallback_reason || null,
            upstream_route: payload?.upstream_route || "/speak",
          });
          if (!payload || payload.ok !== true || !(payload.audio_url || payload.asset_ref)) return null;
          return {
            audioUrl: String(payload.audio_url || "").trim(),
            assetRef: String(payload.asset_ref || "").trim(),
            providerName: String(payload.provider || "openai-via-upstream-speak"),
          };
        }
        function getProviderAudioFromSection(section) {
          const chunks = Array.isArray(section?.chunks) ? section.chunks : [];
          const providerChunk = chunks.find((chunk) => {
            const provider = String(chunk?.provider || chunk?.provider_name || "").toLowerCase();
            return (typeof chunk?.audio_url === "string" && chunk.audio_url.trim().length > 0
              || typeof chunk?.asset_ref === "string" && chunk.asset_ref.trim().length > 0)
              && String(chunk?.provider_status || "").toLowerCase() === "available"
              && provider.includes("openai");
          });
          return providerChunk ? {
            audioUrl: String(providerChunk.audio_url || "").trim(),
            assetRef: String(providerChunk.asset_ref || "").trim(),
            providerName: String(providerChunk.provider || providerChunk.provider_name || "openai-via-gateway").trim(),
          } : null;
        }
        async function loadVoiceSectionsForChild(childId) {
          if (!childId) return;
          try {
            const endpoint = '/api/youth-development/voice/sections/' + encodeURIComponent(String(childId));
            const response = await fetch(endpoint);
            const payload = response.ok ? await response.json().catch(() => null) : null;
            console.info("youth_dashboard_voice_sections_response", {
              endpoint,
              status: response.status,
              ok: Boolean(payload && payload.ok === true),
              child_id: String(childId || ""),
              section_count: Array.isArray(payload?.sections) ? payload.sections.length : 0,
            });
            if (!payload || payload.ok !== true) {
              voiceState.displayStatus = "voice_unavailable";
              updateDashboardVoiceDiagnostics({
                route: endpoint,
                responsePayload: payload,
                playbackMode: "fallback_browser_speech",
                providerStatus: "voice_unavailable",
                fallbackReason: "voice_sections_request_failed",
                audioSource: "browser_speech",
              });
              updateVoiceStatusCopy();
              return;
            }
            voiceState.sectionMap = (Array.isArray(payload.sections) ? payload.sections : []).reduce((acc, item) => {
              const key = String(item.section_key || "").trim();
              if (key) acc[key] = item;
              return acc;
            }, {});
            const sectionEntries = Object.values(voiceState.sectionMap);
            const fallbackChunk = sectionEntries.flatMap((entry) => Array.isArray(entry?.chunks) ? entry.chunks : []).find((chunk) => String(chunk?.provider_status || "").toLowerCase() !== "available");
            const providerAudio = sectionEntries.map((entry) => getProviderAudioFromSection(entry)).find(Boolean) || null;
            voiceState.providerAudioAvailable = Boolean(providerAudio && (providerAudio.audioUrl || providerAudio.assetRef));
            voiceState.providerName = providerAudio ? providerAudio.providerName : "";
            voiceState.playbackState = "ready";
            voiceState.statusDetail = "";
            voiceState.displayStatus = String(payload.display_status || payload.voice_readiness_status || payload.voice_state?.availability || "voice_unknown");
            updateDashboardVoiceDiagnostics({
              route: endpoint,
              responsePayload: payload,
              playbackMode: "pending",
              providerStatus: providerAudio ? "available" : String(fallbackChunk?.provider_status || voiceState.displayStatus || "unknown"),
              fallbackReason: String(fallbackChunk?.fallback_reason || "none"),
              audioSource: providerAudio ? "provider_audio_candidate" : "browser_speech_candidate",
            });
            updateVoiceStatusCopy();
          } catch (_err) {
            voiceState.displayStatus = "voice_unavailable";
            voiceState.providerAudioAvailable = false;
            voiceState.providerName = "";
            updateDashboardVoiceDiagnostics({
              route: "/api/youth-development/voice/sections/" + encodeURIComponent(String(childId || "")),
              responsePayload: null,
              playbackMode: "fallback_browser_speech",
              providerStatus: "voice_unavailable",
              fallbackReason: "voice_sections_fetch_failed",
              audioSource: "browser_speech",
            });
            updateVoiceStatusCopy();
          }
        }
        function sectionVoicePlaybackForTarget(targetId, fallbackText) {
          const map = voiceState.sectionMap || {};
          const keys = targetId === "topStrengths"
            ? ["strengths", "summary", "next_steps"]
            : targetId === "areasToStrengthen"
              ? ["growth", "still_building", "next_steps"]
              : targetId === "weeklySupport"
                ? ["environment", "next_steps", "growth"]
                : targetId === "snapshotCards"
                  ? ["summary", "strengths", "growth"]
                : [];
          for (const key of keys) {
            const providerAudio = getProviderAudioFromSection(map[key]);
            if (providerAudio && (providerAudio.audioUrl || providerAudio.assetRef)) {
              const text = String(fallbackText || map[key]?.text_content || map[key]?.voice_text || map[key]?.playable_text_fallback || "").trim();
              return { text, providerAudio, source: "provider" };
            }
          }
          for (const key of keys) {
            const text = String(fallbackText || map[key]?.text_content || map[key]?.voice_text || map[key]?.playable_text_fallback || "").trim();
            if (text) return { text, audioUrl: "", source: "fallback_tts" };
          }
          return { text: String(fallbackText || "").trim(), audioUrl: "", source: "fallback_tts" };
        }
        function sectionVoicePlaybackForCardCode(cardCode, fallbackText) {
          const map = voiceState.sectionMap || {};
          const normalized = String(cardCode || "").trim().toUpperCase();
          const candidates = [
            "trait_" + normalized.toLowerCase(),
            normalized,
            normalized.toLowerCase(),
            "strengths",
            "growth",
            "summary",
          ];
          for (const key of candidates) {
            const providerAudio = getProviderAudioFromSection(map[key]);
            if (providerAudio && (providerAudio.audioUrl || providerAudio.assetRef)) {
              const text = String(fallbackText || map[key]?.text_content || map[key]?.voice_text || map[key]?.playable_text_fallback || "").trim();
              return { text, providerAudio, source: "provider" };
            }
          }
          for (const key of candidates) {
            const text = String(fallbackText || map[key]?.text_content || map[key]?.voice_text || map[key]?.playable_text_fallback || "").trim();
            if (text) return { text, audioUrl: "", source: "fallback_tts" };
          }
          return { text: String(fallbackText || "").trim(), audioUrl: "", source: "fallback_tts" };
        }
        async function playParentVoiceSelection(selection, label, scopeId) {
          dashboardVoicePlayback.activeScope = String(scopeId || "");
          console.info("youth_dashboard_voice_playback_attempt", {
            scope: dashboardVoicePlayback.activeScope || null,
            selection_source: selection?.source || null,
            provider_audio_candidate: Boolean(selection?.providerAudio),
            text_length: String(selection?.text || "").trim().length,
          });
          const providerFromSpeak = await requestDashboardProviderAudio(selection?.text, scopeId || "dashboard_section");
          if (providerFromSpeak) selection.providerAudio = providerFromSpeak;
          if (selection.providerAudio) {
            const providerPlayed = await safePlayProviderAudio(selection.providerAudio);
            if (providerPlayed) {
              voiceState.lastPlaybackMode = "provider";
              voiceState.playbackState = "playing";
              voiceState.statusDetail = "";
              updateDashboardVoiceDiagnostics({
                playbackMode: "provider_audio",
                providerStatus: "available",
                fallbackReason: "none",
                audioSource: "direct_provider_audio",
              });
              console.info("youth_dashboard_voice_playback_result", {
                playback_mode: "provider_audio",
                provider_status: "available",
                fallback_reason: null,
              });
              updateVoiceStatusCopy();
              return true;
            }
            updateDashboardVoiceDiagnostics({
              playbackMode: "fallback_browser_speech",
              providerStatus: "fallback_active",
              fallbackReason: "provider_audio_playback_failed",
              audioSource: "browser_speech",
            });
            console.info("youth_dashboard_voice_playback_result", {
              playback_mode: "fallback_browser_speech",
              provider_status: "fallback_active",
              fallback_reason: "provider_audio_playback_failed",
            });
          }
          const fallbackPlayed = safePlayText(selection.text);
          if (fallbackPlayed) {
            voiceState.lastPlaybackMode = "fallback_tts";
            voiceState.playbackState = "playing";
            voiceState.statusDetail = "AI voice unavailable, using fallback browser speech.";
            updateDashboardVoiceDiagnostics({
              playbackMode: "fallback_browser_speech",
              providerStatus: selection.providerAudio ? "fallback_active" : "provider_audio_unavailable",
              fallbackReason: selection.providerAudio ? "provider_audio_playback_failed" : "provider_audio_unavailable",
              audioSource: "browser_speech",
            });
            console.info("youth_dashboard_voice_playback_result", {
              playback_mode: "fallback_browser_speech",
              provider_status: selection.providerAudio ? "fallback_active" : "provider_audio_unavailable",
              fallback_reason: selection.providerAudio ? "provider_audio_playback_failed" : "provider_audio_unavailable",
            });
            updateVoiceStatusCopy();
            return true;
          }
          voiceState.lastPlaybackMode = "none";
          voiceState.playbackState = "failed";
          voiceState.statusDetail = "AI voice playback failed; fallback also unavailable on this device.";
          updateDashboardVoiceDiagnostics({
            playbackMode: "unavailable",
            providerStatus: selection.providerAudio ? "fallback_active" : "provider_audio_unavailable",
            fallbackReason: "browser_speech_unavailable",
            audioSource: "none",
          });
          console.info("youth_dashboard_voice_playback_result", {
            playback_mode: "unavailable",
            provider_status: selection.providerAudio ? "fallback_active" : "provider_audio_unavailable",
            fallback_reason: "browser_speech_unavailable",
          });
          updateVoiceStatusCopy();
          alert("Read-aloud is unavailable on this device right now. You can still read: " + label + ".");
          return false;
        }
        function bindVoiceControls() {
          if (bindVoiceControls.bound) return;
          bindVoiceControls.bound = true;
          document.addEventListener("click", async function (event) {
            const controlButton = event.target && event.target.closest ? event.target.closest("[data-voice-control]") : null;
            if (controlButton) {
              const targetId = String(controlButton.getAttribute("data-voice-control") || "").trim();
              const label = String(controlButton.getAttribute("data-voice-label") || targetId || "section");
              const fallbackText = getReadableTextFromElement(targetId);
              const selection = sectionVoicePlaybackForTarget(targetId, fallbackText);
              dashboardVoicePlayback.selectionByScope[targetId] = selection;
              await playParentVoiceSelection(selection, label, targetId);
              return;
            }
            const actionButton = event.target && event.target.closest ? event.target.closest("[data-voice-action]") : null;
            if (actionButton) {
              const action = String(actionButton.getAttribute("data-voice-action") || "").trim();
              const scope = String(actionButton.getAttribute("data-voice-scope") || "").trim();
              const audio = dashboardVoicePlayback.activeAudio;
              if (action === "pause") {
                if (audio && typeof audio.pause === "function") {
                  audio.pause();
                  voiceState.playbackState = "paused";
                  voiceState.lastPlaybackMode = "provider";
                } else {
                  const speech = typeof window !== "undefined" ? window.speechSynthesis : null;
                  if (speech && typeof speech.pause === "function") speech.pause();
                  voiceState.playbackState = "paused";
                  voiceState.lastPlaybackMode = "fallback_tts";
                  voiceState.statusDetail = "Fallback browser speech paused.";
                }
                updateVoiceStatusCopy();
                return;
              }
              if (action === "back10" || action === "forward10") {
                if (audio && typeof audio.currentTime === "number") {
                  const delta = action === "back10" ? -10 : 10;
                  audio.currentTime = Math.max(0, Math.min((audio.duration || Number.MAX_SAFE_INTEGER), audio.currentTime + delta));
                  voiceState.playbackState = "playing";
                } else {
                  voiceState.statusDetail = "Fallback browser speech cannot seek by 10 seconds.";
                }
                updateVoiceStatusCopy();
                return;
              }
              if (action === "play" && scope) {
                const cachedSelection = dashboardVoicePlayback.selectionByScope[scope];
                if (audio && scope === dashboardVoicePlayback.activeScope && audio.paused) {
                  await audio.play().catch(() => null);
                  voiceState.playbackState = "playing";
                  voiceState.lastPlaybackMode = "provider";
                  updateVoiceStatusCopy();
                  return;
                }
                if (cachedSelection) {
                  await playParentVoiceSelection(cachedSelection, scope, scope);
                }
                return;
              }
            }
            const cardButton = event.target && event.target.closest ? event.target.closest("[data-voice-card]") : null;
            if (!cardButton) return;
            const code = String(cardButton.getAttribute("data-voice-card") || "").trim().toUpperCase();
            const cardHost = document.querySelector('[data-snapshot-card="' + code + '"]');
            const fallbackText = String(cardHost?.textContent || "").replace(/\s+/g, " ").trim();
            const selection = sectionVoicePlaybackForCardCode(code, fallbackText);
            dashboardVoicePlayback.selectionByScope["card:" + code] = selection;
            await playParentVoiceSelection(selection, "snapshot card", "card:" + code);
          });
        }

        function setProgramStatus(summary, items, cta) {
          programStatusSummary.textContent = summary || "Program status unavailable.";
          const rows = Array.isArray(items) ? items : [];
          programStatusList.innerHTML = rows.length
            ? rows.map((line) => '<li>' + esc(line) + '</li>').join('')
            : '<li class="muted">No program status yet.</li>';
          if (cta && cta.href && cta.label) {
            programLaunchBtn.href = scopedProgramHref(cta.href, "/youth-development/program");
            programLaunchBtn.textContent = cta.label;
            programLaunchBtn.style.display = "";
          } else {
            programLaunchBtn.style.display = "none";
          }
        }

        async function hydrateProgramBridge(scopedChild, hasAssessment) {
          if (!accountCtx.tenant || !accountCtx.email) {
            setProgramStatus("Add tenant/email context to load parent program state.", [], null);
            return;
          }
          if (!scopedChild || !scopedChild.child_id) {
            if (hasAssessment) {
              setProgramStatus("Child profile setup is required before program launch.", ["Add child name in intake so we can preserve child scope."], null);
            } else {
              setProgramStatus("Assessment is incomplete. Finish intake first.", ["Program launch appears only after a completed assessment."], {
                href: "/youth-development/intake?tenant=" + encodeURIComponent(accountCtx.tenant) + "&email=" + encodeURIComponent(accountCtx.email),
                label: "Return to Intake",
              });
            }
            return;
          }
          const endpoint = new URL('/api/youth-development/program/bridge', window.location.origin);
          endpoint.searchParams.set('tenant', accountCtx.tenant);
          endpoint.searchParams.set('email', accountCtx.email);
          endpoint.searchParams.set('child_id', String(scopedChild.child_id));
          console.info("youth_dashboard_program_bridge_request_scope", {
            requested_child_id: String(scopedChild.child_id || ""),
          });
          const response = await fetch(endpoint.pathname + endpoint.search);
          const bridge = response.ok ? await response.json().catch(() => null) : null;
          if (!bridge || bridge.ok !== true) {
            setProgramStatus("Program state could not be loaded yet.", ["You can still open the program screen and retry launch."], {
              href: "/youth-development/program?tenant=" + encodeURIComponent(accountCtx.tenant) + "&email=" + encodeURIComponent(accountCtx.email) + "&child_id=" + encodeURIComponent(String(scopedChild.child_id)),
              label: "Open Program",
            });
            return;
          }
          const itemLines = [
            "Status: " + String(bridge.program_status_label || "Setup needed"),
            "Current phase: " + String(bridge.current_phase_name || "Not assigned"),
            "Current week: " + String(bridge.current_week || "Not assigned"),
            "Next recommended action: " + String(bridge.next_recommended_action || "Complete setup"),
          ];
          setProgramStatus(bridge.parent_summary || "Program bridge ready.", itemLines, bridge.cta || null);
        }

        function applyPayload(data, opts) {
          if (!data || !data.page_model) return false;
          const options = opts || {};
          payload = data;
          const cardsMap = cardByCode(normalizeCards(data));
          const strongest = (((data.page_model || {}).strengths || {}).items || [])[0];
          const supportArea = (((data.page_model || {}).support || {}).items || [])[0];
          const summary = [
            strongest ? ('Your child currently shows strongest momentum in ' + getMeta(strongest.trait_code).parentLabel + '.') : 'Your child is building developmental patterns across the seven categories.',
            supportArea ? ('A next growth focus is ' + getMeta(supportArea.trait_code).parentLabel + '.') : 'No urgent growth flag is present today.',
            'This is a developmental snapshot for ages 6–11 and will get stronger with repeated observations.'
          ].join(' ');

          document.getElementById('heroTitle').textContent = data.page_model.page_title || 'Youth Development Parent Dashboard';
          document.getElementById('heroSummary').textContent = summary;
          document.getElementById('completionDateLabel').textContent = 'Previous completion date: ' + formatDate(options.savedAt || data.saved_at || data.generated_at || (((data.result || {}).overview || {}).generated_at));

          renderCategoryStrip(cardsMap);
          renderSnapshotCards(cardsMap);
          renderStrengths(data);
          renderSupport(data);
          renderWeeklySupport(data);
          renderAssessmentHistory(data);
          bindHelpButtons();
          bindGeniusNavigation(cardsMap);
          return true;
        }

        function renderNoSavedAssessmentState(reasonCode, scopedChild) {
          const reason = String(reasonCode || "no_saved_parent_assessment").trim();
          const reasonLabel = reason === "requested_child_scope_not_found"
            ? "Requested child scope is not available under this account."
            : (reason === "no_saved_parent_assessment_for_child_scope"
              ? "No saved parent assessment exists for this child scope yet."
              : "No saved parent assessment exists for this account yet.");
          const childLabel = scopedChild && scopedChild.child_name
            ? (" for " + String(scopedChild.child_name))
            : "";
          document.getElementById("heroSummary").textContent = reasonLabel + childLabel + " Complete intake to create parent assessment continuity.";
          document.getElementById("assessmentHistory").innerHTML = '<li class="muted">No saved assessment history found for this child/account scope.</li>';
          document.getElementById("weeklySupport").innerHTML = '<li class="muted">No saved parent assessment context is currently available. Run intake to populate support suggestions.</li>';
        }


        function formatAdaptiveStatus(value) {
          const status = String(value || "not_started").replace(/_/g, " ");
          return status.charAt(0).toUpperCase() + status.slice(1);
        }

        function parentFriendlyLearningArea(value) {
          const code = String(value || "").toUpperCase();
          if (/^G\dM_/.test(code)) return "Math learning";
          if (/^G\dE_/.test(code)) return "English learning";
          return "Learning activity";
        }

        function parentFriendlyActivity(eventType) {
          const type = String(eventType || "").toLowerCase();
          if (type.includes("completed")) return "Completed a learning activity";
          if (type.includes("started")) return "Started a learning activity";
          if (type.includes("progress")) return "Updated learning progress";
          return "Learning activity recorded";
        }

        const parentSkillTitles = new Map();
        async function resolveParentSkillTitles(summary) {
          const ids = [...new Set([summary.current_skill_world, summary.next_recommended_learning_activity, ...(summary.recent_activity || []).slice(0, 12).map(item => String(item.label || '').match(/G[1-6][ME]_[A-Z]+_\d{3}/i)?.[0])].filter(id => /^G[1-6][ME]_[A-Z]+_\d{3}$/i.test(String(id || ''))))].slice(0, 14);
          await Promise.all(ids.map(async id => {
            if (parentSkillTitles.has(id)) return;
            try {
              const response = await fetch('/gamehub/skill-world/content/' + encodeURIComponent(id) + '.skill-package.v1.json');
              if (!response.ok) return;
              const item = await response.json();
              if (item.skill_id === id && item.skill) parentSkillTitles.set(id, 'Grade ' + item.grade + ' ' + item.subject + ' · ' + item.skill);
            } catch (_) {}
          }));
        }
        function parentActivityTitle(item) {
          if (/GAMEHUB_SIGHT_MEMORY/i.test(String(item.label || ''))) return 'Sight Memory · visual recall practice';
          const id = String(item.label || '').match(/G[1-6][ME]_[A-Z]+_\d{3}/i)?.[0];
          return id && parentSkillTitles.has(id) ? parentSkillTitles.get(id) : parentFriendlyActivity(item.event_type);
        }

        function sightMemoryHref(scopedChild) {
          const url = new URL('/gamehub/sight-memory.html', window.location.origin);
          url.searchParams.set('child_id', String(scopedChild?.child_id || ''));
          url.searchParams.set('tenant', accountCtx.tenant);
          url.searchParams.set('email', accountCtx.email);
          url.searchParams.set('program_context', 'youth_development');
          url.searchParams.set('source_registry', 'youth_development');
          return url.pathname + url.search;
        }

        function learningRhythmMarkup(rhythm) {
          const data = rhythm || {};
          const metrics = data.consistency || {};
          const review = data.parent_review || {};
          const reviewReady = data.review_status === 'ready';
          const metric = (label, value) => '<div class="metric-card"><span class="tiny">' + esc(label) + '</span><strong>' + esc(value) + '</strong></div>';
          const reviewedSkills = reviewReady ? Object.entries(data.skill_activity || {}).map(([skill, count]) => '<li><strong>' + esc(skill === 'GAMEHUB_SIGHT_MEMORY' ? 'Sight Memory' : skill) + '</strong><span class="tiny"> · ' + esc(String(count)) + ' learning moments this week</span></li>').join('') : '';
          return [
            '<section class="learning-rhythm" aria-label="Seven-day learning rhythm">',
            '<h3>🗓️ Seven-Day Learning Rhythm</h3>',
            '<p>' + esc(data.parent_message || 'Garvey is collecting consistency first.') + '</p>',
            '<div class="metric-grid">',
            metric('Days active', String(Number(metrics.active_days || 0))),
            metric('Learning moments', String(Number(metrics.learning_moments || 0))),
            metric('Active minutes', String(Number(metrics.active_minutes || 0))),
            metric('Parent check-ins', String(Number(metrics.parent_checkins || 0))),
            '</div>',
            data.review_available_at ? '<p class="tiny"><strong>First weekly review:</strong> ' + esc(formatDate(data.review_available_at)) + '</p>' : '',
            reviewReady && review.observation ? '<div class="callout"><h4>What this week’s rhythm means</h4><p>' + esc(review.observation) + '</p><p><strong>Next consistency action:</strong> ' + esc(review.next_action || '') + '</p></div>' : '',
            reviewReady ? '<h4>What Garvey observed this week</h4><ul class="activity-list">' + (reviewedSkills || '<li class="muted">No completed learning moments were recorded in this review window.</li>') + '</ul>' : '',
            '<label class="tiny" for="garveyParentCheckin">Parent check-in (optional)</label>',
            '<textarea id="garveyParentCheckin" maxlength="1200" placeholder="What did you notice while your child practiced?"></textarea>',
            '<p><button class="btn btn-secondary" type="button" id="saveGarveyParentCheckin">Save today’s check-in</button> <span class="tiny" id="garveyParentCheckinStatus" aria-live="polite"></span></p>',
            '</section>'
          ].join('');
        }

        function bindLearningRhythmCheckin(scopedChild) {
          const button = document.getElementById('saveGarveyParentCheckin');
          if (!button || !scopedChild?.child_id) return;
          button.addEventListener('click', async function () {
            const note = String(document.getElementById('garveyParentCheckin')?.value || '').trim();
            const status = document.getElementById('garveyParentCheckinStatus');
            button.disabled = true;
            if (status) status.textContent = 'Saving…';
            const response = await fetch('/api/skill-world/parent-checkin', {
              method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ child_id: String(scopedChild.child_id), tenant: accountCtx.tenant, email: accountCtx.email, program_context: 'youth_development', source_registry: 'youth_development', event_key: 'parent-checkin:' + String(scopedChild.child_id) + ':' + new Date().toISOString().slice(0, 10), note })
            }).catch(() => null);
            if (response && response.ok) { if (status) status.textContent = 'Today’s check-in is saved.'; await hydrateAdaptiveLearning(scopedChild); return; }
            if (status) status.textContent = 'Your check-in could not be saved. Please try again.';
            button.disabled = false;
          });
        }

        function renderAdaptiveSummary(summary, scopedChild) {
          const host = document.getElementById("adaptiveLearningSummary");
          const status = document.getElementById("adaptiveLearningStatus");
          if (!host) return;
          if (!summary || summary.ok !== true) {
            host.innerHTML = '<p class="muted">Adaptive learning progress is not available yet.</p>';
            return;
          }
          const childName = String(scopedChild?.child_name || summary.child_name || "Selected child");
          if (status) status.textContent = String(summary.overall_status_label || "Adaptive learning progress") + " for " + childName + ".";
          if (summary.empty_state) {
            host.innerHTML = '<p class="muted">No saved adaptive learning progress yet for ' + esc(childName) + '. Start with one learning activity and focus on building the weekly rhythm.</p>' + learningRhythmMarkup(summary.learning_rhythm) + '<p><a class="btn btn-secondary" href="' + esc(sightMemoryHref(scopedChild)) + '">🧠 Open Sight Memory practice →</a></p>';
            bindLearningRhythmCheckin(scopedChild);
            return;
          }
          const metric = (label, value) => '<div class="metric-card"><span class="tiny">' + esc(label) + '</span><strong>' + esc(value) + '</strong></div>';
          const activityRows = (summary.recent_activity || []).slice(0, 3).map(function (item) {
            return '<li><strong>' + esc(parentActivityTitle(item)) + '</strong><span class="tiny"> · ' + esc(formatAdaptiveStatus(item.status || item.event_type)) + ' · ' + esc(formatDate(item.occurred_at)) + '</span></li>';
          }).join('');
          const completed = Number(summary.lessons_completed || 0);
          const total = Number(summary.lessons_total || 0);
          const learningProgress = Number(summary.progress_percent || 0);
          host.innerHTML = [
            '<div class="learning-summary">',
            '<p><strong>' + esc(childName) + '’s learning progress</strong></p>',
            '<div class="metric-grid">',
            metric('Lessons completed', total ? String(completed) + ' of ' + String(total) : String(completed)),
            metric('Current progress', String(learningProgress) + '%'),
            metric('Current focus', parentFriendlyLearningArea(summary.current_skill_world)),
            metric('Last learning day', formatDate(summary.last_activity_at)),
            '</div>',
            '<p><strong>What to do next:</strong> Open the learning hub and continue the next recommended ' + esc(parentFriendlyLearningArea(summary.next_recommended_learning_activity || summary.current_skill_world)).toLowerCase() + ' activity.</p>',
            '<p><a class="btn btn-secondary" href="' + esc(sightMemoryHref(scopedChild)) + '">🧠 Open Sight Memory practice →</a></p>',
            learningRhythmMarkup(summary.learning_rhythm),
            '<h3>Recent learning activity</h3><ul class="activity-list">' + (activityRows || '<li class="muted">No saved learning activity yet.</li>') + '</ul>',
            '<details><summary style="cursor:pointer;font-weight:700;padding:12px 0;">View more saved learning activity</summary><ul class="activity-list">' + ((summary.recent_activity || []).slice(3, 12).map(item => '<li><strong>' + esc(parentActivityTitle(item)) + '</strong><span class="tiny"> · ' + esc(formatAdaptiveStatus(item.status || item.event_type)) + ' · ' + esc(formatDate(item.occurred_at)) + '</span></li>').join('') || '<li class="muted">No additional activity recorded.</li>') + '</ul></details>',
            '</div>'
          ].join('');
          bindLearningRhythmCheckin(scopedChild);
        }

        async function hydrateAdaptiveLearning(scopedChild) {
          if (!scopedChild || !scopedChild.child_id || !accountCtx.tenant || !accountCtx.email) return;
          const endpoint = new URL('/api/youth-development/parent-dashboard/adaptive-summary', window.location.origin);
          endpoint.searchParams.set('tenant', accountCtx.tenant);
          endpoint.searchParams.set('email', accountCtx.email);
          endpoint.searchParams.set('child_id', String(scopedChild.child_id));
          const response = await fetch(endpoint.pathname + endpoint.search).catch(() => null);
          const summary = response && response.ok ? await response.json().catch(() => null) : null;
          if (summary && summary.ok === true) await resolveParentSkillTitles(summary);
          renderAdaptiveSummary(summary, scopedChild);
        }

        async function hydrateFromAccount() {
          if (!accountCtx.tenant || !accountCtx.email) {
            childSwitcherPanel.hidden = false;
            childSwitcher.innerHTML = '<p class="muted" role="status">Your parent account context was not passed to this dashboard. Return through the Garvey Learning sign-in flow; no child records have been changed.</p>';
            return false;
          }
          const requestedChildId = String(accountCtx.child_id || query.get('child_id') || query.get('childId') || '').trim();
          logDashboardContinuity("hydrate_start", {
            tenant_present: Boolean(accountCtx.tenant),
            email_present: Boolean(accountCtx.email),
            requested_child_id: requestedChildId || null,
          });
          const childrenEndpoint = new URL('/api/youth-development/children', window.location.origin);
          childrenEndpoint.searchParams.set('tenant', accountCtx.tenant);
          childrenEndpoint.searchParams.set('email', accountCtx.email);
          const childrenResponse = await fetch(childrenEndpoint.pathname + childrenEndpoint.search).catch(() => null);
          const childrenPayload = childrenResponse && childrenResponse.ok ? await childrenResponse.json().catch(() => null) : null;
          const childProfiles = Array.isArray(childrenPayload && childrenPayload.children) ? childrenPayload.children : [];
          if (!childrenResponse || !childrenResponse.ok || !childrenPayload || childrenPayload.ok !== true) {
            childSwitcherPanel.hidden = false;
            childSwitcher.innerHTML = '<p class="muted" role="alert">Child profiles could not be loaded. Please retry from your signed-in dashboard. Do not create a duplicate child profile.</p>';
            logDashboardContinuity("children_lookup_failed", { response_status: childrenResponse ? childrenResponse.status : null });
            return false;
          }
          logDashboardContinuity("children_lookup_complete", {
            response_ok: Boolean(childrenResponse && childrenResponse.ok),
            children_count: childProfiles.length,
          });
          const scopedChild = requestedChildId
            ? childProfiles.find((entry) => String(entry.child_id || '') === requestedChildId)
            : (childProfiles.length === 1 ? childProfiles[0] : null);
          renderChildSwitcher(childProfiles, scopedChild?.child_id || requestedChildId);
          if (scopedChild && scopedChild.child_id) {
            applyScopedChildContext(scopedChild.child_id, "children_scope_resolution");
            logDashboardContinuity("child_scope_adopted", {
              source: "children_scope_resolution",
              selected_child_id: scopedChild.child_id,
            });
          }
          if (!scopedChild && childProfiles.length > 1) {
            document.getElementById('heroSummary').textContent = 'Choose a child above to view that child’s Genius snapshot, parent guidance, and adaptive-learning history.';
            document.getElementById('weeklySupport').innerHTML = '<li class="muted">Choose a child to view that child’s weekly support suggestions.</li>';
            document.getElementById('assessmentHistory').innerHTML = '<li class="muted">Choose a child to view that child’s assessment history.</li>';
            document.getElementById('adaptiveLearningSummary').innerHTML = '<p class="muted">Choose a child to view saved adaptive-learning progress.</p>';
            logDashboardContinuity("child_selection_required", { children_count: childProfiles.length });
            return false;
          }
          const endpoint = new URL('/api/youth-development/parent-dashboard/latest', window.location.origin);
          endpoint.searchParams.set('tenant', accountCtx.tenant);
          endpoint.searchParams.set('email', accountCtx.email);
          const latestRequestChildId = String((scopedChild && scopedChild.child_id) || accountCtx.child_id || requestedChildId || "").trim();
          if (latestRequestChildId) endpoint.searchParams.set('child_id', latestRequestChildId);
          console.info("youth_dashboard_latest_request_scope", {
            requested_child_id: latestRequestChildId || null,
          });
          logDashboardContinuity("latest_lookup_request", {
            requested_child_id: latestRequestChildId || null,
          });
          const response = await fetch(endpoint.pathname + endpoint.search);
          if (!response.ok) return false;
          const data = await response.json().catch(() => null);
          logDashboardContinuity("latest_lookup_response", {
            response_ok: Boolean(data && data.ok === true),
            has_result: Boolean(data && data.has_result === true),
            selected_submission_id: data?.latest_submission_id || null,
            selected_child_id: data?.child_id || null,
          });
          if (!data || !data.ok || !data.has_result || !data.payload) {
            if (!childProfiles.length && !requestedChildId) {
              document.getElementById('heroSummary').textContent = 'No child profile is linked to this account yet. Complete intake with child name to create child scope.';
              document.getElementById('weeklySupport').innerHTML = '<li class="muted">Child profile setup needed before child-scoped TDE loading is available.</li>';
            } else {
              renderNoSavedAssessmentState(data && data.reason, scopedChild);
            }
            await hydrateProgramBridge(scopedChild || null, false);
            await hydrateAdaptiveLearning(scopedChild || null);
            logDashboardContinuity("render_skipped", {
              reason: data?.reason || "latest_not_available",
              requested_child_id: latestRequestChildId || null,
            });
            return false;
          }
          const latestChildId = String(data.child_id || data?.payload?.ownership?.child_profile?.child_id || scopedChild?.child_id || "").trim();
          if (latestChildId) applyScopedChildContext(latestChildId, "latest_response");
          console.info("youth_dashboard_latest_selected", {
            selected_submission_id: data.latest_submission_id || null,
            selected_child_id: latestChildId || null,
          });
          logDashboardContinuity("latest_selected", {
            selected_submission_id: data.latest_submission_id || null,
            selected_child_id: latestChildId || null,
          });
          voiceState.childId = String(latestChildId || scopedChild?.child_id || "");
          await loadVoiceSectionsForChild(voiceState.childId);
          const applied = applyPayload(data.payload, { savedAt: data.saved_at || data.payload.saved_at || '' });
          logDashboardContinuity("render_applied", {
            render_applied: applied === true,
            source: "latest_payload",
          });
          const resolvedScopedChild = latestChildId
            ? {
                child_id: latestChildId,
                child_name: String(scopedChild?.child_name || data?.payload?.ownership?.child_profile?.child_name || "").trim() || null,
              }
            : (scopedChild || null);
          await hydrateProgramBridge(resolvedScopedChild, applied === true);
          await hydrateAdaptiveLearning(resolvedScopedChild);
          return applied;
        }

        document.getElementById('closeHelpBtn').addEventListener('click', function () {
          const dialog = document.getElementById('categoryHelpDialog');
          if (dialog && dialog.close) dialog.close();
        });

        try {
          payload = JSON.parse(sessionStorage.getItem('youthDevelopmentLatestAssessment') || 'null');
        } catch (_err) {
          payload = null;
        }

        bindVoiceControls();
        if (payload && applyPayload(payload, { savedAt: payload?.ownership?.saved_at || payload?.saved_at })) {
          const persistedChildId = String(payload?.ownership?.child_profile?.child_id || payload?.child_id || "").trim();
          if (persistedChildId) {
            applyScopedChildContext(persistedChildId, "session_payload");
            voiceState.childId = persistedChildId;
            loadVoiceSectionsForChild(voiceState.childId).catch(() => null);
            const sessionScopedChild = {
              child_id: persistedChildId,
              child_name: String(payload?.ownership?.child_profile?.child_name || "").trim() || null,
            };
            hydrateProgramBridge(sessionScopedChild, true).catch(() => null);
            hydrateAdaptiveLearning(sessionScopedChild).catch(() => null);
          }
          updateVoiceStatusCopy();
          // Session storage is only a fast preview; always reconcile against saved,
          // child-scoped server records so stale assessments cannot mask the latest result.
          hydrateFromAccount().catch(() => null);
        } else {
          updateVoiceStatusCopy();
          hydrateFromAccount().catch(() => null);
        }
      }());
    </script>
  </body>
</html>`;
}

function renderLiveYouthProgramPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Youth Development Program</title>
    <style>
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif; margin: 0; padding: 20px; background: #020617; color: #e2e8f0; }
      main { max-width: 840px; margin: 0 auto; display: grid; gap: 12px; }
      .panel { border: 1px solid rgba(148, 163, 184, 0.35); border-radius: 14px; padding: 14px; background: rgba(15, 23, 42, 0.85); }
      .panel h2 { margin: 0 0 8px; font-size: 1.1rem; letter-spacing: 0.01em; }
      .section-kicker { margin: 0 0 10px; font-size: 12px; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
      .muted { color: #94a3b8; }
      .list { margin: 0; padding-left: 18px; display: grid; gap: 8px; }
      .actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .btn { border: 1px solid transparent; border-radius: 999px; padding: 8px 12px; text-decoration: none; display: inline-block; cursor: pointer; }
      .btn-primary { background: #1d4ed8; border-color: rgba(59, 130, 246, 0.65); color: #eff6ff; }
      .btn-secondary { background: rgba(6, 95, 70, 0.25); border-color: rgba(16, 185, 129, 0.65); color: #d1fae5; }
      .state-box { border: 1px dashed rgba(148, 163, 184, 0.5); border-radius: 12px; padding: 12px; background: rgba(15, 23, 42, 0.55); }
      .state-title { margin: 0 0 6px; font-size: 1rem; }
      .state-line { margin: 0; color: #94a3b8; }
      .chip-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
      .chip { border: 1px solid rgba(148, 163, 184, 0.4); border-radius: 999px; padding: 4px 10px; font-size: 12px; color: #bfdbfe; }
      .grid-2 { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
      .progress-wrap { margin-top: 8px; }
      .progress-label { margin: 0 0 4px; font-size: 12px; color: #bfdbfe; font-weight: 600; }
      .progress-track { width: 100%; height: 12px; border-radius: 999px; background: rgba(148, 163, 184, 0.25); overflow: hidden; }
      .progress-fill { height: 100%; background: linear-gradient(90deg, #22c55e, #3b82f6); width: 0%; transition: width 180ms ease; }
      .roadmap-list { margin: 8px 0 0; padding-left: 18px; display: grid; gap: 6px; }
      .roadmap-item-current { color: #bfdbfe; font-weight: 600; }
      .roadmap-item-completed { color: #86efac; }
      .activity-card { border: 1px solid rgba(148, 163, 184, 0.35); border-radius: 10px; padding: 10px; background: rgba(2, 6, 23, 0.55); margin-top: 8px; }
      .activity-card h4 { margin: 0 0 4px; font-size: 0.95rem; }
      .tiny { font-size: 12px; color: #94a3b8; }
      .week-nav { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
      .btn-ghost { background: rgba(30, 41, 59, 0.45); border-color: rgba(148, 163, 184, 0.45); color: #e2e8f0; }
      textarea.input { width: 100%; min-height: 72px; margin-top: 8px; background: rgba(2, 6, 23, 0.75); color: #e2e8f0; border: 1px solid rgba(148, 163, 184, 0.45); border-radius: 8px; padding: 8px; font: inherit; }
      .input { width: 100%; margin-top: 6px; background: rgba(2, 6, 23, 0.75); color: #e2e8f0; border: 1px solid rgba(148, 163, 184, 0.45); border-radius: 8px; padding: 8px; font: inherit; }
      .planner-grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 10px; }
      .planner-metric { border: 1px solid rgba(148, 163, 184, 0.35); border-radius: 10px; padding: 10px; background: rgba(2, 6, 23, 0.4); }
      .planner-metric.today-focus { border-color: rgba(59, 130, 246, 0.8); box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.25); background: rgba(30, 64, 175, 0.12); }
      .planner-metric h4 { margin: 0 0 4px; font-size: 0.9rem; }
      .planner-metric p { margin: 0; font-size: 13px; color: #cbd5e1; }
      .status-pill { border-radius: 999px; padding: 2px 8px; font-size: 11px; border: 1px solid rgba(148, 163, 184, 0.5); text-transform: capitalize; }
      .status-completed { border-color: rgba(34, 197, 94, 0.8); color: #86efac; }
      .status-planned { border-color: rgba(56, 189, 248, 0.8); color: #bfdbfe; }
      .status-in_progress { border-color: rgba(250, 204, 21, 0.8); color: #fde68a; }
      .status-missed { border-color: rgba(248, 113, 113, 0.8); color: #fca5a5; }
      .status-blocked { border-color: rgba(251, 191, 36, 0.8); color: #fcd34d; }
      .calendar-grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
