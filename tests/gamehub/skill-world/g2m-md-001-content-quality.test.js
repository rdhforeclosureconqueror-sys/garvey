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
const questions = pkg.level_banks.flatMap((bank) => bank.questions);

test('package schema, canonical counts, and IDs are valid', () => {
  assert.equal(pkg.skill_id, 'G2M_MD_001');
  assert.deepEqual(pkg.level_banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 10]);
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map((q) => q.question_id)).size, 50);
  questions.forEach((q) => assert.equal(q.id, q.question_id));
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('off-zero ruler measurements preserve their authored start and end points in both production paths', () => {
  const q = questions.find((item) => item.question_id === 'G2M_MD_001_LVL1_Q6');
  assert.equal(q.prompt, 'A card starts at 2 inches and ends at 8 inches. What is its length?');
  assert.equal(q.correct_answer, '6');

  const registryHtml = VisualRegistry.render(q);
  const cardHtml = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
  for (const [pathName, html] of [['visual registry', registryHtml], ['question card', cardHtml]]) {
    assert.match(html, /data-renderer="ruler"/, pathName);
    assert.doesNotMatch(
      html,
      /Start at 0 and count the marks to measure 6 inches\./,
      `${pathName}: shared ruler renderer changes the authored start from 2 inches to 0`,
    );
    assert.match(html, /start(?:s| point)?[^<]*(?:2|two).*end(?:s| point)?[^<]*(?:8|eight)/i, `${pathName}: off-zero endpoints`);
  }
});
