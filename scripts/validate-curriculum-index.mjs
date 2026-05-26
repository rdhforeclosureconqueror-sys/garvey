import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'public/gamehub/content/curriculum-source');
const manifestPath = path.join(repoRoot, 'public/gamehub/content/adaptive-v2/manifests/curriculum-index.v1.json');

const forbiddenPatterns = [
  /tracking/i,
  /score|scoring/i,
  /diagnos/i,
  /\bdb\b|database|insert|update|delete|postgres|pg\./i,
  /adaptive runtime|runtime wiring|engine wiring/i
];

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(manifestPath)) {
  fail('Manifest file does not exist.');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const entries = manifest.entries;
if (!Array.isArray(entries) || entries.length === 0) {
  fail('Manifest entries are missing or empty.');
}

const sourcePhases = fs.readdirSync(sourceRoot).filter((name) => fs.statSync(path.join(sourceRoot, name)).isDirectory());
const listedPhases = new Set(entries.map((entry) => entry.phase_folder));
for (const phase of sourcePhases) {
  if (!listedPhases.has(phase)) {
    fail(`Phase folder is not listed in manifest: ${phase}`);
  }
}

if (sourcePhases.includes('Phase 10')) {
  fail('Source unexpectedly contains Phase 10.');
}

if (!manifest.phase_gap_policy || !Array.isArray(manifest.phase_gap_policy.missing_phases_allowed) || !manifest.phase_gap_policy.missing_phases_allowed.includes('Phase 10')) {
  fail('Manifest does not document that Phase 10 gap is allowed.');
}

const seenSources = new Set();
for (const entry of entries) {
  const sourcePath = path.join(sourceRoot, entry.phase_folder, entry.source_file);
  if (!fs.existsSync(sourcePath)) {
    fail(`Referenced source file does not exist: ${entry.phase_folder}/${entry.source_file}`);
  }

  const sourceKey = `${entry.phase_folder}/${entry.source_file}`;
  if (seenSources.has(sourceKey)) {
    fail(`Duplicate source entry detected: ${sourceKey}`);
  }
  seenSources.add(sourceKey);

  const serialized = JSON.stringify(entry);
  if (forbiddenPatterns.some((pattern) => pattern.test(serialized))) {
    fail(`Forbidden runtime/tracking/scoring/db/diagnosis language found in entry: ${sourceKey}`);
  }
}

console.log(`PASS: curriculum index validation succeeded (${entries.length} indexed source files across ${sourcePhases.length} phases; Phase 10 gap documented).`);
