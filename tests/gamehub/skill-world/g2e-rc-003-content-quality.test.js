const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2E_RC_003.skill-package.v1.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const questions = pkg.level_banks.flatMap((level) => level.questions);
const signature = (question) => JSON.stringify({
  prompt: normalize(question.prompt),
  passage: normalize(question.passage),
  choices: question.choices.map(normalize)
});

test('G2E_RC_003 contains all 50 uniquely identified questions', () => {
  assert.deepEqual(pkg.level_banks.map((level) => level.level_id), [
    'G2E_RC_003_LVL1', 'G2E_RC_003_LVL2', 'G2E_RC_003_LVL3', 'G2E_RC_003_LVL4', 'G2E_RC_003_MIXED'
  ]);
  pkg.level_banks.forEach((level) => {
    assert.equal(level.question_count_required, 10);
    assert.equal(level.questions.length, 10);
  });
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map((question) => question.question_id)).size, 50);
});

test('every question has a passage, prompt, supported interaction, explanation, and no placeholders', () => {
  const supportedTypes = new Set(['multiple_choice', 'short_response', 'text_evidence']);
  questions.forEach((question) => {
    assert.ok(question.passage.trim(), `${question.question_id} passage`);
    assert.ok(question.prompt.trim(), `${question.question_id} prompt`);
    assert.ok(question.explanation.trim(), `${question.question_id} explanation`);
    assert.ok(supportedTypes.has(question.question_type), `${question.question_id} interaction`);
    assert.doesNotMatch(JSON.stringify(question), /\b(?:todo|tbd|placeholder|lorem ipsum|unsupported detail|unrelated detail)\b|\{\{[^}]+\}\}/i);
  });
  const validation = Schema.validateSkillPackage(pkg);
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('choices are unique, complete, and contain exactly one displayed correct answer', () => {
  questions.forEach((question) => {
    assert.equal(question.choices.length, 4, `${question.question_id} choice count`);
    assert.ok(question.choices.every((choice) => normalize(choice)), `${question.question_id} non-empty choices`);
    const choices = question.choices.map(normalize);
    assert.equal(new Set(choices).size, 4, `${question.question_id} unique choices`);
    assert.equal(choices.filter((choice) => choice === normalize(question.correct_answer)).length, 1, `${question.question_id} displayed answer`);
  });
});

test('authored correct-answer positions are balanced without randomization', () => {
  const scoredChoices = questions.filter((question) => question.question_type !== 'short_response');
  const positions = [0, 0, 0, 0];
  scoredChoices.forEach((question) => positions[question.choices.map(normalize).indexOf(normalize(question.correct_answer))] += 1);
  assert.deepEqual(positions, [12, 13, 10, 12]);
  positions.forEach((count) => assert.ok(count / scoredChoices.length >= 0.15 && count / scoredChoices.length <= 0.35));
});

test('full questions, passages, and answer sets are not duplicated', () => {
  assert.equal(new Set(questions.map((question) => normalize(question.prompt))).size, 50);
  assert.equal(new Set(questions.map(signature)).size, 50);
  assert.equal(new Set(questions.map((question) => normalize(question.passage))).size, 50);
  assert.equal(new Set(questions.map((question) => JSON.stringify(question.choices.map(normalize).sort()))).size, 50);
});

test('Mixed review uses new passages and questions for transfer', () => {
  const focused = new Set(pkg.level_banks.slice(0, 4).flatMap((level) => level.questions).map(signature));
  const focusedPassages = new Set(pkg.level_banks.slice(0, 4).flatMap((level) => level.questions).map((question) => normalize(question.passage)));
  pkg.level_banks[4].questions.forEach((question) => {
    assert.equal(focused.has(signature(question)), false, question.question_id);
    assert.equal(focusedPassages.has(normalize(question.passage)), false, question.question_id);
  });
});

test('each interaction type evaluates and renders without a fallback', () => {
  const types = [...new Set(questions.map((question) => question.question_type))];
  types.forEach((type) => {
    const question = questions.find((candidate) => candidate.question_type === type);
    assert.equal(Renderer.evaluateAnswer(question, question.correct_answer), true, `${type} evaluates`);
    const levelIndex = pkg.level_banks.findIndex((level) => level.questions.includes(question));
    const state = Renderer.createState();
    Renderer.selectLevel(state, levelIndex);
    const html = Renderer.renderSkillWorld(pkg, { state, mode: 'drill', failClosed: true }).html;
    assert.doesNotMatch(html, /unsupported question|renderer unavailable|data-renderer="fallback"/i, `${type} renderer`);
  });
});
