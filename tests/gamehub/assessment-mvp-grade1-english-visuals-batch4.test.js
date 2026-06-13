const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const contentDir = path.join(root, 'public/gamehub/skill-world/content');
const { packageIdOf } = require(path.join(root, 'assessment-mvp/loadSkillPackages.js'));
const { createAssessmentSession, publicAssessmentSessionView } = require(path.join(root, 'assessment-mvp/createAssessmentSession.js'));
const { createReassessmentSession } = require(path.join(root, 'assessment-mvp/createReassessmentSession.js'));
const {
  selectAssessmentItems,
  containsProtectedField,
  isAssessmentItemDeliverable,
  REQUIRED_STIMULUS_NOT_RENDERABLE,
} = require(path.join(root, 'assessment-mvp/selectAssessmentItems.js'));
const learnerApp = require(path.join(root, 'public/assessment-mvp/app.js'));

const PRIOR_THROUGH_BATCH_3 = [
  'G1E_FL_001',
  'G1E_PH_001',
  'G1E_PH_002',
  'G1E_RC_001',
  'G1E_RC_002',
  'G1E_RF_001',
  'G1E_RF_002',
  'G1E_SW_001',
  'G1E_WR_001',
];
const BATCH_4 = ['G1E_WR_002'];
const EXPECTED_TITLES = new Map([
  ['G1E_WR_002', 'Describe a Picture with a Sentence'],
]);
const EXPECTED_RENDERERS = new Set(['sentence_builder', 'detail_picker', 'picture_prompt']);
const PROTECTED_RE = /correct_answer|acceptable_answers|accepted_answers|rubric|scoring|score|solution|explanation|feedback|distractor|rationale|sample_answer/i;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function packagePath(packageId) {
  return path.join(contentDir, `${packageId}.skill-package.v1.json`);
}

function loadPackage(packageId) {
  return JSON.parse(fs.readFileSync(packagePath(packageId), 'utf8'));
}

function manifestGrade1EnglishIds() {
  const manifest = JSON.parse(fs.readFileSync(path.join(contentDir, 'manifest.json'), 'utf8'));
  return manifest.packages
    .map((entry) => String(entry).replace(/\.skill-package\.v1\.json$/, ''))
    .filter((packageId) => packageId.startsWith('G1E_'));
}

function iterableQuestions(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  return Object.values(value)
    .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
    .filter((entry) => entry && typeof entry === 'object' && entry.question_id);
}

function allQuestions(pkg) {
  const rows = [];
  for (const bank of ['adaptive_question_bank', 'review_bank']) {
    for (const question of iterableQuestions(pkg[bank])) rows.push({ bank, question });
  }
  for (const level of Array.isArray(pkg.level_banks) ? pkg.level_banks : []) {
    for (const question of iterableQuestions(level.questions)) rows.push({ bank: 'level_banks', level_id: level.level_id, question });
  }
  return rows;
}

function isolatedPackageFromQuestion(pkg, bank, question) {
  const isolated = {
    skill_id: packageIdOf(pkg),
    grade: pkg.grade,
    subject: pkg.subject,
    domain: pkg.domain,
    adaptive_question_bank: [],
    review_bank: [],
    level_banks: [],
  };
  if (bank === 'level_banks') isolated.level_banks = [{ level_id: 'BATCH_4_FOCUSED_LEVEL', questions: [clone(question)] }];
  else isolated[bank] = [clone(question)];
  return isolated;
}

function selectOneActualRenderable(packageId, predicate = () => true) {
  const pkg = loadPackage(packageId);
  for (const { bank, question } of allQuestions(pkg)) {
    if (!predicate(question)) continue;
    const selected = selectAssessmentItems([isolatedPackageFromQuestion(pkg, bank, question)]);
    if (selected.publicItems.length === 1) return { pkg, bank, question, selected, item: selected.publicItems[0] };
  }
  throw new Error(`No renderable actual item found for ${packageId}`);
}

function assertPublicSafe(item) {
  const serialized = JSON.stringify(item.payload);
  assert.doesNotMatch(serialized, PROTECTED_RE);
  assert.equal(containsProtectedField(item.payload), false);
}

function assertStimulusHasAnsweringInformation(item) {
  const stimulus = item.payload.stimulus;
  assert.ok(stimulus, `${item.source_package_id} exposes stimulus`);
  assert.equal(stimulus.type, 'picture_prompt');
  assert.ok(EXPECTED_RENDERERS.has(stimulus.presentation.renderer));
  assert.ok(stimulus.content.label);
  assert.match(stimulus.content.alt_text, /Picture prompt:/);
  assert.ok(Array.isArray(stimulus.content.checks));
  assert.ok(stimulus.content.checks.length >= 3);
  assert.match(stimulus.presentation.label, /picture|detail|sentence/i);
}

function assertLearnerRendersAccessibly(item) {
  const sanitized = learnerApp.publicSessionOnly({ session_id: 'batch-4-test', public_items: [item] }).public_items[0];
  assert.equal(learnerApp.hasRenderableStimulus(sanitized), true);
  const html = learnerApp.renderStimulus(sanitized);
  assert.match(html, /assessment-stimulus/);
  assert.match(html, /picture-prompt-stimulus/);
  assert.match(html, /role="img"/);
  assert.match(html, /aria-label=/);
  assert.match(html, /writing-checklist/);
  assert.doesNotMatch(html, /<audio|autoplay|speechSynthesis/i);
  assert.doesNotMatch(html, PROTECTED_RE);
}

test('Batch 4 resolves only the next manifest-listed Grade 1 English package after Batch 3', () => {
  const ids = manifestGrade1EnglishIds();
  assert.deepEqual(ids.slice(0, 9), PRIOR_THROUGH_BATCH_3);
  assert.deepEqual(ids.slice(9), BATCH_4);
  assert.equal(loadPackage('G1E_WR_002').skill, EXPECTED_TITLES.get('G1E_WR_002'));
});

test('Batch 4 unlocks real picture-writing items with safe public stimulus and deterministic scoring', () => {
  const examples = [
    selectOneActualRenderable('G1E_WR_002', (question) => question.visual_model === 'sentence_builder'),
    selectOneActualRenderable('G1E_WR_002', (question) => question.visual_model === 'detail_picker'),
    selectOneActualRenderable('G1E_WR_002', (question) => question.visual_model === 'picture_prompt' && /full sentence/i.test(question.prompt)),
  ];
  for (const { selected, item } of examples) {
    assert.equal(selected.exclusionCounts[REQUIRED_STIMULUS_NOT_RENDERABLE] || 0, 0);
    assert.equal(selected.scoringRecords.length, 1);
    assert.equal(isAssessmentItemDeliverable(item), true);
    assertStimulusHasAnsweringInformation(item);
    assertPublicSafe(item);
    assertLearnerRendersAccessibly(item);
  }
});

test('Batch 4 baseline and reassessment have at least three distinct safe real items', () => {
  const pkg = loadPackage('G1E_WR_002');
  const baseline = selectAssessmentItems([pkg]);
  const baselineItems = baseline.publicItems.filter((item) => item.source_package_id === 'G1E_WR_002').slice(0, 3);
  assert.equal(baselineItems.length, 3, 'G1E_WR_002 baseline capacity');

  const reassessment = selectAssessmentItems([pkg], { baselineItems });
  const reassessmentItems = reassessment.publicItems.filter((item) => item.source_package_id === 'G1E_WR_002').slice(0, 3);
  assert.equal(reassessmentItems.length, 3, 'G1E_WR_002 reassessment capacity');
  const reservedIds = new Set(baselineItems.map((item) => item.item_identity));
  for (const item of reassessmentItems) assert.equal(reservedIds.has(item.item_identity), false);
});

test('Batch 4 public stimulus survives persistence/API view, learner sanitizer, and renderer', () => {
  const session = createAssessmentSession({ grade: 1, subject: 'English', itemsPerPackage: 3 });
  assert.equal(session.public_items.filter((item) => item.source_package_id === 'G1E_WR_002').length, 3);

  const persistedRows = session.public_items.map((item) => ({ public_payload: clone(item) }));
  const apiView = publicAssessmentSessionView({ ...session, public_items: persistedRows.map((row) => row.public_payload) });
  assert.doesNotMatch(JSON.stringify(apiView.public_items), PROTECTED_RE);

  const learnerSession = learnerApp.publicSessionOnly(apiView);
  const item = learnerSession.public_items.find((candidate) => candidate.source_package_id === 'G1E_WR_002');
  assert.ok(item, 'G1E_WR_002 survived API view');
  assertStimulusHasAnsweringInformation(item);
  assertLearnerRendersAccessibly(item);
});

test('Batch 4 answer-leaking, duplicate-choice, and malformed-choice items remain excluded', () => {
  const pkg = loadPackage('G1E_WR_002');
  const answerLeakingPictureName = allQuestions(pkg).find(({ question }) => question.visual_model === 'picture_prompt' && /^Name the picture\b/i.test(question.prompt));
  assert.ok(answerLeakingPictureName, 'expected an actual answer-leaking picture naming item');
  const unsupportedResult = selectAssessmentItems([isolatedPackageFromQuestion(pkg, answerLeakingPictureName.bank, answerLeakingPictureName.question)]);
  assert.equal(unsupportedResult.publicItems.length, 0);
  assert.equal(unsupportedResult.exclusionCounts[REQUIRED_STIMULUS_NOT_RENDERABLE], 1);

  const { question } = selectOneActualRenderable('G1E_WR_002');
  const duplicateChoiceResult = selectAssessmentItems([isolatedPackageFromQuestion(pkg, 'adaptive_question_bank', {
    ...question,
    question_id: 'BATCH_4_DUPLICATE_CHOICES',
    question_type: 'multiple_choice',
    choices: ['The cat runs.', 'The cat runs.', 'The cat jumps.'],
    correct_answer: 'The cat runs.',
  })]);
  assert.equal(duplicateChoiceResult.publicItems.length, 0);
  assert.equal(duplicateChoiceResult.exclusionCounts.duplicate_answer_choices, 1);

  const malformedChoiceResult = selectAssessmentItems([isolatedPackageFromQuestion(pkg, 'adaptive_question_bank', {
    ...question,
    question_id: 'BATCH_4_MALFORMED_CHOICES',
    question_type: 'multiple_choice',
    choices: ['The cat runs.', 'The cat jumps.', 'The cat naps.'],
    correct_answer: 'not present',
  })]);
  assert.equal(malformedChoiceResult.publicItems.length, 0);
  assert.equal(malformedChoiceResult.exclusionCounts.correct_answer_not_in_choices, 1);
});

test('Batch 4 reassessment session uses distinct newly renderable items after prior exposure', () => {
  const baseline = createAssessmentSession({ grade: 1, subject: 'English', itemsPerPackage: 3 });
  const baselineBatchItems = baseline.public_items.filter((item) => item.source_package_id === 'G1E_WR_002');
  const reassessment = createReassessmentSession({ status: 'completed' }, {
    grade: 1,
    subject: 'English',
    package_ids: BATCH_4,
    itemsPerPackage: 3,
    all_prior_exposed_item_ids: baselineBatchItems.map((item) => item.item_identity),
    all_prior_exposed_duplicate_keys: baselineBatchItems.map((item) => item.duplicate_key),
  });
  assert.deepEqual(reassessment.insufficient_evidence, []);
  const items = reassessment.public_items.filter((item) => item.source_package_id === 'G1E_WR_002');
  assert.equal(items.length, 3);
  const baselineIds = new Set(baselineBatchItems.map((item) => item.item_identity));
  for (const item of items) {
    assert.equal(baselineIds.has(item.item_identity), false);
    assert.equal(isAssessmentItemDeliverable(item), true);
  }
});
