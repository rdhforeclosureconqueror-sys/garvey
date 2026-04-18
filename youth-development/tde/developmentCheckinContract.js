"use strict";

const FORBIDDEN_LANGUAGE_TOKENS = Object.freeze([
  "right",
  "wrong",
  "correct",
  "incorrect",
  "grade",
  "quiz",
  "test score",
]);

const DEVELOPMENT_CHECKIN_CONTRACT = Object.freeze({
  contract_id: "phase10_development_checkin_contract_v1",
  extension_only: true,
  deterministic: true,
  cadence_weeks: 2,
  required_sections: Object.freeze([
    "performance_based_prompts",
    "reflection_prompts",
    "optional_transfer_task",
    "parent_observation_input",
  ]),
  safeguards: Object.freeze([
    "no_single_source_scoring",
    "minimum_two_evidence_sources_before_trait_update",
    "developmental_language_only",
    "traceable_evidence_mapping_required",
  ]),
});

function containsForbiddenLanguage(text) {
  const normalized = String(text || "").toLowerCase();
  return FORBIDDEN_LANGUAGE_TOKENS.some((token) => normalized.includes(token));
}

function validateDevelopmentCheckinContract(payload = {}) {
  const errors = [];

  const checkin = payload.checkin || {};
  const prompts = checkin.prompts || {};
  const performancePrompts = Array.isArray(prompts.performance_based_prompts) ? prompts.performance_based_prompts : [];
  const reflectionPrompts = Array.isArray(prompts.reflection_prompts) ? prompts.reflection_prompts : [];
  const parentPrompt = prompts.parent_observation_input || null;

  if (!Number.isInteger(Number(checkin.program_week)) || Number(checkin.program_week) <= 0) {
    errors.push("program_week_invalid");
  }

  if (checkin.checkin_due !== true) {
    errors.push("checkin_not_due_for_program_week");
  }

  if (performancePrompts.length < 2) errors.push("performance_based_prompts_minimum_two_required");
  if (reflectionPrompts.length < 1) errors.push("reflection_prompts_required");
  if (!parentPrompt || !String(parentPrompt.prompt_id || "").trim()) errors.push("parent_observation_input_required");

  const allPromptText = [
    ...performancePrompts.map((entry) => entry.prompt_text),
    ...reflectionPrompts.map((entry) => entry.prompt_text),
    prompts.optional_transfer_task?.prompt_text,
    parentPrompt?.prompt_text,
  ];

  if (allPromptText.some((text) => containsForbiddenLanguage(text))) {
    errors.push("developmental_language_violation");
  }

  const evidenceMap = Array.isArray(payload.evidence_map) ? payload.evidence_map : [];
  if (!evidenceMap.length) {
    errors.push("traceable_evidence_mapping_required");
  }

  const missingTraceRefs = evidenceMap.some((entry) => !String(entry.trace_ref || "").trim() || !String(entry.evidence_id || "").trim());
  if (missingTraceRefs) {
    errors.push("traceable_evidence_mapping_incomplete");
  }

  const sourceSet = new Set(evidenceMap.map((entry) => `${entry.source_type || ""}:${entry.source_id || ""}`));
  if (sourceSet.size < 2) errors.push("minimum_two_evidence_sources_required");

  const sourceActors = new Set(evidenceMap.map((entry) => String(entry.source_actor || "").toLowerCase()));
  if (!sourceActors.has("child") || !sourceActors.has("parent")) {
    errors.push("multi_signal_capture_child_parent_required");
  }

  return {
    ok: errors.length === 0,
    errors,
    contract_id: DEVELOPMENT_CHECKIN_CONTRACT.contract_id,
    safeguards_enforced: DEVELOPMENT_CHECKIN_CONTRACT.safeguards,
  };
}

module.exports = {
  DEVELOPMENT_CHECKIN_CONTRACT,
  validateDevelopmentCheckinContract,
  containsForbiddenLanguage,
};
