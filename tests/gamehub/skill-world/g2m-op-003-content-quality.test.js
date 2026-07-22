const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2M_OP_003.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const VisualRegistry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const banks = pkg.level_banks;
const questions = banks.flatMap((bank) => bank.questions);
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const arithmetic = (q) => {
  if (q.operation === 'addition') return q.a + q.b;
  if (q.operation === 'subtraction') return q.a - q.b;
  if (q.operation === 'missing_addend') return Number(q.answer);
  if (q.operation === 'missing_subtrahend') return q.b;
  throw new Error(`Unsupported operation for ${q.question_id}`);
};

test('package identity, schema, canonical counts, and IDs are valid', () => {
  assert.equal(pkg.skill_id, 'G2M_OP_003');
  assert.deepEqual(banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 10]);
  banks.forEach((bank) => assert.equal(bank.questions.length, bank.question_count_required));
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map((q) => q.question_id)).size, 50);
  questions.forEach((q) => assert.equal(q.id, q.question_id));
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('all facts, answers, acceptable answers, and decomposition metadata are exact', () => {
  questions.forEach((q) => {
    const result = arithmetic(q);
    assert.ok(Number.isInteger(q.a) && Number.isInteger(q.b), q.question_id);
    assert.ok(q.a >= 0 && q.b >= 0 && q.a <= 20 && q.b <= 20, q.question_id);
    assert.ok(result >= 0 && result <= 20, q.question_id);
    if (q.operation === 'missing_subtrahend') assert.equal(q.a - q.b, q.remaining, q.question_id);
    assert.equal(q.answer, String(result), q.question_id);
    assert.equal(q.correct_answer, String(result), q.question_id);
    assert.deepEqual(q.acceptable_answers, [String(result)], q.question_id);
    assert.equal(q.value, result, q.question_id);
    if (q.visual_model === 'number_bond') {
      assert.equal(q.whole, q.operation === 'subtraction' ? q.a : q.a + q.b, q.question_id);
      const expectedParts = q.operation === 'subtraction' ? [q.b, result] : [q.a, q.b];
      assert.deepEqual(q.parts, expectedParts, q.question_id);
      assert.equal(q.part_a, expectedParts[0], q.question_id);
      assert.equal(q.part_b, expectedParts[1], q.question_id);
    }
    if (q.visual_model === 'ten_frame') assert.deepEqual(q.ten_frame, [q.a, q.b], q.question_id);
  });
});

test('every activity has its own Focus, Strategy, and Verify hint ladder', () => {
  assert.equal(new Set(questions.map((q) => JSON.stringify(q.hints.map(normalize)))).size, 50);
  questions.forEach((q) => {
    assert.equal(q.hints.length, 3, q.question_id);
    assert.equal(new Set(q.hints.map(normalize)).size, 3, q.question_id);
    assert.match(q.hints[0], /^Focus:/, q.question_id);
    assert.match(q.hints[1], /^Strategy:/, q.question_id);
    assert.match(q.hints[2], /^Verify:/, q.question_id);
    assert.ok(q.hints.every((hint) => hint.includes(q.question_id) || /\d/.test(hint)), q.question_id);
  });
});

test('explanations teach reasoning and use an inverse-operation check', () => {
  questions.forEach((q) => {
    assert.match(q.explanation, /Why it works:/, q.question_id);
    assert.match(q.explanation, /Check(?: with (?:the )?inverse (?:operation|addition))?:/i, q.question_id);
    assert.match(q.explanation, /\d+ [+-] \d+ = \d+/, q.question_id);
    assert.doesNotMatch(q.explanation, /^The answer is/i, q.question_id);
  });
});

test('prompts, contexts, equations, and hint ladders do not duplicate Mixed', () => {
  assert.equal(new Set(questions.map((q) => normalize(q.prompt))).size, 50);
  const focused = banks.slice(0, 4).flatMap((bank) => bank.questions);
  const mixed = banks[4].questions;
  const focusedPairs = new Set(focused.map((q) => `${q.a}:${q.b}`));
  mixed.forEach((q) => {
    assert.equal(focusedPairs.has(`${q.a}:${q.b}`), false, `${q.question_id} arithmetic pair`);
    assert.match(q.prompt, /[A-Za-z]+.*[A-Za-z]+.*[A-Za-z]+/, q.question_id);
    assert.doesNotMatch(q.prompt, /^(Make 10|Double|Near double|Related fact|Fact family|Missing)/, q.question_id);
  });
  assert.equal(new Set(mixed.map((q) => normalize(q.prompt))).size, 10);
  assert.equal(new Set(mixed.map((q) => `${q.a}:${q.b}`)).size, 10);
});

test('multiple-choice options are unique and authored positions are balanced', () => {
  const choices = questions.filter((q) => q.question_type === 'multiple_choice');
  const positions = [0, 0, 0, 0];
  assert.equal(choices.length, 16);
  choices.forEach((q) => {
    assert.equal(q.options.length, 4, q.question_id);
    assert.equal(new Set(q.options).size, 4, q.question_id);
    assert.deepEqual(q.choices, q.options, q.question_id);
    positions[q.options.indexOf(q.correct_answer)] += 1;
  });
  assert.deepEqual(positions, [4, 4, 4, 4]);
});

test('visual metadata is exact, accessible, nonblank, and registry-compatible', () => {
  const models = new Set(['ten_frame', 'number_bond', 'addition_model', 'subtraction_model']);
  questions.forEach((q) => {
    assert.ok(models.has(q.visual_model), q.question_id);
    for (const field of ['visual_description', 'accessible_description']) {
      assert.equal(typeof q[field], 'string', `${q.question_id} ${field}`);
      assert.match(q[field], new RegExp(`${q.a}.*${q.b}|${q.b}.*${q.a}`), `${q.question_id} ${field}`);
      assert.match(q[field], new RegExp(`${q.value}|${q.whole}`), `${q.question_id} ${field}`);
    }
    assert.equal(q.accessible_description, q.visual_description, q.question_id);
    const html = VisualRegistry.render(q);
    assert.ok(html.trim().length > 100, q.question_id);
    assert.match(html, new RegExp(`data-renderer=["']${q.visual_model}`), q.question_id);
    assert.doesNotMatch(html, /fallback|renderer unavailable|visual unavailable|placeholder/i, q.question_id);
  });
});

test('production question cards render and every authored correct answer evaluates', () => {
  questions.forEach((q) => {
    const html = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
    assert.ok(html.length > 500, q.question_id);
    assert.match(html, new RegExp(`data-renderer=["']${q.visual_model}`), q.question_id);
    assert.doesNotMatch(html, /unsupported question|renderer unavailable|data-renderer="fallback"/i, q.question_id);
    assert.equal(Renderer.evaluateAnswer(q, q.correct_answer), true, q.question_id);
  });
});

test('Read Question audio includes the complete prompt, natural symbols, and visual context', () => {
  questions.forEach((q) => {
    assert.equal(q.question_audio.label, 'Read Question', q.question_id);
    assert.ok(q.question_audio.text.endsWith(q.visual_description), q.question_id);
    assert.doesNotMatch(q.question_audio.text, /[+=]/, q.question_id);
    assert.doesNotMatch(q.question_audio.text, /\d\s*-\s*\d/, q.question_id);
    assert.ok(q.question_audio.text.length > q.prompt.length + 20, q.question_id);
    assert.notEqual(normalize(q.question_audio.text), normalize(q.correct_answer), q.question_id);
  });
});
