const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2E_RC_002.skill-package.v1.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const questions = pkg.level_banks.flatMap((level) => level.questions);

test('G2E_RC_002 has the complete focused and Mixed bank structure', () => {
  assert.deepEqual(pkg.level_banks.map((level) => level.level_id), [
    'G2E_RC_002_LVL1', 'G2E_RC_002_LVL2', 'G2E_RC_002_LVL3', 'G2E_RC_002_LVL4', 'G2E_RC_002_MIXED'
  ]);
  pkg.level_banks.forEach((level) => {
    assert.equal(level.question_count_required, 10);
    assert.equal(level.questions.length, 10);
  });
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map((question) => question.question_id)).size, 50);
});

test('every question has classroom-ready prompt, story, supported renderer, and no placeholders', () => {
  const supportedTypes = new Set(['multiple_choice', 'sequence_order']);
  questions.forEach((question) => {
    assert.ok(question.prompt.trim(), `${question.question_id} prompt`);
    assert.ok(question.passage.trim(), `${question.question_id} passage`);
    assert.ok(supportedTypes.has(question.question_type), `${question.question_id} renderer`);
    assert.doesNotMatch(JSON.stringify(question), /\b(?:todo|tbd|placeholder|lorem ipsum)\b|\{\{[^}]+\}\}/i);
  });
  const validation = Schema.validateSkillPackage(pkg);
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('multiple-choice choices and scalar answers are unique and balanced', () => {
  const multipleChoice = questions.filter((question) => question.question_type === 'multiple_choice');
  const positions = [0, 0, 0, 0];
  assert.equal(multipleChoice.length, 37);
  multipleChoice.forEach((question) => {
    const choices = question.choices.map(normalize);
    assert.equal(new Set(choices).size, choices.length, `${question.question_id} unique choices`);
    assert.equal(choices.filter((choice) => choice === normalize(question.correct_answer)).length, 1, `${question.question_id} answer appears once`);
    positions[choices.indexOf(normalize(question.correct_answer))] += 1;
  });
  assert.deepEqual(positions, [10, 9, 9, 9]);
  positions.forEach((count) => assert.ok(count / multipleChoice.length >= 0.15 && count / multipleChoice.length <= 0.35));
});

test('all 13 sequence records use complete structured unique event sets', () => {
  const sequenceQuestions = questions.filter((question) => question.question_type === 'sequence_order');
  assert.equal(sequenceQuestions.length, 13);
  sequenceQuestions.forEach((question) => {
    assert.ok(question.sequence_items.length >= 3);
    assert.equal(new Set(question.sequence_items.map(normalize)).size, question.sequence_items.length);
    assert.equal(question.correct_sequence.length, question.sequence_items.length);
    assert.deepEqual([...question.correct_sequence].map(normalize).sort(), [...question.sequence_items].map(normalize).sort());
    assert.equal(Object.hasOwn(question, 'correct_answer'), false, `${question.question_id} does not overload scalar correct_answer`);
  });
});

test('Mixed questions are not exact copies of focused questions', () => {
  const signature = (question) => JSON.stringify({prompt: normalize(question.prompt), passage: normalize(question.passage), choices: question.choices?.map(normalize), sequence_items: question.sequence_items?.map(normalize)});
  const focused = new Set(pkg.level_banks.slice(0, 4).flatMap((level) => level.questions).map(signature));
  pkg.level_banks[4].questions.forEach((question) => assert.equal(focused.has(signature(question)), false, question.question_id));
  assert.equal(new Set(questions.map(signature)).size, 50);
});

test('sequence evaluation accepts only the complete canonical order', () => {
  const question = pkg.level_banks[2].questions[0];
  assert.equal(Renderer.evaluateAnswer(question, question.correct_sequence), true);
  assert.equal(Renderer.evaluateAnswer(question, [...question.correct_sequence].reverse()), false);
  assert.equal(Renderer.evaluateAnswer(question, question.correct_sequence.slice(0, -1)), false);
  assert.equal(Renderer.evaluateAnswer(question, question.correct_sequence.join(' -> ')), false);
});

test('first sequence renders every event without exposing its protected correct sequence', () => {
  const question = pkg.level_banks[2].questions[0];
  const state = Renderer.createState();
  Renderer.selectLevel(state, 2);
  const html = Renderer.renderSkillWorld(pkg, {state, mode: 'drill', failClosed: true}).html;
  question.sequence_items.forEach((event) => assert.match(html, new RegExp(event.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
  assert.match(html, /data-sequence-order/);
  assert.match(html, /Move up/);
  assert.match(html, /Move down/);
  assert.match(html, /Submit complete order/);
  assert.doesNotMatch(html, /correct_sequence|correct-answer|answer-key/i);
  assert.equal(html.includes(JSON.stringify(question.correct_sequence)), false);
});

test('sequence state is serializable, restorable, and resettable for retry', () => {
  const level = pkg.level_banks[2];
  const question = level.questions[0];
  const state = Renderer.createState();
  Renderer.selectLevel(state, 2);
  const wrong = Renderer.submitLevelAnswer(state, level, question, [...question.correct_sequence].reverse());
  assert.equal(wrong.correct, false);
  Renderer.retryLevelAnswer(state, level, question);
  const result = Renderer.submitLevelAnswer(state, level, question, question.correct_sequence);
  assert.equal(result.correct, true);
  const restored = JSON.parse(JSON.stringify(state));
  assert.deepEqual(Renderer.activeLevelQuestion(pkg, restored).question_id, question.question_id);
  assert.deepEqual(restored.drill.levelAnswers[`${level.level_id}:${question.question_id}`].answer, question.correct_sequence);
  Renderer.playLevelAgain(restored, level);
  assert.equal(Renderer.levelQuestionAnswered(restored, level, question), false);
});

test('normal multiple-choice submission remains correct', () => {
  const level = pkg.level_banks[0];
  const question = level.questions[0];
  const state = Renderer.createState();
  assert.equal(Renderer.submitLevelAnswer(state, level, question, question.correct_answer).correct, true);
  assert.doesNotThrow(() => JSON.stringify(state));
});

test('browser integration wires mouse and keyboard ordering with predictable focus', () => {
  const source = fs.readFileSync(path.join(root, 'public/gamehub/skill-world/index.html'), 'utf8');
  assert.match(source, /sequence-move-up/);
  assert.match(source, /sequence-move-down/);
  assert.match(source, /Alt|altKey/);
  assert.match(source, /ArrowUp/);
  assert.match(source, /ArrowDown/);
  assert.match(source, /\.focus\(\)/);
  assert.match(source, /sequenceValues\(control\)/);
  assert.match(source, /savePersistedSkillWorld\(\)/);
});
