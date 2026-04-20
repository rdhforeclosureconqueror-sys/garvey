"use strict";

const express = require("express");
const { buildYouthDevelopmentResult } = require("../youth-development/measurement/resultBuilder");
const { buildYouthDevelopmentDashboard } = require("../youth-development/measurement/dashboardBuilder");
const { buildParentDashboardPageModel } = require("../youth-development/presentation/parentDashboardPageModel");
const { renderYouthDevelopmentParentDashboardPage } = require("./youthDevelopmentRenderer");
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
  validateWeeklyExecutionActionPayload,
  WEEKLY_EXECUTION_ACTIONS,
} = require("../youth-development/tde/weeklyExecutionContract");

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
  continueProgram: "Continue Program",
  returnToDashboard: "Return to Dashboard",
  resumeWeekPrefix: "Resume Week",
  saveReflection: "Save Reflection",
  saveObservation: "Save Observation",
});

function safeTrim(value) {
  return String(value ?? "").trim();
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
  const commitment = planningState.commitment_plan || null;
  const plannedSessions = Array.isArray(planningState.scheduled_sessions) ? planningState.scheduled_sessions : [];
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
    commitment_plan: commitment,
    scheduled_sessions: plannedSessions,
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
        };
        if (accountCtx.tenant || accountCtx.email) {
          const dashUrl = new URL("/youth-development/parent-dashboard", window.location.origin);
          Object.entries(accountCtx).forEach(([key, value]) => { if (value) dashUrl.searchParams.set(key, value); });
          openLiveDashboardBtn.href = dashUrl.pathname + dashUrl.search;
          const programUrl = new URL("/youth-development/program", window.location.origin);
          Object.entries(accountCtx).forEach(([key, value]) => { if (value) programUrl.searchParams.set(key, value); });
          startProgramBtn.href = programUrl.pathname + programUrl.search;
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
          try {
            sessionStorage.setItem("youthDevelopmentLatestAssessment", JSON.stringify(payload));
          } catch (_err) {}
          const priorities = (payload.interpretation && payload.interpretation.priority_traits) || [];
          const highest = payload.interpretation && payload.interpretation.highest_trait;
          const completion = payload.completion && payload.completion.completion_rate_percent;
          resultCard.innerHTML = [
            "<p><strong>Assessment complete.</strong> Your responses are now available in the live parent dashboard.</p>",
            payload.ownership && payload.ownership.account_bound
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
          openLiveDashboardBtn.style.display = "";
          const scopedChildId = ((((payload || {}).ownership || {}).child_profile || {}).child_id || "").trim();
          if (scopedChildId) {
            const launchUrl = new URL(startProgramBtn.href, window.location.origin);
            launchUrl.searchParams.set("child_id", scopedChildId);
            startProgramBtn.href = launchUrl.pathname + launchUrl.search;
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
        --bg: #020617;
        --panel: linear-gradient(145deg, rgba(15, 23, 42, 0.88), rgba(30, 41, 59, 0.78));
        --line: rgba(148, 163, 184, 0.30);
        --text: #e2e8f0;
        --muted: #94a3b8;
        --accent: #22d3ee;
        --accent-2: #6366f1;
        --good: #34d399;
        --watch: #f59e0b;
        --grow: #fb7185;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at 10% -10%, rgba(34, 211, 238, 0.15), transparent 38%),
          radial-gradient(circle at 90% 0%, rgba(99, 102, 241, 0.2), transparent 42%),
          var(--bg);
        padding: 16px;
      }
      main { max-width: 980px; margin: 0 auto; display: grid; gap: 14px; }
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 16px;
        backdrop-filter: blur(10px);
        padding: 14px;
      }
      .hero-title { margin: 0 0 8px; font-size: clamp(1.2rem, 2.6vw, 1.8rem); }
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
      .category-pill {
        border: 1px solid var(--line);
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.65);
        padding: 10px;
      }
      .category-pill h3 { margin: 0 0 6px; font-size: 14px; line-height: 1.25; }
      .tech-tag { color: var(--muted); font-size: 11px; margin: 0; }
      .help-btn {
        width: 24px;
        height: 24px;
        border-radius: 999px;
        border: 1px solid rgba(125, 211, 252, 0.5);
        background: rgba(14, 116, 144, 0.25);
        color: #cffafe;
        font-weight: 700;
        cursor: pointer;
      }
      .pill-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
      .cards { grid-template-columns: repeat(auto-fit, minmax(245px, 1fr)); }
      .snapshot-card {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: rgba(2, 6, 23, 0.56);
        padding: 12px;
        display: grid;
        gap: 8px;
      }
      .meter {
        height: 8px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.25);
        overflow: hidden;
      }
      .meter > span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #38bdf8, #818cf8, #34d399);
      }
      .status-badge {
        display: inline-block;
        border-radius: 999px;
        border: 1px solid var(--line);
        padding: 3px 8px;
        font-size: 11px;
      }
      .status-strong { border-color: rgba(52, 211, 153, 0.6); color: #a7f3d0; }
      .status-watch { border-color: rgba(245, 158, 11, 0.7); color: #fde68a; }
      .status-grow { border-color: rgba(251, 113, 133, 0.7); color: #fecdd3; }
      .list { margin: 0; padding-left: 18px; display: grid; gap: 8px; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .btn {
        border: 1px solid transparent;
        border-radius: 999px;
        text-decoration: none;
        padding: 8px 12px;
        font-size: 14px;
      }
      .btn-primary { background: #0891b2; color: #ecfeff; border-color: rgba(6, 182, 212, 0.55); }
      .btn-secondary { background: rgba(30, 64, 175, 0.35); color: #dbeafe; border-color: rgba(96, 165, 250, 0.5); }
      .btn-ghost { background: transparent; color: #bae6fd; border-color: rgba(56, 189, 248, 0.45); }
      dialog {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: #0f172a;
        color: var(--text);
        max-width: 480px;
      }
      dialog::backdrop { background: rgba(2, 6, 23, 0.7); }
      @media (max-width: 640px) {
        body { padding: 12px; }
        .panel { padding: 12px; }
        .cards { grid-template-columns: 1fr; }
        .category-strip { grid-template-columns: 1fr 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="panel">
        <h1 id="heroTitle" class="hero-title">Youth Development Parent Dashboard</h1>
        <p id="heroSummary">Complete a youth assessment to see what your child currently shows and what helps next.</p>
        <p class="tiny">Designed for ages 6–11. Developmental snapshot only: this dashboard is provisional and should be reviewed as patterns over time.</p>
        <p class="tiny" id="completionDateLabel">Previous completion date: Not available yet.</p>
      </section>

      <section class="panel">
        <h2>What we look at</h2>
        <p class="muted">Seven developmental categories are shown below. Tap <strong>?</strong> for plain-language definitions.</p>
        <div id="categoryStrip" class="grid category-strip"></div>
      </section>

      <section class="panel">
        <h2>Snapshot cards</h2>
        <div id="snapshotCards" class="grid cards"></div>
      </section>

      <section class="panel">
        <h2>Top strengths</h2>
        <ul id="topStrengths" class="list"><li class="muted">Complete an assessment to view strengths.</li></ul>
      </section>

      <section class="panel">
        <h2>Areas to strengthen</h2>
        <ul id="areasToStrengthen" class="list"><li class="muted">Complete an assessment to view growth areas.</li></ul>
      </section>

      <section class="panel">
        <h2>How to support this week</h2>
        <ul id="weeklySupport" class="list"><li class="muted">Complete an assessment to unlock support suggestions.</li></ul>
      </section>

      <section class="panel">
        <h2>Development program</h2>
        <p id="programStatusSummary" class="muted">Complete an assessment to unlock your child-specific development program.</p>
        <ul id="programStatusList" class="list"><li class="muted">No program status yet.</li></ul>
        <div class="actions">
          <a class="btn btn-primary" id="programLaunchBtn" href="/youth-development/program" style="display:none;">Start Program</a>
        </div>
      </section>

      <section class="panel">
        <h2>Actions</h2>
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
        };
        const programStatusSummary = document.getElementById("programStatusSummary");
        const programStatusList = document.getElementById("programStatusList");
        const programLaunchBtn = document.getElementById("programLaunchBtn");

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

        function renderCategoryStrip(cardsMap) {
          const host = document.getElementById("categoryStrip");
          host.innerHTML = categoryOrder.map((code) => {
            const meta = getMeta(code);
            const score = asPercent(cardsMap[code] && cardsMap[code].current_score);
            return [
              '<article class="category-pill">',
                '<div class="pill-head">',
                  '<div>',
                    '<h3>' + esc(meta.icon + ' ' + meta.parentLabel) + '</h3>',
                    '<p class="tech-tag">' + esc(meta.technicalLabel) + '</p>',
                  '</div>',
                  '<button class="help-btn" data-help-code="' + esc(code) + '" aria-label="Explain ' + esc(meta.parentLabel) + '">?</button>',
                '</div>',
                '<div class="chip">Score: ' + score + '%</div>',
              '</article>'
            ].join('');
          }).join('');
        }

        function renderSnapshotCards(cardsMap) {
          const host = document.getElementById("snapshotCards");
          host.innerHTML = categoryOrder.map((code) => {
            const meta = getMeta(code);
            const card = cardsMap[code] || {};
            const score = asPercent(card.current_score);
            const tone = statusTone(score);
            const oneLine = card.what_this_means || "More observations will make this snapshot more specific.";
            const whatItLooksLike = card.behavior_look_fors || "Look for this across home, schoolwork, and transitions.";
            const whyItMatters = card.why_it_matters || "This pattern can affect confidence, consistency, and learning momentum.";
            const whatHelpsNext = card.progress_look_fors || card.emotional_context || "Keep routines predictable and practice in short repeatable blocks.";
            return [
              '<article class="snapshot-card">',
                '<div class="pill-head">',
                  '<div>',
                    '<h3 style="margin:0 0 4px;">' + esc(meta.parentLabel) + '</h3>',
                    '<p class="tech-tag" style="margin:0;">' + esc(meta.technicalLabel) + '</p>',
                  '</div>',
                  '<button class="help-btn" data-help-code="' + esc(code) + '" aria-label="Explain ' + esc(meta.parentLabel) + '">?</button>',
                '</div>',
                '<div><span class="status-badge ' + tone.klass + '">' + esc(tone.label) + '</span> <span class="tiny">Score: ' + score + '%</span></div>',
                '<div class="meter" aria-label="' + esc(meta.parentLabel) + ' score meter"><span style="width:' + score + '%"></span></div>',
                '<p><strong>What your child currently shows:</strong> ' + esc(oneLine) + '</p>',
                '<p><strong>What this means:</strong> ' + esc(card.what_this_means || oneLine) + '</p>',
                '<p><strong>What it looks like:</strong> ' + esc(whatItLooksLike) + '</p>',
                '<p><strong>Why it matters:</strong> ' + esc(whyItMatters) + '</p>',
                '<p><strong>What helps next:</strong> ' + esc(whatHelpsNext) + '</p>',
              '</article>'
            ].join('');
          }).join('');
        }

        function renderStrengths(data) {
          const host = document.getElementById("topStrengths");
          const strengths = (((data || {}).page_model || {}).strengths || {}).items || [];
          const items = strengths.slice(0, 3);
          host.innerHTML = items.length
            ? items.map((item) => {
                const meta = getMeta(item.trait_code);
                return '<li><strong>' + esc(meta.parentLabel) + ':</strong> ' + esc(item.keep_doing_copy || "Keep giving practice opportunities in this area.") + ' <span class="tiny">What to keep doing: ' + esc(item.actionable_next_step || "Keep a predictable routine and gently raise challenge.") + '</span></li>';
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
                return '<li><strong>' + esc(meta.parentLabel) + ':</strong> ' + esc(item.support_next_copy || "Choose one small skill practice this week.") + '<br><span class="tiny"><strong>What helps next:</strong> ' + esc(item.actionable_next_step || "Repeat one scaffolded task 2-3 times this week.") + '</span><br><span class="tiny"><strong>Progress can look like:</strong> ' + esc(item.progress_signal || "Fewer prompts and more independent attempts.") + '</span></li>';
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

        function bindHelpButtons() {
          Array.from(document.querySelectorAll('[data-help-code]')).forEach((button) => {
            button.addEventListener('click', function () {
              openHelp(button.getAttribute('data-help-code'));
            });
          });
        }

        function setProgramStatus(summary, items, cta) {
          programStatusSummary.textContent = summary || "Program status unavailable.";
          const rows = Array.isArray(items) ? items : [];
          programStatusList.innerHTML = rows.length
            ? rows.map((line) => '<li>' + esc(line) + '</li>').join('')
            : '<li class="muted">No program status yet.</li>';
          if (cta && cta.href && cta.label) {
            programLaunchBtn.href = cta.href;
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
          bindHelpButtons();
          return true;
        }

        async function hydrateFromAccount() {
          if (!accountCtx.tenant || !accountCtx.email) return false;
          const requestedChildId = (query.get('child_id') || query.get('childId') || '').trim();
          const childrenEndpoint = new URL('/api/youth-development/children', window.location.origin);
          childrenEndpoint.searchParams.set('tenant', accountCtx.tenant);
          childrenEndpoint.searchParams.set('email', accountCtx.email);
          const childrenResponse = await fetch(childrenEndpoint.pathname + childrenEndpoint.search);
          const childrenPayload = childrenResponse.ok ? await childrenResponse.json().catch(() => null) : null;
          const childProfiles = Array.isArray(childrenPayload && childrenPayload.children) ? childrenPayload.children : [];
          if (!childProfiles.length) {
            document.getElementById('heroSummary').textContent = 'No child profile is linked to this account yet. Complete intake with child name to create child scope.';
            document.getElementById('weeklySupport').innerHTML = '<li class="muted">Child profile setup needed before child-scoped TDE loading is available.</li>';
            await hydrateProgramBridge(null, false);
            return false;
          }
          const scopedChild = requestedChildId
            ? childProfiles.find((entry) => String(entry.child_id || '') === requestedChildId)
            : (childProfiles.length === 1 ? childProfiles[0] : null);
          if (!scopedChild && childProfiles.length > 1) {
            document.getElementById('heroSummary').textContent = 'Multiple child profiles found. Select a child scope to continue.';
            document.getElementById('weeklySupport').innerHTML = childProfiles.map((entry) => {
              const dash = new URL('/youth-development/parent-dashboard', window.location.origin);
              dash.searchParams.set('tenant', accountCtx.tenant);
              dash.searchParams.set('email', accountCtx.email);
              dash.searchParams.set('child_id', String(entry.child_id || ''));
              return '<li><a href="' + esc(dash.pathname + dash.search) + '">' + esc(entry.child_name || entry.child_id || 'Child profile') + '</a></li>';
            }).join('');
            setProgramStatus("Multiple children are available. Choose child scope first.", childProfiles.map((entry) => "Select " + (entry.child_name || entry.child_id || "Child profile")), null);
            return false;
          }
          const endpoint = new URL('/api/youth-development/parent-dashboard/latest', window.location.origin);
          endpoint.searchParams.set('tenant', accountCtx.tenant);
          endpoint.searchParams.set('email', accountCtx.email);
          if (scopedChild && scopedChild.child_id) endpoint.searchParams.set('child_id', String(scopedChild.child_id));
          const response = await fetch(endpoint.pathname + endpoint.search);
          if (!response.ok) return false;
          const data = await response.json().catch(() => null);
          if (!data || !data.ok || !data.has_result || !data.payload) {
            await hydrateProgramBridge(scopedChild, false);
            return false;
          }
          const applied = applyPayload(data.payload, { savedAt: data.saved_at || data.payload.saved_at || '' });
          await hydrateProgramBridge(scopedChild, applied === true);
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

        if (payload && applyPayload(payload, { savedAt: payload?.ownership?.saved_at || payload?.saved_at })) return;
        hydrateFromAccount().catch(() => null);
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
      .progress-track { width: 100%; height: 10px; border-radius: 999px; background: rgba(148, 163, 184, 0.25); overflow: hidden; }
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
      .planner-metric h4 { margin: 0 0 4px; font-size: 0.9rem; }
      .planner-metric p { margin: 0; font-size: 13px; color: #cbd5e1; }
      .status-pill { border-radius: 999px; padding: 2px 8px; font-size: 11px; border: 1px solid rgba(148, 163, 184, 0.5); text-transform: capitalize; }
      .status-completed { border-color: rgba(34, 197, 94, 0.8); color: #86efac; }
      .status-planned { border-color: rgba(56, 189, 248, 0.8); color: #bfdbfe; }
      .status-in_progress { border-color: rgba(250, 204, 21, 0.8); color: #fde68a; }
      .status-missed { border-color: rgba(248, 113, 113, 0.8); color: #fca5a5; }
      .calendar-grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
      .calendar-day { border: 1px solid rgba(148, 163, 184, 0.35); border-radius: 10px; padding: 8px; background: rgba(2, 6, 23, 0.45); }
      .calendar-day.today { border-color: rgba(56, 189, 248, 0.75); box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.25); }
      .calendar-day h4 { margin: 0 0 6px; font-size: 13px; color: #dbeafe; }
      .session-row { margin: 0 0 6px; font-size: 12px; color: #cbd5e1; display: grid; gap: 4px; }
      .session-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
      .session-actions .btn { padding: 6px 10px; font-size: 12px; }
      .lesson-plan { border: 1px solid rgba(148, 163, 184, 0.35); border-radius: 10px; padding: 10px; background: rgba(2, 6, 23, 0.45); margin-top: 8px; }
      .lesson-plan table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
      .lesson-plan th, .lesson-plan td { border: 1px solid rgba(148, 163, 184, 0.35); padding: 6px; text-align: left; vertical-align: top; }
      .checklist { margin: 8px 0 0; padding-left: 18px; display: grid; gap: 4px; }
    </style>
  </head>
  <body>
    <main>
      <section class="panel">
        <h1>Youth Development Program</h1>
        <p id="programHero" class="muted">Loading child-scoped program readiness…</p>
      </section>
      <section class="panel">
        <h2>Program status</h2>
        <ul id="programStatusList" class="list"><li class="muted">Loading…</li></ul>
        <div class="actions">
          <button id="launchBtn" class="btn btn-primary" type="button" style="display:none;">Start Program</button>
          <a id="dashboardBtn" class="btn btn-secondary" href="/youth-development/parent-dashboard">Return to Dashboard</a>
        </div>
      </section>
      <section class="panel">
        <h2>Current week guided experience</h2>
        <div id="weekExperience" class="state-box">
          <h3 class="state-title">Loading week content…</h3>
          <p class="state-line">Resolving child-scoped week experience.</p>
        </div>
        <div class="grid-2">
          <div class="state-box">
            <h3 class="state-title">Weekly goals + parent guidance</h3>
            <ul id="weeklyGoals" class="list"><li class="muted">Loading goals…</li></ul>
            <ul id="weeklyGuidance" class="list"><li class="muted">Loading parent guidance…</li></ul>
          </div>
          <div class="state-box">
            <h3 class="state-title">Week progress + roadmap</h3>
            <p id="progressSummary" class="state-line">Loading progress…</p>
            <div class="progress-wrap">
              <div class="progress-track"><div id="progressFill" class="progress-fill"></div></div>
            </div>
            <ul id="roadmapList" class="roadmap-list"><li class="muted">Loading roadmap…</li></ul>
            <div class="week-nav">
              <button id="prevWeekBtn" class="btn btn-ghost" type="button">Previous week</button>
              <button id="nextWeekBtn" class="btn btn-ghost" type="button">Next Week</button>
            </div>
          </div>
        </div>
        <div class="grid-2">
          <div class="state-box">
            <h3 class="state-title">Session flow + activity bank</h3>
            <ul id="sessionFlowList" class="list"><li class="muted">Loading session flow…</li></ul>
            <div id="activityBankSurface"><p class="state-line">Loading activity options…</p></div>
          </div>
          <div class="state-box">
            <h3 class="state-title">Reflection + observation/support</h3>
            <p id="observationSupport" class="state-line">Loading observation/support…</p>
            <label class="tiny" for="parentReflectionInput">Parent reflection / check-in notes</label>
            <textarea id="parentReflectionInput" class="input" placeholder="What worked this week? What should shift next week?"></textarea>
            <button id="saveReflectionBtn" class="btn btn-secondary" type="button">Save Reflection</button>
            <label class="tiny" for="parentObservationInput">Observation / support note</label>
            <textarea id="parentObservationInput" class="input" placeholder="What did you observe and what support action will you use next?"></textarea>
            <button id="saveObservationBtn" class="btn btn-secondary" type="button">Save Observation</button>
            <p id="executionStateArea" class="tiny muted">Execution state loading…</p>
            <div class="week-nav">
              <button id="startResumeWeekBtn" class="btn btn-primary" type="button">Start Week</button>
              <button id="markStepCompleteBtn" class="btn btn-secondary" type="button">Mark Step Complete</button>
            <button id="continueStepBtn" class="btn btn-ghost" type="button">Continue to Next Step</button>
            <button id="continueNextWeekBtn" class="btn btn-ghost" type="button">Continue Next Week</button>
            </div>
            <p id="nextActionArea" class="state-line">Next action loading…</p>
          </div>
        </div>
      </section>
      <section class="panel">
        <h2>Weekly planner + calendar agenda</h2>
        <div class="planner-grid">
          <div class="planner-metric">
            <h4>Today’s Session</h4>
            <p id="todaySessionCard">Loading today’s session…</p>
          </div>
          <div class="planner-metric">
            <h4>Next Scheduled Session</h4>
            <p id="nextSessionCard">Loading next scheduled session…</p>
          </div>
          <div class="planner-metric">
            <h4>This Week at a Glance</h4>
            <p id="weekAtGlanceCard">Loading weekly planner summary…</p>
          </div>
          <div class="planner-metric">
            <h4>Week-in-Program Marker</h4>
            <p id="weekMarkerCard">Loading week marker…</p>
          </div>
        </div>
        <div class="grid-2">
          <div class="state-box">
            <h3 class="state-title">Parent commitment setup</h3>
            <label class="tiny">Days per week</label><input id="commitDaysInput" class="input" type="number" min="1" max="7" value="3" />
            <label class="tiny">Preferred days (comma separated)</label><input id="commitPreferredDaysInput" class="input" placeholder="monday,wednesday,saturday" />
            <label class="tiny">Preferred time (HH:MM)</label><input id="commitTimeInput" class="input" type="time" value="17:30" />
            <label class="tiny">Session duration minutes</label><input id="commitDurationInput" class="input" type="number" min="10" max="120" value="30" />
            <label class="tiny">Start date</label><input id="commitStartDateInput" class="input" type="date" />
            <button id="saveCommitmentBtn" class="btn btn-primary" type="button">Set Commitment</button>
            <p id="commitmentSummary" class="tiny muted">Commitment not set.</p>
          </div>
          <div class="state-box">
            <h3 class="state-title">Weekly Planner Calendar + adherence</h3>
            <p id="adherenceSummary" class="state-line">Loading adherence summary…</p>
            <div class="progress-wrap">
              <div class="progress-track"><div id="adherenceFill" class="progress-fill"></div></div>
            </div>
            <p id="completionCountSummary" class="tiny muted">Planned vs completed loading…</p>
            <div id="plannerCalendarGrid" class="calendar-grid"><div class="calendar-day"><p class="tiny muted">Loading weekly planner calendar…</p></div></div>
            <ul id="agendaList" class="list"><li class="muted">Loading scheduled sessions…</li></ul>
            <button id="markNextSessionCompleteBtn" class="btn btn-secondary" type="button">Mark Next Session Complete</button>
            <button id="openNextSessionBtn" class="btn btn-ghost" type="button">Open Next Scheduled Session</button>
            <p id="nextScheduledSession" class="tiny muted">Next scheduled session loading…</p>
          </div>
        </div>
        <div class="state-box">
          <h3 class="state-title">Teacher-Style Lesson Plan</h3>
          <p id="lessonPlanSessionHeader" class="state-line">Select a scheduled session to view lesson plan details.</p>
          <div id="lessonPlanView" class="lesson-plan"><p class="tiny muted">Lesson plan loading…</p></div>
          <div class="session-actions">
            <button id="resumeSessionBtn" class="btn btn-primary" type="button">Resume Session</button>
            <button id="completeSelectedSessionBtn" class="btn btn-secondary" type="button">Mark Session Complete</button>
            <button id="returnWeeklyOverviewBtn" class="btn btn-ghost" type="button">Return to Weekly Overview</button>
          </div>
        </div>
      </section>
    </main>
    <script>
      (async function () {
        const query = new URLSearchParams(window.location.search);
        const accountCtx = {
          tenant: (query.get("tenant") || "").trim(),
          email: (query.get("email") || "").trim().toLowerCase(),
          child_id: (query.get("child_id") || query.get("childId") || "").trim(),
        };
        const hero = document.getElementById("programHero");
        const list = document.getElementById("programStatusList");
        const launchBtn = document.getElementById("launchBtn");
        const dashboardBtn = document.getElementById("dashboardBtn");
        const weekExperience = document.getElementById("weekExperience");
        const weeklyGoals = document.getElementById("weeklyGoals");
        const weeklyGuidance = document.getElementById("weeklyGuidance");
        const progressSummary = document.getElementById("progressSummary");
        const progressFill = document.getElementById("progressFill");
        const roadmapList = document.getElementById("roadmapList");
        const prevWeekBtn = document.getElementById("prevWeekBtn");
        const nextWeekBtn = document.getElementById("nextWeekBtn");
        const sessionFlowList = document.getElementById("sessionFlowList");
        const activityBankSurface = document.getElementById("activityBankSurface");
        const observationSupport = document.getElementById("observationSupport");
        const parentReflectionInput = document.getElementById("parentReflectionInput");
        const parentObservationInput = document.getElementById("parentObservationInput");
        const saveReflectionBtn = document.getElementById("saveReflectionBtn");
        const saveObservationBtn = document.getElementById("saveObservationBtn");
        const startResumeWeekBtn = document.getElementById("startResumeWeekBtn");
        const markStepCompleteBtn = document.getElementById("markStepCompleteBtn");
        const continueStepBtn = document.getElementById("continueStepBtn");
        const continueNextWeekBtn = document.getElementById("continueNextWeekBtn");
        const executionStateArea = document.getElementById("executionStateArea");
        const nextActionArea = document.getElementById("nextActionArea");
        const commitDaysInput = document.getElementById("commitDaysInput");
        const commitPreferredDaysInput = document.getElementById("commitPreferredDaysInput");
        const commitTimeInput = document.getElementById("commitTimeInput");
        const commitDurationInput = document.getElementById("commitDurationInput");
        const commitStartDateInput = document.getElementById("commitStartDateInput");
        const saveCommitmentBtn = document.getElementById("saveCommitmentBtn");
        const commitmentSummary = document.getElementById("commitmentSummary");
        const adherenceSummary = document.getElementById("adherenceSummary");
        const adherenceFill = document.getElementById("adherenceFill");
        const completionCountSummary = document.getElementById("completionCountSummary");
        const plannerCalendarGrid = document.getElementById("plannerCalendarGrid");
        const agendaList = document.getElementById("agendaList");
        const markNextSessionCompleteBtn = document.getElementById("markNextSessionCompleteBtn");
        const openNextSessionBtn = document.getElementById("openNextSessionBtn");
        const nextScheduledSession = document.getElementById("nextScheduledSession");
        const todaySessionCard = document.getElementById("todaySessionCard");
        const nextSessionCard = document.getElementById("nextSessionCard");
        const weekAtGlanceCard = document.getElementById("weekAtGlanceCard");
        const weekMarkerCard = document.getElementById("weekMarkerCard");
        const lessonPlanSessionHeader = document.getElementById("lessonPlanSessionHeader");
        const lessonPlanView = document.getElementById("lessonPlanView");
        const resumeSessionBtn = document.getElementById("resumeSessionBtn");
        const completeSelectedSessionBtn = document.getElementById("completeSelectedSessionBtn");
        const returnWeeklyOverviewBtn = document.getElementById("returnWeeklyOverviewBtn");

        let latestBridge = null;
        let latestWeekPayload = null;
        let navWeekOffset = 0;
        let selectedSessionId = "";

        function esc(value) {
          return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
        function setList(items) {
          list.innerHTML = (items || []).map((line) => '<li>' + esc(line) + '</li>').join("") || '<li class="muted">No status available.</li>';
        }
        function withCtx(path) {
          const url = new URL(path, window.location.origin);
          if (accountCtx.tenant) url.searchParams.set("tenant", accountCtx.tenant);
          if (accountCtx.email) url.searchParams.set("email", accountCtx.email);
          if (accountCtx.child_id) url.searchParams.set("child_id", accountCtx.child_id);
          return url.pathname + url.search;
        }
        function renderStateCard(title, lines, chips, nextAction) {
          const safeLines = (lines || []).map((line) => '<p class="state-line">' + esc(line) + '</p>').join("");
          const safeChips = (chips || []).map((chip) => '<span class="chip">' + esc(chip) + '</span>').join("");
          weekExperience.innerHTML = [
            '<h3 class="state-title">' + esc(title || "Week experience") + '</h3>',
            safeLines || '<p class="state-line">No details available.</p>',
            safeChips ? '<div class="chip-row">' + safeChips + '</div>' : "",
            nextAction ? '<p class="state-line"><strong>Next action:</strong> ' + esc(nextAction) + '</p>' : "",
          ].join("");
        }
        function setListHtml(host, items, className) {
          host.innerHTML = (items || []).length
            ? items.map((line) => '<li' + (className ? ' class="' + className + '"' : '') + '>' + line + '</li>').join("")
            : '<li class="muted">No items available yet.</li>';
        }
        function renderActivityCard(title, activity) {
          if (!activity) return '<div class="activity-card"><h4>' + esc(title) + '</h4><p class="tiny">No mapped activity selected yet.</p></div>';
          const variations = Array.isArray(activity.available_variations) ? activity.available_variations : [];
          return [
            '<div class="activity-card">',
            '<h4>' + esc(title + ": " + activity.title) + '</h4>',
            '<p class="tiny">' + esc(activity.description || "No description available.") + '</p>',
            '<p class="tiny"><strong>Subcategory:</strong> ' + esc(activity.subcategory || "n/a") + '</p>',
            '<p class="tiny"><strong>Duration:</strong> ' + esc((activity.estimated_duration || 0) + " min") + '</p>',
            '<p class="tiny"><strong>Materials:</strong> ' + esc((activity.materials_needed || []).join(", ") || "None") + '</p>',
            variations.length
              ? '<p class="tiny"><strong>Variation options:</strong> ' + esc(variations.map((item) => item.variation_level + " · " + item.variation_type).join(" | ")) + '</p>'
              : '<p class="tiny"><strong>Variation options:</strong> none</p>',
            '</div>',
          ].join("");
        }
        function renderAlternativeOptions(title, options) {
          const rows = Array.isArray(options) ? options : [];
          return [
            '<div class="activity-card"><h4>' + esc(title) + '</h4>',
            rows.length
              ? '<ul class="tiny">' + rows.map((item) => '<li>' + esc(item.title || item.activity_id || "Alternative") + ' <span class="muted">(' + esc(item.subcategory || "n/a") + ')</span></li>').join("") + '</ul>'
              : '<p class="tiny">No alternatives available.</p>',
            '</div>',
          ].join("");
        }
        function to12Hour(time24) {
          const raw = String(time24 || "").trim();
          const parts = raw.split(":");
          if (parts.length < 2) return raw || "TBD";
          const hour = Number(parts[0]);
          const minute = Number(parts[1]);
          if (!Number.isFinite(hour) || !Number.isFinite(minute)) return raw || "TBD";
          const suffix = hour >= 12 ? "PM" : "AM";
          const h = hour % 12 || 12;
          return h + ":" + String(minute).padStart(2, "0") + " " + suffix;
        }
        function addMinutesToTime(time24, minutesToAdd) {
          const raw = String(time24 || "").trim();
          const parts = raw.split(":");
          if (parts.length < 2) return "TBD";
          const hour = Number(parts[0]);
          const minute = Number(parts[1]);
          if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "TBD";
          const total = ((hour * 60) + minute + Number(minutesToAdd || 0) + 1440) % 1440;
          const outHour = Math.floor(total / 60);
          const outMin = total % 60;
          return to12Hour(String(outHour).padStart(2, "0") + ":" + String(outMin).padStart(2, "0"));
        }
        function normalizeSessionStatus(entry, todayName) {
          const explicit = String(entry.status || "").toLowerCase();
          if (explicit === "completed") return "completed";
          if (explicit === "in_progress") return "in_progress";
          if (explicit === "planned") {
            if (String(entry.day || "").toLowerCase() === String(todayName || "").toLowerCase() && explicit !== "completed") return "in_progress";
            return "planned";
          }
          return "missed";
        }
        function dayOrder(dayName) {
          const idx = DAYS.indexOf(String(dayName || "").toLowerCase());
          return idx >= 0 ? idx : 99;
        }
        function buildPlannerModel(week) {
          const scheduledRaw = Array.isArray(week.scheduled_sessions) ? week.scheduled_sessions : [];
          const commitment = week.commitment_plan || {};
          const accountability = week.accountability || {};
          const now = new Date();
          const todayName = DAYS[now.getUTCDay() === 0 ? 6 : now.getUTCDay() - 1];
          const duration = Number(commitment.session_duration_minutes || commitment.target_session_length || 30);
          const scheduled = scheduledRaw
            .map((entry) => ({ ...entry, normalized_status: normalizeSessionStatus(entry, todayName) }))
            .sort((a, b) => dayOrder(a.day) - dayOrder(b.day));
          const todaySession = scheduled.find((entry) => String(entry.day || "").toLowerCase() === todayName) || null;
          const nextSession = scheduled.find((entry) => entry.normalized_status === "planned" || entry.normalized_status === "in_progress") || null;
          const completedCount = scheduled.filter((entry) => entry.normalized_status === "completed").length;
          const plannedCount = scheduled.length;
          const adherenceRatio = plannedCount > 0 ? completedCount / plannedCount : Number(accountability.consistency_ratio || 0);
          return {
            scheduled,
            duration,
            todaySession,
            nextSession,
            completedCount,
            plannedCount,
            adherenceRatio: Math.max(0, Math.min(1, Number(adherenceRatio || 0))),
            accountability,
          };
        }
        function renderLessonPlan(session, week) {
          const template = week.lesson_plan_template || {};
          const duration = Number(week.commitment_plan?.session_duration_minutes || week.commitment_plan?.target_session_length || template.total_minutes || 30);
          const status = session?.normalized_status || "planned";
          const sessionTitle = session
            ? String(session.core_activity_title || "Guided weekly session")
            : String(week.content_blocks?.core_activity || "Guided weekly session");
          const startTime = to12Hour(session?.time || template.scheduled_at || "17:30");
          const endTime = addMinutesToTime(session?.time || "17:30", duration);
          const blocks = Array.isArray(template.blocks) ? template.blocks : [];
          const labelMap = {
            opening_routine: "Opening Routine",
            prep_time: "Prep",
            core_activity: "Core Activity",
            transition: "Transition",
            stretch_challenge: "Stretch",
            reflection: "Reflection",
            observation_close: "Observation / Close",
          };
          const parentGuidance = Array.isArray(week.parent_guidance) ? week.parent_guidance : [];
          const materials = [session?.core_activity_title, session?.stretch_activity_title, "Notebook or reflection card", "Timer"]
            .filter(Boolean);
          lessonPlanSessionHeader.innerHTML = '<strong>' + esc(sessionTitle) + '</strong> · '
            + esc(startTime) + " to " + esc(endTime) + " · "
            + '<span class="status-pill status-' + esc(status) + '">' + esc(status.replace("_", " ")) + "</span>";
          lessonPlanView.innerHTML = [
            '<p class="tiny"><strong>Session title:</strong> ' + esc(sessionTitle) + '</p>',
            '<p class="tiny"><strong>Start time:</strong> ' + esc(startTime) + ' · <strong>Estimated end:</strong> ' + esc(endTime) + '</p>',
            '<p class="tiny"><strong>Materials needed:</strong> ' + esc(materials.join(", ")) + '</p>',
            '<table><thead><tr><th>Block</th><th>Estimated duration</th><th>Child-friendly step</th><th>What parent does</th></tr></thead><tbody>',
            blocks.length
              ? blocks.map((row) => '<tr><td>' + esc(labelMap[row.segment] || row.segment || "Session step") + '</td><td>' + esc(String(row.minutes || 0) + " min") + '</td><td>'
                + esc(row.segment === "core_activity" ? "Try it together" : row.segment === "reflection" ? "Share one win" : "Keep the flow moving")
                + '</td><td>' + esc(row.title || week.reflection_checkin_support || "Guide with short cues and keep momentum.") + '</td></tr>').join("")
              : '<tr><td colspan="4">Lesson-plan blocks unavailable for this session.</td></tr>',
            '</tbody></table>',
            '<p class="tiny"><strong>Parent guidance:</strong></p>',
            '<ul class="checklist">' + (parentGuidance.length ? parentGuidance.map((item) => '<li>' + esc(item) + '</li>').join("") : "<li>No guidance available.</li>") + "</ul>",
          ].join("");
        }
        function renderWeekDetails(week, nextAction, navOffset) {
          const weekNumber = Number(week.week_number || 1);
          const navWeekNumber = Math.max(1, Math.min(36, weekNumber + Number(navOffset || 0)));
          const roadmap = Array.isArray(week.roadmap) ? week.roadmap : [];
          const focusedRoadmapEntry = roadmap.find((entry) => Number(entry.week_number) === navWeekNumber) || null;
          const showingWeek = focusedRoadmapEntry ? navWeekNumber : weekNumber;
          const showingGoal = focusedRoadmapEntry ? focusedRoadmapEntry.weekly_goal : week.objective;
          const showingPhase = focusedRoadmapEntry ? focusedRoadmapEntry.phase_name : (String(week.title || "").split("·")[1] || "Foundation").trim();

          renderStateCard(
            'Week ' + showingWeek + ' · ' + showingPhase,
            [
              week.week_purpose || week.objective || "Week objective is loading.",
              "Primary goal: " + String(showingGoal || "Goal not available."),
              "Phase/week context: " + String(week.phase_week_context || ""),
            ],
            [
              "Core: " + String(week.content_blocks?.core_activity || "N/A"),
              "Stretch: " + String(week.content_blocks?.stretch_challenge || "N/A"),
              "Reflection: " + String(week.content_blocks?.reflection_loop || "N/A"),
              "Observation: " + String(week.content_blocks?.observation_entry || "N/A"),
            ],
            nextAction || week.next_action || "Continue this week"
          );

          setListHtml(weeklyGoals, (week.weekly_goals || []).map((line) => esc(line)));
          setListHtml(weeklyGuidance, (week.parent_guidance || []).map((line) => '<span class="tiny">Parent guidance:</span> ' + esc(line)));
          const progress = week.progress || {};
          progressSummary.textContent = "Week " + String(progress.current_week || week.week_number || 1) + " of " + String(progress.total_weeks || 36) + " · " + String(progress.percent_complete || 0) + "% roadmap progress";
          progressFill.style.width = String(Math.max(0, Math.min(100, Number(progress.percent_complete || 0)))) + "%";
          setListHtml(
            roadmapList,
            roadmap.map((entry) => {
              const statusClass = entry.status === "current" ? "roadmap-item-current" : (entry.status === "completed" ? "roadmap-item-completed" : "");
              return '<span class="' + statusClass + '">' + esc("Week " + entry.week_number + " · " + entry.status + " · " + entry.weekly_goal) + '</span>';
            })
          );

          setListHtml(
            sessionFlowList,
            (week.session_flow || []).map((row) => '<strong>' + esc(row.step || "Step") + ':</strong> ' + esc(row.detail || ""))
          );
          const selectedPath = week.activity_bank_surface?.selected_path || {};
          const bankSummary = week.activity_bank_surface?.banks || {};
          const componentChoices = week.activity_bank_surface?.session_plan?.component_choices || {};
          const coreChoices = [componentChoices.RULE_BASED_REGULATION, componentChoices.ATTENTION_MINDFULNESS].filter(Boolean);
          const stretchChoices = componentChoices.CHALLENGE_SUSTAINED_FOCUS || null;
          const reflectionChoices = componentChoices.REFLECTION_COACHING || null;
          activityBankSurface.innerHTML = [
            renderActivityCard("Active core path", selectedPath.core_activity),
            renderActivityCard("Active stretch challenge", selectedPath.stretch_challenge),
            renderActivityCard("Active reflection loop", selectedPath.reflection),
            renderAlternativeOptions("Core alternatives", coreChoices.flatMap((entry) => entry.available_alternatives || []).slice(0, 3)),
            renderAlternativeOptions("Stretch alternatives", stretchChoices?.available_alternatives || []),
            renderAlternativeOptions("Reflection alternatives", reflectionChoices?.available_alternatives || []),
            '<div class="activity-card"><h4>Weekly options from activity bank</h4><p class="tiny">Core: ' + esc(String((bankSummary.core_activity || []).length))
            + ' · Stretch: ' + esc(String((bankSummary.stretch_challenge || []).length))
            + ' · Reflection: ' + esc(String((bankSummary.reflection || []).length))
            + ' · Opening: ' + esc(String((bankSummary.opening_routine || []).length))
            + ' · Transition: ' + esc(String((bankSummary.transition_routine || []).length))
            + ' · Closing: ' + esc(String((bankSummary.closing_routine || []).length))
            + '</p><p class="tiny"><strong>Core options:</strong> ' + esc(String((bankSummary.core_activity || []).length))
            + ' · <strong>Stretch options:</strong> ' + esc(String((bankSummary.stretch_challenge || []).length))
            + ' · <strong>Reflection options:</strong> ' + esc(String((bankSummary.reflection || []).length)) + '</p></div>',
          ].join("");

          observationSupport.textContent = String(week.observation_support_area || week.reflection_checkin_support || "Observation/support details unavailable.");
          nextActionArea.innerHTML = "<strong>Next action:</strong> " + esc(nextAction || week.next_action || "Continue this week flow.");
          prevWeekBtn.disabled = showingWeek <= 1;
          nextWeekBtn.disabled = showingWeek >= 36;
        }

        function renderPlanner(week) {
          const planner = buildPlannerModel(week);
          const commitment = week.commitment_plan || {};
          const scheduled = planner.scheduled;
          const accountability = planner.accountability;
          commitDaysInput.value = String(commitment.days_per_week || commitment.committed_days_per_week || 3);
          commitPreferredDaysInput.value = Array.isArray(commitment.preferred_days) ? commitment.preferred_days.join(",") : "";
          commitTimeInput.value = String(commitment.preferred_time || "17:30");
          commitDurationInput.value = String(commitment.session_duration_minutes || commitment.target_session_length || 30);
          commitStartDateInput.value = String(commitment.start_date || "").slice(0, 10);
          commitmentSummary.textContent = "Committed: " + String(commitment.days_per_week || commitment.committed_days_per_week || 0)
            + "/week · Preferred days: " + String((commitment.preferred_days || []).join(", ") || "none");
          adherenceSummary.textContent = "Planned this week: " + String(accountability.planned_this_week || 0)
            + " · Completed this week: " + String(accountability.completed_this_week || 0)
            + " · Consistency: " + String(accountability.consistency_label || "early");
          completionCountSummary.textContent = "Weekly completion count: " + String(planner.completedCount) + " of " + String(planner.plannedCount) + " planned sessions complete.";
          adherenceFill.style.width = String(Math.round(planner.adherenceRatio * 100)) + "%";
          agendaList.innerHTML = scheduled.length ? scheduled.map((entry) =>
            '<li><strong>' + esc(String(entry.day_label || entry.day || "Session")) + '</strong> @ ' + esc(to12Hour(entry.time || ""))
            + ' · <span class="status-pill status-' + esc(entry.normalized_status) + '">' + esc(String(entry.normalized_status || "planned").replace("_", " ")) + "</span>"
            + ' · Core: ' + esc(String(entry.core_activity_title || "auto"))
            + '<div class="session-actions"><button class="btn btn-ghost" type="button" data-action="open-session" data-session-id="' + esc(String(entry.session_id || "")) + '">Open Scheduled Session</button>'
            + '<button class="btn btn-ghost" type="button" data-action="view-lesson-plan" data-session-id="' + esc(String(entry.session_id || "")) + '">View Lesson Plan</button>'
            + '<button class="btn btn-secondary" type="button" data-action="complete-session" data-session-id="' + esc(String(entry.session_id || "")) + '"' + (entry.normalized_status === "completed" ? " disabled" : "") + '>Mark Session Complete</button>'
            + '<button class="btn btn-primary" type="button" data-action="resume-session" data-session-id="' + esc(String(entry.session_id || "")) + '">Resume Session</button></div>'
            + '</li>').join("") : '<li class="muted">No sessions scheduled yet.</li>';
          const next = planner.nextSession;
          const today = planner.todaySession;
          todaySessionCard.textContent = today
            ? String(today.day_label || today.day || "Today") + " at " + to12Hour(today.time || "") + " · " + String(today.core_activity_title || "Guided session")
            : "No session scheduled for today. Use commitment setup to place one.";
          nextSessionCard.textContent = next
            ? String(next.day_label || next.day || "") + " at " + to12Hour(next.time || "") + " · " + String(next.core_activity_title || "Guided session")
            : "No upcoming session currently planned.";
          weekAtGlanceCard.textContent = String(planner.completedCount) + "/" + String(planner.plannedCount) + " sessions completed · Consistency " + String(accountability.consistency_label || "early") + ".";
          weekMarkerCard.textContent = "Week " + String(week.week_number || 1) + " of 36 (" + String(week.progress?.percent_complete || 0) + "% program progress).";
          plannerCalendarGrid.innerHTML = DAYS.map((dayName) => {
            const sessions = scheduled.filter((entry) => String(entry.day || "").toLowerCase() === dayName);
            const isToday = Boolean(today && String(today.day || "").toLowerCase() === dayName);
            return '<article class="calendar-day' + (isToday ? " today" : "") + '"><h4>' + esc(dayName.slice(0, 1).toUpperCase() + dayName.slice(1)) + '</h4>'
              + (sessions.length
                ? sessions.map((entry) => '<div class="session-row"><span>' + esc(to12Hour(entry.time || "")) + " · " + esc(String(entry.core_activity_title || "Session")) + '</span>'
                  + '<span class="status-pill status-' + esc(entry.normalized_status) + '">' + esc(entry.normalized_status.replace("_", " ")) + "</span></div>").join("")
                : '<p class="tiny muted">No planned session</p>')
              + "</article>";
          }).join("");
          nextScheduledSession.textContent = next
            ? "Next scheduled session: " + String(next.day_label || next.day || "") + " " + to12Hour(next.time || "") + " (" + String(next.session_id || "") + ")"
            : "No upcoming sessions. Set commitment to generate schedule.";
          markNextSessionCompleteBtn.disabled = !next;
          markNextSessionCompleteBtn.dataset.sessionId = next ? String(next.session_id || "") : "";
          openNextSessionBtn.disabled = !next;
          openNextSessionBtn.dataset.sessionId = next ? String(next.session_id || "") : "";
          const selected = (selectedSessionId && scheduled.find((entry) => String(entry.session_id) === String(selectedSessionId)))
            || next
            || today
            || scheduled[0]
            || null;
          selectedSessionId = selected ? String(selected.session_id || "") : "";
          completeSelectedSessionBtn.disabled = !selected || selected.normalized_status === "completed";
          renderLessonPlan(selected, week);
        }

        function renderExecutionState(executionState) {
          const state = executionState || {};
          const completed = Array.isArray(state.completed_step_keys) ? state.completed_step_keys.length : 0;
          executionStateArea.textContent = "Status: " + String(state.week_status || "not_started")
            + " · Completed steps: " + String(completed) + "/4"
            + " · Resume ready: " + String(state.resume_ready === true ? "yes" : "no")
            + (state.blocked_reason ? " · Blocked: " + String(state.blocked_reason) : "");
          const currentWeek = latestWeekPayload && latestWeekPayload.week_content
            ? Number(latestWeekPayload.week_content.week_number || latestWeekPayload.current_week || 1)
            : 1;
          startResumeWeekBtn.textContent = state.week_status === "not_started"
            ? "Start Program"
            : ("Resume Week " + String(state.week_number || currentWeek || 1));
          continueNextWeekBtn.disabled = state.next_week_available !== true;
          continueStepBtn.disabled = state.week_status === "blocked";
          markStepCompleteBtn.disabled = state.week_status === "ready_for_next_week" || state.week_status === "completed";
          parentReflectionInput.value = String(state.reflection_note || "");
          parentObservationInput.value = String(state.observation_note || "");
        }

        async function saveExecutionAction(actionType, extra) {
          if (!latestWeekPayload || !latestWeekPayload.week_content) return;
          const body = Object.assign({
            tenant: accountCtx.tenant,
            email: accountCtx.email,
            child_id: accountCtx.child_id,
            week_number: Number(latestWeekPayload.current_week || latestWeekPayload.week_content.week_number || 1),
            action_type: actionType,
          }, extra || {});
          const response = await fetch("/api/youth-development/program/week-execution", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
          const payload = response.ok ? await response.json().catch(() => null) : null;
          if (!payload || payload.ok !== true) {
            nextActionArea.innerHTML = "<strong>Action blocked:</strong> " + esc(String((payload && (payload.message || payload.error)) || "Unable to process action."));
            if (payload && payload.execution_state) renderExecutionState(payload.execution_state);
            return;
          }
          latestWeekPayload.execution_state = payload.execution_state;
          if (payload.bridge_state && typeof payload.bridge_state.current_week === "number") {
            latestWeekPayload.current_week = payload.bridge_state.current_week;
          }
          renderExecutionState(payload.execution_state);
        }

        async function loadWeekExperience() {
          const url = new URL("/api/youth-development/program/week-content", window.location.origin);
          if (accountCtx.tenant) url.searchParams.set("tenant", accountCtx.tenant);
          if (accountCtx.email) url.searchParams.set("email", accountCtx.email);
          if (accountCtx.child_id) url.searchParams.set("child_id", accountCtx.child_id);
          const response = await fetch(url.pathname + url.search);
          const payload = response.ok ? await response.json().catch(() => null) : null;
          if (!payload || payload.ok !== true) {
            renderStateCard("Unable to load week content", [
              "Week content could not be loaded for this child scope.",
              "Verify tenant, parent email, and child selection.",
            ], [], "Return to Parent Dashboard");
            return;
          }
          if (payload.state !== "content_ready" || !payload.week_content) {
            renderStateCard(
              payload.state_label || "Week content unavailable",
              Array.isArray(payload.messages) ? payload.messages : ["No week-content module is available for the current state."],
              Array.isArray(payload.child_scope_options) ? payload.child_scope_options.map((entry) => "Child: " + String(entry.child_name || entry.child_id || "Unknown")) : [],
              payload.next_action || "Resolve child scope then continue"
            );
            return;
          }
          latestWeekPayload = payload;
          renderWeekDetails(payload.week_content, payload.next_action, navWeekOffset);
          renderPlanner(payload.week_content);
          renderExecutionState(payload.execution_state || null);
        }

        dashboardBtn.href = withCtx("/youth-development/parent-dashboard");

        async function loadBridge() {
          const bridgeUrl = new URL("/api/youth-development/program/bridge", window.location.origin);
          if (accountCtx.tenant) bridgeUrl.searchParams.set("tenant", accountCtx.tenant);
          if (accountCtx.email) bridgeUrl.searchParams.set("email", accountCtx.email);
          if (accountCtx.child_id) bridgeUrl.searchParams.set("child_id", accountCtx.child_id);
          const response = await fetch(bridgeUrl.pathname + bridgeUrl.search);
          const payload = response.ok ? await response.json().catch(() => null) : null;
          if (!payload || payload.ok !== true) {
            hero.textContent = "Program bridge could not load. Ensure tenant/email/child scope is present.";
            setList(["Missing or invalid account context.", "If assessment is incomplete, return to intake first."]);
            return null;
          }
          hero.textContent = String(payload.parent_summary || "Program bridge ready.");
          latestBridge = payload;
          setList([
            "Status: " + String(payload.program_status_label || "Setup needed"),
            "Current phase: " + String(payload.current_phase_name || "Not assigned"),
            "Current week: " + String(payload.current_week || "Not assigned"),
            "Next action: " + String(payload.next_recommended_action || "Complete setup"),
          ]);
          if (payload.launch_allowed === true) {
            launchBtn.style.display = "";
            launchBtn.textContent = String((payload.cta && payload.cta.label) || "Start Program");
          } else {
            launchBtn.style.display = "none";
          }
          return payload;
        }

        function openWeekFlow() {
          if (!latestWeekPayload || !latestWeekPayload.week_content) return;
          navWeekOffset = 0;
          renderWeekDetails(latestWeekPayload.week_content, latestWeekPayload.next_action, navWeekOffset);
          weekExperience.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        launchBtn.addEventListener("click", async function () {
          if (latestBridge && latestBridge.has_enrollment === true) {
            openWeekFlow();
            return;
          }
          launchBtn.disabled = true;
          const response = await fetch("/api/youth-development/program/launch", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(accountCtx),
          });
          const payload = response.ok ? await response.json().catch(() => null) : null;
          if (!payload || payload.ok !== true) {
            hero.textContent = "Program launch failed. Please retry.";
            launchBtn.disabled = false;
            return;
          }
          accountCtx.child_id = String(payload.child_id || accountCtx.child_id || "");
          hero.textContent = String(payload.parent_summary || "Program launch confirmed.");
          setList([
            "Status: " + String(payload.program_status_label || "Active"),
            "Current phase: " + String(payload.current_phase_name || "Foundation"),
            "Current week: " + String(payload.current_week || 1),
            "Next action: " + String(payload.next_recommended_action || "Begin current week"),
          ]);
          launchBtn.textContent = "Continue Program";
          launchBtn.disabled = false;
          dashboardBtn.href = withCtx("/youth-development/parent-dashboard");
          await loadWeekExperience();
          openWeekFlow();
        });

        prevWeekBtn.addEventListener("click", function () {
          if (!latestWeekPayload || !latestWeekPayload.week_content) return;
          const currentWeek = Number(latestWeekPayload.week_content.week_number || 1);
          navWeekOffset = Math.max(1 - currentWeek, navWeekOffset - 1);
          renderWeekDetails(latestWeekPayload.week_content, latestWeekPayload.next_action, navWeekOffset);
        });
        nextWeekBtn.addEventListener("click", function () {
          if (!latestWeekPayload || !latestWeekPayload.week_content) return;
          const currentWeek = Number(latestWeekPayload.week_content.week_number || 1);
          navWeekOffset = Math.min(36 - currentWeek, navWeekOffset + 1);
          renderWeekDetails(latestWeekPayload.week_content, latestWeekPayload.next_action, navWeekOffset);
        });

        startResumeWeekBtn.addEventListener("click", async function () {
          await saveExecutionAction("start_week");
        });
        saveReflectionBtn.addEventListener("click", async function () {
          await saveExecutionAction("save_reflection", { note: String(parentReflectionInput.value || "") });
        });
        saveObservationBtn.addEventListener("click", async function () {
          await saveExecutionAction("save_observation", { note: String(parentObservationInput.value || "") });
        });
        markStepCompleteBtn.addEventListener("click", async function () {
          const state = latestWeekPayload?.execution_state || {};
          const stepOrder = ["core_activity", "stretch_challenge", "reflection_checkin", "observation_support"];
          const idx = Number(state.active_step_index || 0);
          await saveExecutionAction("mark_step_complete", { step_key: stepOrder[Math.max(0, Math.min(stepOrder.length - 1, idx))] });
        });
        continueStepBtn.addEventListener("click", async function () {
          await saveExecutionAction("continue_to_next_step");
        });
        continueNextWeekBtn.addEventListener("click", async function () {
          await saveExecutionAction("continue_next_week");
          await loadBridge();
          await loadWeekExperience();
        });
        saveCommitmentBtn.addEventListener("click", async function () {
          if (!latestWeekPayload || !latestWeekPayload.week_content) return;
          const response = await fetch("/api/youth-development/program/commitment", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              tenant: accountCtx.tenant,
              email: accountCtx.email,
              child_id: accountCtx.child_id,
              week_number: latestWeekPayload.current_week,
              days_per_week: Number(commitDaysInput.value || 3),
              preferred_days: String(commitPreferredDaysInput.value || "").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean),
              preferred_time: String(commitTimeInput.value || "17:30"),
              session_duration_minutes: Number(commitDurationInput.value || 30),
              start_date: String(commitStartDateInput.value || new Date().toISOString().slice(0, 10)),
            }),
          });
          const payload = response.ok ? await response.json().catch(() => null) : null;
          if (!payload || payload.ok !== true) return;
          await loadWeekExperience();
        });
        markNextSessionCompleteBtn.addEventListener("click", async function () {
          const sessionId = String(markNextSessionCompleteBtn.dataset.sessionId || "");
          if (!sessionId || !latestWeekPayload) return;
          await fetch("/api/youth-development/program/session-complete", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              tenant: accountCtx.tenant,
              email: accountCtx.email,
              child_id: accountCtx.child_id,
              week_number: latestWeekPayload.current_week,
              session_id: sessionId,
            }),
          });
          await loadWeekExperience();
        });
        openNextSessionBtn.addEventListener("click", function () {
          const sessionId = String(openNextSessionBtn.dataset.sessionId || "");
          if (!sessionId || !latestWeekPayload?.week_content) return;
          selectedSessionId = sessionId;
          renderPlanner(latestWeekPayload.week_content);
          lessonPlanView.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        agendaList.addEventListener("click", async function (event) {
          const target = event.target;
          if (!target || !target.dataset) return;
          const action = String(target.dataset.action || "");
          const sessionId = String(target.dataset.sessionId || "");
          if (!action || !sessionId || !latestWeekPayload?.week_content) return;
          selectedSessionId = sessionId;
          if (action === "complete-session") {
            await fetch("/api/youth-development/program/session-complete", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                tenant: accountCtx.tenant,
                email: accountCtx.email,
                child_id: accountCtx.child_id,
                week_number: latestWeekPayload.current_week,
                session_id: sessionId,
              }),
            });
            await loadWeekExperience();
            return;
          }
          if (action === "resume-session") {
            await saveExecutionAction("start_week");
          }
          renderPlanner(latestWeekPayload.week_content);
          lessonPlanView.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        resumeSessionBtn.addEventListener("click", async function () {
          if (!selectedSessionId) return;
          await saveExecutionAction("start_week");
        });
        completeSelectedSessionBtn.addEventListener("click", async function () {
          if (!selectedSessionId || !latestWeekPayload) return;
          await fetch("/api/youth-development/program/session-complete", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              tenant: accountCtx.tenant,
              email: accountCtx.email,
              child_id: accountCtx.child_id,
              week_number: latestWeekPayload.current_week,
              session_id: selectedSessionId,
            }),
          });
          await loadWeekExperience();
        });
        returnWeeklyOverviewBtn.addEventListener("click", function () {
          weekExperience.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        const bridge = await loadBridge();
        await loadWeekExperience();
        if (bridge && bridge.has_enrollment === true) openWeekFlow();
      }());
    </script>
  </body>
</html>`;
}

function buildDeterministicNarrative(interpretation = {}) {
  if (interpretation?.incomplete) {
    return {
      opening: "More responses are needed before trait interpretation can be shown.",
      focus_area: "Please complete additional questions so the screener has enough current evidence.",
      next_step: interpretation.message,
    };
  }

  const highest = interpretation.highest_trait;
  const lowest = interpretation.lowest_trait;
  const conflict = interpretation.conflict;

  const opening = highest
    ? `Your child currently shows the strongest pattern in ${highest.trait_name} (${Number(highest.current_score || 0).toFixed(1)}).`
    : "Trait strengths will populate after all intake answers are submitted.";
  const focusArea = lowest
    ? `A practical support focus is ${lowest.trait_name} (${Number(lowest.current_score || 0).toFixed(1)}), where structured repetition can improve consistency.`
    : "No immediate low trait signal is available yet.";
  const nextStep = conflict
    ? `Watch the ${conflict.conflict_key} gap: ${conflict.insight}`
    : "No major trait conflict is currently detected.";

  return { opening, focus_area: focusArea, next_step: nextStep };
}

function buildYouthAssessPayload(answerPairs, options = {}) {
  const scoring = runYouthIntakeScoring(answerPairs, {
    unansweredCount: options.unansweredCount,
    totalQuestions: YOUTH_QUESTION_BANK.length,
  });
  const result = buildYouthDevelopmentResult(scoring.trait_rows, {
    generatedAt: options.generatedAt || "2026-04-17T00:00:00.000Z",
    evidenceSummary: {
      sources_used: ["parent_observation"],
      confidence_caveats: [
        "Parent-observation intake only: all outputs are provisional developmental signals.",
        "This screener is evidence-informed and designed for validation, not a psychometrically validated instrument.",
      ],
    },
  });
  const dashboard = buildYouthDevelopmentDashboard(result, { maxItems: 5 });
  const pageModel = buildParentDashboardPageModel(dashboard, {
    page_title: "Youth Development Parent Dashboard",
    page_subtitle: "Assessment generated from deterministic parent intake responses.",
    maxItems: 5,
  });

  const insightNarrative = buildDeterministicNarrative(scoring.interpretation);
  const enrichedPageModel = {
    ...pageModel,
    insight_narrative: {
      ...pageModel.insight_narrative,
      ...insightNarrative,
    },
  };

  return {
    scoring,
    result,
    dashboard,
    page_model: enrichedPageModel,
    rendered_html: renderYouthDevelopmentParentDashboardPage(enrichedPageModel),
    trait_reports: scoring.trait_reports,
  };
}

function buildPreviewPayload() {
  const result = buildYouthDevelopmentResult(PREVIEW_AGGREGATED_ROWS, PREVIEW_OPTIONS);
  const dashboard = buildYouthDevelopmentDashboard(result, { maxItems: 5 });
  const pageModel = buildParentDashboardPageModel(dashboard, {
    page_title: "Youth Development Parent Dashboard (Preview)",
    page_subtitle: "Preview / test-only rendering from deterministic fixture data.",
    maxItems: 5,
  });

  return {
    fixture_aggregated_rows: PREVIEW_AGGREGATED_ROWS,
    result,
    dashboard,
    page_model: pageModel,
  };
}

function createYouthDevelopmentRouter(options = {}) {
  const router = express.Router();
  const persistYouthAssessment = typeof options.persistYouthAssessment === "function" ? options.persistYouthAssessment : null;
  const loadLatestYouthAssessment = typeof options.loadLatestYouthAssessment === "function" ? options.loadLatestYouthAssessment : null;
  const listYouthChildProfiles = typeof options.listYouthChildProfiles === "function" ? options.listYouthChildProfiles : null;
  const getProgramBridgeState = typeof options.getProgramBridgeState === "function" ? options.getProgramBridgeState : null;
  const launchProgramForChild = typeof options.launchProgramForChild === "function" ? options.launchProgramForChild : null;
  const getProgramWeekExecution = typeof options.getProgramWeekExecution === "function" ? options.getProgramWeekExecution : null;
  const saveProgramWeekExecution = typeof options.saveProgramWeekExecution === "function" ? options.saveProgramWeekExecution : null;
  const getProgramWeekPlanning = typeof options.getProgramWeekPlanning === "function" ? options.getProgramWeekPlanning : null;
  const saveProgramCommitmentPlan = typeof options.saveProgramCommitmentPlan === "function" ? options.saveProgramCommitmentPlan : null;
  const saveProgramSessionPlan = typeof options.saveProgramSessionPlan === "function" ? options.saveProgramSessionPlan : null;
  const markProgramSessionComplete = typeof options.markProgramSessionComplete === "function" ? options.markProgramSessionComplete : null;

  router.get("/youth-development/intake", (req, res) => (
    res.status(200).type("html").send(renderLiveYouthAssessmentPage())
  ));

  router.get("/youth-development/intake/test", (req, res) => (
    (isInternalSurfaceRequestAllowed(req)
      ? res.status(200).type("html").send(renderYouthDevelopmentIntakeTestPage())
      : res.status(404).type("html").send("<h1>Not Found</h1>"))
  ));

  router.get("/youth-development/parent-dashboard", (req, res) => (
    res.status(200).type("html").send(renderLiveYouthParentDashboardPage())
  ));
  router.get("/youth-development/program", (req, res) => (
    res.status(200).type("html").send(renderLiveYouthProgramPage())
  ));

  router.get("/youth-development/parent-dashboard/preview", (req, res) => {
    if (!isInternalSurfaceRequestAllowed(req)) {
      return res.status(404).type("html").send("<h1>Not Found</h1>");
    }
    const payload = buildPreviewPayload();
    const html = renderYouthDevelopmentParentDashboardPage(payload.page_model, {
      previewLabel: "Preview / test-only output (deterministic fixture, no production data)",
    });
    return res.status(200).type("html").send(html);
  });

  router.get("/api/youth-development/questions", (req, res) => {
    const flow = getQuestionFlowState({ answers: {} });
    return res.status(200).json({
      ok: true,
      bank_id: "youth_talent_development_parent_observation_screener_v1",
      bank_name: "Youth Talent Development Intake — Parent Observation Screener v1",
      respondent: "parent_guardian",
      instructions: YOUTH_PARENT_INSTRUCTIONS,
      question_count: YOUTH_QUESTION_BANK.length,
      questions: YOUTH_QUESTION_BANK,
      flow,
    });
  });

  router.post("/api/youth-development/assess", async (req, res) => {
    const validation = validateAnswers(req.body || {});
    if (!validation.ok) {
      return res.status(400).json({
        ok: false,
        error: "invalid_youth_intake_answers",
        validation_errors: validation.errors,
      });
    }
    try {
      const payload = buildYouthAssessPayload(validation.answers, {
        unansweredCount: validation.unanswered_question_ids.length,
      });
      const accountCtx = resolveRequestAccountContext(req, req.body || {});
      const childProfile = {
        child_id: safeTrim(req.body?.child_id || req.body?.childId) || null,
        child_name: safeTrim(req.body?.child_name || req.body?.childName) || null,
        child_age_band: safeTrim(req.body?.child_age_band || req.body?.childAgeBand) || null,
        child_grade_band: safeTrim(req.body?.child_grade_band || req.body?.childGradeBand) || null,
      };
      let ownership = {
        account_bound: false,
        tenant: accountCtx.tenant || null,
        email: accountCtx.email || null,
        child_profile: childProfile,
      };
      if (persistYouthAssessment && accountCtx.tenant && accountCtx.email) {
        const saved = await persistYouthAssessment({
          accountCtx,
          request: req,
          requestBody: req.body || {},
          responsePayload: payload,
          validation,
          answers: validation.answers,
          unansweredQuestionIds: validation.unanswered_question_ids,
        });
        if (saved && typeof saved === "object") ownership = Object.assign(ownership, saved);
      }
      return res.status(200).json({
        ok: true,
        question_count: YOUTH_QUESTION_BANK.length,
        answers_count: validation.answers.length,
        unanswered_count: validation.unanswered_question_ids.length,
        flow: getQuestionFlowState(req.body || {}),
        interpretation: payload.scoring.interpretation,
        completion: payload.scoring.completion,
        aggregated_trait_rows: payload.scoring.trait_rows,
        trait_reports: payload.trait_reports,
        result: payload.result,
        dashboard: payload.dashboard,
        page_model: payload.page_model,
        rendered_html: payload.rendered_html,
        ownership,
      });
    } catch (err) {
      console.error("youth_assess_failed", err);
      return res.status(500).json({
        ok: false,
        error: "youth_assess_failed",
      });
    }
  });

  router.get("/api/youth-development/parent-dashboard/latest", async (req, res) => {
    if (!loadLatestYouthAssessment) {
      return res.status(200).json({ ok: true, has_result: false, payload: null, reason: "persistence_not_enabled" });
    }
    const accountCtx = resolveRequestAccountContext(req, req.query || {});
    if (!accountCtx.tenant || !accountCtx.email) {
      return res.status(400).json({ ok: false, error: "tenant and email are required" });
    }
    try {
      const childId = safeTrim(req.query?.child_id || req.query?.childId);
      const latest = await loadLatestYouthAssessment({ accountCtx, request: req, childId });
      if (!latest) {
        return res.status(200).json({ ok: true, has_result: false, payload: null, child_id: childId || null });
      }
      return res.status(200).json({ ok: true, has_result: true, payload: latest, child_id: childId || latest?.ownership?.child_profile?.child_id || null });
    } catch (err) {
      console.error("youth_latest_lookup_failed", err);
      return res.status(500).json({ ok: false, error: "youth_latest_lookup_failed" });
    }
  });

  router.get("/api/youth-development/children", async (req, res) => {
    if (!listYouthChildProfiles) {
      return res.status(200).json({ ok: true, has_children: false, children: [], reason: "persistence_not_enabled" });
    }
    const accountCtx = resolveRequestAccountContext(req, req.query || {});
    if (!accountCtx.tenant || !accountCtx.email) {
      return res.status(400).json({ ok: false, error: "tenant and email are required" });
    }
    try {
      const children = await listYouthChildProfiles({ accountCtx, request: req });
      return res.status(200).json({ ok: true, has_children: children.length > 0, children });
    } catch (err) {
      console.error("youth_children_lookup_failed", err);
      return res.status(500).json({ ok: false, error: "youth_children_lookup_failed" });
    }
  });

  router.get("/api/youth-development/program/week-content", async (req, res) => {
    const childId = safeTrim(req.query?.child_id || req.query?.childId);
    const accountCtx = resolveRequestAccountContext(req, req.query || {});
    try {
      const [bridgeState, childProfiles] = await Promise.all([
        getProgramBridgeState
          ? getProgramBridgeState({ accountCtx, request: req, childId: childId || null })
          : Promise.resolve(null),
        (!childId && listYouthChildProfiles && accountCtx.tenant && accountCtx.email)
          ? listYouthChildProfiles({ accountCtx, request: req })
          : Promise.resolve([]),
      ]);
      const payload = buildProgramWeekContentState({
        bridgeState,
        childId,
        childProfiles: Array.isArray(childProfiles) ? childProfiles : [],
        executionState: getProgramWeekExecution
          ? await getProgramWeekExecution({
            accountCtx,
            request: req,
            childId,
            weekNumber: Number(bridgeState?.current_week || 1),
          })
          : null,
        planningState: getProgramWeekPlanning
          ? await getProgramWeekPlanning({
            accountCtx,
            request: req,
            childId,
            weekNumber: Number(bridgeState?.current_week || 1),
          })
          : null,
      });
      return res.status(200).json(payload);
    } catch (err) {
      console.error("youth_program_week_content_failed", err);
      return res.status(500).json({ ok: false, error: "youth_program_week_content_failed" });
    }
  });

  router.get("/api/youth-development/program/bridge", async (req, res) => {
    if (!getProgramBridgeState) {
      return res.status(200).json({ ok: true, launch_allowed: false, reason: "program_bridge_not_enabled" });
    }
    try {
      const childId = safeTrim(req.query?.child_id || req.query?.childId);
      const accountCtx = resolveRequestAccountContext(req, req.body || {});
      const state = await getProgramBridgeState({ accountCtx, request: req, childId });
      return res.status(200).json(state || { ok: true, launch_allowed: false, reason: "program_state_unavailable" });
    } catch (err) {
      console.error("youth_program_bridge_failed", err);
      return res.status(500).json({ ok: false, error: "youth_program_bridge_failed" });
    }
  });

  router.post("/api/youth-development/program/launch", async (req, res) => {
    if (!launchProgramForChild) {
      return res.status(200).json({ ok: true, launch_allowed: false, reason: "program_launch_not_enabled" });
    }
    try {
      const childId = safeTrim(req.body?.child_id || req.body?.childId || req.query?.child_id || req.query?.childId);
      const accountCtx = resolveRequestAccountContext(req, req.body || {});
      const launched = await launchProgramForChild({ accountCtx, request: req, childId });
      return res.status(200).json(launched || { ok: false, error: "program_launch_unavailable" });
    } catch (err) {
      console.error("youth_program_launch_failed", err);
      return res.status(500).json({ ok: false, error: "youth_program_launch_failed" });
    }
  });

  router.post("/api/youth-development/program/week-execution", async (req, res) => {
    if (!saveProgramWeekExecution) {
      return res.status(200).json({ ok: false, error: "week_execution_not_enabled" });
    }
    try {
      const accountCtx = resolveRequestAccountContext(req, req.body || {});
      const childId = safeTrim(req.body?.child_id || req.body?.childId || req.query?.child_id || req.query?.childId);
      const actionTypeRaw = safeTrim(req.body?.action_type || req.body?.actionType);
      const normalizedActionType = actionTypeRaw === "continue_next_step" ? "continue_to_next_step" : actionTypeRaw;
      const validation = validateWeeklyExecutionActionPayload({
        tenant: accountCtx.tenant,
        email: accountCtx.email,
        child_id: childId,
        week_number: Number(req.body?.week_number || req.body?.weekNumber || 1),
        action_type: normalizedActionType,
        step_key: safeTrim(req.body?.step_key || req.body?.stepKey),
        note: String(req.body?.note || ""),
      });
      if (!validation.ok) {
        return res.status(200).json({
          ok: false,
          error: "week_execution_contract_invalid",
          messages: validation.errors,
          allowed_actions: WEEKLY_EXECUTION_ACTIONS,
        });
      }
      const result = await saveProgramWeekExecution({
        accountCtx,
        request: req,
        childId,
        weekNumber: validation.normalized.week_number,
        actionType: validation.normalized.action_type,
        stepKey: validation.normalized.step_key,
        note: validation.normalized.note,
      });
      return res.status(200).json(result);
    } catch (err) {
      console.error("youth_program_week_execution_failed", err);
      return res.status(500).json({ ok: false, error: "youth_program_week_execution_failed" });
    }
  });

  router.post("/api/youth-development/program/commitment", async (req, res) => {
    if (!saveProgramCommitmentPlan) return res.status(200).json({ ok: false, error: "commitment_plan_not_enabled" });
    try {
      const accountCtx = resolveRequestAccountContext(req, req.body || {});
      const childId = safeTrim(req.body?.child_id || req.body?.childId);
      const result = await saveProgramCommitmentPlan({ accountCtx, request: req, childId, commitment: req.body || {} });
      return res.status(200).json(result);
    } catch (err) {
      console.error("youth_program_commitment_save_failed", err);
      return res.status(500).json({ ok: false, error: "youth_program_commitment_save_failed" });
    }
  });

  router.post("/api/youth-development/program/session-plan", async (req, res) => {
    if (!saveProgramSessionPlan) return res.status(200).json({ ok: false, error: "session_plan_not_enabled" });
    try {
      const accountCtx = resolveRequestAccountContext(req, req.body || {});
      const childId = safeTrim(req.body?.child_id || req.body?.childId);
      const weekNumber = Number(req.body?.week_number || req.body?.weekNumber || 1);
      const result = await saveProgramSessionPlan({ accountCtx, request: req, childId, weekNumber, payload: req.body || {} });
      return res.status(200).json(result);
    } catch (err) {
      console.error("youth_program_session_plan_save_failed", err);
      return res.status(500).json({ ok: false, error: "youth_program_session_plan_save_failed" });
    }
  });

  router.post("/api/youth-development/program/session-complete", async (req, res) => {
    if (!markProgramSessionComplete) return res.status(200).json({ ok: false, error: "session_complete_not_enabled" });
    try {
      const accountCtx = resolveRequestAccountContext(req, req.body || {});
      const childId = safeTrim(req.body?.child_id || req.body?.childId);
      const weekNumber = Number(req.body?.week_number || req.body?.weekNumber || 1);
      const sessionId = safeTrim(req.body?.session_id || req.body?.sessionId);
      const result = await markProgramSessionComplete({ accountCtx, request: req, childId, weekNumber, sessionId });
      return res.status(200).json(result);
    } catch (err) {
      console.error("youth_program_session_complete_failed", err);
      return res.status(500).json({ ok: false, error: "youth_program_session_complete_failed" });
    }
  });

  router.get("/api/youth-development/parent-dashboard/preview", (req, res) => {
    if (!isInternalSurfaceRequestAllowed(req)) {
      return res.status(404).json({ ok: false, error: "not_found" });
    }
    const payload = buildPreviewPayload();
    return res.status(200).json({
      preview: true,
      test_only: true,
      notes: [
        "Deterministic fixture data only.",
        "No database access.",
        "No tenant writes.",
      ],
      ...payload,
    });
  });

  return router;
}

module.exports = {
  createYouthDevelopmentRouter,
  PREVIEW_AGGREGATED_ROWS,
  INTAKE_TEST_FIXTURE,
};
