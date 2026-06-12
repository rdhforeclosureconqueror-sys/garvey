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

const PRIOR_THROUGH_BATCH_2 = ['G1E_FL_001', 'G1E_PH_001', 'G1E_PH_002', 'G1E_RC_001', 'G1E_RC_002', 'G1E_RF_001'];
const BATCH_3 = ['G1E_RF_002', 'G1E_SW_001', 'G1E_WR_001'];
const EXPECTED_TITLES = new Map([
  ['G1E_RF_002', 'Phonemic Awareness: Beginning, Middle, Ending Sounds'],
  ['G1E_SW_001', 'Sight Words and High-Frequency Words'],
  ['G1E_WR_001', 'Write a Simple Sentence'],
]);
const EXPECTED_RENDERERS = new Map([
  ['G1E_RF_002', new Set(['picture_choice', 'word_sound_map', 'sound_match'])],
  ['G1E_SW_001', new Set(['word_card', 'phrase_builder', 'sentence_highlight'])],
  ['G1E_WR_001', new Set(['writing_checklist', 'sentence_builder', 'punctuation_marker'])],
]);
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

function allQuestions(pkg) {
  const rows = [];
  for (const bank of ['adaptive_question_bank', 'review_bank']) {
    if (Array.isArray(pkg[bank])) for (const question of pkg[bank]) rows.push({ bank, question });
  }
  for (const level of Array.isArray(pkg.level_banks) ? pkg.level_banks : []) {
    for (const question of Array.isArray(level.questions) ? level.questions : []) rows.push({ bank: 'level_banks', level_id: level.level_id, question });
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
  if (bank === 'level_banks') isolated.level_banks = [{ level_id: 'BATCH_3_FOCUSED_LEVEL', questions: [clone(question)] }];
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
  assert.ok(EXPECTED_RENDERERS.get(item.source_package_id).has(stimulus.presentation.renderer));
  if (stimulus.type === 'picture_choice') {
    assert.ok(stimulus.content.label);
    assert.match(stimulus.content.alt_text, /Picture of/);
  } else if (stimulus.type === 'phonics_tiles') {
    assert.ok(stimulus.content.word);
    assert.ok(stimulus.content.focus);
  } else if (stimulus.type === 'sound_match') {
    assert.ok(stimulus.content.words.length >= 2);
  } else if (stimulus.type === 'word') {
    assert.ok(stimulus.content.text);
  } else if (stimulus.type === 'highlighted_text') {
    assert.match(stimulus.content.text, /___/);
  } else if (stimulus.type === 'sentence_builder') {
    assert.ok(stimulus.content.text);
  } else if (stimulus.type === 'punctuation_marker') {
    assert.ok(stimulus.content.text);
    assert.ok(stimulus.content.marker);
  } else {
    throw new Error(`Unexpected stimulus type ${stimulus.type}`);
  }
}

function assertLearnerRendersAccessibly(item) {
  const sanitized = learnerApp.publicSessionOnly({ session_id: 'batch-3-test', public_items: [item] }).public_items[0];
  assert.equal(learnerApp.hasRenderableStimulus(sanitized), true);
  const html = learnerApp.renderStimulus(sanitized);
  assert.match(html, /assessment-stimulus/);
  assert.match(html, /aria-label=/);
  assert.doesNotMatch(html, /<audio|autoplay|speechSynthesis/i);
  assert.doesNotMatch(html, PROTECTED_RE);
  if (item.payload.stimulus.type === 'picture_choice') assert.match(html, /role="img"/);
  if (item.payload.stimulus.type === 'phonics_tiles') assert.match(html, /word-sound-map/);
  if (item.payload.stimulus.type === 'sound_match') assert.match(html, /sound-match-row/);
  if (item.payload.stimulus.type === 'highlighted_text') assert.match(html, /text-marker/);
  if (item.payload.stimulus.type === 'sentence_builder') assert.match(html, /sentence-builder-stimulus/);
  if (item.payload.stimulus.type === 'punctuation_marker') assert.match(html, /punctuation-slot/);
}

test('Batch 3 package IDs and titles resolve directly after Batch 2 from the manifest', () => {
  const ids = manifestGrade1EnglishIds();
  assert.deepEqual(ids.slice(0, 6), PRIOR_THROUGH_BATCH_2);
  assert.deepEqual(ids.slice(6, 9), BATCH_3);
  assert.equal(ids[9], 'G1E_WR_002', 'test scope stops before the fourth Batch 3 candidate');
  for (const packageId of BATCH_3) assert.equal(loadPackage(packageId).skill, EXPECTED_TITLES.get(packageId));
});

test('each Batch 3 package unlocks a real previously excluded item with safe public stimulus and deterministic scoring', () => {
  const examples = [
    selectOneActualRenderable('G1E_RF_002', (question) => question.visual_model === 'picture_choice'),
    selectOneActualRenderable('G1E_SW_001', (question) => question.visual_model === 'word_card'),
    selectOneActualRenderable('G1E_WR_001', (question) => question.visual_model === 'writing_checklist'),
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

test('Batch 3 baseline and reassessment have at least three distinct safe real items per package', () => {
  const packages = BATCH_3.map(loadPackage);
  const baseline = selectAssessmentItems(packages);
  const reserved = [];

  for (const packageId of BATCH_3) {
    const baselineItems = baseline.publicItems.filter((item) => item.source_package_id === packageId).slice(0, 3);
    assert.equal(baselineItems.length, 3, `${packageId} baseline capacity`);
    reserved.push(...baselineItems);
  }

  const reassessment = selectAssessmentItems(packages, { baselineItems: reserved });
  for (const packageId of BATCH_3) {
    const reassessmentItems = reassessment.publicItems.filter((item) => item.source_package_id === packageId).slice(0, 3);
    assert.equal(reassessmentItems.length, 3, `${packageId} reassessment capacity`);
    const reservedIds = new Set(reserved.filter((item) => item.source_package_id === packageId).map((item) => item.item_identity));
    for (const item of reassessmentItems) assert.equal(reservedIds.has(item.item_identity), false);
  }
});

test('Batch 3 public stimulus survives persistence/API view, learner sanitizer, and renderer', () => {
  const session = createAssessmentSession({ grade: 1, subject: 'English', itemsPerPackage: 3 });
  for (const packageId of BATCH_3) assert.equal(session.public_items.filter((item) => item.source_package_id === packageId).length, 3);

  const persistedRows = session.public_items.map((item) => ({ public_payload: clone(item) }));
  const apiView = publicAssessmentSessionView({ ...session, public_items: persistedRows.map((row) => row.public_payload) });
  assert.doesNotMatch(JSON.stringify(apiView.public_items), PROTECTED_RE);

  const learnerSession = learnerApp.publicSessionOnly(apiView);
  for (const packageId of BATCH_3) {
    const item = learnerSession.public_items.find((candidate) => candidate.source_package_id === packageId);
    assert.ok(item, `${packageId} survived API view`);
    assertStimulusHasAnsweringInformation(item);
    assertLearnerRendersAccessibly(item);
  }
});

test('Batch 3 unsupported answer-leaking sentence highlights and duplicate or malformed choices remain excluded', () => {
  const sw = loadPackage('G1E_SW_001');
  const answerLeakingHighlight = allQuestions(sw).find(({ question }) => question.visual_model === 'sentence_highlight' && !String(question.prompt).includes('___'));
  assert.ok(answerLeakingHighlight, 'expected an actual answer-leaking sentence_highlight item');
  const unsupportedResult = selectAssessmentItems([isolatedPackageFromQuestion(sw, answerLeakingHighlight.bank, answerLeakingHighlight.question)]);
  assert.equal(unsupportedResult.publicItems.length, 0);
  assert.equal(unsupportedResult.exclusionCounts[REQUIRED_STIMULUS_NOT_RENDERABLE], 1);

  const duplicateChoice = allQuestions(sw).find(({ question }) => Array.isArray(question.choices) && new Set(question.choices.map((choice) => String(choice).trim().toLowerCase())).size < question.choices.length);
  assert.ok(duplicateChoice, 'expected an actual duplicate-choice item');
  const duplicateResult = selectAssessmentItems([isolatedPackageFromQuestion(sw, duplicateChoice.bank, duplicateChoice.question)]);
  assert.equal(duplicateResult.publicItems.length, 0);
  assert.equal(duplicateResult.exclusionCounts.duplicate_answer_choices, 1);

  const { question } = selectOneActualRenderable('G1E_RF_002');
  const malformed = isolatedPackageFromQuestion(loadPackage('G1E_RF_002'), 'adaptive_question_bank', { ...question, question_id: 'BATCH_3_MALFORMED', choices: ['first', 'middle', 'last'], correct_answer: 'not present' });
  const malformedResult = selectAssessmentItems([malformed]);
  assert.equal(malformedResult.publicItems.length, 0);
  assert.equal(malformedResult.exclusionCounts.correct_answer_not_in_choices, 1);
});

test('Batch 3 reassessment session uses distinct newly renderable items after prior exposure', () => {
  const baseline = createAssessmentSession({ grade: 1, subject: 'English', itemsPerPackage: 3 });
  const baselineBatchItems = baseline.public_items.filter((item) => BATCH_3.includes(item.source_package_id));
  const reassessment = createReassessmentSession({ status: 'completed' }, {
    grade: 1,
    subject: 'English',
    package_ids: BATCH_3,
    itemsPerPackage: 3,
    all_prior_exposed_item_ids: baselineBatchItems.map((item) => item.item_identity),
    all_prior_exposed_duplicate_keys: baselineBatchItems.map((item) => item.duplicate_key),
  });
  assert.deepEqual(reassessment.insufficient_evidence, []);
  for (const packageId of BATCH_3) {
    const items = reassessment.public_items.filter((item) => item.source_package_id === packageId);
    assert.equal(items.length, 3);
    const baselineIds = new Set(baselineBatchItems.filter((item) => item.source_package_id === packageId).map((item) => item.item_identity));
    for (const item of items) {
      assert.equal(baselineIds.has(item.item_identity), false);
      assert.equal(isAssessmentItemDeliverable(item), true);
    }
  }
});
