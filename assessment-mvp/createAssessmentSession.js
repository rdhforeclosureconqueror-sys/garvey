const crypto = require('crypto');
const { loadSkillPackages, packageIdOf } = require('./loadSkillPackages');
const { PROVISIONAL_EVIDENCE_POLICY } = require('./evidencePolicy');
const { selectAssessmentItems, stableStringify } = require('./selectAssessmentItems');

const SESSION_VERSION = 'assessment-mvp-session-v3-grade1-math-complete';
const DEFAULT_ITEMS_PER_PACKAGE = PROVISIONAL_EVIDENCE_POLICY.minimumValidResponses;

function requireSingle(name, value, moduleName = 'createAssessmentSession') {
  if (Array.isArray(value) || value === undefined || value === null || value === '') {
    throw new Error(`${moduleName} requires exactly one ${name}`);
  }
  return value;
}

function toStableUnique(values) {
  return [...new Set((values || []).filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b));
}

function boundedItemsPerPackage(options = {}) {
  const raw = options.itemsPerPackage ?? options.assessmentSize?.itemsPerPackage ?? DEFAULT_ITEMS_PER_PACKAGE;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    throw new Error('itemsPerPackage must be an integer from 1 through 10');
  }
  return value;
}

function deterministicSessionId(role, grade, subject, packageIds, itemIds) {
  const seed = stableStringify({ role, grade, subject, packageIds, itemIds, session_version: SESSION_VERSION });
  return `mvp_session_${crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16)}`;
}

function priorExposureItems(itemIds = [], duplicateKeys = []) {
  const ids = toStableUnique(itemIds);
  const keys = toStableUnique(duplicateKeys);
  const max = Math.max(ids.length, keys.length);
  return Array.from({ length: max }, (_, index) => ({
    item_identity: ids[index] || `prior-exposure-${index}`,
    duplicate_key: keys[index],
  }));
}

function applyItemsPerPackage(selection, itemsPerPackage) {
  const countByPackage = new Map();
  const selectedIdentitySet = new Set();
  const publicItems = [];

  for (const item of selection.publicItems) {
    const packageId = item.source_package_id;
    const current = countByPackage.get(packageId) || 0;
    if (current >= itemsPerPackage) continue;
    countByPackage.set(packageId, current + 1);
    selectedIdentitySet.add(item.item_identity);
    publicItems.push(item);
  }

  const internalScoringRecords = selection.scoringRecords.filter((record) => selectedIdentitySet.has(record.item_identity));
  return { publicItems, internalScoringRecords, selectedIdentitySet };
}

function summarizeSelection(selection, publicItems, packages, itemsPerPackage) {
  const selectedByPackage = new Map();
  for (const item of publicItems) {
    selectedByPackage.set(item.source_package_id, (selectedByPackage.get(item.source_package_id) || 0) + 1);
  }

  const packageSummaries = [...packages]
    .map((pkg) => {
      const packageId = packageIdOf(pkg);
      return {
        package_id: packageId,
        selected_count: selectedByPackage.get(packageId) || 0,
        requested_count: itemsPerPackage,
      };
    })
    .sort((a, b) => a.package_id.localeCompare(b.package_id));

  return {
    evidence_policy_version: PROVISIONAL_EVIDENCE_POLICY.version,
    minimum_valid_responses: PROVISIONAL_EVIDENCE_POLICY.minimumValidResponses,
    requested_items_per_package: itemsPerPackage,
    selected_item_count: publicItems.length,
    represented_package_count: packageSummaries.filter((pkg) => pkg.selected_count > 0).length,
    package_summaries: packageSummaries,
    unsupported_selection_counts: { ...selection.exclusionCounts },
    unsupported_selection_reasons: selection.exclusions.map((exclusion) => ({ ...exclusion, reasons: [...exclusion.reasons] })),
  };
}

function publicAssessmentSessionView(session) {
  if (!session || typeof session !== 'object') throw new TypeError('session must be an object');
  const { internal_scoring_records, ...publicSession } = session;
  return JSON.parse(JSON.stringify(publicSession));
}

function createAssessmentSession(options = {}) {
  const grade = requireSingle('grade', options.grade);
  const subject = requireSingle('subject', options.subject);
  const itemsPerPackage = boundedItemsPerPackage(options);
  const packages = loadSkillPackages({ grade, subject, manifestPath: options.manifestPath, contentDir: options.contentDir });
  const priorItems = priorExposureItems(options.previously_exposed_item_ids, options.previously_exposed_duplicate_keys);
  const selection = selectAssessmentItems(packages, { baselineItems: priorItems });
  const { publicItems, internalScoringRecords } = applyItemsPerPackage(selection, itemsPerPackage);
  const packageIds = toStableUnique(publicItems.map((item) => item.source_package_id));
  const exposedItemIds = toStableUnique([
    ...(options.previously_exposed_item_ids || []),
    ...publicItems.map((item) => item.item_identity),
  ]);
  const exposedDuplicateKeys = toStableUnique([
    ...(options.previously_exposed_duplicate_keys || []),
    ...publicItems.map((item) => item.duplicate_key),
  ]);
  const itemIds = publicItems.map((item) => item.item_identity).sort((a, b) => a.localeCompare(b));

  return {
    session_id: options.session_id || deterministicSessionId('baseline', grade, subject, packageIds, itemIds),
    session_version: SESSION_VERSION,
    evidence_policy: {
      version: PROVISIONAL_EVIDENCE_POLICY.version,
      minimum_valid_responses: PROVISIONAL_EVIDENCE_POLICY.minimumValidResponses,
      provisional_note: 'Three valid responses are enough for provisional Grade 1 Math evidence labels; fewer than three remains Not Enough Evidence.',
    },
    assessment_role: 'baseline',
    grade,
    subject,
    status: 'in_progress',
    public_items: publicItems,
    internal_scoring_records: internalScoringRecords,
    exposed_item_ids: exposedItemIds,
    exposed_duplicate_keys: exposedDuplicateKeys,
    package_ids: packageIds,
    selection_summary: summarizeSelection(selection, publicItems, packages, itemsPerPackage),
  };
}

module.exports = {
  SESSION_VERSION,
  boundedItemsPerPackage,
  createAssessmentSession,
  deterministicSessionId,
  publicAssessmentSessionView,
  requireSingle,
  toStableUnique,
};
