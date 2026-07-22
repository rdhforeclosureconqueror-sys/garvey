const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2M_OP_001.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const VisualRegistry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const banks = pkg.level_banks;
const questions = banks.flatMap((bank) => bank.questions);
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

test('package has 50 unique canonical activities and passes the production schema', () => {
  assert.deepEqual(banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 10]);
  banks.forEach((bank) => assert.equal(bank.questions.length, bank.question_count_required));
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map((q) => q.question_id)).size, 50);
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('all arithmetic, place-value metadata, regrouping flags, and answer keys are exact', () => {
  questions.forEach((q) => {
    const sum = q.a + q.b;
    assert.equal(q.sum, sum, q.question_id);
    assert.equal(q.value, sum, q.question_id);
    assert.equal(q.answer, String(sum), q.question_id);
    assert.equal(q.correct_answer, String(sum), q.question_id);
    assert.deepEqual(q.acceptable_answers, [String(sum)], q.question_id);
    assert.deepEqual(q.addends, [q.a, q.b], q.question_id);
    assert.equal(q.ones_a, q.a % 10, q.question_id);
    assert.equal(q.ones_b, q.b % 10, q.question_id);
    assert.equal(q.tens_a, Math.floor(q.a / 10), q.question_id);
    assert.equal(q.tens_b, Math.floor(q.b / 10), q.question_id);
    assert.equal(q.regrouping, (q.a % 10) + (q.b % 10) >= 10, q.question_id);
    assert.ok(sum <= 100, q.question_id);
  });
});

test('every activity has a distinct Focus, Strategy, Verify scaffold', () => {
  assert.equal(new Set(questions.map((q) => JSON.stringify(q.hints.map(normalize)))).size, 50);
  questions.forEach((q) => {
    assert.equal(q.hints.length, 3, q.question_id);
    assert.match(q.hints[0], /^Focus:/, q.question_id);
    assert.match(q.hints[1], /^Strategy:/, q.question_id);
    assert.match(q.hints[2], /^Verify:/, q.question_id);
  });
});

test('explanations teach method, reason for regrouping, and inverse verification', () => {
  questions.forEach((q) => {
    assert.match(q.explanation, /ones|place values/i, q.question_id);
    assert.match(q.explanation, new RegExp(`${q.a} \\+ ${q.b} = ${q.sum}`), q.question_id);
    assert.match(q.explanation, new RegExp(`Check: ${q.sum} - ${q.b} = ${q.a}`), q.question_id);
    if (q.regrouping) assert.match(q.explanation, /Trade 10 ones for 1 ten/, q.question_id);
    assert.doesNotMatch(q.explanation, /^(Correct|Good job|Nice work)[.!]?$/i, q.question_id);
  });
});

test('multiple-choice answers are unique and balanced across authored positions', () => {
  const choiceQuestions = questions.filter((q) => q.question_type === 'multiple_choice');
  const positions = [0, 0, 0, 0];
  assert.equal(choiceQuestions.length, 20);
  choiceQuestions.forEach((q) => {
    assert.equal(new Set(q.options).size, 4, q.question_id);
    assert.deepEqual(q.choices, q.options, q.question_id);
    const index = q.options.indexOf(q.correct_answer);
    assert.notEqual(index, -1, q.question_id);
    positions[index] += 1;
  });
  assert.deepEqual(positions, [5, 5, 5, 5]);
});

test('answer sets are unique within each focused bank and Mixed assesses transfer', () => {
  banks.forEach((bank) => assert.equal(new Set(bank.questions.map((q) => q.options ? q.options.join('|') : `${q.a}|${q.b}`)).size, bank.questions.length, bank.level_id));
  const focused = banks.slice(0, 4).flatMap((bank) => bank.questions);
  const mixed = banks[4].questions;
  const focusedPrompts = new Set(focused.map((q) => normalize(q.prompt)));
  const focusedPairs = new Set(focused.map((q) => `${q.a}:${q.b}`));
  mixed.forEach((q) => {
    assert.equal(focusedPrompts.has(normalize(q.prompt)), false, `${q.question_id} prompt`);
    assert.equal(focusedPairs.has(`${q.a}:${q.b}`), false, `${q.question_id} addends`);
    assert.match(q.prompt, /\?$/, q.question_id);
    assert.doesNotMatch(q.prompt, /^Add \d+/, q.question_id);
  });
});

test('visual metadata is complete, exact, accessible, and renderer-compatible', () => {
  const models = new Set(['base_ten_blocks', 'place_value_chart', 'number_line', 'addition_model']);
  questions.forEach((q) => {
    assert.ok(models.has(q.visual_model), q.question_id);
    for (const field of ['visual_description', 'accessible_description']) {
      assert.match(q[field], new RegExp(`${q.a}.*${q.b}.*${q.sum}`), `${q.question_id} ${field}`);
    }
    const html = VisualRegistry.render(q);
    assert.ok(html.trim().length > 40, q.question_id);
    assert.doesNotMatch(html, /fallback|renderer unavailable|visual unavailable|placeholder/i, q.question_id);
  });
});

test('all canonical visuals render through the question card and answers evaluate', () => {
  questions.forEach((q) => {
    const html = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
    assert.doesNotMatch(html, /unsupported question|renderer unavailable|data-renderer="fallback"/i, q.question_id);
    assert.equal(Renderer.evaluateAnswer(q, q.correct_answer), true, q.question_id);
  });
});

test('Read Question audio includes prompt and accurate visual context', () => {
  questions.forEach((q) => {
    assert.equal(q.question_audio.label, 'Read Question', q.question_id);
    assert.match(q.question_audio.text, new RegExp(q.visual_description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), q.question_id);
    assert.match(q.question_audio.text, /plus|adds|added|altogether|in all|total|more/i, q.question_id);
    assert.notEqual(normalize(q.question_audio.text), normalize(q.correct_answer), q.question_id);
  });
});
