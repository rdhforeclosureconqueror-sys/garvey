const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2M_GM_001.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const Registry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const questions = pkg.level_banks.flatMap((bank) => bank.questions);

test('blocker audit selected the canonical package with five complete banks', () => {
  assert.equal(pkg.skill_id, 'G2M_GM_001');
  assert.deepEqual(
    pkg.level_banks.map((bank) => bank.level_id),
    ['G2M_GM_001_LVL1', 'G2M_GM_001_LVL2', 'G2M_GM_001_LVL3', 'G2M_GM_001_LVL4', 'G2M_GM_001_MIXED'],
  );
  assert.deepEqual(pkg.level_banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 10]);
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map((question) => question.id)).size, 50);
  questions.forEach((question) => assert.equal(question.id, question.question_id));
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('shape-identification visuals must not print the answer to an identification question', () => {
  const question = questions.find(({ id }) => id === 'G2M_GM_001_LVL1_Q1');
  assert.equal(question.prompt, 'Which 2D shape has 3 sides?');
  assert.equal(question.correct_answer, 'triangle');

  const leaks = [];
  for (const [pathName, html] of [
    ['production visual registry', Registry.render(question)],
    ['production question-card renderer', Renderer.renderQuestionCard(question, 'practice', Renderer.createState(), pkg)],
  ]) {
    assert.match(html, /data-renderer="shape_identification"/, `${pathName}: intended renderer`);
    if (/aria-label="triangle shape model"|<p class="sw-visual-caption">triangle model\./i.test(html)) {
      leaks.push(pathName);
    }
  }
  assert.deepEqual(leaks, [], `shared shape_identification renderer reveals "triangle" via: ${leaks.join(', ')}`);
});
