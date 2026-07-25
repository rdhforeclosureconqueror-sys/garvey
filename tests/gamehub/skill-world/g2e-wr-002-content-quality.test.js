const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2E_WR_002.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/[.,!?;:—-]+$/g, '').replace(/\s+/g, ' ');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const questions = pkg.level_banks.flatMap((bank) => bank.questions);
const choiceQuestions = questions.filter((question) => Array.isArray(question.choices));
const answerSet = (question) => JSON.stringify(question.choices.map(normalize).sort());

test('package exists with the expected five banks, counts, and unique IDs', () => {
  assert.equal(fs.existsSync(packagePath), true);
  assert.deepEqual(pkg.level_banks.map(({ level_id }) => level_id), [
    'G2E_WR_002_LVL1', 'G2E_WR_002_LVL2', 'G2E_WR_002_LVL3',
    'G2E_WR_002_LVL4', 'G2E_WR_002_MIXED',
  ]);
  pkg.level_banks.forEach((bank) => {
    assert.equal(bank.question_count_required, 10);
    assert.equal(bank.questions.length, 10);
  });
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map(({ question_id }) => question_id)).size, 50);
});

test('every question has teaching content and a unique three-step hint ladder', () => {
  questions.forEach((question) => {
    ['prompt', 'explanation', 'feedback', 'topic'].forEach((field) => assert.ok(normalize(question[field]), `${question.question_id} ${field}`));
    assert.equal(question.hints.length, 3, `${question.question_id} hints`);
    question.hints.forEach((hint) => assert.ok(normalize(hint), `${question.question_id} empty hint`));
    assert.doesNotMatch(JSON.stringify(question), /\b(?:todo|tbd|placeholder|lorem ipsum)\b|\{\{[^}]+\}\}/i);
  });
  assert.equal(new Set(questions.map((question) => JSON.stringify(question.hints.map(normalize)))).size, 50);
});

test('displayed choices are unique and show exactly one keyed answer', () => {
  choiceQuestions.forEach((question) => {
    assert.equal(question.choices.length, 4, `${question.question_id} choice count`);
    const choices = question.choices.map(normalize);
    assert.equal(new Set(choices).size, 4, `${question.question_id} repeated choice`);
    assert.equal(choices.filter((choice) => choice === normalize(question.correct_answer)).length, 1, `${question.question_id} displayed key`);
  });
  questions.filter((question) => Array.isArray(question.acceptable_answers)).forEach((question) => {
    const acceptable = question.acceptable_answers.map(normalize);
    assert.equal(new Set(acceptable).size, acceptable.length, `${question.question_id} repeated acceptable answer`);
    assert.ok(acceptable.includes(normalize(question.correct_answer)), `${question.question_id} missing key`);
  });
});

test('authored answer positions are balanced from 15 to 35 percent', () => {
  const positions = [0, 0, 0, 0];
  choiceQuestions.forEach((question) => positions[question.choices.map(normalize).indexOf(normalize(question.correct_answer))] += 1);
  assert.deepEqual(positions, [11, 8, 8, 10]);
  positions.forEach((count) => assert.ok(count / choiceQuestions.length >= 0.15 && count / choiceQuestions.length <= 0.35));
});

test('prompts and displayed answer sets are unique', () => {
  assert.equal(new Set(questions.map((question) => normalize(question.prompt))).size, 50);
  assert.equal(new Set(choiceQuestions.map(answerSet)).size, choiceQuestions.length);
});

test('Mixed review transfers learning to new prompts, topics, and answer sets', () => {
  const focused = pkg.level_banks.slice(0, 4).flatMap((bank) => bank.questions);
  const focusedPrompts = new Set(focused.map((question) => normalize(question.prompt)));
  const focusedTopics = new Set(focused.map((question) => normalize(question.topic)));
  const focusedSets = new Set(focused.filter((question) => question.choices).map(answerSet));
  pkg.level_banks[4].questions.forEach((question) => {
    assert.equal(focusedPrompts.has(normalize(question.prompt)), false, `${question.question_id} prompt`);
    assert.equal(focusedTopics.has(normalize(question.topic)), false, `${question.question_id} topic`);
    if (question.choices) assert.equal(focusedSets.has(answerSet(question)), false, `${question.question_id} answer set`);
  });
});

test('schema and every authored interaction type have production support', () => {
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
  const supportedTypes = new Set(['multiple_choice', 'sentence_completion', 'short_response', 'writing_response']);
  [...new Set(questions.map(({ question_type }) => question_type))].forEach((type) => {
    assert.ok(supportedTypes.has(type), type);
    const question = questions.find((candidate) => candidate.question_type === type);
    const levelIndex = pkg.level_banks.findIndex((bank) => bank.questions.includes(question));
    const state = Renderer.createState();
    Renderer.selectLevel(state, levelIndex);
    const html = Renderer.renderSkillWorld(pkg, { state, mode: 'drill', failClosed: true }).html;
    assert.doesNotMatch(html, /unsupported question|renderer unavailable|data-renderer="fallback"/i);
    assert.equal(Renderer.evaluateAnswer(question, question.correct_answer), true);
    if (question.choices) {
      const wrong = question.choices.find((choice) => normalize(choice) !== normalize(question.correct_answer));
      assert.equal(Renderer.evaluateAnswer(question, wrong), false);
    }
  });
});
