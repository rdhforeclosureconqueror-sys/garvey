const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2M_WP_001.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const VisualRegistry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const questions = pkg.level_banks.flatMap((bank) => bank.questions);

test('package schema, canonical counts, and IDs are valid', () => {
  assert.equal(pkg.skill_id, 'G2M_WP_001');
  assert.deepEqual(pkg.level_banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 10]);
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map((q) => q.question_id)).size, 50);
  questions.forEach((q) => assert.equal(q.id, q.question_id));
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('authored arithmetic is internally consistent', () => {
  questions.forEach((q) => {
    const answer = Number(q.correct_answer);
    const [left, right] = q.equation.split('=').map((side) => side.trim().replace('?', String(answer)));
    const evaluate = (expression) => Function(`"use strict"; return (${expression})`)();
    assert.equal(evaluate(left), evaluate(right), q.question_id);
    assert.equal(q.answer, q.correct_answer, q.question_id);
    assert.ok(q.acceptable_answers.includes(q.correct_answer), q.question_id);
  });
});

test('bar models must not reveal an unknown whole or add an unmatched unknown', () => {
  const q = questions.find((item) => item.question_id === 'G2M_WP_001_LVL1_Q1');
  const html = VisualRegistry.render(q);
  assert.match(html, /data-renderer="bar_model"/);
  assert.doesNotMatch(
    html,
    /<strong>42<\/strong><small>whole<\/small>/,
    'shared bar_model renderer reveals the unknown answer (42) as a known whole',
  );
  assert.equal(
    (html.match(/class="measure-bar short missing"/g) || []).length,
    0,
    'shared bar_model renderer adds an extra unknown after already displaying both parts and the whole',
  );
});
