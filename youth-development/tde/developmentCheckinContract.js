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
  contract_id: "phase12_development_checkin_contract_v2",
  extension_only: true,
  deterministic: true,
  cadence_weeks: 1,
  required_sections: Object.freeze([
    "performance_prompt",
    "reflection_prompt",
    "optional_transfer_prompt",
    "parent_observation_prompt",
  ]),
  safeguards: Object.freeze([
    "no_single_source_scoring",
    "minimum_two_evidence_sources_before_trait_update",
    "developmental_language_only",
    "no_binary_correctness_outputs",
    "traceable_evidence_mapping_required",
  ]),
});

const VOICE_READY_SCHEMA_RULES = Object.freeze({
  contract_id: "phase12_voice_ready_prompt_schema_v1",
  extension_only: true,
  deterministic: true,
  applies_to: Object.freeze([
    "development_checkin_prompts",
    "scenario_items",
    "reflection_prompts",
    "parent_report_sections",
  ]),
  required_fields: Object.freeze([
    "voice_ready",
    "voice_text",
    "voice_pacing",
    "voice_chunk_id",
  ]),
  constraints: Object.freeze({
    max_sentences_per_chunk: 2,
    max_length_key: "CALIBRATION_VARIABLES.voice_architecture.voice_chunk_max_length",
    replay_safe_required: true,
    vocabulary_must_match_age_band: true,
  }),
});

function containsForbiddenLanguage(text) {
  const normalized = String(text || "").toLowerCase();
  return FORBIDDEN_LANGUAGE_TOKENS.some((token) => normalized.includes(token));
}

function validateDevelopmentCheckinContract(payload = {}) {
  const errors = [];

  const checkin = payload.checkin || {};
  const prompts = checkin.prompts || {};
  const performancePrompt = prompts.performance_prompt || null;
  const reflectionPrompt = prompts.reflection_prompt || null;
  const transferPrompt = prompts.optional_transfer_prompt || null;
  const parentPrompt = prompts.parent_observation_prompt || null;

  if (!Number.isInteger(Number(checkin.program_week)) || Number(checkin.program_week) <= 0) {
    errors.push("program_week_invalid");
  }

  if (checkin.checkin_due !== true) {
    errors.push("checkin_not_due_for_program_week");
  }

  if (!performancePrompt || !String(performancePrompt.prompt_id || "").trim()) errors.push("performance_prompt_required");
  if (!reflectionPrompt || !String(reflectionPrompt.prompt_id || "").trim()) errors.push("reflection_prompt_required");
  if (!parentPrompt || !String(parentPrompt.prompt_id || "").trim()) errors.push("parent_observation_prompt_required");

  const allPromptText = [
    performancePrompt?.prompt_text,
    reflectionPrompt?.prompt_text,
    transferPrompt?.prompt_text,
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
  const promptTypes = new Set(evidenceMap.map((entry) => String(entry.prompt_type || "").toLowerCase()));
  const hasChildParent = sourceActors.has("child") && sourceActors.has("parent");
  const hasTaskReflection = promptTypes.has("performance") && promptTypes.has("reflection");
  if (!hasChildParent && !hasTaskReflection) {
    errors.push("minimum_two_evidence_contributors_required");
  }

  const promptRows = [performancePrompt, reflectionPrompt, transferPrompt, parentPrompt].filter(Boolean);
  const invalidPromptShape = promptRows.some((prompt) => {
    const targetTraits = Array.isArray(prompt.target_traits) ? prompt.target_traits : [];
    return !String(prompt.prompt_id || "").trim()
      || !["performance", "reflection", "transfer", "observation"].includes(String(prompt.prompt_type || ""))
      || targetTraits.length < 1
      || !String(prompt.age_band || "").trim()
      || typeof prompt.voice_ready !== "boolean";
  });
  if (invalidPromptShape) {
    errors.push("prompt_schema_invalid");
  }

  const binaryScoringFound = evidenceMap.some((entry) => {
    const normalized = String(entry.raw_response || "").toLowerCase();
    return normalized.includes("correct") || normalized.includes("incorrect");
  });
  if (binaryScoringFound) {
    errors.push("binary_correctness_language_detected");
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
  VOICE_READY_SCHEMA_RULES,
  validateDevelopmentCheckinContract,
  containsForbiddenLanguage,
};
