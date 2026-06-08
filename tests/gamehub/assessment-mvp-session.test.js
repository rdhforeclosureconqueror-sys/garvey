const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const { createAssessmentSession, publicAssessmentSessionView } = require(path.join(root, 'assessment-mvp/createAssessmentSession.js'));
const { createReassessmentSession } = require(path.join(root, 'assessment-mvp/createReassessmentSession.js'));
const { submitAssessmentResponses, REQUIRED_LIMITATIONS } = require(path.join(root, 'assessment-mvp/submitAssessmentResponses.js'));
const { loadSkillPackages, packageIdOf } = require(path.join(root, 'assessment-mvp/loadSkillPackages.js'));

const contentRoot = path.join(root, 'public/gamehub/skill-world/content');

function hashRealContent() {
  const files = ['manifest.json', ...fs.readdirSync(contentRoot).filter((name) => name.endsWith('.skill-package.v1.json')).sort()];
  return crypto.createHash('sha256').update(files.map((name) => fs.readFileSync(path.join(contentRoot, name))).join('\n')).digest('hex');
}

function copyFixture(packages) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'assessment-session-mvp-'));
  const manifestEntries = packages.map((pkg) => `${pkg.skill_id}.json`);
  for (const pkg of packages) fs.writeFileSync(path.join(dir, `${pkg.skill_id}.json`), JSON.stringify(pkg, null, 2));
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ packages: manifestEntries }, null, 2));
  return path.join(dir, 'manifest.json');
}

function question(question_id, answer = 'yes', overrides = {}) {
  return {
    question_id,
    prompt: `Prompt ${question_id}`,
    question_type: 'short_response',
    correct_answer: answer,
    explanation: 'Private explanation',
    scoring_rubric: 'Private rubric',
    ...overrides,
  };
}

function pkg(skill_id, overrides = {}) {
  return {
    skill_id,
    grade: 3,
    subject: 'Math',
    domain: 'Numbers',
    skill: `Skill ${skill_id}`,
    adaptive_question_bank: [question(`${skill_id}_Q1`), question(`${skill_id}_Q2`), question(`${skill_id}_Q3`), question(`${skill_id}_Q4`)],
    review_bank: [],
    level_banks: [],
    ...overrides,
  };
}

function makeManifest() {
  return copyFixture([
    pkg('P1'),
    pkg('P2'),
    pkg('P3'),
    pkg('P4'),
    pkg('OTHER_GRADE', { grade: 4 }),
    pkg('OTHER_SUBJECT', { subject: 'English' }),
  ]);
}

function responseMapFor(session, value = 'yes') {
  return Object.fromEntries(session.internal_scoring_records.map((record) => [record.item_identity, value]));
}

function assertNoPrivateFields(value) {
  const text = JSON.stringify(value);
  assert.doesNotMatch(text, /correct_answer|acceptable_answers|accepted_answers|\banswer\b|rubric|scoring|score_key|solution|explanation|feedback|internal_scoring_records/i);
}

function assertNoSessionRuleLanguage(value) {
  const text = JSON.stringify(value).toLowerCase();
  assert.doesNotMatch(text, /mastered|failed|behind|diagnostic/);
}

test('baseline session filters to one grade and one subject, exposes only public items, records exposure, and is deterministic', () => {
  const manifestPath = makeManifest();
  const first = createAssessmentSession({ grade: 3, subject: 'Math', itemsPerPackage: 3, manifestPath, session_id: 'BASELINE' });
  const second = createAssessmentSession({ grade: 3, subject: 'Math', itemsPerPackage: 3, manifestPath, session_id: 'BASELINE' });

  assert.equal(first.assessment_role, 'baseline');
  assert.equal(first.status, 'in_progress');
  assert.deepEqual([...new Set(first.public_items.map((item) => item.grade))], [3]);
  assert.deepEqual([...new Set(first.public_items.map((item) => item.subject))], ['Math']);
  assert.equal(first.public_items.length, 12);
  assert.deepEqual(first.package_ids, ['P1', 'P2', 'P3', 'P4']);
  assert.deepEqual(first.exposed_item_ids, first.public_items.map((item) => item.item_identity).sort());
  assert.deepEqual(first.exposed_duplicate_keys, first.public_items.map((item) => item.duplicate_key).sort());
  assert.equal(first.selection_summary.unsupported_selection_counts['missing deterministic answer'] || 0, 0);

  const publicView = publicAssessmentSessionView(first);
  assert.equal(Object.prototype.hasOwnProperty.call(publicView, 'internal_scoring_records'), false);
  assertNoPrivateFields(publicView.public_items);
  assert.deepEqual(first, second);

  const automaticIdA = createAssessmentSession({ grade: 3, subject: 'Math', itemsPerPackage: 3, manifestPath });
  const automaticIdB = createAssessmentSession({ grade: 3, subject: 'Math', itemsPerPackage: 3, manifestPath });
  assert.deepEqual(automaticIdA, automaticIdB);
});

test('baseline session works with real manifest-listed packages without modifying source files', () => {
  const before = hashRealContent();
  const session = createAssessmentSession({ grade: 1, subject: 'Math', itemsPerPackage: 1, session_id: 'REAL' });
  const after = hashRealContent();

  assert.equal(before, after);
  assert.equal(session.grade, 1);
  assert.equal(session.subject, 'Math');
  assert.equal(session.public_items.every((item) => item.grade === 1), true);
  assert.equal(session.public_items.every((item) => item.subject === 'Math'), true);
  assert.equal(session.internal_scoring_records.length, session.public_items.length);
});

test('submission scores only session-owned items, is immutable, public-safe, and recommends only manifest packages', () => {
  const manifestPath = makeManifest();
  const packages = loadSkillPackages({ grade: 3, subject: 'Math', manifestPath });
  const session = createAssessmentSession({ grade: 3, subject: 'Math', itemsPerPackage: 3, manifestPath, session_id: 'SUBMIT' });
  const before = JSON.stringify(session);
  const responses = { ...responseMapFor(session, 'no'), 'P999::adaptive_question_bank::UNKNOWN': 'yes' };

  const result = submitAssessmentResponses(session, responses, { packages });
  assert.equal(JSON.stringify(session), before);
  assert.equal(result.status, 'completed');
  assert.equal(result.completed_session.status, 'completed');
  assert.equal(Object.prototype.hasOwnProperty.call(result.completed_session, 'internal_scoring_records'), false);
  assert.equal(result.response_results.filter((response) => response.status === 'unknown_item').length, 1);
  assert.equal(result.response_results.filter((response) => response.status !== 'unknown_item').length, session.internal_scoring_records.length);
  assert.deepEqual(result.skill_evidence.map((evidence) => evidence.source_package_id), ['P1', 'P2', 'P3', 'P4']);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'overall_mastery'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'subject_mastery'), false);
  assert.equal(result.recommendations.length, 3);
  assert.equal(result.recommendations.every((rec) => packages.some((pkg) => packageIdOf(pkg) === rec.package_id)), true);
  assert.deepEqual(result.exposure.item_ids, session.exposed_item_ids);
  assert.deepEqual(result.exposure.duplicate_keys, session.exposed_duplicate_keys);
  for (const limitation of REQUIRED_LIMITATIONS) assert.equal(result.limitations.includes(limitation), true);
  assertNoPrivateFields(result);
  assertNoSessionRuleLanguage(result);
});

test('completed and malformed sessions are rejected', () => {
  const manifestPath = makeManifest();
  const session = createAssessmentSession({ grade: 3, subject: 'Math', itemsPerPackage: 3, manifestPath });
  const result = submitAssessmentResponses(session, responseMapFor(session), { manifestPath });

  assert.throws(() => submitAssessmentResponses(result.completed_session, {}, { manifestPath }), /not in progress/);
  assert.throws(() => submitAssessmentResponses({ ...session, internal_scoring_records: null }, {}, { manifestPath }), /Malformed assessment session/);
});

test('reassessment excludes prior item IDs and duplicate keys, stays in requested packages, and reports insufficient coverage', () => {
  const baselinePkg = pkg('P1');
  const reassessPkg = pkg('P1', {
    adaptive_question_bank: [
      question('P1_Q1'),
      question('P1_Q5', 'yes', { prompt: 'Prompt P1_Q2' }),
      question('P1_Q6'),
      question('P1_Q7'),
    ],
  });
  const baselineManifest = copyFixture([baselinePkg, pkg('P2')]);
  const baseline = createAssessmentSession({ grade: 3, subject: 'Math', itemsPerPackage: 4, manifestPath: baselineManifest, session_id: 'BASE' });
  const completed = submitAssessmentResponses(baseline, responseMapFor(baseline), { manifestPath: baselineManifest });
  const reassessmentManifest = copyFixture([reassessPkg, pkg('P2')]);

  const reassessment = createReassessmentSession(completed, {
    grade: 3,
    subject: 'Math',
    package_ids: ['P1'],
    all_prior_exposed_item_ids: completed.exposure.item_ids,
    all_prior_exposed_duplicate_keys: completed.exposure.duplicate_keys,
    itemsPerPackage: 4,
    manifestPath: reassessmentManifest,
    session_id: 'REASSESS',
  });

  assert.equal(reassessment.assessment_role, 'reassessment');
  assert.deepEqual([...new Set(reassessment.public_items.map((item) => item.source_package_id))], ['P1']);
  assert.equal(reassessment.public_items.some((item) => completed.exposure.item_ids.includes(item.item_identity)), false);
  assert.equal(reassessment.public_items.some((item) => completed.exposure.duplicate_keys.includes(item.duplicate_key)), false);
  assert.deepEqual(reassessment.requested_package_ids, ['P1']);
  assert.deepEqual(reassessment.package_ids, ['P1']);
  assert.deepEqual(reassessment.insufficient_evidence, [{
    package_id: 'P1',
    safe_non_repeated_item_count: 2,
    reason_code: 'insufficient_non_repeated_items',
  }]);
  assert.equal(reassessment.selection_summary.unsupported_selection_counts['baseline/reassessment repeated item'], 2);
  assert.equal(Object.prototype.hasOwnProperty.call(publicAssessmentSessionView(reassessment), 'internal_scoring_records'), false);
});

test('reassessment never broadens into unrequested or missing packages', () => {
  const manifestPath = makeManifest();
  const baseline = createAssessmentSession({ grade: 3, subject: 'Math', itemsPerPackage: 1, manifestPath });
  const completed = submitAssessmentResponses(baseline, responseMapFor(baseline), { manifestPath });
  const reassessment = createReassessmentSession(completed, {
    grade: 3,
    subject: 'Math',
    package_ids: ['P2', 'DOES_NOT_EXIST'],
    all_prior_exposed_item_ids: [],
    all_prior_exposed_duplicate_keys: [],
    itemsPerPackage: 3,
    manifestPath,
  });

  assert.deepEqual(reassessment.requested_package_ids, ['DOES_NOT_EXIST', 'P2']);
  assert.deepEqual(reassessment.package_ids, ['P2']);
  assert.equal(reassessment.public_items.every((item) => item.source_package_id === 'P2'), true);
  assert.equal(reassessment.insufficient_evidence.some((entry) => entry.package_id === 'DOES_NOT_EXIST' && entry.reason_code === 'package_not_manifested'), true);
});
