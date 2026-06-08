const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const { packageIdOf } = require(path.join(root, 'assessment-mvp/loadSkillPackages.js'));
const {
  ALLOWED_REASON_CODES,
  ALLOWED_RECOMMENDATION_TYPES,
  recommendSkillPackages,
} = require(path.join(root, 'assessment-mvp/recommendSkillPackages.js'));

const manifestPath = path.join(root, 'public/gamehub/skill-world/content/manifest.json');
const contentDir = path.dirname(manifestPath);

function pkg(overrides = {}) {
  return {
    skill_id: 'PKG_A',
    grade: 1,
    subject: 'Math',
    domain: 'Operations',
    skill: 'Add within 10',
    adaptive_question_bank: [],
    review_bank: [],
    level_banks: [],
    ...overrides,
  };
}

function evidence(packageId, provisionalLabel, overrides = {}) {
  return {
    source_package_id: packageId,
    valid_scored_responses: 5,
    correct_responses: provisionalLabel === 'Needs Support' ? 2 : 3,
    incorrect_responses: provisionalLabel === 'Needs Support' ? 3 : 2,
    omitted_responses: 0,
    not_scorable_responses: 0,
    accuracy: provisionalLabel === 'Not Enough Evidence' ? null : (provisionalLabel === 'Ready' ? 0.9 : (provisionalLabel === 'Needs Support' ? 0.4 : 0.6)),
    provisional_label: provisionalLabel,
    ...overrides,
  };
}

function recommend(options) {
  return recommendSkillPackages({ grade: 1, subject: 'Math', ...options });
}

function loadManifestPackages() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return manifest.packages.map((entry) => JSON.parse(fs.readFileSync(path.join(contentDir, entry), 'utf8')));
}

function hashRealContent() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const hashes = new Map([[manifestPath, fs.readFileSync(manifestPath, 'utf8')]]);
  for (const entry of manifest.packages) {
    const filePath = path.join(contentDir, entry);
    hashes.set(filePath, fs.readFileSync(filePath, 'utf8'));
  }
  return hashes;
}

function assertRecommendationsArePublic(result) {
  const serialized = JSON.stringify(result.recommendations);
  assert.doesNotMatch(serialized, /scoring|answer|acceptable|correct_answer|private|question_id|item_identity/i);
}

function assertAllowedOutput(result) {
  for (const rec of result.recommendations) {
    assert.equal(ALLOWED_RECOMMENDATION_TYPES.has(rec.recommendation_type), true);
    assert.equal(ALLOWED_REASON_CODES.has(rec.reason_code), true);
    assert.equal(rec.study_route, `/skill-world/${rec.package_id}`);
    assert.equal(rec.practice_route, `/skill-world/${rec.package_id}/drill`);
    assert.doesNotMatch(rec.reason, /failed|bad at|weak child|behind|mastered|certified|diagnosis|grade placement/i);
  }
  for (const skipped of result.skipped) assert.equal(ALLOWED_REASON_CODES.has(skipped.reason_code), true);
}

test('ranking caps output at three and orders Needs Support, remediation, Developing, then extra evidence deterministically', () => {
  const packages = [
    pkg({ skill_id: 'PKG_NEEDS', remediation_skill_id: 'PKG_PRE' }),
    pkg({ skill_id: 'PKG_PRE', skill: 'Earlier add facts' }),
    pkg({ skill_id: 'PKG_DEV_A', skill: 'Developing A' }),
    pkg({ skill_id: 'PKG_DEV_B', skill: 'Developing B' }),
    pkg({ skill_id: 'PKG_MORE', skill: 'More evidence' }),
  ];
  const inputEvidence = [
    evidence('PKG_DEV_B', 'Developing', { accuracy: 0.8 }),
    evidence('PKG_MORE', 'Not Enough Evidence', { valid_scored_responses: 2, accuracy: null }),
    evidence('PKG_DEV_A', 'Developing', { accuracy: 0.5 }),
    evidence('PKG_NEEDS', 'Needs Support', { accuracy: 0.4 }),
  ];

  const result = recommend({ packages, evidence: inputEvidence });
  assert.deepEqual(result.recommendations.map((rec) => rec.package_id), ['PKG_NEEDS', 'PKG_PRE', 'PKG_DEV_A']);
  assert.deepEqual(result.recommendations.map((rec) => rec.recommendation_type), ['current_skill_support', 'prerequisite_support', 'current_skill_support']);
  assert.equal(result.recommendations.length, 3);
  assert.equal(result.recommendations[0].priority < result.recommendations[2].priority, true);
  assertAllowedOutput(result);
});

test('verified remediation is safe: ignores next_skill_id, reports missing references, rejects cross-subject, and allows cross-grade prerequisite support', () => {
  const packages = [
    pkg({ skill_id: 'PKG_NEEDS', remediation_skill_id: 'PKG_PRE', prerequisite_skill_ids: ['PKG_MISSING', 'PKG_ENGLISH'], next_skill_id: 'PKG_NEXT' }),
    pkg({ skill_id: 'PKG_PRE', grade: 0, skill: 'Earlier count support' }),
    pkg({ skill_id: 'PKG_NEXT', skill: 'Next skill must not be remediation' }),
    pkg({ skill_id: 'PKG_ENGLISH', subject: 'English', skill: 'English support' }),
  ];

  const result = recommend({ packages, evidence: [evidence('PKG_NEEDS', 'Needs Support')] });
  assert.deepEqual(result.recommendations.map((rec) => rec.package_id), ['PKG_NEEDS', 'PKG_PRE']);
  assert.equal(result.recommendations[1].grade, 0);
  assert.equal(result.recommendations.some((rec) => rec.package_id === 'PKG_NEXT'), false);
  assert.deepEqual(result.skipped, [
    { package_id: 'PKG_ENGLISH', reason_code: 'subject_mismatch' },
    { package_id: 'PKG_MISSING', reason_code: 'package_not_manifested' },
  ]);
  assert.match(result.recommendations[1].reason, /earlier skill may help support/i);
});

test('Ready is skipped, Not Enough Evidence can recommend additional evidence, and completed/recommended packages are skipped', () => {
  const packages = [
    pkg({ skill_id: 'PKG_READY' }),
    pkg({ skill_id: 'PKG_MORE' }),
    pkg({ skill_id: 'PKG_DONE' }),
    pkg({ skill_id: 'PKG_SEEN' }),
  ];
  const result = recommend({
    packages,
    evidence: [
      evidence('PKG_READY', 'Ready'),
      evidence('PKG_MORE', 'Not Enough Evidence', { valid_scored_responses: 2, accuracy: null }),
      evidence('PKG_DONE', 'Needs Support'),
      evidence('PKG_SEEN', 'Developing'),
    ],
    completedPackageIds: ['PKG_DONE'],
    previouslyRecommendedPackageIds: ['PKG_SEEN'],
  });

  assert.deepEqual(result.recommendations.map((rec) => [rec.package_id, rec.recommendation_type, rec.reason_code]), [
    ['PKG_MORE', 'additional_evidence', 'insufficient_evidence'],
  ]);
  assert.deepEqual(result.skipped, [
    { package_id: 'PKG_DONE', reason_code: 'already_completed' },
    { package_id: 'PKG_READY', reason_code: 'ready_not_prioritized' },
    { package_id: 'PKG_SEEN', reason_code: 'already_recommended' },
  ]);
});

test('all recommendation IDs must exist and evidence from unrelated grades, subjects, or missing packages is ignored', () => {
  const packages = [
    pkg({ skill_id: 'PKG_OK' }),
    pkg({ skill_id: 'PKG_GRADE', grade: 2 }),
    pkg({ skill_id: 'PKG_SUBJECT', subject: 'English' }),
  ];
  const result = recommend({
    packages,
    evidence: [
      evidence('PKG_OK', 'Developing'),
      evidence('PKG_GRADE', 'Needs Support'),
      evidence('PKG_SUBJECT', 'Needs Support'),
      evidence('PKG_MISSING', 'Needs Support'),
    ],
  });

  assert.deepEqual(result.recommendations.map((rec) => rec.package_id), ['PKG_OK']);
  assert.deepEqual(result.skipped, [
    { package_id: 'PKG_GRADE', reason_code: 'grade_mismatch' },
    { package_id: 'PKG_MISSING', reason_code: 'package_not_manifested' },
    { package_id: 'PKG_SUBJECT', reason_code: 'subject_mismatch' },
  ]);
  for (const rec of result.recommendations) assert.equal(packages.some((candidate) => packageIdOf(candidate) === rec.package_id), true);
});

test('ordering is byte-stable for equal priority using severity, accuracy, valid count, and package ID', () => {
  const packages = ['PKG_A', 'PKG_B', 'PKG_C', 'PKG_D'].map((skill_id) => pkg({ skill_id }));
  const unorderedEvidence = [
    evidence('PKG_D', 'Developing', { accuracy: 0.6, valid_scored_responses: 4 }),
    evidence('PKG_C', 'Developing', { accuracy: 0.6, valid_scored_responses: 4 }),
    evidence('PKG_B', 'Developing', { accuracy: 0.6, valid_scored_responses: 3 }),
    evidence('PKG_A', 'Developing', { accuracy: 0.4, valid_scored_responses: 5 }),
  ];
  const first = recommend({ packages, evidence: unorderedEvidence });
  const second = recommend({ packages: [...packages].reverse(), evidence: [...unorderedEvidence].reverse() });

  assert.deepEqual(first.recommendations.map((rec) => rec.package_id), ['PKG_A', 'PKG_B', 'PKG_C']);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test('inputs are not mutated and recommendation output has no scoring keys or private item records', () => {
  const packages = [pkg({ skill_id: 'PKG_A' })];
  const inputEvidence = [evidence('PKG_A', 'Developing')];
  const packagesBefore = JSON.stringify(packages);
  const evidenceBefore = JSON.stringify(inputEvidence);

  const result = recommend({ packages, evidence: inputEvidence });
  assert.equal(JSON.stringify(packages), packagesBefore);
  assert.equal(JSON.stringify(inputEvidence), evidenceBefore);
  assertRecommendationsArePublic(result);
  assertAllowedOutput(result);
});

test('real manifest-listed packages produce canonical routes without changing manifest or SkillPackage files', () => {
  const before = hashRealContent();
  const packages = loadManifestPackages();
  const result = recommendSkillPackages({
    grade: 1,
    subject: 'Math',
    packages,
    evidence: [
      evidence('G1M_OP_003', 'Needs Support', { accuracy: 0.25, valid_scored_responses: 4 }),
      evidence('G1M_NS_001', 'Developing', { accuracy: 0.6, valid_scored_responses: 5 }),
    ],
  });
  const after = hashRealContent();

  assert.deepEqual(before, after);
  assert.deepEqual(result.recommendations.map((rec) => rec.package_id), ['G1M_OP_003', 'G1M_OP_002', 'G1M_NS_001']);
  assert.equal(result.recommendations[0].grade, 1);
  assert.equal(result.recommendations[0].subject, 'Math');
  assert.equal(result.recommendations[0].study_route, '/skill-world/G1M_OP_003');
  assert.equal(result.recommendations[0].practice_route, '/skill-world/G1M_OP_003/drill');
  for (const rec of result.recommendations) assert.equal(packages.some((candidate) => packageIdOf(candidate) === rec.package_id), true);
  assertAllowedOutput(result);
  assertRecommendationsArePublic(result);
});
