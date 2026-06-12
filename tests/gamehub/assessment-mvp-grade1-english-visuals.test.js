const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const contentDir = path.join(root, 'public/gamehub/skill-world/content');
const { loadSkillPackages, packageIdOf } = require(path.join(root, 'assessment-mvp/loadSkillPackages.js'));
const { createAssessmentSession, publicAssessmentSessionView } = require(path.join(root, 'assessment-mvp/createAssessmentSession.js'));
const { createReassessmentSession } = require(path.join(root, 'assessment-mvp/createReassessmentSession.js'));
const {
  selectAssessmentItems,
  containsProtectedField,
  isAssessmentItemDeliverable,
  REQUIRED_STIMULUS_NOT_RENDERABLE,
} = require(path.join(root, 'assessment-mvp/selectAssessmentItems.js'));
const learnerApp = require(path.join(root, 'public/assessment-mvp/app.js'));

const FIRST_THREE = ['G1E_FL_001', 'G1E_PH_001', 'G1E_PH_002'];
const PROTECTED_RE = /correct_answer|acceptable_answers|accepted_answers|rubric|scoring|score|solution|explanation|feedback|distractor|rationale/i;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function packagePath(packageId) {
  return path.join(contentDir, `${packageId}.skill-package.v1.json`);
}

function loadPackage(packageId) {
  return JSON.parse(fs.readFileSync(packagePath(packageId), 'utf8'));
}

function firstThreeManifestIds() {
  const manifest = JSON.parse(fs.readFileSync(path.join(contentDir, 'manifest.json'), 'utf8'));
  return manifest.packages.slice(0, 3).map((entry) => String(entry).replace(/\.skill-package\.v1\.json$/, ''));
}

function allQuestions(pkg) {
  const rows = [];
  for (const bank of ['adaptive_question_bank', 'review_bank']) {
    if (Array.isArray(pkg[bank])) for (const question of pkg[bank]) rows.push({ bank, question });
  }
  for (const level of Array.isArray(pkg.level_banks) ? pkg.level_banks : []) {
    for (const question of Array.isArray(level.questions) ? level.questions : []) rows.push({ bank: 'level_banks', question, level_id: level.level_id });
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
  if (bank === 'level_banks') isolated.level_banks = [{ level_id: 'FOCUSED_TEST_LEVEL', questions: [clone(question)] }];
  else isolated[bank] = [clone(question)];
  return isolated;
}

function publicPayloadIsSafe(item) {
  const serialized = JSON.stringify(item.payload);
  assert.doesNotMatch(serialized, PROTECTED_RE);
  assert.equal(containsProtectedField(item.payload), false);
}

function selectOneActualRenderable(packageId) {
  const pkg = loadPackage(packageId);
  for (const { bank, question } of allQuestions(pkg)) {
    const selected = selectAssessmentItems([isolatedPackageFromQuestion(pkg, bank, question)]);
    if (selected.publicItems.length === 1) return { pkg, bank, question, selected, item: selected.publicItems[0] };
  }
  throw new Error(`No renderable actual item found for ${packageId}`);
}

function assertStimulusVisibleForPackage(packageId, item) {
  const html = learnerApp.renderStimulus(learnerApp.publicSessionOnly({
    session_id: 'test',
    public_items: [item],
  }).public_items[0]);
  const stimulus = item.payload.stimulus;
  assert.match(html, /assessment-stimulus/);
  assert.equal(learnerApp.hasRenderableStimulus(item), true);
  if (stimulus.type === 'sentence' || stimulus.type === 'word') {
    assert.match(html, new RegExp(stimulus.content.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(html, /aria-label=/);
  }
  if (stimulus.type === 'letter_tiles') {
    for (const tile of stimulus.content.tiles) assert.match(html, new RegExp(`>${tile}<`));
    assert.match(html, /letter-tile/);
    assert.match(html, /aria-label="Tile 1:/);
  }
  assert.doesNotMatch(html, PROTECTED_RE);
}

test('batch is limited to the first three manifest-listed Grade 1 English packages', () => {
  assert.deepEqual(firstThreeManifestIds(), FIRST_THREE);
});

test('actual previously excluded items now expose minimal public stimuli and remain scorable', () => {
  const expectedTypes = new Map([
    ['G1E_FL_001', 'sentence'],
    ['G1E_PH_001', 'letter_tiles'],
    ['G1E_PH_002', 'word'],
  ]);

  for (const packageId of FIRST_THREE) {
    const { selected, item } = selectOneActualRenderable(packageId);
    assert.equal(selected.exclusionCounts[REQUIRED_STIMULUS_NOT_RENDERABLE] || 0, 0);
    assert.equal(item.payload.stimulus.type, expectedTypes.get(packageId));
    assert.equal(selected.scoringRecords.length, 1);
    assert.equal(isAssessmentItemDeliverable(item), true);
    publicPayloadIsSafe(item);
    assertStimulusVisibleForPackage(packageId, item);
  }
});

test('baseline and reassessment capacity use different safe actual items for each package', () => {
  const packages = FIRST_THREE.map(loadPackage);
  const baseline = selectAssessmentItems(packages);
  const priorItems = [];

  for (const packageId of FIRST_THREE) {
    const baselineItems = baseline.publicItems.filter((item) => item.source_package_id === packageId).slice(0, 3);
    assert.equal(baselineItems.length, 3, `${packageId} needs at least three baseline items`);
    priorItems.push(...baselineItems);
  }

  const reassessment = selectAssessmentItems(packages, { baselineItems: priorItems });
  for (const packageId of FIRST_THREE) {
    const reassessmentItems = reassessment.publicItems.filter((item) => item.source_package_id === packageId).slice(0, 3);
    assert.equal(reassessmentItems.length, 3, `${packageId} needs at least three reassessment items`);
    const baselineIds = new Set(priorItems.filter((item) => item.source_package_id === packageId).map((item) => item.item_identity));
    for (const item of reassessmentItems) assert.equal(baselineIds.has(item.item_identity), false);
  }
});

test('public stimulus survives session creation, stored payload clone, API view, learner sanitizer, and renderer', () => {
  const session = createAssessmentSession({ grade: 1, subject: 'English', itemsPerPackage: 3 });
  for (const packageId of FIRST_THREE) {
    const items = session.public_items.filter((item) => item.source_package_id === packageId);
    assert.equal(items.length, 3);
  }
  const storedRows = session.public_items.map((item) => ({ public_payload: clone(item) }));
  const reconstructed = publicAssessmentSessionView({ ...session, public_items: storedRows.map((row) => row.public_payload) });
  assert.doesNotMatch(JSON.stringify(reconstructed.public_items), PROTECTED_RE);
  const learnerSession = learnerApp.publicSessionOnly(reconstructed);
  for (const packageId of FIRST_THREE) {
    const item = learnerSession.public_items.find((candidate) => candidate.source_package_id === packageId);
    assert.ok(item.payload.stimulus, `${packageId} stimulus survived learner sanitizer`);
    assert.equal(learnerApp.hasRenderableStimulus(item), true);
    assert.match(learnerApp.renderStimulus(item), /assessment-stimulus/);
  }
});

test('unsupported, duplicate-choice, malformed-choice, and text-only controls remain fail-closed or valid as expected', () => {
  const fluency = loadPackage('G1E_FL_001');
  const unsupported = allQuestions(fluency).find(({ question }) => ['sentence_builder', 'punctuation_marker'].includes(question.visual_model));
  assert.ok(unsupported, 'expected actual unsupported fluency item');
  const unsupportedResult = selectAssessmentItems([isolatedPackageFromQuestion(fluency, unsupported.bank, unsupported.question)]);
  assert.equal(unsupportedResult.publicItems.length, 0);
  assert.equal(unsupportedResult.exclusionCounts[REQUIRED_STIMULUS_NOT_RENDERABLE], 1);

  const phonics = loadPackage('G1E_PH_001');
  const actual = selectOneActualRenderable('G1E_PH_001').question;
  const duplicateChoices = isolatedPackageFromQuestion(phonics, 'adaptive_question_bank', { ...actual, question_id: 'DUP_CHOICES', choices: ['cat', ' cat ', 'dog'] });
  const duplicateResult = selectAssessmentItems([duplicateChoices]);
  assert.equal(duplicateResult.publicItems.length, 0);
  assert.equal(duplicateResult.exclusionCounts.duplicate_answer_choices, 1);

  const malformedChoices = isolatedPackageFromQuestion(phonics, 'adaptive_question_bank', { ...actual, question_id: 'MALFORMED_CHOICES', choices: ['cat', 'dog'], correct_answer: 'pig' });
  const malformedResult = selectAssessmentItems([malformedChoices]);
  assert.equal(malformedResult.publicItems.length, 0);
  assert.equal(malformedResult.exclusionCounts.correct_answer_not_in_choices, 1);

  const textOnly = {
    skill_id: 'TEXT_ONLY_OK',
    grade: 1,
    subject: 'English',
    domain: 'Fluency',
    adaptive_question_bank: [{ question_id: 'TEXT_OK', prompt: 'Pick the word cat.', question_type: 'multiple_choice', choices: ['cat', 'dog', 'sun'], correct_answer: 'cat' }],
    review_bank: [],
    level_banks: [],
  };
  const textOnlyResult = selectAssessmentItems([textOnly]);
  assert.equal(textOnlyResult.publicItems.length, 1);
  assert.equal(learnerApp.hasRenderableStimulus(textOnlyResult.publicItems[0]), true);
});

test('actual items provide mobile and accessibility hooks without forced audio', () => {
  const css = fs.readFileSync(path.join(root, 'public/assessment-mvp/styles.css'), 'utf8');
  assert.match(css, /@media \(max-width: 430px\)/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /letter-tile/);

  for (const packageId of FIRST_THREE) {
    const { item } = selectOneActualRenderable(packageId);
    const html = learnerApp.renderStimulus(item);
    assert.match(html, /aria-label=/);
    assert.doesNotMatch(html, /<audio|autoplay|speechSynthesis/i);
  }
});

test('createReassessmentSession admits newly renderable actual items after prior exposure', () => {
  const baseline = createAssessmentSession({ grade: 1, subject: 'English', itemsPerPackage: 3 });
  const reassessment = createReassessmentSession({ status: 'completed' }, {
    grade: 1,
    subject: 'English',
    package_ids: FIRST_THREE,
    itemsPerPackage: 3,
    all_prior_exposed_item_ids: baseline.public_items.map((item) => item.item_identity),
    all_prior_exposed_duplicate_keys: baseline.public_items.map((item) => item.duplicate_key),
  });
  assert.deepEqual(reassessment.insufficient_evidence, []);
  for (const packageId of FIRST_THREE) {
    const items = reassessment.public_items.filter((item) => item.source_package_id === packageId);
    assert.equal(items.length, 3);
    for (const item of items) assert.equal(isAssessmentItemDeliverable(item), true);
  }
});
