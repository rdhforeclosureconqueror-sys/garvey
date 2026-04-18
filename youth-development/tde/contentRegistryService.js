"use strict";

const { CALIBRATION_VARIABLES } = require("./constants");
const { toRegistrationBase, UNIVERSAL_CONTENT_BLOCK_CONTRACT } = require("./contentBlockContract");
const { buildParentProgressSummary } = require("./parentSummaryService");
const { buildInsightLayer } = require("./insightService");
const { buildPatternHistory } = require("./personalizationService");
const { buildRecommendationInputs, generateRecommendations } = require("./recommendationService");

function summarizeCheckinsForRegistry(checkins = []) {
  const rows = Array.isArray(checkins)
    ? [...checkins].sort((a, b) => String(a.completed_at || "").localeCompare(String(b.completed_at || "")))
    : [];
  const latest = rows.at(-1) || null;
  const prior = rows.length >= 2 ? rows.at(-2) : null;
  const latestTransfer = Number(latest?.summary?.transfer_attempt_quality || 0);
  const priorTransfer = Number(prior?.summary?.transfer_attempt_quality || latestTransfer || 0);

  return {
    changes_since_prior_checkin: {
      transfer_attempt_quality_latest: latestTransfer,
      reflection_quality_delta: Number((latestTransfer - priorTransfer).toFixed(3)),
      interpretation: latest
        ? "Developmental check-in evidence is available for short-cycle interpretation."
        : "Check-in interpretation is pending additional evidence.",
    },
    cross_source_disagreement: { present: false },
    evidence_sufficiency: {
      status: rows.length >= 2 ? "sufficient" : "limited",
    },
  };
}

function splitIntoReplaySafeChunks(text = "", maxChars = 220) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);

    if (sentence.length <= maxChars) {
      current = sentence;
      continue;
    }

    let index = 0;
    while (index < sentence.length) {
      chunks.push(sentence.slice(index, index + maxChars).trim());
      index += maxChars;
    }
    current = "";
  }

  if (current) chunks.push(current);
  return chunks;
}

function enforceSectionRules(block, rules) {
  const missing = [];
  const sectionPattern = new RegExp(rules.section_key_allowed_pattern || "^[a-z0-9_]+$");

  if (!sectionPattern.test(block.section_key || "")) missing.push("section_key_pattern_invalid");

  const chunkLimit = String(block.section_key || "").includes("prompt")
    ? Number(rules.child_prompt_max_chars || 120)
    : Number(rules.content_chunk_max_chars || 220);

  const chunked = splitIntoReplaySafeChunks(block.voice_text || block.text_content || "", chunkLimit);
  if (!chunked.length) missing.push("voice_text_chunk_required");

  return {
    chunk_limit: chunkLimit,
    replay_safe_chunks: chunked,
    child_safe_short_prompt_rule_applied: String(block.section_key || "").includes("prompt"),
    parent_readability_segmentation_applied: !String(block.section_key || "").includes("prompt"),
    missing_contracts: missing,
  };
}

function registerReadablePlayableContentBlocks(blocks = [], options = {}) {
  const rules = CALIBRATION_VARIABLES.readability_voice_architecture || {};
  const scope = String(options.scope || "tde_content").trim() || "tde_content";

  const normalized = (Array.isArray(blocks) ? blocks : []).map((entry) => {
    const base = toRegistrationBase(entry, options);
    const section = enforceSectionRules(base, rules);
    const registrationStatus = (base.missing_contracts.length || section.missing_contracts.length)
      ? "contract_missing"
      : "registered";

    return {
      ...base,
      registration_scope: scope,
      registration_status: registrationStatus,
      missing_contracts: [...new Set([...(base.missing_contracts || []), ...(section.missing_contracts || [])])],
      replay_safe_chunk_structure: rules.replay_safe_chunk_structure || "deterministic_sentence_chunks_v1",
      replay_safe_chunks: section.replay_safe_chunks,
      chunk_limit: section.chunk_limit,
      child_safe_short_prompt_rule_applied: section.child_safe_short_prompt_rule_applied,
      parent_readability_segmentation_applied: section.parent_readability_segmentation_applied,
    };
  });

  const voiceReadyCount = normalized.filter((entry) => entry.voice_ready && entry.registration_status === "registered").length;
  const missing = [...new Set(normalized.flatMap((entry) => entry.missing_contracts || []))].sort();

  return {
    ok: true,
    extension_only: true,
    deterministic: true,
    contract: UNIVERSAL_CONTENT_BLOCK_CONTRACT,
    registration_scope: scope,
    section_rules: {
      max_content_per_chunk: Number(rules.content_chunk_max_chars || 220),
      child_safe_short_prompt_max_chars: Number(rules.child_prompt_max_chars || 120),
      parent_section_max_chars: Number(rules.parent_section_max_chars || 260),
      section_key_allowed_pattern: rules.section_key_allowed_pattern || "^[a-z0-9_]+$",
      replay_safe_chunk_structure: rules.replay_safe_chunk_structure || "deterministic_sentence_chunks_v1",
    },
    voice_ready_content_present: voiceReadyCount > 0,
    voice_ready_content_count: voiceReadyCount,
    registered_block_count: normalized.filter((entry) => entry.registration_status === "registered").length,
    contract_missing_block_count: normalized.filter((entry) => entry.registration_status !== "registered").length,
    registration_completeness: normalized.length && missing.length === 0 ? "complete" : "incomplete",
    missing_contracts: missing,
    blocks: normalized,
  };
}

function buildUniversalContentRegistry(childId, snapshot = {}) {
  const summary = buildParentProgressSummary(childId, snapshot);
  const insights = buildInsightLayer(snapshot, { child_id: childId });
  const checkinSummary = summarizeCheckinsForRegistry(snapshot.development_checkins || []);
  const patternHistory = buildPatternHistory(snapshot, { child_id: childId });

  const recommendationInputs = buildRecommendationInputs(
    snapshot,
    snapshot.commitment_plan || null,
    snapshot.intervention_sessions || [],
    { confidence_label: summary.confidence_context?.confidence_label || "early-signal" },
    { status: summary.data_sufficiency_status?.status || "limited" },
    {
      transfer_strength_status: checkinSummary.changes_since_prior_checkin?.transfer_attempt_quality_latest <= 1.8 ? "weak" : "stable",
      reflection_quality_status: checkinSummary.changes_since_prior_checkin?.reflection_quality_delta > 0 ? "improving" : "mixed",
      cross_source_disagreement_present: checkinSummary.cross_source_disagreement?.present === true,
      evidence_sufficiency_status: checkinSummary.evidence_sufficiency?.status || "limited",
    }
  );

  const recommendations = generateRecommendations({ child_id: childId, ...recommendationInputs });
  const latestCheckin = Array.isArray(snapshot.development_checkins)
    ? [...snapshot.development_checkins].sort((a, b) => String(a.completed_at || "").localeCompare(String(b.completed_at || ""))).at(-1)
    : null;

  const blocks = [
    {
      section_key: "parent_summary",
      text_content: (summary.next_step_support_actions || []).join(" "),
      voice_ready: true,
      source_module: "parent_summary_service",
      readability_level: "parent_standard",
    },
    {
      section_key: "trajectory_summary",
      text_content: patternHistory.pattern_history?.interpretive_summary || "Trajectory history is still forming.",
      voice_ready: true,
      source_module: "personalization_service",
      readability_level: "parent_standard",
    },
    {
      section_key: "checkin_interpretation",
      text_content: checkinSummary.changes_since_prior_checkin?.interpretation || "Check-in interpretation is pending additional evidence.",
      voice_ready: true,
      source_module: "development_checkin_service",
      readability_level: "child_friendly",
    },
    ...(recommendations.recommendations || []).slice(0, 3).map((entry) => ({
      section_key: "recommendation_item",
      text_content: entry.parent_language,
      voice_ready: true,
      source_module: "recommendation_service",
      readability_level: "parent_standard",
    })),
    ...(insights.pillar_insights || []).slice(0, 3).map((entry) => ({
      section_key: "insight_item",
      text_content: entry.pillar_summary?.strengthening || "Insight is still forming.",
      voice_ready: true,
      source_module: "insight_service",
      readability_level: "parent_standard",
    })),
    ...((latestCheckin?.prompts && typeof latestCheckin.prompts === "object")
      ? Object.entries(latestCheckin.prompts).map(([key, prompt]) => ({
        section_key: key,
        text_content: String(prompt?.voice_text || prompt?.prompt_text || "").trim(),
        voice_ready: Boolean(prompt?.voice_ready !== false),
        voice_text: String(prompt?.voice_text || prompt?.prompt_text || "").trim(),
        source_module: "development_checkin_service",
        age_band: latestCheckin.age_band || null,
        readability_level: "child_friendly",
      }))
      : []),
  ];

  return registerReadablePlayableContentBlocks(blocks, { child_id: childId, scope: "tde_universal_content_registry" });
}

function buildReadabilityStatusFromRegistry(registry = {}) {
  const blocks = Array.isArray(registry.blocks) ? registry.blocks : [];
  const voiceReadyBlocks = blocks.filter((entry) => entry.voice_ready);
  const missingBlocks = blocks.filter((entry) => entry.registration_status !== "registered");

  return {
    ok: true,
    extension_only: true,
    deterministic: true,
    child_id: registry.child_id || null,
    registration_scope: registry.registration_scope,
    registration_completeness: registry.registration_completeness || "incomplete",
    readability_status: {
      registered_blocks: blocks.length,
      voice_ready_blocks: voiceReadyBlocks.length,
      missing_contract_blocks: missingBlocks.length,
      fully_registered_voice_ready_blocks: blocks.filter((entry) => entry.voice_ready && entry.registration_status === "registered").length,
    },
    missing_contracts: registry.missing_contracts || [],
    missing_contract_block_refs: missingBlocks.map((entry) => ({
      content_block_id: entry.content_block_id,
      section_key: entry.section_key,
      source_module: entry.source_module,
      missing_contracts: entry.missing_contracts,
    })),
    blocks: blocks.map((entry) => ({
      content_block_id: entry.content_block_id,
      section_key: entry.section_key,
      source_module: entry.source_module,
      voice_ready: entry.voice_ready,
      registration_status: entry.registration_status,
      missing_contracts: entry.missing_contracts,
    })),
  };
}

module.exports = {
  registerReadablePlayableContentBlocks,
  buildUniversalContentRegistry,
  buildReadabilityStatusFromRegistry,
  splitIntoReplaySafeChunks,
};
