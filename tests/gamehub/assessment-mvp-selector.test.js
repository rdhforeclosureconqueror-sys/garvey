const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const { loadSkillPackages } = require(path.join(root, 'assessment-mvp/loadSkillPackages.js'));
const { selectAssessmentItems, containsProtectedField } = require(path.join(root, 'assessment-mvp/selectAssessmentItems.js'));

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function copyFixture(files, manifestEntries) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'assessment-mvp-'));
  for (const [name, data] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2));
  }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ packages: manifestEntries }, null, 2));
  return path.join(dir, 'manifest.json');
}

function pkg(overrides = {}) {
  return {
    skill_id: 'PKG_A',
    grade: 1,
    subject: 'Math',
    domain: 'Operations',
    adaptive_question_bank: [],
    review_bank: [],
    level_banks: [],
    ...overrides,
  };
}

function question(overrides = {}) {
  return {
    question_id: 'Q1',
    prompt: 'What is 1 + 1?',
    question_type: 'multiple_choice',
    choices: ['1', '2', '3'],
    correct_answer: '2',
    explanation: '1 + 1 is 2.',
    feedback: 'Correct.',
    ...overrides,
  };
}

function assertPublicIsSafe(items) {
  const serialized = JSON.stringify(items);
  assert.doesNotMatch(serialized, /correct_answer|acceptable_answers|accepted_answers|rubric|scoring|score|solution|explanation|feedback/i);
  for (const item of items) assert.equal(containsProtectedField(item.payload), false);
}

test('loader filters by exact grade and exact subject using only manifest members', () => {
  const manifestPath = copyFixture({
    'a.json': pkg({ skill_id: 'PKG_A', grade: 1, subject: 'Math' }),
    'b.json': pkg({ skill_id: 'PKG_B', grade: 2, subject: 'Math' }),
    'c.json': pkg({ skill_id: 'PKG_C', grade: 1, subject: 'English' }),
    'unlisted.json': pkg({ skill_id: 'PKG_D', grade: 1, subject: 'Math' }),
  }, ['b.json', 'c.json', 'a.json']);

  const packages = loadSkillPackages({ manifestPath, grade: 1, subject: 'Math' });
  assert.deepEqual(packages.map((p) => p.skill_id), ['PKG_A']);
  assert.equal(Object.isFrozen(packages[0]), true);
});

test('loader requires exactly one grade and subject', () => {
  assert.throws(() => loadSkillPackages({ grade: [1], subject: 'Math' }), /exactly one grade/);
  assert.throws(() => loadSkillPackages({ grade: 1, subject: ['Math'] }), /exactly one subject/);
});

test('loader rejects duplicate package IDs across manifest-listed files', () => {
  const manifestPath = copyFixture({
    'a.json': pkg({ skill_id: 'PKG_A' }),
    'b.json': pkg({ skill_id: 'PKG_A' }),
  }, ['a.json', 'b.json']);
  assert.throws(() => loadSkillPackages({ manifestPath, grade: 1, subject: 'Math' }), /Duplicate package ID: PKG_A/);
});

test('loader and selector output are deterministic', () => {
  const packages = loadSkillPackages({ grade: 1, subject: 'Math' });
  const first = selectAssessmentItems(packages);
  const second = selectAssessmentItems(loadSkillPackages({ grade: 1, subject: 'Math' }));
  assert.deepEqual(first.publicItems.map((item) => item.assessment_item_id), second.publicItems.map((item) => item.assessment_item_id));
  assert.deepEqual(first.exclusionCounts, second.exclusionCounts);
});

test('selector emits no duplicate selected identities', () => {
  const { publicItems } = selectAssessmentItems(loadSkillPackages({ grade: 1, subject: 'Math' }));
  const identities = publicItems.map((item) => item.item_identity);
  assert.equal(new Set(identities).size, identities.length);
});

test('reassessment excludes baseline identities and duplicate keys', () => {
  const baseline = selectAssessmentItems([pkg({ adaptive_question_bank: [question()] })]);
  const reassessment = selectAssessmentItems([pkg({ adaptive_question_bank: [question()] })], { baselineItems: baseline.publicItems });
  assert.equal(reassessment.publicItems.length, 0);
  assert.equal(reassessment.exclusionCounts['baseline/reassessment repeated item'], 1);
});

test('visual questions with identical prompt text but different stimuli are not incorrectly collapsed', () => {
  const result = selectAssessmentItems([pkg({
    adaptive_question_bank: [
      question({ question_id: 'Q1', prompt: 'How many?', visual_model: 'ten_frame', a: 2, correct_answer: '2' }),
      question({ question_id: 'Q2', prompt: 'How many?', visual_model: 'ten_frame', a: 3, correct_answer: '3' }),
    ],
  })]);
  assert.equal(result.publicItems.length, 2);
  assert.equal(result.exclusionCounts['duplicate prompt/stimulus combination'] || 0, 0);
});

test('true duplicate prompt and stimulus combinations are collapsed after preferred bank order', () => {
  const result = selectAssessmentItems([pkg({
    adaptive_question_bank: [question({ question_id: 'Q1', visual_model: 'ten_frame', a: 2 })],
    review_bank: [question({ question_id: 'Q2', visual_model: 'ten_frame', a: 2 })],
  })]);
  assert.deepEqual(result.publicItems.map((item) => item.source_bank), ['adaptive_question_bank']);
  assert.equal(result.exclusionCounts['duplicate prompt/stimulus combination'], 1);
});

test('unsupported and invalid items are counted by reason', () => {
  const result = selectAssessmentItems([pkg({
    adaptive_question_bank: [
      question({ question_id: '', prompt: 'Missing ID' }),
      question({ question_id: 'Q2', question_type: '' }),
      question({ question_id: 'Q3', question_type: 'essay' }),
      question({ question_id: 'Q4', correct_answer: '' }),
      question({ question_id: 'Q5', delivery_metadata: { correct_answer: 'yes' } }),
    ],
  })]);
  assert.equal(result.exclusionCounts['missing question ID'], 1);
  assert.equal(result.exclusionCounts['missing question type'], 1);
  assert.equal(result.exclusionCounts['unsupported question type'], 1);
  assert.equal(result.exclusionCounts['missing deterministic answer'], 1);
  assert.equal(result.exclusionCounts['answer-revealing delivery metadata'], 1);
});

test('duplicate source question IDs and duplicate item identities are excluded', () => {
  const result = selectAssessmentItems([pkg({
    adaptive_question_bank: [question({ question_id: 'Q1', prompt: 'A' }), question({ question_id: 'Q1', prompt: 'B' })],
  })]);
  assert.equal(result.publicItems.length, 1);
  assert.equal(result.exclusionCounts['duplicate source question ID'], 1);
  assert.equal(result.exclusionCounts['duplicate item identity'], 1);
});

test('public payload contains no answer or scoring data while internal records retain answers', () => {
  const result = selectAssessmentItems([pkg({ adaptive_question_bank: [question()] })]);
  assert.equal(result.publicItems.length, 1);
  assertPublicIsSafe(result.publicItems);
  assert.deepEqual(result.scoringRecords.map((record) => record.answer), ['2']);
});

test('manifest and package source files remain byte-identical after loading and selecting', () => {
  const sourceFiles = [
    'public/gamehub/skill-world/content/manifest.json',
    'public/gamehub/skill-world/content/G1M_OP_001.skill-package.v1.json',
  ];
  const before = Object.fromEntries(sourceFiles.map((file) => [file, read(file)]));
  const packages = loadSkillPackages({ grade: 1, subject: 'Math' });
  selectAssessmentItems(packages);
  for (const file of sourceFiles) assert.equal(read(file), before[file], `${file} changed`);
});
