const { loadSkillPackages, packageIdOf } = require('./loadSkillPackages');
const { selectAssessmentItems } = require('./selectAssessmentItems');
const {
  SESSION_VERSION,
  boundedItemsPerPackage,
  deterministicSessionId,
  publicAssessmentSessionView,
  requireSingle,
  toStableUnique,
} = require('./createAssessmentSession');

const MIN_SAFE_REASSESSMENT_ITEMS = 3;

function priorExposureItems(itemIds = [], duplicateKeys = []) {
  const ids = toStableUnique(itemIds);
  const keys = toStableUnique(duplicateKeys);
  const max = Math.max(ids.length, keys.length);
  return Array.from({ length: max }, (_, index) => ({
    item_identity: ids[index] || `prior-reassessment-exposure-${index}`,
    duplicate_key: keys[index],
  }));
}

function requestedPackageIds(options = {}) {
  const values = options.packageIds || options.package_ids || options.reassessPackageIds || options.reassess_package_ids;
  if (!Array.isArray(values) || values.length === 0) throw new Error('createReassessmentSession requires package IDs to reassess');
  return toStableUnique(values);
}

function summarize(selection, publicItems, requestedIds, itemsPerPackage, insufficientEvidence) {
  const selectedByPackage = new Map();
  for (const item of publicItems) selectedByPackage.set(item.source_package_id, (selectedByPackage.get(item.source_package_id) || 0) + 1);
  return {
    requested_items_per_package: itemsPerPackage,
    selected_item_count: publicItems.length,
    requested_package_ids: requestedIds,
    insufficient_evidence: insufficientEvidence,
    package_summaries: requestedIds.map((packageId) => ({
      package_id: packageId,
      selected_count: selectedByPackage.get(packageId) || 0,
      requested_count: itemsPerPackage,
    })),
    unsupported_selection_counts: { ...selection.exclusionCounts },
    unsupported_selection_reasons: selection.exclusions.map((exclusion) => ({ ...exclusion, reasons: [...exclusion.reasons] })),
  };
}

function createReassessmentSession(priorCompletedResult, options = {}) {
  if (!priorCompletedResult || priorCompletedResult.status !== 'completed') {
    throw new Error('createReassessmentSession requires a prior completed assessment result');
  }
  const grade = requireSingle('grade', options.grade);
  const subject = requireSingle('subject', options.subject);
  const ids = requestedPackageIds(options);
  const itemsPerPackage = boundedItemsPerPackage(options);
  const allPackages = loadSkillPackages({ grade, subject, manifestPath: options.manifestPath, contentDir: options.contentDir });
  const packageById = new Map(allPackages.map((pkg) => [packageIdOf(pkg), pkg]));
  const requestedPackages = ids.filter((id) => packageById.has(id)).map((id) => packageById.get(id));

  const priorItems = priorExposureItems(options.all_prior_exposed_item_ids, options.all_prior_exposed_duplicate_keys);
  const selection = selectAssessmentItems(requestedPackages, { baselineItems: priorItems });

  const selectedByPackage = new Map();
  const selectedIdentitySet = new Set();
  const publicItems = [];
  for (const item of selection.publicItems) {
    const count = selectedByPackage.get(item.source_package_id) || 0;
    if (count >= itemsPerPackage) continue;
    selectedByPackage.set(item.source_package_id, count + 1);
    selectedIdentitySet.add(item.item_identity);
    publicItems.push(item);
  }
  const internalScoringRecords = selection.scoringRecords.filter((record) => selectedIdentitySet.has(record.item_identity));

  const insufficientEvidence = ids
    .map((packageId) => {
      const safe_non_repeated_item_count = selectedByPackage.get(packageId) || 0;
      if (!packageById.has(packageId)) return { package_id: packageId, safe_non_repeated_item_count: 0, reason_code: 'package_not_manifested' };
      if (safe_non_repeated_item_count < MIN_SAFE_REASSESSMENT_ITEMS) {
        return { package_id: packageId, safe_non_repeated_item_count, reason_code: 'insufficient_non_repeated_items' };
      }
      return null;
    })
    .filter(Boolean);

  const packageIds = toStableUnique(publicItems.map((item) => item.source_package_id));
  const exposedItemIds = toStableUnique([
    ...(options.all_prior_exposed_item_ids || []),
    ...publicItems.map((item) => item.item_identity),
  ]);
  const exposedDuplicateKeys = toStableUnique([
    ...(options.all_prior_exposed_duplicate_keys || []),
    ...publicItems.map((item) => item.duplicate_key),
  ]);
  const itemIds = publicItems.map((item) => item.item_identity).sort((a, b) => a.localeCompare(b));

  return {
    session_id: options.session_id || deterministicSessionId('reassessment', grade, subject, ids, itemIds),
    session_version: SESSION_VERSION,
    assessment_role: 'reassessment',
    grade,
    subject,
    status: 'in_progress',
    public_items: publicItems,
    internal_scoring_records: internalScoringRecords,
    exposed_item_ids: exposedItemIds,
    exposed_duplicate_keys: exposedDuplicateKeys,
    package_ids: packageIds,
    requested_package_ids: ids,
    insufficient_evidence: insufficientEvidence,
    selection_summary: summarize(selection, publicItems, ids, itemsPerPackage, insufficientEvidence),
  };
}

module.exports = {
  MIN_SAFE_REASSESSMENT_ITEMS,
  createReassessmentSession,
  publicReassessmentSessionView: publicAssessmentSessionView,
};
