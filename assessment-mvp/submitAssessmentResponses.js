const { loadSkillPackages, packageIdOf } = require('./loadSkillPackages');
const { scoreResponses } = require('./scoreResponses');
const { recommendSkillPackages } = require('./recommendSkillPackages');
const { publicAssessmentSessionView, requireSingle, toStableUnique } = require('./createAssessmentSession');

const REQUIRED_LIMITATIONS = [
  'Results are provisional instructional guidance.',
  'Results are not an official placement decision.',
  'Open writing may require additional evidence.',
  'Ready is provisional and is not a scientific mastery certification.',
];

function validateSession(session) {
  if (!session || typeof session !== 'object') throw new Error('Malformed assessment session');
  if (session.status !== 'in_progress') throw new Error('Assessment session is not in progress');
  if (!Array.isArray(session.public_items)) throw new Error('Malformed assessment session: public_items must be an array');
  if (!Array.isArray(session.internal_scoring_records)) throw new Error('Malformed assessment session: internal_scoring_records must be an array');
  requireSingle('grade', session.grade, 'assessment session');
  requireSingle('subject', session.subject, 'assessment session');
  if (!session.session_id || !session.assessment_role) throw new Error('Malformed assessment session: missing identity fields');
}

function normalizeResponses(responses) {
  if (Array.isArray(responses)) return responses.map((response) => ({ ...response }));
  if (!responses || typeof responses !== 'object') throw new TypeError('responses must be an object keyed by item identity or an array');
  return Object.keys(responses)
    .sort((a, b) => a.localeCompare(b))
    .map((item_identity) => ({ item_identity, response: responses[item_identity] }));
}

function packageSummaryById(packages) {
  const byId = new Map();
  for (const pkg of packages) {
    const id = packageIdOf(pkg);
    if (id) byId.set(id, { skill: pkg.skill || pkg.title || pkg.name || id, domain: pkg.domain || 'unknown' });
  }
  return byId;
}

function enrichEvidence(skillEvidence, packages) {
  const byId = packageSummaryById(packages);
  return skillEvidence.map((evidence) => ({
    ...evidence,
    skill: byId.get(evidence.source_package_id)?.skill || evidence.skill || evidence.source_package_id,
    domain: byId.get(evidence.source_package_id)?.domain || evidence.domain || 'unknown',
  }));
}

function publicResult(result) {
  return JSON.parse(JSON.stringify(result));
}

function submitAssessmentResponses(session, responses, options = {}) {
  validateSession(session);
  const submissions = normalizeResponses(responses);
  const packages = options.packages || loadSkillPackages({
    grade: session.grade,
    subject: session.subject,
    manifestPath: options.manifestPath,
    contentDir: options.contentDir,
  });
  if (!Array.isArray(packages)) throw new TypeError('packages must be an array');

  const scored = scoreResponses(session.internal_scoring_records, submissions);
  const enrichedSkillEvidence = enrichEvidence(scored.skillEvidence, packages);
  const recommendationResult = recommendSkillPackages({
    grade: session.grade,
    subject: session.subject,
    packages,
    evidence: enrichedSkillEvidence,
    completedPackageIds: options.completedPackageIds || options.completed_package_ids || [],
    previouslyRecommendedPackageIds: options.previouslyRecommendedPackageIds || options.previously_recommended_package_ids || [],
  });

  const completedSession = {
    ...publicAssessmentSessionView(session),
    status: 'completed',
  };

  return publicResult({
    session_id: session.session_id,
    assessment_role: session.assessment_role,
    grade: session.grade,
    subject: session.subject,
    status: 'completed',
    completed_session: completedSession,
    response_results: scored.responses,
    skill_evidence: enrichedSkillEvidence,
    recommendations: recommendationResult.recommendations.slice(0, 3),
    skipped_recommendations: recommendationResult.skipped,
    exposure: {
      item_ids: toStableUnique(session.exposed_item_ids || session.public_items.map((item) => item.item_identity)),
      duplicate_keys: toStableUnique(session.exposed_duplicate_keys || session.public_items.map((item) => item.duplicate_key)),
    },
    limitations: [...REQUIRED_LIMITATIONS],
  });
}

module.exports = {
  REQUIRED_LIMITATIONS,
  enrichEvidence,
  normalizeResponses,
  submitAssessmentResponses,
};
