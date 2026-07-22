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

test('production renderers do not print answers while asking learners to read clocks or count money', () => {
  const answerLeaks = [];
  const tasks = questions.filter((question) =>
    (question.visual_model === 'analog_clock' && /what time is shown/i.test(question.prompt)) ||
    (question.visual_model === 'money_counting' && /how much/i.test(question.prompt))
  );

  tasks.forEach((question) => {
    const escapedAnswer = String(question.correct_answer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const answerPattern = question.visual_model === 'analog_clock'
      ? new RegExp(`<strong>\\s*${escapedAnswer}\\s*</strong>`, 'i')
      : new RegExp(`Total shown:\\s*${escapedAnswer}\\s*cents`, 'i');
    for (const [renderPath, html] of [
      ['visual registry', VisualRegistry.render(question)],
      ['question card', Renderer.renderQuestionCard(question, 'practice', Renderer.createState(), pkg)],
    ]) {
      assert.ok(html.trim(), `${question.question_id}: ${renderPath} output is blank`);
      assert.match(html, new RegExp(`data-renderer="${question.visual_model}"`), `${question.question_id}: ${renderPath}`);
      if (answerPattern.test(html)) answerLeaks.push(`${question.question_id} via ${renderPath}`);
    }
  });

  assert.deepEqual(answerLeaks, [], `answer leakage from shared production renderers: ${answerLeaks.join(', ')}`);
});
