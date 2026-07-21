const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2E_RF_001.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/[.,!?;:—]+$/g, '').replace(/\s+/g, ' ');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const questions = pkg.level_banks.flatMap((bank) => bank.questions);
const signature = (question) => JSON.stringify({
  prompt: normalize(question.prompt),
  word: normalize(question.word),
  choices: question.choices.map(normalize),
});

test('package exists with the expected five complete banks and unique IDs', () => {
  assert.equal(fs.existsSync(packagePath), true);
  assert.deepEqual(pkg.level_banks.map((bank) => bank.level_id), [
    'G2E_RF_001_LVL1', 'G2E_RF_001_LVL2', 'G2E_RF_001_LVL3',
    'G2E_RF_001_LVL4', 'G2E_RF_001_MIXED',
  ]);
  assert.deepEqual(pkg.level_banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 12]);
  pkg.level_banks.forEach((bank) => assert.equal(bank.questions.length, bank.question_count_required));
  assert.equal(questions.length, 52);
  assert.equal(new Set(questions.map(({ question_id }) => question_id)).size, 52);
});

test('every question has required instructional content and the package passes schema validation', () => {
  questions.forEach((question) => {
    ['prompt', 'explanation', 'feedback', 'word'].forEach((field) => {
      assert.ok(normalize(question[field]), `${question.question_id} ${field}`);
    });
    assert.ok(Array.isArray(question.hints) && question.hints.length >= 3, `${question.question_id} hints`);
    assert.doesNotMatch(JSON.stringify(question), /\b(?:todo|tbd|placeholder|lorem ipsum)\b|\{\{[^}]+\}\}|\$\{[^}]+\}/i);
  });
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('choices are normalized-unique and display exactly one correct answer', () => {
  questions.forEach((question) => {
    assert.equal(question.choices.length, 4, `${question.question_id} choice count`);
    const choices = question.choices.map(normalize);
    assert.ok(choices.every(Boolean), `${question.question_id} empty choice`);
    assert.equal(new Set(choices).size, 4, `${question.question_id} repeated choice`);
    assert.equal(choices.filter((choice) => choice === normalize(question.correct_answer)).length, 1,
      `${question.question_id} displayed key`);
    if (question.question_type === 'short_response') {
      const acceptable = question.acceptable_answers.map(normalize);
      assert.equal(new Set(acceptable).size, acceptable.length, `${question.question_id} repeated acceptable answer`);
      assert.ok(acceptable.includes(normalize(question.correct_answer)), `${question.question_id} acceptable key`);
    }
  });
});

test('authored answer positions are evenly balanced across A, B, C, and D', () => {
  const positions = [0, 0, 0, 0];
  questions.forEach((question) => {
    positions[question.choices.map(normalize).indexOf(normalize(question.correct_answer))] += 1;
  });
  assert.deepEqual(positions, [13, 13, 13, 13]);
  positions.forEach((count) => assert.ok(count / questions.length >= 0.15 && count / questions.length <= 0.35));
});

test('normalized prompts and answer sets are unique', () => {
  assert.equal(new Set(questions.map((question) => normalize(question.prompt))).size, 52);
  assert.equal(new Set(questions.map((question) => JSON.stringify(question.choices.map(normalize).sort()))).size, 52);
});

test('Mixed review uses new words and does not copy a focused question', () => {
  const focused = pkg.level_banks.slice(0, 4).flatMap((bank) => bank.questions);
  const focusedSignatures = new Set(focused.map(signature));
  const focusedWords = new Set(focused.map((question) => normalize(question.word)));
  pkg.level_banks[4].questions.forEach((question) => {
    assert.equal(focusedSignatures.has(signature(question)), false, question.question_id);
    assert.equal(focusedWords.has(normalize(question.word)), false, question.question_id);
  });
});

test('all authored interaction types are supported and render without fallback UI', () => {
  const supportedTypes = new Set(['multiple_choice', 'short_response', 'sound_match', 'word_building']);
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
  });
});
