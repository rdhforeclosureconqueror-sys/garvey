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

test('fresh audit starts from the valid canonical package, counts, and IDs', () => {
  assert.equal(pkg.skill_id, 'G2M_MD_001');
  assert.deepEqual(pkg.level_banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 10]);
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map((q) => q.question_id)).size, 50);
  questions.forEach((q) => assert.equal(q.id, q.question_id));
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('approved ruler fix preserves authored off-zero endpoints through both production paths', () => {
  const q = questions.find((item) => item.question_id === 'G2M_MD_001_LVL1_Q6');
  assert.match(q.prompt, /starts at 2 inches and ends at 8 inches/);
  assert.deepEqual({ length: q.length, answer: q.correct_answer }, { length: 6, answer: '6' });
  for (const [pathName, html] of [
    ['visual registry', VisualRegistry.render(q)],
    ['question card', Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg)],
  ]) {
    assert.match(html, /data-renderer="ruler"/, pathName);
    assert.match(html, /data-render-status="complete"/, pathName);
    assert.match(html, /data-start="2"/, pathName);
    assert.match(html, /data-end="8"/, pathName);
    assert.match(html, /data-span="6"/, pathName);
    assert.doesNotMatch(html, /Start at 0/i, pathName);
  }
});

test('BLOCKER: ruler visuals must not state the answer before the learner responds', () => {
  const rulers = questions.filter((q) => q.visual_model === 'ruler');
  assert.equal(rulers.length, 24);
  rulers.forEach((q) => {
    const answerLeak = new RegExp(`(?:distance is|spanning)\\s+${q.length}\\s+${q.unit}`, 'i');
    for (const [pathName, html] of [
      ['visual registry', VisualRegistry.render(q)],
      ['question card', Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg)],
    ]) {
      assert.doesNotMatch(html, answerLeak, `${q.question_id}: ${pathName} reveals correct answer ${q.length} ${q.unit}`);
    }
  });
});
