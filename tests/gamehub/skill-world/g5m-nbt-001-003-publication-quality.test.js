const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const Registry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const ids = ['G5M_NBT_001', 'G5M_NBT_002', 'G5M_NBT_003'];
const packages = Object.fromEntries(ids.map((id) => [id, JSON.parse(fs.readFileSync(path.join(root, `public/gamehub/skill-world/content/${id}.skill-package.v1.json`), 'utf8'))]));
const questions = (pkg) => pkg.level_banks.flatMap((bank) => bank.questions);
const norm = (value) => String(value ?? '').toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ').trim();
const numeric = (value) => Number(norm(value).replace(/\$/g, ''));
const close = (actual, expected, id) => assert.ok(Math.abs(actual - expected) < 1e-9, `${id}: ${actual} !== ${expected}`);

test('exactly the three requested packages are complete and publication certified', () => {
  assert.deepEqual(Object.keys(packages), ids);
  for (const [id, pkg] of Object.entries(packages)) {
    assert.equal(pkg.metadata.production_status, 'publication_certified');
    assert.equal(pkg.metadata.audit_date, '2026-08-03');
    assert.deepEqual(pkg.level_banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 10]);
    assert.equal(new Set(questions(pkg).map((q) => q.question_id)).size, 50);
    const result = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
    assert.equal(result.valid, true, `${id}: ${result.errors.join('; ')}`);
  }
});

test('all 150 canonical activities have authored teaching, accessibility, and audio metadata', () => {
  for (const pkg of Object.values(packages)) for (const q of questions(pkg)) {
    assert.deepEqual(q.hints.map((hint) => hint.split(':')[0]), ['Focus', 'Strategy', 'Verify'], q.question_id);
    assert.ok(q.explanation.length > 70, q.question_id);
    assert.doesNotMatch(q.explanation, /^The answer is/i, q.question_id);
    assert.ok(q.visual_description.length > 100, q.question_id);
    assert.equal(q.accessible_description, q.visual_description, q.question_id);
    assert.equal(q.question_audio.label, 'Read Question', q.question_id);
    assert.equal(q.question_audio.text, q.read_aloud_text, q.question_id);
    assert.doesNotMatch(JSON.stringify(q), /\b(?:todo|tbd|placeholder|lorem ipsum)\b|\{\{[^}]+\}\}/i, q.question_id);
    assert.equal(norm(q.answer), norm(q.correct_answer), q.question_id);
    if (q.acceptable_answers) assert.equal(new Set(q.acceptable_answers.map(norm)).size, q.acceptable_answers.length, q.question_id);
    const choices = q.choices || q.options;
    if (choices) {
      assert.equal(new Set(choices.map(norm)).size, choices.length, q.question_id);
      assert.equal(choices.filter((choice) => norm(choice) === norm(q.correct_answer)).length, 1, q.question_id);
    }
  }
});

test('G5M_NBT_001 place-value, power-of-ten, comparison, and rounding metadata recomputes', () => {
  const pkg = packages.G5M_NBT_001;
  const q9 = questions(pkg).find((q) => q.question_id === 'G5M_NBT_001_L3_Q9');
  close(q9.value, 5.64 / 100, q9.question_id);
  for (const q of questions(pkg)) {
    if (q.left_value !== undefined) {
      const expected = q.left_value < q.right_value ? '<' : q.left_value > q.right_value ? '>' : '=';
      assert.equal(q.correct_answer, expected, q.question_id);
    }
    if (q.rounded !== undefined) assert.equal(numeric(q.correct_answer), numeric(q.rounded), q.question_id);
    if (q.number !== undefined) {
      const places = ['ones', 'tens', 'hundreds', 'thousands', 'ten_thousands', 'hundred_thousands', 'millions'];
      places.forEach((place, power) => {
        if (q[place] !== undefined) assert.equal(q[place], Math.floor(q.number / (10 ** power)) % 10, `${q.question_id}:${place}`);
      });
    }
    const operation = q.prompt.match(/([\d,.]+)\s*([×÷])\s*([\d,.]+)/);
    if (operation) {
      const a = numeric(operation[1]); const b = numeric(operation[3]);
      close(numeric(q.correct_answer), operation[2] === '×' ? a * b : a / b, q.question_id);
    }
  }
});

test('G5M_NBT_002 multiplication, division, remainder, and model metadata recomputes', () => {
  for (const q of questions(packages.G5M_NBT_002)) {
    if (q.operands) {
      const expected = q.operands[0] * q.operands[1];
      assert.equal(numeric(q.correct_answer), expected, q.question_id);
      assert.equal(q.area, expected, q.question_id);
      assert.equal(q.rows * q.columns, expected, q.question_id);
      assert.equal(q.partial_products.reduce((sum, part) => sum + part, 0), expected, q.question_id);
    }
    if (Number.isFinite(q.dividend)) {
      assert.equal(q.quotient, Math.floor(q.dividend / q.divisor), q.question_id);
      assert.equal(q.remainder, q.dividend % q.divisor, q.question_id);
      assert.equal(q.divisor * q.quotient + q.remainder, q.dividend, q.question_id);
      const expected = /one more/i.test(q.remainder_interpretation) ? q.quotient + 1 : q.remainder ? q.remainder : q.quotient;
      assert.equal(numeric(q.correct_answer), expected, q.question_id);
    }
  }
});

test('G5M_NBT_003 decimal operations and contextual totals recompute', () => {
  for (const q of questions(packages.G5M_NBT_003)) {
    if (q.correct_answer === 'same place values line up') continue;
    let match = q.prompt.match(/(?:Add|add)\s+([\d.]+)\s*\+\s*([\d.]+)/);
    if (match) close(numeric(q.correct_answer), parseFloat(match[1]) + parseFloat(match[2]), q.question_id);
    match = q.prompt.match(/(?:Multiply|multiply)\s+([\d.]+)\s*×\s*([\d.]+)/);
    if (match) close(numeric(q.correct_answer), parseFloat(match[1]) * parseFloat(match[2]), q.question_id);
    match = q.prompt.match(/(?:Divide|divide)\s+([\d.]+)\s*÷\s*([\d.]+)/);
    if (match) close(numeric(q.correct_answer), parseFloat(match[1]) / parseFloat(match[2]), q.question_id);
    match = q.prompt.match(/costs \$([\d.]+).*cost of (\d+)/);
    if (match) close(numeric(q.correct_answer), parseFloat(match[1]) * parseFloat(match[2]), q.question_id);
  }
});

test('all canonical activities render through registry and production question-card paths answer safely', () => {
  for (const pkg of Object.values(packages)) for (const q of questions(pkg)) {
    const visual = Registry.render(q);
    const card = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
    for (const html of [visual, card]) {
      assert.ok(html.trim().length > 40, q.question_id);
      assert.doesNotMatch(html, /renderer unavailable|unsupported question|data-renderer="fallback"|>placeholder</i, q.question_id);
    }
    assert.match(visual, new RegExp(`data-renderer="${q.visual_model}"`), q.question_id);
    assert.match(card, /question-card/, q.question_id);
    assert.match(card, /question-read-button[\s\S]*Read Question/, q.question_id);
    assert.doesNotMatch(visual, /correct answer|answer:/i, q.question_id);
  }
});

test('all interaction types accept correct responses, reject wrong responses, and support retry', () => {
  for (const pkg of Object.values(packages)) for (const q of questions(pkg)) {
    assert.equal(Renderer.evaluateAnswer(q, q.correct_answer), true, q.question_id);
    const candidates = q.choices || q.options || [];
    const wrong = candidates.find((choice) => !Renderer.evaluateAnswer(q, choice)) || '__definitely_wrong__';
    assert.equal(Renderer.evaluateAnswer(q, wrong), false, q.question_id);
    const state = Renderer.createState();
    const first = Renderer.submitAnswer(state, 'practice', q, wrong);
    assert.equal(first.correct, false, q.question_id); assert.equal(state.attempts, 1, q.question_id);
    Renderer.retryAnswer(state, 'practice', q);
    const second = Renderer.submitAnswer(state, 'practice', q, q.correct_answer);
    assert.equal(second.correct, true, q.question_id); assert.equal(state.attempts, 2, q.question_id); assert.equal(state.correct, 1, q.question_id);
  }
});
