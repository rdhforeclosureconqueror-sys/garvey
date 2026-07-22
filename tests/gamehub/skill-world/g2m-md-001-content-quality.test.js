const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2M_MD_001.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const VisualRegistry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const banks = pkg.level_banks;
const questions = banks.flatMap((bank) => bank.questions);
const mixed = banks.at(-1).questions;
const focused = questions.slice(0, 40);
const normalized = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

test('canonical package passes schema, count, and identity checks', () => {
  assert.equal(pkg.skill_id, 'G2M_MD_001');
  assert.deepEqual(banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 10]);
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map((q) => q.question_id)).size, 50);
  questions.forEach((q) => assert.equal(q.id, q.question_id));
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('all authored measurement mathematics, units, and acceptable answers are consistent', () => {
  questions.forEach((q) => {
    assert.ok(['inches', 'centimeters'].includes(q.unit), q.question_id);
    const numericAnswer = Number.parseInt(q.correct_answer, 10);
    assert.ok(Number.isInteger(numericAnswer) && numericAnswer > 0 && numericAnswer <= 100, q.question_id);
    assert.equal(q.answer, q.correct_answer, q.question_id);
    assert.equal(new Set(q.acceptable_answers.map(normalized)).size, q.acceptable_answers.length, q.question_id);
    assert.ok(q.acceptable_answers.some((answer) => Number.parseInt(answer, 10) === numericAnswer), q.question_id);
    if (q.visual_model === 'ruler') {
      assert.equal(q.end - q.start, q.length, q.question_id);
      assert.equal(q.length, numericAnswer, q.question_id);
      assert.equal(q.ruler.start, q.start, q.question_id);
      assert.equal(q.ruler.end, q.end, q.question_id);
      assert.equal(q.ruler.end - q.ruler.start, q.length, q.question_id);
      assert.equal(q.ruler.unit, q.unit, q.question_id);
      assert.equal(q.ruler.tick_interval, 1, q.question_id);
      assert.ok(q.ruler.min <= q.start && q.ruler.max >= q.end, q.question_id);
      assert.equal(q.measurement_structure, q.start === 0 ? 'zero-based-measurement' : 'off-zero-interval', q.question_id);
    }
    if (Number.isFinite(q.larger_length)) {
      assert.equal(q.larger_length - q.smaller_length, q.difference, q.question_id);
      assert.equal(q.difference, numericAnswer, q.question_id);
    }
  });
});

test('each activity has a distinct three-step hint ladder and a reasoning explanation', () => {
  questions.forEach((q) => {
    assert.equal(q.hints.length, 3, q.question_id);
    assert.match(q.hints[0], /^Focus:/, q.question_id);
    assert.match(q.hints[1], /^Strategy:/, q.question_id);
    assert.match(q.hints[2], /^Verify:/, q.question_id);
    assert.match(q.explanation, /because|subtract|distance|estimat|difference|endpoint|benchmark/i, q.question_id);
    assert.ok(q.explanation.length >= 65, q.question_id);
  });
  for (let tier = 0; tier < 3; tier += 1) {
    assert.equal(new Set(questions.map((q) => normalized(q.hints[tier]))).size, 50, `hint tier ${tier + 1}`);
  }
  assert.equal(new Set(questions.map((q) => normalized(q.prompt))).size, 50);
  assert.equal(new Set(questions.map((q) => normalized(q.explanation))).size, 50);
});

test('Mixed bank is authentic transfer rather than focused-content reuse', () => {
  const focusedPrompts = new Set(focused.map((q) => normalized(q.prompt)));
  const focusedObjects = new Set(focused.map((q) => normalized(q.object || '')));
  const focusedPairs = new Set(focused.map((q) => q.visual_model === 'ruler' ? `${q.start}:${q.end}:${q.unit}` : Number.isFinite(q.larger_length) ? `${q.larger_length}:${q.smaller_length}:${q.unit}` : '').filter(Boolean));
  mixed.forEach((q) => {
    assert.ok(!focusedPrompts.has(normalized(q.prompt)), q.question_id);
    assert.ok(!focusedObjects.has(normalized(q.object)), q.question_id);
    const pair = q.visual_model === 'ruler' ? `${q.start}:${q.end}:${q.unit}` : Number.isFinite(q.larger_length) ? `${q.larger_length}:${q.smaller_length}:${q.unit}` : '';
    if (pair) assert.ok(!focusedPairs.has(pair), q.question_id);
  });
  assert.ok(new Set(mixed.map((q) => q.visual_model)).size >= 4);
  assert.equal(new Set(mixed.map((q) => normalized(q.prompt))).size, 10);
});

test('multiple-choice options are synchronized, unique, and position-balanced', () => {
  const multipleChoice = questions.filter((q) => q.question_type === 'multiple_choice');
  const positions = [0, 0, 0, 0];
  multipleChoice.forEach((q) => {
    assert.deepEqual(q.choices, q.options, q.question_id);
    assert.equal(new Set(q.options.map(normalized)).size, 4, q.question_id);
    const index = q.options.indexOf(q.correct_answer);
    assert.notEqual(index, -1, q.question_id);
    positions[index] += 1;
  });
  assert.ok(Math.max(...positions) - Math.min(...positions) <= 1, positions.join(','));
});

test('accessibility metadata and Read Question audio give context without disclosing solutions', () => {
  questions.forEach((q) => {
    for (const description of [q.visual_description, q.accessible_description]) {
      assert.ok(description && description.length >= 70, q.question_id);
      assert.match(description, /ruler|picture|visual|model|represent/i, q.question_id);
      assert.match(description, /find|choose|determine|estimate/i, q.question_id);
      assert.doesNotMatch(description, new RegExp(`(?:answer|length|difference|estimate) is ${Number.parseInt(q.correct_answer, 10)}(?:\\D|$)`, 'i'), q.question_id);
    }
    assert.equal(q.question_audio.label, 'Read Question', q.question_id);
    assert.ok(q.question_audio.text.startsWith(q.prompt), q.question_id);
    assert.ok(q.question_audio.text.includes(q.accessible_description), q.question_id);
    assert.doesNotMatch(q.question_audio.text, /(?:answer|solution) is/i, q.question_id);
  });
});

test('every activity renders completely through both production paths without fallback or leakage', () => {
  questions.forEach((q) => {
    for (const [pathName, html] of [
      ['visual registry', VisualRegistry.render(q)],
      ['question card', Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg)],
    ]) {
      assert.ok(html.trim(), `${q.question_id}: ${pathName} blank`);
      assert.match(html, new RegExp(`data-renderer="${q.visual_model}"`), `${q.question_id}: ${pathName}`);
      assert.doesNotMatch(html, /placeholder|data-renderer="fallback"|ruler-invalid|data-render-status="invalid"/i, `${q.question_id}: ${pathName}`);
      if (q.visual_model === 'ruler') {
        assert.match(html, /data-render-status="complete"/, q.question_id);
        assert.match(html, new RegExp(`data-start="${q.start}"`), q.question_id);
        assert.match(html, new RegExp(`data-end="${q.end}"`), q.question_id);
        assert.match(html, new RegExp(`data-span="${q.length}"`), q.question_id);
        assert.match(html, /data-tick-interval="1"/, q.question_id);
        assert.doesNotMatch(html, new RegExp(`(?:distance is|spanning)\\s+${q.length}\\s+${q.unit}`, 'i'), q.question_id);
      }
    }
  });
});

test('production evaluation accepts every synchronized answer form and rejects a wrong answer', () => {
  questions.forEach((q) => {
    assert.equal(Renderer.evaluateAnswer(q, q.correct_answer), true, q.question_id);
    q.acceptable_answers.forEach((answer) => assert.equal(Renderer.evaluateAnswer(q, answer), true, `${q.question_id}: ${answer}`));
    assert.equal(Renderer.evaluateAnswer(q, '999 wrong units'), false, q.question_id);
    const state = Renderer.createState();
    const result = Renderer.submitAnswer(state, 'practice', q, q.correct_answer);
    assert.equal(result.correct, true, q.question_id);
    assert.equal(state.correct, 1, q.question_id);
  });
});
