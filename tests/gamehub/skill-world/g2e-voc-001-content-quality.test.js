const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2E_VOC_001.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/[.,!?;:—-]+$/g, '').replace(/\s+/g, ' ');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const questions = pkg.level_banks.flatMap((bank) => bank.questions);
const signature = (question) => JSON.stringify({
  prompt: normalize(question.prompt),
  passage: normalize(question.passage),
  choices: question.choices.map(normalize),
});

test('package exists with five complete banks and 50 unique question IDs', () => {
  assert.equal(fs.existsSync(packagePath), true);
  assert.deepEqual(pkg.level_banks.map((bank) => bank.level_id), [
    'G2E_VOC_001_LVL1', 'G2E_VOC_001_LVL2', 'G2E_VOC_001_LVL3',
    'G2E_VOC_001_LVL4', 'G2E_VOC_001_MIXED',
  ]);
  pkg.level_banks.forEach((bank) => {
    assert.equal(bank.question_count_required, 10);
    assert.equal(bank.questions.length, 10);
  });
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map(({ question_id }) => question_id)).size, 50);
});

test('every question has complete vocabulary content and passes the package schema', () => {
  questions.forEach((question) => {
    ['prompt', 'passage', 'explanation', 'word'].forEach((field) => {
      assert.ok(normalize(question[field]), `${question.question_id} ${field}`);
    });
    assert.doesNotMatch(JSON.stringify(question), /\b(?:todo|tbd|placeholder|lorem ipsum)\b|\{\{[^}]+\}\}/i);
  });
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('choices are unique and each question displays exactly one correct answer', () => {
  questions.forEach((question) => {
    assert.equal(question.choices.length, 4, `${question.question_id} choice count`);
    const normalizedChoices = question.choices.map(normalize);
    assert.ok(normalizedChoices.every(Boolean), `${question.question_id} empty choice`);
    assert.equal(new Set(normalizedChoices).size, 4, `${question.question_id} repeated choice`);
    assert.equal(normalizedChoices.filter((choice) => choice === normalize(question.correct_answer)).length, 1,
      `${question.question_id} displayed key`);
    if (question.question_type === 'short_response') {
      const acceptable = question.acceptable_answers.map(normalize);
      assert.ok(acceptable.length > 0, `${question.question_id} acceptable answers`);
      assert.equal(new Set(acceptable).size, acceptable.length, `${question.question_id} repeated acceptable answer`);
      assert.ok(acceptable.includes(normalize(question.correct_answer)));
    }
  });
});

test('authored correct-answer positions are balanced across A, B, C, and D', () => {
  const positions = [0, 0, 0, 0];
  questions.forEach((question) => {
    positions[question.choices.map(normalize).indexOf(normalize(question.correct_answer))] += 1;
  });
  assert.deepEqual(positions, [13, 13, 12, 12]);
  positions.forEach((count) => assert.ok(count / questions.length >= 0.15 && count / questions.length <= 0.35));
});

test('prompts, passages, and normalized answer sets are unique', () => {
  assert.equal(new Set(questions.map((question) => normalize(question.prompt))).size, 50);
  assert.equal(new Set(questions.map((question) => normalize(question.passage))).size, 50);
  assert.equal(new Set(questions.map((question) => JSON.stringify(question.choices.map(normalize).sort()))).size, 50);
});

test('Mixed review has new passages and does not copy a focused question', () => {
  const focused = pkg.level_banks.slice(0, 4).flatMap((bank) => bank.questions);
  const focusedSignatures = new Set(focused.map(signature));
  const focusedPassages = new Set(focused.map((question) => normalize(question.passage)));
  pkg.level_banks[4].questions.forEach((question) => {
    assert.equal(focusedSignatures.has(signature(question)), false, question.question_id);
    assert.equal(focusedPassages.has(normalize(question.passage)), false, question.question_id);
  });
});

test('all interaction types are supported and render without a fallback', () => {
  const supportedTypes = new Set(['multiple_choice', 'short_response', 'vocabulary_match', 'category_sort']);
  [...new Set(questions.map((question) => question.question_type))].forEach((type) => {
    assert.ok(supportedTypes.has(type), type);
    const question = questions.find((candidate) => candidate.question_type === type);
    const levelIndex = pkg.level_banks.findIndex((bank) => bank.questions.includes(question));
    const state = Renderer.createState();
    Renderer.selectLevel(state, levelIndex);
    const html = Renderer.renderSkillWorld(pkg, { state, mode: 'drill', failClosed: true }).html;
    assert.doesNotMatch(html, /unsupported question|renderer unavailable|data-renderer="fallback"/i);
    assert.equal(Renderer.evaluateAnswer(question, question.correct_answer), true);
    const wrong = question.choices.find((choice) => normalize(choice) !== normalize(question.correct_answer));
    assert.equal(Renderer.evaluateAnswer(question, wrong), false);
    Renderer.submitLevelAnswer(state, pkg.level_banks[levelIndex], question, question.correct_answer);
    assert.doesNotThrow(() => JSON.stringify(state));
  });
});
