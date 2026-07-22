const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2M_NS_002.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const VisualRegistry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const questions = pkg.level_banks.flatMap((bank) => bank.questions);
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const relation = (left, right) => left > right ? '>' : left < right ? '<' : '=';

test('package has 52 unique canonical activities in the approved banks', () => {
  assert.deepEqual(pkg.level_banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 12]);
  pkg.level_banks.forEach((bank) => assert.equal(bank.questions.length, bank.question_count_required));
  assert.equal(questions.length, 52);
  assert.equal(new Set(questions.map((q) => q.question_id)).size, 52);
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('prompts, comparison values, symbols, and answer keys are exact', () => {
  questions.forEach((q) => {
    assert.match(q.prompt, new RegExp(`Compare ${q.left_value} and ${q.right_value}`), q.question_id);
    assert.deepEqual([q.left, q.right], [q.left_value, q.right_value], q.question_id);
    assert.equal(q.answer, relation(q.left_value, q.right_value), q.question_id);
    assert.equal(q.correct_answer, q.answer, q.question_id);
    assert.ok(q.acceptable_answers.includes(q.answer), q.question_id);
    assert.match(q.explanation, new RegExp(`${q.left_value} is (?:greater than|less than|equal to) ${q.right_value} because`), q.question_id);
  });
});

test('each activity has a unique three-step focus, strategy, and check hint ladder', () => {
  assert.equal(new Set(questions.map((q) => JSON.stringify(q.hints.map(normalize)))).size, 52);
  questions.forEach((q) => {
    assert.equal(q.hints.length, 3, q.question_id);
    assert.match(q.hints[0], /focus|start/i, q.question_id);
    assert.match(q.hints[1], /compare|choose/i, q.question_id);
    assert.match(q.hints[2], /check/i, q.question_id);
    assert.notEqual(normalize(q.hints[2]), normalize(q.correct_answer), q.question_id);
  });
});

test('authored multiple-choice symbols are unique, complete, and position-balanced', () => {
  const choiceQuestions = questions.filter((q) => q.question_type === 'multiple_choice');
  assert.equal(choiceQuestions.length, 19);
  const positions = [0, 0, 0];
  choiceQuestions.forEach((q) => {
    assert.deepEqual([...q.options].sort(), ['<', '=', '>']);
    positions[q.options.indexOf(q.correct_answer)] += 1;
  });
  assert.deepEqual(positions, [7, 6, 6]);
});

test('Mixed activities are separate from focused prompts and value pairs', () => {
  const focused = pkg.level_banks.slice(0, 4).flatMap((bank) => bank.questions);
  const mixed = pkg.level_banks[4].questions;
  const prompts = new Set(focused.map((q) => normalize(q.prompt)));
  const pairs = new Set(focused.map((q) => `${q.left_value}:${q.right_value}`));
  mixed.forEach((q) => {
    assert.equal(prompts.has(normalize(q.prompt)), false, `${q.question_id} prompt`);
    assert.equal(pairs.has(`${q.left_value}:${q.right_value}`), false, `${q.question_id} values`);
  });
});

test('visual metadata names both values and every approved model renders without fallback', () => {
  const types = new Set(['comparison', 'place_value_chart', 'base_ten_blocks', 'number_line']);
  questions.forEach((q) => {
    assert.ok(types.has(q.visual_model), q.question_id);
    assert.match(q.accessible_description, new RegExp(`${q.left_value}.*${q.right_value}`), q.question_id);
    assert.match(q.visual_description, new RegExp(`${q.left_value}.*${q.right_value}`), q.question_id);
    const html = VisualRegistry.render(q);
    assert.doesNotMatch(html, /fallback|renderer unavailable|visual unavailable/i, q.question_id);
    const visibleNumber = (value) => new RegExp(String(value).replace(/(?=(?:\d{3})+$)/, ',?'));
    assert.match(html, visibleNumber(q.left_value), `${q.question_id} left value`);
    assert.match(html, visibleNumber(q.right_value), `${q.question_id} right value`);
    if (q.visual_model !== 'comparison') assert.match(html, /role="img"|aria-label=/, `${q.question_id} accessibility`);
    assert.ok(html.trim().length > 40, `${q.question_id} nonblank visual`);
  });
});

test('place-value, base-ten, and number-line metadata matches authored values', () => {
  questions.filter((q) => q.visual_model === 'place_value_chart').forEach((q) => {
    const html = VisualRegistry.render(q);
    assert.match(html, /Hundreds[\s\S]*Tens[\s\S]*Ones/, q.question_id);
    assert.match(html, new RegExp(`Place-value comparison of ${q.left_value} and ${q.right_value}`), q.question_id);
  });
  questions.filter((q) => q.visual_model === 'base_ten_blocks').forEach((q) => {
    const html = VisualRegistry.render(q);
    assert.match(html, new RegExp(`Base-ten comparison of ${q.left_value} and ${q.right_value}`), q.question_id);
  });
  questions.filter((q) => q.visual_model === 'number_line').forEach((q) => {
    assert.ok(q.min <= Math.min(q.left_value, q.right_value), q.question_id);
    assert.ok(q.max >= Math.max(q.left_value, q.right_value), q.question_id);
  });
});

test('all interaction types render and correct answers evaluate', () => {
  [...new Set(questions.map((q) => q.question_type))].forEach((type) => {
    const q = questions.find((item) => item.question_type === type);
    const html = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
    assert.doesNotMatch(html, /unsupported question|renderer unavailable|data-renderer="fallback"/i, type);
    assert.equal(Renderer.evaluateAnswer(q, q.correct_answer), true, type);
  });
});

test('Read Question audio preserves the complete comparison context', () => {
  questions.forEach((q) => {
    assert.equal(q.question_audio.label, 'Read Question', q.question_id);
    assert.equal(q.question_audio.text, q.prompt, q.question_id);
    assert.notEqual(normalize(q.question_audio.text), normalize(q.correct_answer), q.question_id);
    const html = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
    assert.match(html, /question-read-button[\s\S]*Read Question/, q.question_id);
    assert.doesNotMatch(html, />\s*Listen\s*</i, q.question_id);
  });
});
