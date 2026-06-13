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
      question({ question_id: 'Q1', prompt: 'What shape is shown?', visual_model: 'shape_identification', support_type: 'shape_identification', shape: 'circle', choices: ['circle', 'square'], correct_answer: 'circle' }),
      question({ question_id: 'Q2', prompt: 'What shape is shown?', visual_model: 'shape_identification', support_type: 'shape_identification', shape: 'square', choices: ['circle', 'square'], correct_answer: 'square' }),
    ],
  })]);
  assert.equal(result.publicItems.length, 2);
  assert.equal(result.exclusionCounts['duplicate prompt/stimulus combination'] || 0, 0);
});

test('true duplicate prompt and stimulus combinations are collapsed after preferred bank order', () => {
  const result = selectAssessmentItems([pkg({
    adaptive_question_bank: [question({ question_id: 'Q1', prompt: 'What shape is shown?', visual_model: 'shape_identification', support_type: 'shape_identification', shape: 'circle', choices: ['circle', 'square'], correct_answer: 'circle' })],
    review_bank: [question({ question_id: 'Q2', prompt: 'What shape is shown?', visual_model: 'shape_identification', support_type: 'shape_identification', shape: 'circle', choices: ['circle', 'square'], correct_answer: 'circle' })],
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

function productionQuestion(promptRe, questionId) {
  const packages = loadSkillPackages({ grade: 1, subject: 'Math' });
  for (const packageData of packages) {
    for (const bank of ['adaptive_question_bank', 'review_bank']) {
      for (const q of Array.isArray(packageData[bank]) ? packageData[bank] : []) {
        if ((!questionId || q.question_id === questionId) && promptRe.test(q.prompt || '')) return { packageData, bank, q };
      }
    }
    for (const level of Array.isArray(packageData.level_banks) ? packageData.level_banks : []) {
      for (const q of Array.isArray(level.questions) ? level.questions : []) {
        if ((!questionId || q.question_id === questionId) && promptRe.test(q.prompt || '')) return { packageData, bank: 'level_banks', q };
      }
    }
  }
  throw new Error(`production question not found: ${promptRe}`);
}

function selectOneLive(promptRe, questionId) {
  const { packageData, bank, q } = productionQuestion(promptRe, questionId);
  const packageOverride = {
    skill_id: packageData.skill_id,
    grade: packageData.grade,
    subject: packageData.subject,
    domain: packageData.domain,
  };
  if (bank === 'level_banks') packageOverride.level_banks = [{ level_id: 'TEST_LEVEL', questions: [q] }];
  else packageOverride[bank] = [q];
  return selectAssessmentItems([pkg(packageOverride)]);
}

test('live visual prompts without renderable public stimulus fail closed', () => {
  const cases = [
    [/What shape is shown\?/i, 'G1M_GM_001_AQ1', (q) => ({ ...q, shape: undefined })],
    [/Which is longer, A or B\?/i, null, (q) => q],
    [/Which is taller, A or B\?/i, null, (q) => q],
    [/Which object is heavier\?/i, null, (q) => q],
    [/What time is shown on the clock\?/i, null, (q) => ({ ...q, hour: undefined })],
    [/Count the objects\. How many are there\?/i, null, (q) => q],
  ];
  for (const [promptRe, questionId, mutate] of cases) {
    const { packageData, bank, q } = productionQuestion(promptRe, questionId);
    const packageOverride = {
      skill_id: packageData.skill_id,
      grade: packageData.grade,
      subject: packageData.subject,
      domain: packageData.domain,
    };
    if (bank === 'level_banks') packageOverride.level_banks = [{ level_id: 'TEST_LEVEL', questions: [mutate(q)] }];
    else packageOverride[bank] = [mutate(q)];
    const result = selectAssessmentItems([pkg(packageOverride)]);
    assert.equal(result.publicItems.length, 0, `${q.question_id} should not be delivered`);
    assert.equal(result.exclusionCounts.required_stimulus_not_renderable, 1, `${q.question_id} should report required_stimulus_not_renderable`);
  }
});

test('duplicate answer choices are rejected after display normalization for the live subtraction item', () => {
  const result = selectOneLive(/Subtract:\s*6\s*-\s*6\s*= __/i, 'G1M_OP_002_AQ2');
  assert.equal(result.publicItems.length, 0);
  assert.equal(result.exclusionCounts.duplicate_answer_choices, 1);
});

test('single-choice answer validation rejects malformed choices but keeps a valid text-only item', () => {
  const malformed = selectAssessmentItems([pkg({ adaptive_question_bank: [
    question({ question_id: 'DUP_DISPLAY', choices: [' 0 ', '0', '1'], correct_answer: '0' }),
    question({ question_id: 'MISSING_CORRECT', choices: ['A', 'B'], correct_answer: 'C' }),
    question({ question_id: 'VALID_TEXT', prompt: 'What is 2 + 1?', choices: ['2', '3', '4'], correct_answer: '3' }),
  ] })]);
  assert.equal(malformed.exclusionCounts.duplicate_answer_choices, 1);
  assert.equal(malformed.exclusionCounts.correct_answer_not_in_choices, 1);
  assert.deepEqual(malformed.publicItems.map((item) => item.source_question_id), ['VALID_TEXT']);
});

test('supported shape stimulus survives public payload without protected scoring fields', () => {
  const result = selectAssessmentItems([pkg({ adaptive_question_bank: [question({
    question_id: 'SHAPE_OK',
    prompt: 'What shape is shown?',
    visual_model: 'shape_identification',
    support_type: 'shape_identification',
    shape: 'triangle',
    choices: ['triangle', 'circle'],
    correct_answer: 'triangle',
  })] })]);
  assert.equal(result.publicItems.length, 1);
  assert.deepEqual(result.publicItems[0].payload.stimulus, {
    type: 'shape',
    content: { shape: 'triangle', color: 'blue' },
    accessibility_text: 'A shape to identify',
    presentation: { renderer: 'single_shape', label: 'Look at the shape.' },
  });
  assertPublicIsSafe(result.publicItems);
});

test('production SkillPackages and manifest remain unchanged during live-content validation', () => {
  const sourceFiles = [
    'public/gamehub/skill-world/content/manifest.json',
    'public/gamehub/skill-world/content/G1M_GM_001.skill-package.v1.json',
    'public/gamehub/skill-world/content/G1M_OP_002.skill-package.v1.json',
    'public/gamehub/skill-world/content/G1M_MD_TIME_001.skill-package.v1.json',
  ];
  const before = Object.fromEntries(sourceFiles.map((file) => [file, read(file)]));
  selectAssessmentItems(loadSkillPackages({ grade: 1, subject: 'Math' }));
  for (const file of sourceFiles) assert.equal(read(file), before[file], `${file} changed`);
});

test('persisted in-progress sessions do not resume into an invalid unanswered visual item', () => {
  const { sessionFromRows } = require(path.join(root, 'server/assessmentMvpStore.js'));
  const session = sessionFromRows({
    session_id: 'amvp_test',
    session_version: 'v',
    assessment_role: 'baseline',
    grade: 1,
    subject: 'Math',
    status: 'in_progress',
    current_question_position: 0,
    selection_config: {},
  }, [
    {
      display_order: 0,
      item_identity: 'PKG_BAD::bank::Q1',
      duplicate_key: 'bad',
      public_payload: { item_identity: 'PKG_BAD::bank::Q1', payload: { prompt: 'Which is taller, A or B?', question_type: 'multiple_choice', choices: ['A', 'B'] } },
    },
    {
      display_order: 1,
      item_identity: 'PKG_OK::bank::Q2',
      duplicate_key: 'ok',
      public_payload: { item_identity: 'PKG_OK::bank::Q2', payload: { prompt: 'What is 1 + 1?', question_type: 'multiple_choice', choices: ['1', '2'] } },
    },
  ]);
  assert.deepEqual(session.public_items.map((item) => item.item_identity), ['PKG_OK::bank::Q2']);
});
