const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2M_MD_002.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const VisualRegistry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const questions = pkg.level_banks.flatMap((bank) => bank.questions);

test('selected canonical package has the expected identity, schema, counts, and IDs', () => {
  assert.equal(pkg.skill_id, 'G2M_MD_002');
  assert.deepEqual(pkg.level_banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 10]);
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map((question) => question.question_id)).size, 50);
  questions.forEach((question) => assert.equal(question.id, question.question_id));
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('production money renderer must not disclose the authored answer', () => {
  const question = questions.find((candidate) => candidate.visual_model === 'money_counting');
  assert.ok(question, 'package must contain a canonical money-counting activity');
  const disclosure = new RegExp(`(?:total shown|→)\\s*(?:[^<]*\\s)?${question.correct_answer}\\s*(?:cents|¢)`, 'i');
  for (const [pathName, html] of [
    ['visual registry', VisualRegistry.render(question)],
    ['question card', Renderer.renderQuestionCard(question, 'practice', Renderer.createState(), pkg)],
  ]) {
    assert.ok(html.trim(), `${pathName} output must be nonblank`);
    assert.match(html, /data-renderer="money_counting"/, `${pathName} must select money_counting`);
    assert.doesNotMatch(html, /placeholder|data-renderer="fallback"/i, `${pathName} must not fall back`);
    assert.doesNotMatch(html, disclosure, `${pathName} leaks ${question.correct_answer} cents`);
  }
});
