"use strict";

const fs = require("node:fs");
const path = require("node:path");

const REVIEW_STATUSES = Object.freeze([
  "generated",
  "ready_for_review",
  "approved_for_live_candidate",
  "superseded",
]);

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveGeneratedBank({ rootDir, manifestPath, selectBankId = null, requireQuestionCount = null }) {
  const manifest = readJsonIfExists(manifestPath);
  if (!manifest || !Array.isArray(manifest.banks)) return { available: false, reason: "manifest_missing", questions: [] };
  const approvedBanks = manifest.banks
    .filter((entry) => entry.review_status === "approved_for_live_candidate")
    .sort((a, b) => new Date(String(b.generated_at || 0)).getTime() - new Date(String(a.generated_at || 0)).getTime());
  const requestedBankId = String(selectBankId || "").trim().toUpperCase();
  const approved = requestedBankId
    ? approvedBanks.find((entry) => String(entry?.bank_id || "").trim().toUpperCase() === requestedBankId)
    : approvedBanks[0];
  if (!approved) return { available: false, reason: "no_approved_bank", questions: [] };
  const generatedFile = path.resolve(rootDir, String(approved?.source_artifact_paths?.generatedFile || ""));
  const questions = readJsonIfExists(generatedFile);
  if (!Array.isArray(questions)) return { available: false, reason: "invalid_generated_file", questions: [] };
  if (Number.isFinite(Number(requireQuestionCount)) && Number(requireQuestionCount) > 0 && questions.length !== Number(requireQuestionCount)) {
    return { available: false, reason: "invalid_generated_file", questions: [] };
  }
  return {
    available: true,
    reason: null,
    bankId: approved.bank_id,
    questions,
    reviewStatus: approved.review_status,
    sourcePath: path.relative(rootDir, generatedFile),
  };
}

module.exports = { REVIEW_STATUSES, resolveGeneratedBank };
