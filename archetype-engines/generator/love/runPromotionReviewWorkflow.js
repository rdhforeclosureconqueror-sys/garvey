"use strict";

const path = require("node:path");

const {
  generateReviewSummary,
  writeReviewBundle,
  updateManifest,
} = require("./promotionReviewWorkflow");

const ROOT = path.resolve(__dirname, "../../..");

function main() {
  const bankId = process.argv[2] || "BANK_A";
  const summary = generateReviewSummary({ bankId });
  const bundle = writeReviewBundle(summary);
  const manifestFile = updateManifest({
    summary,
    notes: "Controlled review layer only. Manual approval required before any live candidate promotion.",
  });

  console.log(`Wrote ${path.relative(ROOT, bundle.jsonPath)}`);
  console.log(`Wrote ${path.relative(ROOT, bundle.markdownPath)}`);
  console.log(`Updated ${path.relative(ROOT, manifestFile)}`);
  console.log(`Review status: ${summary.status}`);
  console.log(`Recommendation: ${summary.recommendation}`);
}

main();
