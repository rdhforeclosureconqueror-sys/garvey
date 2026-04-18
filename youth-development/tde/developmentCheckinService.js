"use strict";

const { deterministicId, DEFAULT_CALIBRATION_VERSION, EVIDENCE_STATUS_TAG } = require("./constants");
const { validateDevelopmentCheckinContract } = require("./developmentCheckinContract");
const { extractSignalsFromEvidence } = require("./signalExtractionService");
const { scoreTraitsFromSignals } = require("./traitScoringService");

const PERFORMANCE_PROMPT_BANK = Object.freeze([
  Object.freeze({ trait_code: "SR", signal_type: "strategy_use_presence", prompt_text: "Show how you chose a strategy before starting and what helped you keep using it." }),
  Object.freeze({ trait_code: "PS", signal_type: "reengagement_latency", prompt_text: "When the task felt hard, describe what you did to re-engage and keep going." }),
  Object.freeze({ trait_code: "RS", signal_type: "justification_quality", prompt_text: "Walk through how you decided what to try first and why it made sense." }),
  Object.freeze({ trait_code: "CQ", signal_type: "inquiry_depth", prompt_text: "Share one question you asked yourself that opened a new way to explore the activity." }),
]);

const REFLECTION_PROMPT_BANK = Object.freeze([
  Object.freeze({ trait_code: "DE", signal_type: "domain_commitment_language", prompt_text: "What felt meaningful about this work for your growth this week?" }),
  Object.freeze({ trait_code: "FB", signal_type: "improvement_delta", prompt_text: "What changed between your first attempt and your latest attempt?" }),
]);

const TRANSFER_PROMPT = Object.freeze({
  trait_code: "CR",
  signal_type: "attempt_quality_change",
  prompt_text: "Optional transfer: try the same strategy in a different setting and note what shifted.",
});

const PARENT_PROMPT = Object.freeze({
  trait_code: "SR",
  signal_type: "context_consistency",
  prompt_text: "Parent observation: describe what you noticed about the child's approach, persistence, and support needs across contexts.",
});

function toWeek(value) {
  const week = Number(value);
  if (!Number.isFinite(week)) return 0;
  return Math.floor(week);
}

function isBiweeklyCheckinDue(programWeek) {
  return programWeek > 0 && (programWeek % 2 === 0);
}

function buildPromptId(checkinId, prefix, seed) {
  return deterministicId(prefix, { checkin_id: checkinId, seed });
}

function generateDevelopmentCheckin(payload = {}) {
  const childId = String(payload.child_id || "").trim();
  const programWeek = toWeek(payload.program_week);
  const checkinDue = isBiweeklyCheckinDue(programWeek);
  const calibrationVersion = String(payload.calibration_version || DEFAULT_CALIBRATION_VERSION);

  const checkinId = deterministicId("checkin", {
    child_id: childId,
    program_week: programWeek,
    calibration_version: calibrationVersion,
  });

  const perfStart = programWeek % PERFORMANCE_PROMPT_BANK.length;
  const performance_based_prompts = [
    PERFORMANCE_PROMPT_BANK[perfStart],
    PERFORMANCE_PROMPT_BANK[(perfStart + 1) % PERFORMANCE_PROMPT_BANK.length],
  ].map((entry, idx) => ({
    prompt_id: buildPromptId(checkinId, "cp", `${entry.trait_code}_${idx}`),
    prompt_type: "performance_based",
    ...entry,
  }));

  const reflectionStart = programWeek % REFLECTION_PROMPT_BANK.length;
  const reflection_prompts = [
    REFLECTION_PROMPT_BANK[reflectionStart],
  ].map((entry, idx) => ({
    prompt_id: buildPromptId(checkinId, "cr", `${entry.trait_code}_${idx}`),
    prompt_type: "reflection",
    ...entry,
  }));

  const optional_transfer_task = (programWeek % 4 === 0)
    ? {
        prompt_id: buildPromptId(checkinId, "ct", `transfer_${programWeek}`),
        prompt_type: "transfer_optional",
        ...TRANSFER_PROMPT,
      }
    : null;

  const parent_observation_input = {
    prompt_id: buildPromptId(checkinId, "parent", `parent_${programWeek}`),
    prompt_type: "parent_observation",
    ...PARENT_PROMPT,
  };

  return {
    checkin_id: checkinId,
    child_id: childId,
    program_week: programWeek,
    checkin_due: checkinDue,
    cadence_weeks: 2,
    calibration_version: calibrationVersion,
    prompts: {
      performance_based_prompts,
      reflection_prompts,
      optional_transfer_task,
      parent_observation_input,
    },
    developmental_framing: "developmental_snapshot_not_quiz",
    deterministic: true,
    extension_only: true,
  };
}

function toEvidenceEntries(checkin, payload = {}) {
  const responses = payload.responses || {};
  const childResponses = Array.isArray(responses.child) ? responses.child : [];
  const parentResponse = responses.parent || null;
  const transferResponse = responses.transfer || null;

  const promptById = new Map();
  const allPromptRows = [
    ...checkin.prompts.performance_based_prompts,
    ...checkin.prompts.reflection_prompts,
    checkin.prompts.optional_transfer_task,
    checkin.prompts.parent_observation_input,
  ].filter(Boolean);

  for (const prompt of allPromptRows) promptById.set(prompt.prompt_id, prompt);

  const evidence = [];

  for (const response of childResponses) {
    const prompt = promptById.get(String(response.prompt_id || "").trim());
    if (!prompt) continue;
    const observedAt = String(response.observed_at || payload.completed_at || new Date().toISOString());
    const responseText = String(response.response_text || "").trim();
    evidence.push({
      evidence_id: deterministicId("checkin_evidence", { checkin_id: checkin.checkin_id, prompt_id: prompt.prompt_id, source_actor: "child", response_text: responseText }),
      child_id: checkin.child_id,
      session_id: checkin.checkin_id,
      source_type: "development_checkin",
      source_id: `child:${checkin.child_id}`,
      source_actor: "child",
      signal_type: prompt.signal_type,
      trait_code: prompt.trait_code,
      value: Number.isFinite(Number(response.value)) ? Number(response.value) : 3,
      value_min: 0,
      value_max: 4,
      confidence_weight: Number.isFinite(Number(response.confidence_weight)) ? Number(response.confidence_weight) : 0.65,
      evidence_status_tag: EVIDENCE_STATUS_TAG.OPERATIONAL_SYSTEM_CONSTRUCT,
      prompt_id: prompt.prompt_id,
      raw_response: responseText,
      observed_at: observedAt,
      trace_ref: deterministicId("checkin_trace", { checkin_id: checkin.checkin_id, prompt_id: prompt.prompt_id, observed_at: observedAt, source_actor: "child" }),
    });
  }

  if (transferResponse && checkin.prompts.optional_transfer_task && String(transferResponse.response_text || "").trim()) {
    const prompt = checkin.prompts.optional_transfer_task;
    const observedAt = String(transferResponse.observed_at || payload.completed_at || new Date().toISOString());
    evidence.push({
      evidence_id: deterministicId("checkin_evidence", { checkin_id: checkin.checkin_id, prompt_id: prompt.prompt_id, source_actor: "child_transfer", response_text: transferResponse.response_text }),
      child_id: checkin.child_id,
      session_id: checkin.checkin_id,
      source_type: "development_checkin",
      source_id: `child:${checkin.child_id}:transfer`,
      source_actor: "child",
      signal_type: prompt.signal_type,
      trait_code: prompt.trait_code,
      value: Number.isFinite(Number(transferResponse.value)) ? Number(transferResponse.value) : 3,
      value_min: 0,
      value_max: 4,
      confidence_weight: Number.isFinite(Number(transferResponse.confidence_weight)) ? Number(transferResponse.confidence_weight) : 0.6,
      evidence_status_tag: EVIDENCE_STATUS_TAG.OPERATIONAL_SYSTEM_CONSTRUCT,
      prompt_id: prompt.prompt_id,
      raw_response: String(transferResponse.response_text || "").trim(),
      observed_at: observedAt,
      trace_ref: deterministicId("checkin_trace", { checkin_id: checkin.checkin_id, prompt_id: prompt.prompt_id, observed_at: observedAt, source_actor: "child_transfer" }),
    });
  }

  if (parentResponse && String(parentResponse.response_text || "").trim()) {
    const prompt = checkin.prompts.parent_observation_input;
    const observedAt = String(parentResponse.observed_at || payload.completed_at || new Date().toISOString());
    evidence.push({
      evidence_id: deterministicId("checkin_evidence", { checkin_id: checkin.checkin_id, prompt_id: prompt.prompt_id, source_actor: "parent", response_text: parentResponse.response_text }),
      child_id: checkin.child_id,
      session_id: checkin.checkin_id,
      source_type: "development_checkin",
      source_id: `parent:${String(parentResponse.parent_id || "parent_observer").trim() || "parent_observer"}`,
      source_actor: "parent",
      signal_type: prompt.signal_type,
      trait_code: prompt.trait_code,
      value: Number.isFinite(Number(parentResponse.value)) ? Number(parentResponse.value) : 3,
      value_min: 0,
      value_max: 4,
      confidence_weight: Number.isFinite(Number(parentResponse.confidence_weight)) ? Number(parentResponse.confidence_weight) : 0.7,
      evidence_status_tag: EVIDENCE_STATUS_TAG.OPERATIONAL_SYSTEM_CONSTRUCT,
      prompt_id: prompt.prompt_id,
      raw_response: String(parentResponse.response_text || "").trim(),
      observed_at: observedAt,
      trace_ref: deterministicId("checkin_trace", { checkin_id: checkin.checkin_id, prompt_id: prompt.prompt_id, observed_at: observedAt, source_actor: "parent" }),
    });
  }

  evidence.sort((a, b) => `${a.evidence_id}`.localeCompare(`${b.evidence_id}`));
  return evidence;
}

async function runDevelopmentCheckin(payload = {}, repository) {
  const checkin = generateDevelopmentCheckin(payload);
  if (!checkin.child_id) {
    return { ok: false, error: "child_id_required", deterministic: true, extension_only: true };
  }

  const evidenceMap = toEvidenceEntries(checkin, payload);
  const contractValidation = validateDevelopmentCheckinContract({ checkin, evidence_map: evidenceMap });
  if (!contractValidation.ok) {
    return {
      ok: false,
      error: "development_checkin_contract_invalid",
      validation_errors: contractValidation.errors,
      checkin,
      deterministic: true,
      extension_only: true,
    };
  }

  const record = {
    ...checkin,
    completed_at: String(payload.completed_at || new Date().toISOString()),
    evidence_map: evidenceMap,
    evidence_source_type: "development_checkin",
    pipeline_evidence_link: {
      source_type: "development_checkin",
      source_id: checkin.checkin_id,
      confidence_contribution_supported: true,
      non_override_policy: "additive_distinct_source",
      traceable_to_raw_response: true,
    },
  };

  const persistence = await repository.persistDevelopmentCheckin(record);
  const extraction = extractSignalsFromEvidence({
    child_id: checkin.child_id,
    session_id: checkin.checkin_id,
    calibration_version: checkin.calibration_version,
    evidence: evidenceMap,
  });
  const scoringPreview = scoreTraitsFromSignals(extraction.extracted_signals, {
    adherence_context: payload.adherence_context || {},
  });

  return {
    ok: true,
    checkin: record,
    pipeline_integration: {
      source_type: "development_checkin",
      extracted_signals: extraction.extracted_signals,
      rejected_evidence: extraction.rejected_evidence,
      trait_confidence_preview: scoringPreview.trait_results.map((entry) => ({
        trait_code: entry.trait_code,
        evidence_sufficiency_status: entry.evidence_sufficiency_status,
        confidence_score: entry.confidence_score,
        reported_trait_score: entry.reported_trait_score,
      })),
      non_override_policy: "does_not_replace_session_or_intervention_evidence",
    },
    persistence,
    deterministic: true,
    extension_only: true,
  };
}

async function listDevelopmentCheckins(childId, repository) {
  const checkins = await repository.listDevelopmentCheckins(String(childId || ""));
  return {
    ok: true,
    child_id: String(childId || ""),
    checkins,
    deterministic: true,
    extension_only: true,
  };
}

module.exports = {
  generateDevelopmentCheckin,
  runDevelopmentCheckin,
  listDevelopmentCheckins,
  isBiweeklyCheckinDue,
};
