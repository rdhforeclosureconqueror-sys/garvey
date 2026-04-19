"use strict";

const { deterministicId, DEFAULT_CALIBRATION_VERSION, EVIDENCE_STATUS_TAG, CALIBRATION_VARIABLES } = require("./constants");
const { validateDevelopmentCheckinContract } = require("./developmentCheckinContract");
const { extractSignalsFromEvidence } = require("./signalExtractionService");
const { scoreTraitsFromSignals } = require("./traitScoringService");
const { registerVoiceReadableContentBlock } = require("./voiceContentRegistry");
const { pickWeeklyCheckinItems } = require("../content/assessmentContentBanks");

function toWeek(value) {
  const week = Number(value);
  if (!Number.isFinite(week)) return 0;
  return Math.floor(week);
}

function isWeeklyCheckinDue(programWeek) {
  return programWeek > 0;
}

function buildPromptId(checkinId, prefix, seed) {
  return deterministicId(prefix, { checkin_id: checkinId, seed });
}

function generateDevelopmentCheckin(payload = {}) {
  const childId = String(payload.child_id || "").trim();
  const programWeek = toWeek(payload.program_week);
  const checkinDue = isWeeklyCheckinDue(programWeek);
  const calibrationVersion = String(payload.calibration_version || DEFAULT_CALIBRATION_VERSION);

  const checkinId = deterministicId("checkin", {
    child_id: childId,
    program_week: programWeek,
    calibration_version: calibrationVersion,
  });

  const ageBand = String(payload.age_band || "8-10").trim() || "8-10";
  const voiceChunkLimit = Number(CALIBRATION_VARIABLES.voice_architecture.voice_chunk_max_length || 180);
  const cleanVoiceText = (text) => String(text || "").trim().split(/\s+/).slice(0, Math.max(1, Math.floor(voiceChunkLimit / 6))).join(" ");
  const registerPromptVoiceContent = (promptKey, promptText, voiceReady = true, voicePacing = "short") => {
    return registerVoiceReadableContentBlock({
      section_key: promptKey,
      text_content: promptText,
      voice_ready: voiceReady,
      voice_text: cleanVoiceText(promptText),
      voice_pacing: voicePacing,
      age_band: ageBand,
      playback_optional: true,
    }, { scope: "development_checkin_prompt", child_id: childId });
  };
  const authoredPrompts = pickWeeklyCheckinItems({ week: programWeek, age_band: ageBand });
  const performanceEntry = authoredPrompts.performance_prompt || {};
  const performanceVoice = registerPromptVoiceContent("performance_prompt", performanceEntry.prompt_text, true, "short");
  const performance_prompt = {
    prompt_id: buildPromptId(checkinId, "cp", `${performanceEntry.item_id || "perf"}_${programWeek}`),
    prompt_type: "performance",
    prompt_text: performanceEntry.prompt_text,
    trait_code: performanceEntry.target_traits?.[0] || "SR",
    signal_type: performanceEntry.signal_type || "strategy_use_presence",
    target_traits: performanceEntry.target_traits || ["SR"],
    source_module: performanceEntry.source_module || "youth-development/tde/developmentCheckinService",
    content_version: performanceEntry.content_version || calibrationVersion,
    age_band: ageBand,
    voice_ready: performanceVoice.voice_ready,
    voice_text: performanceVoice.voice_text,
    voice_pacing: "short",
    voice_chunk_id: performanceVoice.voice_chunk_id,
    readability_registration: performanceVoice,
  };

  const reflectionEntry = authoredPrompts.reflection_prompt || {};
  const reflectionVoice = registerPromptVoiceContent("reflection_prompt", reflectionEntry.prompt_text, true, "short");
  const reflection_prompt = {
    prompt_id: buildPromptId(checkinId, "cr", `${reflectionEntry.item_id || "reflection"}_${programWeek}`),
    prompt_type: "reflection",
    prompt_text: reflectionEntry.prompt_text,
    trait_code: reflectionEntry.target_traits?.[0] || "FB",
    signal_type: reflectionEntry.signal_type || "improvement_delta",
    target_traits: reflectionEntry.target_traits || ["FB"],
    source_module: reflectionEntry.source_module || "youth-development/tde/developmentCheckinService",
    content_version: reflectionEntry.content_version || calibrationVersion,
    age_band: ageBand,
    voice_ready: reflectionVoice.voice_ready,
    voice_text: reflectionVoice.voice_text,
    voice_pacing: "short",
    voice_chunk_id: reflectionVoice.voice_chunk_id,
    readability_registration: reflectionVoice,
  };

  const transferEntry = authoredPrompts.optional_transfer_prompt;
  const optional_transfer_prompt = transferEntry
    ? {
        ...(() => {
          const transferVoice = registerPromptVoiceContent("optional_transfer_prompt", transferEntry.prompt_text, true, "medium");
          return {
            voice_ready: transferVoice.voice_ready,
            voice_text: transferVoice.voice_text,
            voice_chunk_id: transferVoice.voice_chunk_id,
            readability_registration: transferVoice,
          };
        })(),
        prompt_id: buildPromptId(checkinId, "ct", `${transferEntry.item_id || "transfer"}_${programWeek}`),
        prompt_type: "transfer",
        prompt_text: transferEntry.prompt_text,
        trait_code: transferEntry.target_traits?.[0] || "CR",
        signal_type: transferEntry.signal_type || "attempt_quality_change",
        target_traits: transferEntry.target_traits || ["CR"],
        source_module: transferEntry.source_module || "youth-development/tde/developmentCheckinService",
        content_version: transferEntry.content_version || calibrationVersion,
        age_band: ageBand,
        voice_pacing: "medium",
      }
    : null;

  const parentEntry = authoredPrompts.parent_observation_prompt || {};
  const parentVoice = registerPromptVoiceContent("parent_observation_prompt", parentEntry.prompt_text, false, "short");
  const parent_observation_prompt = {
    prompt_id: buildPromptId(checkinId, "parent", `${parentEntry.item_id || "parent"}_${programWeek}`),
    prompt_type: "observation",
    prompt_text: parentEntry.prompt_text,
    trait_code: parentEntry.target_traits?.[0] || "SR",
    signal_type: parentEntry.signal_type || "context_consistency",
    target_traits: parentEntry.target_traits || ["SR"],
    source_module: parentEntry.source_module || "youth-development/tde/developmentCheckinService",
    content_version: parentEntry.content_version || calibrationVersion,
    age_band: ageBand,
    voice_ready: parentVoice.voice_ready,
    voice_text: parentVoice.voice_text,
    voice_pacing: "short",
    voice_chunk_id: parentVoice.voice_chunk_id,
    readability_registration: parentVoice,
  };

  return {
    checkin_id: checkinId,
    child_id: childId,
    program_week: programWeek,
    checkin_due: checkinDue,
    cadence_weeks: 1,
    target_duration_minutes: Number(CALIBRATION_VARIABLES.developmental_checkins.weekly_checkin_max_duration_minutes || 5),
    calibration_version: calibrationVersion,
    prompts: {
      performance_prompt,
      reflection_prompt,
      optional_transfer_prompt,
      parent_observation_prompt,
    },
    developmental_framing: "weekly_micro_checkin_developmental_snapshot",
    right_wrong_scoring_disabled: true,
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
    checkin.prompts.performance_prompt,
    checkin.prompts.reflection_prompt,
    checkin.prompts.optional_transfer_prompt,
    checkin.prompts.parent_observation_prompt,
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
        prompt_type: prompt.prompt_type,
        raw_response: responseText,
      observed_at: observedAt,
      trace_ref: deterministicId("checkin_trace", { checkin_id: checkin.checkin_id, prompt_id: prompt.prompt_id, observed_at: observedAt, source_actor: "child" }),
    });
  }

  if (transferResponse && checkin.prompts.optional_transfer_prompt && String(transferResponse.response_text || "").trim()) {
    const prompt = checkin.prompts.optional_transfer_prompt;
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
      prompt_type: prompt.prompt_type,
      raw_response: String(transferResponse.response_text || "").trim(),
      observed_at: observedAt,
      trace_ref: deterministicId("checkin_trace", { checkin_id: checkin.checkin_id, prompt_id: prompt.prompt_id, observed_at: observedAt, source_actor: "child_transfer" }),
    });
  }

  if (parentResponse && String(parentResponse.response_text || "").trim()) {
    const prompt = checkin.prompts.parent_observation_prompt;
    const observedAt = String(parentResponse.observed_at || payload.completed_at || new Date().toISOString());
    const normalizedObservation = {
      observed_effort: Number.isFinite(Number(parentResponse.observed_effort)) ? Number(parentResponse.observed_effort) : 3,
      observed_persistence: Number.isFinite(Number(parentResponse.observed_persistence)) ? Number(parentResponse.observed_persistence) : 3,
      support_need_level: Number.isFinite(Number(parentResponse.support_need_level)) ? Number(parentResponse.support_need_level) : 2,
    };
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
      prompt_type: prompt.prompt_type,
      raw_response: String(parentResponse.response_text || "").trim(),
      normalized_observation: normalizedObservation,
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
      requires_additional_source_for_trait_scoring: true,
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
      requires_additional_source_for_trait_scoring: true,
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

function summarizeDevelopmentCheckins(checkins = [], options = {}) {
  const sorted = [...checkins].sort((a, b) => `${a.completed_at || ""}`.localeCompare(`${b.completed_at || ""}`));
  const historyCount = sorted.length;
  const latest = sorted.at(-1) || null;
  const prior = sorted.at(-2) || null;
  const currentWeek = Number(options.current_week || latest?.program_week || 1);
  const nextExpectedWeek = currentWeek + 1;

  const traceableEntries = sorted.flatMap((entry) => Array.isArray(entry.evidence_map) ? entry.evidence_map : []);
  const traceabilityRatio = traceableEntries.length
    ? traceableEntries.filter((entry) => Boolean(entry.trace_ref) && Boolean(entry.prompt_id)).length / traceableEntries.length
    : 0;

  const latestEvidence = Array.isArray(latest?.evidence_map) ? latest.evidence_map : [];
  const priorEvidence = Array.isArray(prior?.evidence_map) ? prior.evidence_map : [];
  const average = (rows) => rows.length ? rows.reduce((sum, row) => sum + Number(row.value || 0), 0) / rows.length : 0;
  const bySignal = (rows, signalType) => rows.filter((row) => row.signal_type === signalType);
  const reflectionDelta = Number((average(bySignal(latestEvidence, "improvement_delta")) - average(bySignal(priorEvidence, "improvement_delta"))).toFixed(3));
  const transferLatest = average(bySignal(latestEvidence, "attempt_quality_change"));

  const childRows = latestEvidence.filter((entry) => entry.source_actor === "child");
  const parentRows = latestEvidence.filter((entry) => entry.source_actor === "parent");
  const disagreementDelta = Math.abs(average(childRows) - average(parentRows));
  const disagreementThreshold = Number(CALIBRATION_VARIABLES.developmental_checkins.disagreement_max_delta || 0.35);
  const disagreement = parentRows.length && childRows.length && disagreementDelta > disagreementThreshold;

  const consistencyRatio = historyCount
    ? sorted.filter((entry) => entry.checkin_due === true).length / historyCount
    : 0;
  const sufficientHistory = historyCount >= Number(CALIBRATION_VARIABLES.developmental_checkins.minimum_history_for_sufficiency || 2);
  const sufficientTraceability = traceabilityRatio >= Number(CALIBRATION_VARIABLES.developmental_checkins.minimum_traceability_ratio || 0.9);
  const sufficientConsistency = consistencyRatio >= Number(CALIBRATION_VARIABLES.developmental_checkins.consistency_min_completed_ratio || 0.5);
  const sufficientEvidence = sufficientHistory && sufficientTraceability && sufficientConsistency;

  return {
    ok: true,
    deterministic: true,
    extension_only: true,
    checkin_history_count: historyCount,
    next_expected_checkin: {
      expected_program_week: nextExpectedWeek,
      cadence_weeks: 1,
      status: latest && currentWeek <= Number(latest.program_week || 0) ? "awaiting_completion" : "scheduled",
    },
    latest_checkin_summary: latest
      ? {
          checkin_id: latest.checkin_id,
          program_week: latest.program_week,
          completed_at: latest.completed_at,
          developmental_summary: "Latest developmental snapshot combines child performance reflections and parent observation context.",
        }
      : null,
    changes_since_prior_checkin: prior && latest
      ? {
          reflection_quality_delta: reflectionDelta,
          transfer_attempt_quality_latest: Number(transferLatest.toFixed(3)),
          interpretation: reflectionDelta > 0
            ? "Reflection quality appears to be improving in the most recent snapshot."
            : "Reflection quality trend is still mixed; continue regular snapshots.",
        }
      : {
          interpretation: "Additional developmental check-ins are needed before change-over-time can be interpreted.",
        },
    confidence_contribution_context: {
      contributes_to_confidence_context: historyCount > 0,
      evidence_stream_weight: "supplemental_not_override",
      current_contribution: historyCount > 0 ? "development_checkin_evidence_present" : "development_checkin_evidence_missing",
      checkin_confidence_weight: Number(CALIBRATION_VARIABLES.developmental_checkins.checkin_confidence_weight || 0.2),
    },
    consistency: {
      completed_checkins: historyCount,
      expected_weekly_ratio: Number(consistencyRatio.toFixed(3)),
      status: sufficientConsistency ? "consistent" : "inconsistent",
    },
    trend_signals: {
      reflection_quality_delta: reflectionDelta,
      transfer_attempt_quality_latest: Number(transferLatest.toFixed(3)),
      cross_source_disagreement_present: disagreement,
    },
    confidence_contribution: {
      contributes: historyCount > 0,
      minimum_history_for_confidence: Number(CALIBRATION_VARIABLES.developmental_checkins.minimum_checkin_history_for_confidence || 3),
      threshold_met: historyCount >= Number(CALIBRATION_VARIABLES.developmental_checkins.minimum_checkin_history_for_confidence || 3),
    },
    missing_data_flags: [
      ...(historyCount === 0 ? ["weekly_checkin_history_missing"] : []),
      ...(traceabilityRatio < 1 ? ["traceability_gap_present"] : []),
      ...(!parentRows.length ? ["parent_observation_missing"] : []),
      ...(!childRows.length ? ["child_response_missing"] : []),
    ],
    evidence_sufficiency: {
      status: sufficientEvidence ? "sufficient" : "limited",
      has_enough_checkin_evidence: sufficientEvidence,
      history_present: sufficientHistory,
      consistency_present: sufficientConsistency,
      traceability_complete: sufficientTraceability,
      missing_contracts: [
        ...(sufficientHistory ? [] : ["development_checkin_history_required"]),
        ...(sufficientConsistency ? [] : ["development_checkin_consistency_required"]),
        ...(sufficientTraceability ? [] : ["development_checkin_traceability_required"]),
      ],
    },
    evidence_stream_distinction: {
      session_intervention_evidence: "implementation_and_session_behavior_stream",
      developmental_checkin_evidence: "periodic_developmental_snapshot_stream",
      parent_observation_evidence: "observer_context_stream",
      separation_guard: "streams_reported_separately_no_single_source_override",
    },
    cross_source_disagreement: {
      present: disagreement,
      disagreement_delta: Number(disagreementDelta.toFixed(3)),
      interpretation: disagreement
        ? "Parent observation and child developmental snapshot are currently misaligned; gather more consistent observations before strong interpretation."
        : "No major disagreement detected in latest developmental snapshot sources.",
    },
  };
}

module.exports = {
  generateDevelopmentCheckin,
  runDevelopmentCheckin,
  listDevelopmentCheckins,
  summarizeDevelopmentCheckins,
  isWeeklyCheckinDue,
};
