"use strict";

const CONTENT_VERSION = "2026.04.19";

const ANSWER_SCALE_1_TO_4 = Object.freeze([
  Object.freeze({ value: 1, label: "Rarely true" }),
  Object.freeze({ value: 2, label: "Sometimes true" }),
  Object.freeze({ value: 3, label: "Often true" }),
  Object.freeze({ value: 4, label: "Very often true" }),
]);

const CONTENT_CONTRACT_REQUIRED_FIELDS = Object.freeze([
  "item_id",
  "phase",
  "week",
  "item_type",
  "age_band",
  "target_traits",
  "prompt_text",
  "response_schema",
  "voice_ready",
  "reading_level",
  "source_module",
  "active",
  "content_version",
]);

function makeItem(item) {
  return Object.freeze({
    ...item,
    target_traits: Object.freeze([...(Array.isArray(item.target_traits) ? item.target_traits : [])]),
    response_schema: Object.freeze(item.response_schema || {}),
    active: item.active !== false,
    content_version: item.content_version || CONTENT_VERSION,
  });
}

const PARENT_BASELINE_INTAKE_BANK = Object.freeze([
  ["YT_POBS_Q01", "Before starting something important, my child makes some kind of plan, even a simple one.", "SR", "RS"],
  ["YT_POBS_Q02", "When my child gets distracted, they can usually get themselves back on track without a lot of reminding.", "SR", "PS"],
  ["YT_POBS_Q03", "My child notices mistakes in their work and tries to fix them on their own.", "SR", "FB"],
  ["YT_POBS_Q04", "When a task has several steps, my child can keep track of what comes next.", "SR", "RS"],
  ["YT_POBS_Q05", "My child asks “why,” “how,” or “what if” questions that go beyond the basic directions.", "CQ", "RS"],
  ["YT_POBS_Q06", "When something interests my child, they keep exploring it even after the main activity is over.", "CQ", "DE"],
  ["YT_POBS_Q07", "My child looks for extra information or examples without being told to.", "CQ", "DE"],
  ["YT_POBS_Q08", "My child enjoys figuring out how something works instead of only being given the answer.", "CQ", "RS"],
  ["YT_POBS_Q09", "My child comes up with more than one way to solve a problem.", "CR", "RS"],
  ["YT_POBS_Q10", "My child makes unusual or surprising connections between ideas, objects, or experiences.", "CR", "CQ"],
  ["YT_POBS_Q11", "During play, projects, or problem-solving, my child changes or improves the original idea instead of only copying it.", "CR", "DE"],
  ["YT_POBS_Q12", "My child notices possibilities, uses, or questions that other people often miss.", "CR", "CQ"],
  ["YT_POBS_Q13", "My child notices patterns, rules, or similarities quickly.", "RS", "CQ"],
  ["YT_POBS_Q14", "When my child explains an answer, they can usually tell why they think it is right.", "RS", "SR"],
  ["YT_POBS_Q15", "My child can use what they learned in one situation to help in a different one.", "RS", "FB"],
  ["YT_POBS_Q16", "My child likes puzzles, sorting, strategy games, or figuring out how pieces fit together.", "RS", "DE"],
  ["YT_POBS_Q17", "When work gets hard, my child usually keeps trying before giving up.", "PS", "SR"],
  ["YT_POBS_Q18", "After getting something wrong, my child can recover and try again.", "PS", "FB"],
  ["YT_POBS_Q19", "My child is willing to try a different approach when the first one does not work.", "PS", "CR"],
  ["YT_POBS_Q20", "When someone gives helpful correction, my child usually uses it on the next try.", "FB", "PS"],
  ["YT_POBS_Q21", "My child improves more after specific feedback than after general encouragement alone.", "FB", "SR"],
  ["YT_POBS_Q22", "My child remembers past corrections and applies them later in a similar situation.", "FB", "RS"],
  ["YT_POBS_Q23", "My child returns to certain topics or activities again and again on their own.", "DE", "CQ"],
  ["YT_POBS_Q24", "When my child is highly interested in something, they spend extra time on it without needing pressure.", "DE", "PS"],
  ["YT_POBS_Q25", "Over time, I can see my child’s knowledge, skill, or depth growing in at least one area they care about.", "DE", "CR"],
].map(([itemId, promptText, primaryTrait, secondaryTrait], index) => makeItem({
  item_id: itemId,
  phase: "baseline_intake",
  week: 1,
  item_type: "parent_baseline",
  age_band: "8-10|11-13|14-16",
  target_traits: [primaryTrait, secondaryTrait],
  prompt_text: promptText,
  response_schema: {
    kind: "likert",
    respondent: "parent_guardian",
    answer_options: ANSWER_SCALE_1_TO_4,
    required: true,
  },
  voice_ready: false,
  reading_level: "grade_6",
  source_module: "youth-development/question-engine/youthQuestionBank",
  sort_order: index + 1,
  active: true,
})));

const WEEKLY_CHECKIN_ITEM_BANK = Object.freeze([
  makeItem({ item_id: "YDTDE_WK_PERF_SR_8_10", phase: "weekly_checkin", week: "*", item_type: "performance", age_band: "8-10", target_traits: ["SR"], signal_type: "strategy_use_presence", prompt_text: "Show how you chose a strategy before starting and what helped you keep using it.", response_schema: { kind: "open_text_plus_score", answer_options: ANSWER_SCALE_1_TO_4, required: true }, voice_ready: true, reading_level: "grade_3", source_module: "youth-development/tde/developmentCheckinService" }),
  makeItem({ item_id: "YDTDE_WK_PERF_SR_11_13", phase: "weekly_checkin", week: "*", item_type: "performance", age_band: "11-13", target_traits: ["SR"], signal_type: "strategy_use_presence", prompt_text: "Explain the strategy you used before you started and how you stayed with it.", response_schema: { kind: "open_text_plus_score", answer_options: ANSWER_SCALE_1_TO_4, required: true }, voice_ready: true, reading_level: "grade_5", source_module: "youth-development/tde/developmentCheckinService" }),
  makeItem({ item_id: "YDTDE_WK_PERF_SR_14_16", phase: "weekly_checkin", week: "*", item_type: "performance", age_band: "14-16", target_traits: ["SR"], signal_type: "strategy_use_presence", prompt_text: "Describe your pre-task strategy and what you did to keep execution stable through the task.", response_schema: { kind: "open_text_plus_score", answer_options: ANSWER_SCALE_1_TO_4, required: true }, voice_ready: true, reading_level: "grade_8", source_module: "youth-development/tde/developmentCheckinService" }),
  makeItem({ item_id: "YDTDE_WK_REFL_FB_8_10", phase: "weekly_checkin", week: "*", item_type: "reflection", age_band: "8-10", target_traits: ["FB"], signal_type: "improvement_delta", prompt_text: "What changed between your first try and your next try?", response_schema: { kind: "open_text_plus_score", answer_options: ANSWER_SCALE_1_TO_4, required: true }, voice_ready: true, reading_level: "grade_3", source_module: "youth-development/tde/developmentCheckinService" }),
  makeItem({ item_id: "YDTDE_WK_REFL_FB_11_13", phase: "weekly_checkin", week: "*", item_type: "reflection", age_band: "11-13", target_traits: ["FB"], signal_type: "improvement_delta", prompt_text: "What specific adjustment made your second attempt better than your first?", response_schema: { kind: "open_text_plus_score", answer_options: ANSWER_SCALE_1_TO_4, required: true }, voice_ready: true, reading_level: "grade_5", source_module: "youth-development/tde/developmentCheckinService" }),
  makeItem({ item_id: "YDTDE_WK_REFL_FB_14_16", phase: "weekly_checkin", week: "*", item_type: "reflection", age_band: "14-16", target_traits: ["FB"], signal_type: "improvement_delta", prompt_text: "Identify the revision you made and explain how it changed your result.", response_schema: { kind: "open_text_plus_score", answer_options: ANSWER_SCALE_1_TO_4, required: true }, voice_ready: true, reading_level: "grade_8", source_module: "youth-development/tde/developmentCheckinService" }),
  makeItem({ item_id: "YDTDE_WK_PARENT_SR_ALL", phase: "weekly_checkin", week: "*", item_type: "observation", age_band: "8-10|11-13|14-16", target_traits: ["SR"], signal_type: "context_consistency", prompt_text: "Parent observation: describe what you noticed about the child's approach, persistence, and support needs across contexts.", response_schema: { kind: "parent_observation", answer_options: ANSWER_SCALE_1_TO_4, required: true }, voice_ready: false, reading_level: "grade_7", source_module: "youth-development/tde/developmentCheckinService" }),
  makeItem({ item_id: "YDTDE_WK_TRANSFER_CR_ALL", phase: "weekly_checkin", week: 4, item_type: "transfer", age_band: "8-10|11-13|14-16", target_traits: ["CR"], signal_type: "attempt_quality_change", prompt_text: "Optional transfer: try the same strategy in a different setting and note what shifted.", response_schema: { kind: "optional_open_text_plus_score", answer_options: ANSWER_SCALE_1_TO_4, required: false }, voice_ready: true, reading_level: "grade_5", source_module: "youth-development/tde/developmentCheckinService" }),
]);

const MILESTONE_REASSESSMENT_BANK = Object.freeze([
  makeItem({ item_id: "YDTDE_MS_12_SR", phase: "milestone_reassessment", week: 12, item_type: "milestone_reassessment", age_band: "8-10|11-13|14-16", target_traits: ["SR", "PS"], prompt_text: "At week 12, how consistently does your child start tasks with a plan and recover after distraction?", response_schema: { kind: "likert_with_note", answer_options: ANSWER_SCALE_1_TO_4, required: true }, voice_ready: true, reading_level: "grade_6", source_module: "youth-development/tde/programRail" }),
  makeItem({ item_id: "YDTDE_MS_24_CQ", phase: "milestone_reassessment", week: 24, item_type: "milestone_reassessment", age_band: "8-10|11-13|14-16", target_traits: ["CQ", "CR"], prompt_text: "At week 24, how often does your child pursue deeper questions and generate more than one approach?", response_schema: { kind: "likert_with_note", answer_options: ANSWER_SCALE_1_TO_4, required: true }, voice_ready: true, reading_level: "grade_6", source_module: "youth-development/tde/programRail" }),
  makeItem({ item_id: "YDTDE_MS_36_DE", phase: "milestone_reassessment", week: 36, item_type: "milestone_reassessment", age_band: "8-10|11-13|14-16", target_traits: ["DE", "FB", "RS"], prompt_text: "At week 36, how durable is your child’s engagement, revision quality, and transfer of reasoning across contexts?", response_schema: { kind: "likert_with_note", answer_options: ANSWER_SCALE_1_TO_4, required: true }, voice_ready: true, reading_level: "grade_7", source_module: "youth-development/tde/programRail" }),
]);

const PARENT_REFLECTION_PROMPT_BANK = Object.freeze([
  makeItem({ item_id: "YDTDE_PR_WKLY_01", phase: "weekly_checkin", week: "*", item_type: "parent_reflection", age_band: "8-10|11-13|14-16", target_traits: ["PS", "FB"], prompt_text: "What support from you helped most this week, and what would you adjust next week?", response_schema: { kind: "open_text", required: true }, voice_ready: true, reading_level: "grade_6", source_module: "youth-development/tde/parentExperienceService" }),
  makeItem({ item_id: "YDTDE_PR_MS_12", phase: "milestone_reassessment", week: 12, item_type: "parent_reflection", age_band: "8-10|11-13|14-16", target_traits: ["SR", "PS"], prompt_text: "Looking back on weeks 1–12, what routine change had the strongest positive effect?", response_schema: { kind: "open_text", required: true }, voice_ready: true, reading_level: "grade_6", source_module: "youth-development/tde/parentExperienceService" }),
  makeItem({ item_id: "YDTDE_PR_MS_24", phase: "milestone_reassessment", week: 24, item_type: "parent_reflection", age_band: "8-10|11-13|14-16", target_traits: ["CQ", "CR"], prompt_text: "Across weeks 13–24, where did your child show the most growth in curiosity or problem solving?", response_schema: { kind: "open_text", required: true }, voice_ready: true, reading_level: "grade_6", source_module: "youth-development/tde/parentExperienceService" }),
  makeItem({ item_id: "YDTDE_PR_MS_36", phase: "milestone_reassessment", week: 36, item_type: "parent_reflection", age_band: "8-10|11-13|14-16", target_traits: ["DE", "FB"], prompt_text: "At program close, what habits seem most sustainable for your child and your family support routine?", response_schema: { kind: "open_text", required: true }, voice_ready: true, reading_level: "grade_7", source_module: "youth-development/tde/parentExperienceService" }),
]);

const CHILD_DEVELOPMENTAL_PROMPT_BANK = Object.freeze([
  makeItem({ item_id: "YDTDE_CF_WKLY_8_10", phase: "weekly_checkin", week: "*", item_type: "child_facing_prompt", age_band: "8-10", target_traits: ["SR", "FB"], prompt_text: "Tell what you tried, then tell one thing you changed next.", response_schema: { kind: "open_text_plus_score", answer_options: ANSWER_SCALE_1_TO_4, required: true }, voice_ready: true, reading_level: "grade_3", source_module: "youth-development/tde/developmentCheckinService" }),
  makeItem({ item_id: "YDTDE_CF_WKLY_11_13", phase: "weekly_checkin", week: "*", item_type: "child_facing_prompt", age_band: "11-13", target_traits: ["SR", "FB", "RS"], prompt_text: "Describe your strategy, what feedback you used, and what improved.", response_schema: { kind: "open_text_plus_score", answer_options: ANSWER_SCALE_1_TO_4, required: true }, voice_ready: true, reading_level: "grade_5", source_module: "youth-development/tde/developmentCheckinService" }),
  makeItem({ item_id: "YDTDE_CF_WKLY_14_16", phase: "weekly_checkin", week: "*", item_type: "child_facing_prompt", age_band: "14-16", target_traits: ["SR", "FB", "RS", "DE"], prompt_text: "Summarize your strategy, adjustment cycle, and why the final approach worked better.", response_schema: { kind: "open_text_plus_score", answer_options: ANSWER_SCALE_1_TO_4, required: true }, voice_ready: true, reading_level: "grade_8", source_module: "youth-development/tde/developmentCheckinService" }),
]);

const REPORT_SUPPORT_CONTENT_BLOCKS = Object.freeze([
  makeItem({ item_id: "YDTDE_RPT_TRUST_NON_DIAG", phase: "report_support", week: "*", item_type: "report_support", age_band: "parent_all", target_traits: [], prompt_text: "Developmental, not diagnostic: this report describes current support patterns and evidence strength.", response_schema: { kind: "informational" }, voice_ready: true, reading_level: "grade_7", source_module: "youth-development/tde/parentExperienceService" }),
  makeItem({ item_id: "YDTDE_RPT_CONFIDENCE", phase: "report_support", week: "*", item_type: "report_support", age_band: "parent_all", target_traits: [], prompt_text: "Confidence increases when multiple evidence sources repeat similar patterns across weeks and milestones.", response_schema: { kind: "informational" }, voice_ready: true, reading_level: "grade_7", source_module: "youth-development/tde/parentExperienceService" }),
]);

const ASSESSMENT_CONTENT_BANKS = Object.freeze({
  parent_baseline_intake: PARENT_BASELINE_INTAKE_BANK,
  weekly_development_checkins: WEEKLY_CHECKIN_ITEM_BANK,
  milestone_reassessments: MILESTONE_REASSESSMENT_BANK,
  parent_reflection_prompts: PARENT_REFLECTION_PROMPT_BANK,
  child_facing_developmental_prompts: CHILD_DEVELOPMENTAL_PROMPT_BANK,
  assessment_report_support_blocks: REPORT_SUPPORT_CONTENT_BLOCKS,
});

function isAgeBandMatch(itemAgeBand, ageBand) {
  if (!ageBand) return true;
  const raw = String(itemAgeBand || "");
  if (!raw) return false;
  return raw.split("|").map((v) => v.trim()).includes(String(ageBand).trim());
}

function pickWeeklyCheckinItems({ week = 1, age_band = "8-10" } = {}) {
  const weekNumber = Number.isFinite(Number(week)) ? Number(week) : 1;
  const scoped = WEEKLY_CHECKIN_ITEM_BANK.filter((item) => isAgeBandMatch(item.age_band, age_band) || item.age_band.includes("|"));
  const performance = scoped.filter((item) => item.item_type === "performance");
  const reflection = scoped.filter((item) => item.item_type === "reflection");
  const parent = scoped.find((item) => item.item_type === "observation");
  const transfer = scoped.find((item) => item.item_type === "transfer" && weekNumber % 4 === 0) || null;
  return {
    performance_prompt: performance[weekNumber % performance.length] || performance[0] || null,
    reflection_prompt: reflection[weekNumber % reflection.length] || reflection[0] || null,
    optional_transfer_prompt: transfer,
    parent_observation_prompt: parent || null,
  };
}

function getMilestoneItems(weekNumber, ageBand) {
  return MILESTONE_REASSESSMENT_BANK.filter((item) => Number(item.week) === Number(weekNumber) && isAgeBandMatch(item.age_band, ageBand));
}

function getBankInventorySummary() {
  return Object.fromEntries(Object.entries(ASSESSMENT_CONTENT_BANKS).map(([key, rows]) => [key, rows.length]));
}

function validateContentContract(item = {}) {
  return CONTENT_CONTRACT_REQUIRED_FIELDS.filter((field) => {
    const value = item[field];
    if (Array.isArray(value)) {
      if (field === "target_traits" && String(item.item_type || "") === "report_support") return false;
      return value.length === 0;
    }
    return value === undefined || value === null || `${value}`.trim() === "";
  });
}

function auditAssessmentContentBanks() {
  const audited = Object.entries(ASSESSMENT_CONTENT_BANKS).map(([bankKey, rows]) => {
    const contractGaps = rows.flatMap((item) => validateContentContract(item).map((gap) => `${item.item_id}:${gap}`));
    return {
      bank_key: bankKey,
      item_count: rows.length,
      status: rows.length && contractGaps.length === 0 ? "complete" : rows.length ? "partial" : "missing",
      contract_gaps: contractGaps,
    };
  });

  return {
    content_version: CONTENT_VERSION,
    required_contract_fields: CONTENT_CONTRACT_REQUIRED_FIELDS,
    inventory: audited,
    complete: audited.filter((entry) => entry.status === "complete").map((entry) => entry.bank_key),
    partial_or_missing: audited.filter((entry) => entry.status !== "complete").map((entry) => entry.bank_key),
    present_in_logic_not_authored: [],
  };
}

module.exports = {
  CONTENT_VERSION,
  CONTENT_CONTRACT_REQUIRED_FIELDS,
  ANSWER_SCALE_1_TO_4,
  ASSESSMENT_CONTENT_BANKS,
  getBankInventorySummary,
  pickWeeklyCheckinItems,
  getMilestoneItems,
  auditAssessmentContentBanks,
};
