const { packageIdOf } = require('./loadSkillPackages');

const ALLOWED_RECOMMENDATION_TYPES = new Set([
  'current_skill_support',
  'prerequisite_support',
  'additional_evidence',
]);

const ALLOWED_REASON_CODES = new Set([
  'needs_support',
  'developing',
  'insufficient_evidence',
  'verified_remediation',
  'already_completed',
  'already_recommended',
  'package_not_manifested',
  'subject_mismatch',
  'grade_mismatch',
  'ready_not_prioritized',
]);

const LABEL_SEVERITY = {
  'Needs Support': 0,
  Developing: 1,
  'Not Enough Evidence': 2,
  Ready: 3,
};

const CURRENT_LABEL_PLAN = {
  'Needs Support': {
    priority: 10,
    recommendation_type: 'current_skill_support',
    reason_code: 'needs_support',
    reason: 'This skill needs more support based on the recent responses.',
  },
  Developing: {
    priority: 30,
    recommendation_type: 'current_skill_support',
    reason_code: 'developing',
    reason: 'This skill is developing and would benefit from more practice.',
  },
  'Not Enough Evidence': {
    priority: 40,
    recommendation_type: 'additional_evidence',
    reason_code: 'insufficient_evidence',
    reason: 'More evidence is needed before assigning a stronger label.',
  },
};

function normalizeId(value) {
  return String(value ?? '').trim();
}

function asSet(values) {
  if (!values) return new Set();
  return new Set((Array.isArray(values) ? values : [...values]).map(normalizeId).filter(Boolean));
}

function evidencePackageId(evidence) {
  return normalizeId(evidence && (evidence.source_package_id || evidence.package_id || evidence.skill_id || evidence.id));
}

function toNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function compareEvidence(a, b) {
  const severity = (LABEL_SEVERITY[a.provisional_label] ?? 9) - (LABEL_SEVERITY[b.provisional_label] ?? 9);
  if (severity) return severity;

  const accuracyA = a.accuracy === null || a.accuracy === undefined ? Number.POSITIVE_INFINITY : Number(a.accuracy);
  const accuracyB = b.accuracy === null || b.accuracy === undefined ? Number.POSITIVE_INFINITY : Number(b.accuracy);
  if (accuracyA !== accuracyB) return accuracyA - accuracyB;

  const validA = toNumber(a.valid_scored_responses, Number.POSITIVE_INFINITY);
  const validB = toNumber(b.valid_scored_responses, Number.POSITIVE_INFINITY);
  if (validA !== validB) return validA - validB;

  return evidencePackageId(a).localeCompare(evidencePackageId(b));
}

function packageSummary(pkg) {
  return {
    package_id: packageIdOf(pkg),
    grade: pkg.grade,
    subject: pkg.subject,
    domain: pkg.domain || 'unknown',
    skill: pkg.skill || pkg.title || pkg.name || packageIdOf(pkg),
  };
}

function recommendationFor(pkg, evidence, plan) {
  const packageId = packageIdOf(pkg);
  const output = {
    ...packageSummary(pkg),
    evidence_label: evidence.provisional_label,
    recommendation_type: plan.recommendation_type,
    reason_code: plan.reason_code,
    reason: plan.reason,
    study_route: `/skill-world/${packageId}`,
    practice_route: `/skill-world/${packageId}/drill`,
    priority: plan.priority,
  };
  if (!ALLOWED_RECOMMENDATION_TYPES.has(output.recommendation_type)) throw new Error(`Unsupported recommendation_type: ${output.recommendation_type}`);
  if (!ALLOWED_REASON_CODES.has(output.reason_code)) throw new Error(`Unsupported reason_code: ${output.reason_code}`);
  return output;
}

function pushSkipped(skipped, packageId, reasonCode) {
  if (!packageId || !ALLOWED_REASON_CODES.has(reasonCode)) return;
  skipped.push({ package_id: packageId, reason_code: reasonCode });
}

function collectRemediationIds(pkg) {
  const ids = [];
  const visit = (value) => {
    if (!value) return;
    if (typeof value === 'string' || typeof value === 'number') {
      ids.push(normalizeId(value));
    } else if (Array.isArray(value)) {
      for (const child of value) visit(child);
    }
  };

  for (const [key, value] of Object.entries(pkg || {})) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.includes('next')) continue;
    if (normalizedKey.includes('remediation') || normalizedKey.includes('prerequisite')) visit(value);
  }

  return [...new Set(ids.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function sortCandidates(candidates) {
  return candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const evidenceCompare = compareEvidence(a.evidence, b.evidence);
    if (evidenceCompare) return evidenceCompare;
    return a.package_id.localeCompare(b.package_id);
  });
}

function recommendSkillPackages(options = {}) {
  const selectedGrade = options.grade;
  const selectedSubject = options.subject;
  const evidenceResults = options.evidence || options.skillEvidence || [];
  const packages = options.packages || [];
  const completed = asSet(options.completedPackageIds || options.previouslyCompletedPackageIds);
  const previouslyRecommended = asSet(options.previouslyRecommendedPackageIds || options.recommendedPackageIds);

  if (Array.isArray(selectedGrade) || selectedGrade === undefined || selectedGrade === null || selectedGrade === '') {
    throw new Error('recommendSkillPackages requires exactly one grade');
  }
  if (Array.isArray(selectedSubject) || !selectedSubject) {
    throw new Error('recommendSkillPackages requires exactly one subject');
  }
  if (!Array.isArray(evidenceResults)) throw new TypeError('evidence must be an array');
  if (!Array.isArray(packages)) throw new TypeError('packages must be an array');

  const packageById = new Map();
  for (const pkg of packages) {
    const packageId = packageIdOf(pkg);
    if (packageId) packageById.set(packageId, pkg);
  }

  const skipped = [];
  const currentCandidates = [];
  const remediationCandidates = [];
  const sortedEvidence = [...evidenceResults].sort(compareEvidence);

  for (const evidence of sortedEvidence) {
    const packageId = evidencePackageId(evidence);
    if (!packageId) continue;
    const pkg = packageById.get(packageId);
    if (!pkg) {
      pushSkipped(skipped, packageId, 'package_not_manifested');
      continue;
    }
    if (pkg.subject !== selectedSubject) {
      pushSkipped(skipped, packageId, 'subject_mismatch');
      continue;
    }
    if (Number(pkg.grade) !== Number(selectedGrade)) {
      pushSkipped(skipped, packageId, 'grade_mismatch');
      continue;
    }
    if (completed.has(packageId)) {
      pushSkipped(skipped, packageId, 'already_completed');
      continue;
    }
    if (previouslyRecommended.has(packageId)) {
      pushSkipped(skipped, packageId, 'already_recommended');
      continue;
    }

    if (evidence.provisional_label === 'Ready') {
      pushSkipped(skipped, packageId, 'ready_not_prioritized');
      continue;
    }

    const plan = CURRENT_LABEL_PLAN[evidence.provisional_label];
    if (plan) {
      currentCandidates.push({ ...recommendationFor(pkg, evidence, plan), evidence, package_id: packageId });
    }

    if (evidence.provisional_label === 'Needs Support') {
      for (const remediationId of collectRemediationIds(pkg)) {
        const remediationPkg = packageById.get(remediationId);
        if (!remediationPkg) {
          pushSkipped(skipped, remediationId, 'package_not_manifested');
          continue;
        }
        if (remediationPkg.subject !== selectedSubject) {
          pushSkipped(skipped, remediationId, 'subject_mismatch');
          continue;
        }
        if (completed.has(remediationId)) {
          pushSkipped(skipped, remediationId, 'already_completed');
          continue;
        }
        if (previouslyRecommended.has(remediationId)) {
          pushSkipped(skipped, remediationId, 'already_recommended');
          continue;
        }
        remediationCandidates.push({
          ...recommendationFor(remediationPkg, evidence, {
            priority: 20,
            recommendation_type: 'prerequisite_support',
            reason_code: 'verified_remediation',
            reason: 'This earlier skill may help support the current skill.',
          }),
          evidence,
          package_id: remediationId,
        });
      }
    }
  }

  const hasInstructionalEvidence = currentCandidates.some((candidate) => candidate.reason_code === 'needs_support' || candidate.reason_code === 'developing') || remediationCandidates.length > 0;
  const filteredCurrentCandidates = hasInstructionalEvidence
    ? currentCandidates.filter((candidate) => candidate.reason_code !== 'insufficient_evidence')
    : currentCandidates.filter((candidate) => candidate.reason_code === 'insufficient_evidence').slice(0, 1);

  const byId = new Map();
  for (const candidate of sortCandidates([...filteredCurrentCandidates, ...remediationCandidates])) {
    if (!byId.has(candidate.package_id)) byId.set(candidate.package_id, candidate);
  }

  const recommendations = [...byId.values()].slice(0, 3).map(({ evidence, ...publicRecommendation }) => publicRecommendation);
  skipped.sort((a, b) => `${a.package_id}:${a.reason_code}`.localeCompare(`${b.package_id}:${b.reason_code}`));
  return { recommendations, skipped };
}

module.exports = {
  ALLOWED_REASON_CODES,
  ALLOWED_RECOMMENDATION_TYPES,
  collectRemediationIds,
  recommendSkillPackages,
};
