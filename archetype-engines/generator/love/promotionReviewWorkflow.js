"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");

const BANK_REVIEW_STATUSES = Object.freeze([
  "generated",
  "structurally_valid",
  "wording_refined",
  "ready_for_review",
  "approved_for_live_candidate",
  "rejected",
  "superseded",
]);

function toLowerBank(bankId) {
  return bankId.toLowerCase();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function recommendationFromSummary(summary) {
  if (!summary.structuralAudit.auditValid || summary.wordingDesirability.desirabilityWarningCount > 0) {
    return "reject_for_now";
  }
  if (!summary.crossBankStability.rankingStableAcrossProfiles) {
    return "review_required_before_any_promotion";
  }
  return "manual_review_required_before_any_live_promotion";
}

function buildManualChecklist() {
  return [
    { id: "wording_natural", prompt: "Does the wording feel natural?", reviewerResponse: null },
    { id: "options_respectable", prompt: "Do options feel equally respectable?", reviewerResponse: null },
    { id: "prompt_repetition", prompt: "Do prompts feel repetitive?", reviewerResponse: null },
    { id: "archetypes_recognizable", prompt: "Do archetypes feel recognizable?", reviewerResponse: null },
    { id: "sounds_better", prompt: "Does any option sound noticeably \"better\"?", reviewerResponse: null },
    { id: "premium_quality", prompt: "Does the bank feel premium enough for live candidate testing?", reviewerResponse: null },
  ];
}

function generateReviewSummary({ bankId = "BANK_A", generatedAt = new Date().toISOString() } = {}) {
  const bankSlug = toLowerBank(bankId);
  const generatedFile = path.join(ROOT, "artifacts", "love-banks", `${bankSlug}.generated.json`);
  const auditFile = path.join(ROOT, "artifacts", "love-banks", `${bankSlug}.audit.json`);
  const wordingFile = path.join(ROOT, "artifacts", "love-generator-wording-refinement-pass-2026-04-14.json");

  const generated = readJson(generatedFile);
  const audit = readJson(auditFile);
  const wording = readJson(wordingFile);

  const wordingSummary = wording.phase4.find((entry) => entry.seed === bankId) || null;
  const dominanceSummary = wording.phase2.find((entry) => entry.seed === bankId) || null;

  const stabilityProfiles = wording.phase3.map((profile) => ({
    profile: profile.profile,
    rankingStable: Boolean(profile.rankingStable),
    bankResult: profile.results[bankId],
    deltasVsBankA: profile.deltasVsBankA || {},
  }));

  const summary = {
    bankId,
    generatedAt,
    status: "ready_for_review",
    sourceArtifacts: {
      generatedFile: path.relative(ROOT, generatedFile),
      auditFile: path.relative(ROOT, auditFile),
      wordingPassFile: path.relative(ROOT, wordingFile),
    },
    structuralAudit: {
      questionCount: generated.length,
      auditValid: audit.valid,
      classCounts: audit.classCounts,
      pairSpread: Object.values(audit.pairCounts).length
        ? Math.max(...Object.values(audit.pairCounts)) - Math.min(...Object.values(audit.pairCounts))
        : 0,
      failures: audit.failures,
      warnings: audit.warnings,
    },
    wordingDesirability: wordingSummary ? {
      repeatedPromptStartsTopCount: wordingSummary.repeatedPromptStarts[0]?.count || 0,
      repeatedOptionStartsTopCount: wordingSummary.repeatedOptionStarts[0]?.count || 0,
      weakBehavioralSpecificityCount: wordingSummary.weakBehavioralSpecificityCount,
      desirabilityWarningCount: wordingSummary.desirabilityWarnings.length,
    } : null,
    dominanceSimulation: dominanceSummary ? {
      profileCount: dominanceSummary.runs.length,
      topPrimaryByProfile: dominanceSummary.runs.map((run) => ({ pattern: run.pattern, primary: run.primary, secondary: run.secondary })),
    } : null,
    crossBankStability: {
      rankingStableAcrossProfiles: stabilityProfiles.every((profile) => profile.rankingStable),
      profiles: stabilityProfiles,
    },
    manualReviewChecklist: buildManualChecklist(),
  };

  summary.recommendation = recommendationFromSummary(summary);
  return summary;
}

function toReviewMarkdown(summary) {
  const lines = [];
  lines.push(`# Love Candidate-Bank Promotion Review — ${summary.bankId}`);
  lines.push("");
  lines.push(`- generated_at: ${summary.generatedAt}`);
  lines.push(`- review_status: ${summary.status}`);
  lines.push(`- recommendation: ${summary.recommendation}`);
  lines.push("");
  lines.push("## 1) Structural Audit Summary");
  lines.push("");
  lines.push(`- audit_valid: ${summary.structuralAudit.auditValid}`);
  lines.push(`- question_count: ${summary.structuralAudit.questionCount}`);
  lines.push(`- pair_spread: ${summary.structuralAudit.pairSpread}`);
  lines.push(`- failures: ${summary.structuralAudit.failures.length}`);
  lines.push("");
  lines.push("## 2) Wording / Desirability Summary");
  lines.push("");
  lines.push(`- prompt_stem_repeat_peak: ${summary.wordingDesirability?.repeatedPromptStartsTopCount ?? "n/a"}`);
  lines.push(`- option_stem_repeat_peak: ${summary.wordingDesirability?.repeatedOptionStartsTopCount ?? "n/a"}`);
  lines.push(`- weak_specificity_count: ${summary.wordingDesirability?.weakBehavioralSpecificityCount ?? "n/a"}`);
  lines.push(`- desirability_warning_count: ${summary.wordingDesirability?.desirabilityWarningCount ?? "n/a"}`);
  lines.push("");
  lines.push("## 3) Dominance Simulation Summary");
  lines.push("");
  if (!summary.dominanceSimulation) {
    lines.push("- not available");
  } else {
    lines.push(`- simulation_profiles: ${summary.dominanceSimulation.profileCount}`);
    for (const result of summary.dominanceSimulation.topPrimaryByProfile) {
      lines.push(`- ${result.pattern}: primary=${result.primary}, secondary=${result.secondary}`);
    }
  }
  lines.push("");
  lines.push("## 4) Cross-Bank Stability Summary");
  lines.push("");
  lines.push(`- ranking_stable_across_profiles: ${summary.crossBankStability.rankingStableAcrossProfiles}`);
  for (const profile of summary.crossBankStability.profiles) {
    lines.push(`- ${profile.profile}: ranking_stable=${profile.rankingStable}`);
  }
  lines.push("");
  lines.push("## 5) Manual Review Checklist");
  lines.push("");
  for (const item of summary.manualReviewChecklist) {
    lines.push(`- [ ] ${item.prompt}`);
  }
  lines.push("");
  lines.push("## 6) Recommendation");
  lines.push("");
  lines.push(`- ${summary.recommendation}`);
  lines.push("");
  lines.push("> NOTE: This review bundle does not auto-promote any bank live.");
  return `${lines.join("\n")}\n`;
}

function updateManifest({ summary, approvedBy = null, notes = "", generatedSeed = summary.bankId }) {
  const manifestFile = path.join(ROOT, "artifacts", "love-banks", "promotion-manifest.json");
  const current = fs.existsSync(manifestFile)
    ? readJson(manifestFile)
    : { generatedAt: new Date().toISOString(), statuses: BANK_REVIEW_STATUSES, banks: [] };

  const entry = {
    bank_id: summary.bankId,
    seed: generatedSeed,
    generated_at: summary.generatedAt,
    review_status: summary.status,
    approved_by: approvedBy,
    notes,
    source_artifact_paths: summary.sourceArtifacts,
    recommendation: summary.recommendation,
  };

  const filtered = current.banks.filter((bank) => bank.bank_id !== summary.bankId);
  current.banks = [...filtered, entry].sort((a, b) => a.bank_id.localeCompare(b.bank_id));
  current.statuses = BANK_REVIEW_STATUSES;
  current.lastUpdatedAt = new Date().toISOString();

  fs.writeFileSync(manifestFile, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  return manifestFile;
}

function writeReviewBundle(summary) {
  const bankSlug = toLowerBank(summary.bankId);
  const outJson = path.join(ROOT, "artifacts", "love-banks", "reviews", `${bankSlug}.promotion-review.json`);
  const outMd = path.join(ROOT, "docs", `${summary.bankId}_LOVE_PROMOTION_REVIEW.md`);

  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  fs.writeFileSync(outMd, toReviewMarkdown(summary), "utf8");

  return {
    jsonPath: outJson,
    markdownPath: outMd,
  };
}

module.exports = {
  BANK_REVIEW_STATUSES,
  buildManualChecklist,
  generateReviewSummary,
  toReviewMarkdown,
  writeReviewBundle,
  updateManifest,
};
