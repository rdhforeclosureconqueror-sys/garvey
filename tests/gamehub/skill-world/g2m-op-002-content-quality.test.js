const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2M_OP_002.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const VisualRegistry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const banks = pkg.level_banks;
const questions = banks.flatMap((bank) => bank.questions);
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

test('package identity, schema, bank sizes, and canonical IDs are valid', () => {
  assert.equal(pkg.skill_id, 'G2M_OP_002');
  assert.deepEqual(banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 10]);
  banks.forEach((bank) => assert.equal(bank.questions.length, bank.question_count_required));
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map((q) => q.question_id)).size, 50);
  questions.forEach((q) => assert.equal(q.id, q.question_id));
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('all subtraction, place-value metadata, regrouping flags, and answer keys are exact', () => {
  questions.forEach((q) => {
    const difference = q.a - q.b;
    assert.ok(q.a >= q.b && q.a <= 100 && q.b >= 0, q.question_id);
    assert.equal(q.minuend, q.a, q.question_id);
    assert.equal(q.subtrahend, q.b, q.question_id);
    assert.equal(q.difference, difference, q.question_id);
    assert.equal(q.answer, String(difference), q.question_id);
    assert.equal(q.correct_answer, String(difference), q.question_id);
    assert.deepEqual(q.acceptable_answers, [String(difference)], q.question_id);
    assert.equal(q.value, q.a, q.question_id);
    assert.equal(q.ones_a, q.a % 10, q.question_id);
    assert.equal(q.ones_b, q.b % 10, q.question_id);
    assert.equal(q.tens_a, Math.floor(q.a / 10), q.question_id);
    assert.equal(q.tens_b, Math.floor(q.b / 10), q.question_id);
    assert.equal(q.regrouping, q.a % 10 < q.b % 10, q.question_id);
  });
});

test('every activity has exactly three unique Focus, Strategy, Verify hints', () => {
  assert.equal(new Set(questions.map((q) => JSON.stringify(q.hints.map(normalize)))).size, 50);
  questions.forEach((q) => {
    assert.equal(q.hints.length, 3, q.question_id);
    assert.equal(new Set(q.hints.map(normalize)).size, 3, q.question_id);
    assert.match(q.hints[0], /^Focus:/, q.question_id);
    assert.match(q.hints[1], /^Strategy:/, q.question_id);
    assert.match(q.hints[2], /^Verify:/, q.question_id);
  });
});

test('explanations teach why, show the method, and verify by inverse addition', () => {
  questions.forEach((q) => {
    assert.match(q.explanation, /ones.*tens|tens.*ones/i, q.question_id);
    assert.match(q.explanation, /Why it works:/, q.question_id);
    assert.match(q.explanation, new RegExp(`Check: ${q.difference} \\+ ${q.b} = ${q.a}`), q.question_id);
    if (q.regrouping) assert.match(q.explanation, /decompose 1 ten/i, q.question_id);
    else assert.match(q.explanation, /No regrouping is needed/i, q.question_id);
    assert.doesNotMatch(q.explanation, /^(Correct|Good job|Nice work)[.!]?$/i, q.question_id);
  });
});

test('multiple-choice answer sets are unique and answer positions are balanced', () => {
  const choiceQuestions = questions.filter((q) => q.question_type === 'multiple_choice');
  const positions = [0, 0, 0, 0];
  assert.equal(choiceQuestions.length, 20);
  assert.equal(new Set(choiceQuestions.map((q) => q.options.join('|'))).size, 20);
  choiceQuestions.forEach((q) => {
    assert.equal(q.options.length, 4, q.question_id);
    assert.equal(new Set(q.options).size, 4, q.question_id);
    assert.deepEqual(q.choices, q.options, q.question_id);
    positions[q.options.indexOf(q.correct_answer)] += 1;
  });
  assert.deepEqual(positions, [5, 5, 5, 5]);
});

test('prompts, arithmetic, answer sets, and visual signatures do not duplicate Mixed', () => {
  assert.equal(new Set(questions.map((q) => normalize(q.prompt))).size, 50);
  assert.equal(new Set(questions.map((q) => `${q.a}:${q.b}:${q.visual_model}`)).size, 50);
  const focused = banks.slice(0, 4).flatMap((bank) => bank.questions);
  const mixed = banks[4].questions;
  const focusedPrompts = new Set(focused.map((q) => normalize(q.prompt)));
  const focusedPairs = new Set(focused.map((q) => `${q.a}:${q.b}`));
  const focusedVisuals = new Set(focused.map((q) => `${q.a}:${q.b}:${q.visual_model}`));
  mixed.forEach((q) => {
    assert.equal(focusedPrompts.has(normalize(q.prompt)), false, `${q.question_id} prompt`);
    assert.equal(focusedPairs.has(`${q.a}:${q.b}`), false, `${q.question_id} numbers`);
    assert.equal(focusedVisuals.has(`${q.a}:${q.b}:${q.visual_model}`), false, `${q.question_id} visual`);
    assert.doesNotMatch(q.prompt, /^Subtract \d+/, q.question_id);
  });
});

test('visual metadata is consistent, accessible, nonblank, and renderer-compatible', () => {
  const models = new Set(['base_ten_blocks', 'place_value_chart', 'number_line', 'subtraction_model']);
  questions.forEach((q) => {
    assert.ok(models.has(q.visual_model), q.question_id);
    for (const field of ['visual_description', 'accessible_description']) {
      assert.equal(typeof q[field], 'string', `${q.question_id} ${field}`);
      assert.match(q[field], new RegExp(`${q.a}.*${q.b}.*${q.difference}`), `${q.question_id} ${field}`);
    }
    assert.equal(q.accessible_description, q.visual_description, q.question_id);
    const html = VisualRegistry.render(q);
    assert.ok(html.trim().length > 100, q.question_id);
    assert.match(html, new RegExp(`data-renderer=["']${q.visual_model}`), q.question_id);
    assert.doesNotMatch(html, /fallback|renderer unavailable|visual unavailable|placeholder/i, q.question_id);
  });
});

test('question-card interactions render and every correct answer evaluates', () => {
  questions.forEach((q) => {
    const html = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
    assert.doesNotMatch(html, /unsupported question|renderer unavailable|data-renderer="fallback"/i, q.question_id);
    assert.equal(Renderer.evaluateAnswer(q, q.correct_answer), true, q.question_id);
  });
});

test('Read Question audio gives the complete prompt and meaningful visual context', () => {
  questions.forEach((q) => {
    assert.equal(q.question_audio.label, 'Read Question', q.question_id);
    assert.ok(normalize(q.question_audio.text).startsWith(normalize(q.prompt.replace(' - ', ' minus '))), q.question_id);
    assert.ok(q.question_audio.text.includes(q.visual_description), q.question_id);
    assert.match(q.question_audio.text, /minus|subtract|take away|difference|remain|left|walked/i, q.question_id);
    assert.notEqual(normalize(q.question_audio.text), normalize(q.correct_answer), q.question_id);
  });
});
