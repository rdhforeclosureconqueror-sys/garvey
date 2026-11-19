const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2M_WP_001.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const VisualRegistry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const banks = pkg.level_banks;
const questions = banks.flatMap((bank) => bank.questions);
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const solve = (q) => {
  const expression = q.equation.split('=')[0].trim();
  if (expression.startsWith('? +')) return Number(q.equation.split('=')[1]) - q.b;
  if (expression.startsWith('? -')) return Number(q.equation.split('=')[1]) + q.b;
  if (/[+-] \?/.test(expression)) {
    const result = Number(q.equation.split('=')[1]);
    return q.operation === 'addition' ? result - q.a : q.a - result;
  }
  assert.match(expression, /^[\d\s()+-]+$/, q.question_id);
  return Function(`"use strict"; return (${expression})`)();
};

test('schema, identity, canonical counts, and unique IDs are valid', () => {
  assert.equal(pkg.skill_id, 'G2M_WP_001');
  assert.deepEqual(banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 10]);
  banks.forEach((bank) => assert.equal(bank.questions.length, bank.question_count_required));
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map((q) => q.question_id)).size, 50);
  questions.forEach((q) => assert.equal(q.id, q.question_id));
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('arithmetic, answers, acceptable answers, and grade-level limits are exact', () => {
  questions.forEach((q) => {
    const result = solve(q);
    assert.ok(Number.isInteger(result) && result >= 0 && result <= 100, q.question_id);
    assert.ok(q.knowns.every((n) => Number.isInteger(n) && n >= 0 && n <= 100), q.question_id);
    assert.equal(q.answer, String(result), q.question_id);
    assert.equal(q.correct_answer, String(result), q.question_id);
    assert.deepEqual(q.acceptable_answers, [String(result)], q.question_id);
  });
});

test('operation and word-problem metadata match every authored equation', () => {
  const expectedBankOperations = ['addition', 'subtraction', 'compare', 'two_step'];
  banks.slice(0, 4).forEach((bank, index) => bank.questions.forEach((q) => assert.equal(q.operation, expectedBankOperations[index], q.question_id)));
  questions.forEach((q) => {
    assert.equal(q.word_problem_metadata.structure, q.problem_structure, q.question_id);
    assert.equal(q.word_problem_metadata.equation, q.equation, q.question_id);
    assert.equal(q.word_problem_metadata.unknown_quantity, '?', q.question_id);
    assert.deepEqual(q.word_problem_metadata.known_quantities, (q.equation.match(/\d+/g) || []).map(Number), q.question_id);
    if (q.operation === 'compare') {
      assert.deepEqual(q.comparison_metadata, { larger: q.a, smaller: q.b, difference: Number(q.answer), unknown: 'difference' }, q.question_id);
      assert.ok(q.a > q.b, q.question_id);
    } else assert.equal(q.comparison_metadata, undefined, q.question_id);
    if (q.equation.startsWith('?') || /[+-] \?/.test(q.equation)) {
      assert.equal(q.missing_part_metadata.answer, Number(q.answer), q.question_id);
      assert.deepEqual(q.missing_part_metadata.known_quantities, q.word_problem_metadata.known_quantities, q.question_id);
    }
    if (q.operation === 'two_step') assert.ok(Number.isInteger(q.c), q.question_id);
  });
});

test('every activity has a unique Focus, Strategy, and Verify ladder', () => {
  assert.equal(new Set(questions.map((q) => JSON.stringify(q.hints.map(normalize)))).size, 50);
  questions.forEach((q) => {
    assert.equal(q.hints.length, 3, q.question_id);
    assert.equal(new Set(q.hints.map(normalize)).size, 3, q.question_id);
    assert.match(q.hints[0], /^Focus:/, q.question_id);
    assert.match(q.hints[1], /^Strategy:/, q.question_id);
    assert.match(q.hints[2], /^Verify:/, q.question_id);
    assert.match(q.hints[0], new RegExp(q.question_id), q.question_id);
  });
});

test('explanations teach reasoning and verify with inverse operations where appropriate', () => {
  questions.forEach((q) => {
    assert.match(q.explanation, /Why it works:/, q.question_id);
    assert.match(q.explanation, /Check/i, q.question_id);
    assert.match(q.explanation, /\d+ [+-] \d+ = \d+/, q.question_id);
    assert.doesNotMatch(q.explanation, /^The answer is/i, q.question_id);
    if (q.operation !== 'two_step') assert.match(q.explanation, /inverse/i, q.question_id);
  });
});

test('prompts, contexts, equations, and Mixed arithmetic are nonduplicative transfer', () => {
  assert.equal(new Set(questions.map((q) => normalize(q.prompt))).size, 50);
  const focused = banks.slice(0, 4).flatMap((bank) => bank.questions);
  const mixed = banks[4].questions;
  const focusedEquations = new Set(focused.map((q) => normalize(q.equation)));
  const focusedPairs = new Set(focused.map((q) => [q.a, q.b, q.c].filter(Number.isInteger).join(':')));
  mixed.forEach((q) => {
    assert.equal(focusedEquations.has(normalize(q.equation)), false, `${q.question_id} equation`);
    assert.equal(focusedPairs.has([q.a, q.b, q.c].filter(Number.isInteger).join(':')), false, `${q.question_id} arithmetic`);
  });
  assert.deepEqual([...new Set(mixed.map((q) => q.operation))].sort(), ['addition', 'compare', 'subtraction', 'two_step']);
  assert.equal(new Set(mixed.map((q) => q.visual_model)).size, 4);
});

test('multiple-choice options are unique and answer positions are balanced', () => {
  const choices = questions.filter((q) => q.question_type === 'multiple_choice');
  const positions = [0, 0, 0, 0];
  assert.equal(choices.length, 17);
  choices.forEach((q) => {
    assert.equal(q.options.length, 4, q.question_id);
    assert.equal(new Set(q.options).size, 4, q.question_id);
    assert.deepEqual(q.choices, q.options, q.question_id);
    positions[q.options.indexOf(q.correct_answer)] += 1;
  });
  assert.deepEqual(positions, [5, 4, 4, 4]);
});

test('all visuals are accessible, registry-compatible, and free of fallback output', () => {
  questions.forEach((q) => {
    for (const field of ['visual_description', 'accessible_description']) {
      assert.equal(typeof q[field], 'string', `${q.question_id} ${field}`);
      assert.match(q[field], /unknown|quantity to find/, `${q.question_id} ${field}`);
      assert.match(q[field], /question mark/, `${q.question_id} ${field}`);
    }
    assert.equal(q.accessible_description, q.visual_description, q.question_id);
    const html = VisualRegistry.render(q);
    assert.ok(html.trim().length > 100, q.question_id);
    assert.match(html, new RegExp(`data-renderer=["']${q.visual_model}`), q.question_id);
    assert.doesNotMatch(html, /fallback|renderer unavailable|visual unavailable|placeholder/i, q.question_id);
  });
});

test('every bar model has the right structure, known quantities, and one nonleaking unknown', () => {
  questions.filter((q) => q.visual_model === 'bar_model').forEach((q) => {
    const html = VisualRegistry.render(q);
    assert.equal(q.bar_model.structure, q.problem_structure, q.question_id);
    assert.match(html, new RegExp(`data-structure="${q.problem_structure}"`), q.question_id);
    assert.equal((html.match(/data-quantity="unknown"/g) || []).length, 1, q.question_id);
    q.word_problem_metadata.known_quantities.forEach((n) => assert.match(html, new RegExp(`<strong>${n}</strong>`), q.question_id));
    assert.doesNotMatch(html, new RegExp(`<strong>${q.correct_answer}</strong>`), `${q.question_id} leaked answer`);
  });
});

test('complete production question cards render and answer evaluation works', () => {
  questions.forEach((q) => {
    const html = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
    assert.ok(html.length > 500, q.question_id);
    assert.match(html, new RegExp(`data-renderer=["']${q.visual_model}`), q.question_id);
    assert.doesNotMatch(html, /unsupported question|renderer unavailable|data-renderer="fallback"/i, q.question_id);
    assert.equal(Renderer.evaluateAnswer(q, q.correct_answer), true, q.question_id);
    assert.equal(Renderer.evaluateAnswer(q, String(Number(q.correct_answer) + 101)), false, q.question_id);
  });
});

test('Read Question audio contains the full prompt and answer-safe visual context', () => {
  questions.forEach((q) => {
    assert.equal(q.question_audio.label, 'Read Question', q.question_id);
    assert.ok(q.question_audio.text.startsWith(q.prompt), q.question_id);
    assert.ok(q.question_audio.text.endsWith(q.visual_description), q.question_id);
    assert.match(q.question_audio.text, /Visual context:/, q.question_id);
    assert.doesNotMatch(q.question_audio.text, /[+=]/, q.question_id);
    assert.doesNotMatch(q.question_audio.text, /\d\s*-\s*\d/, q.question_id);
    assert.ok(q.question_audio.text.length > q.prompt.length + 30, q.question_id);
  });
});
