const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2E_RC_001.skill-package.v1.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/[.,!?]+$/g, '').replace(/\s+/g, ' ');
const questions = pkg.level_banks.flatMap((level) => level.questions);
const signature = (question) => JSON.stringify({
  prompt: normalize(question.prompt), passage: normalize(question.passage), choices: question.choices.map(normalize)
});

test('G2E_RC_001 has five complete banks and 50 unique IDs', () => {
  assert.deepEqual(pkg.level_banks.map((level) => level.level_id), [
    'G2E_RC_001_LVL1', 'G2E_RC_001_LVL2', 'G2E_RC_001_LVL3', 'G2E_RC_001_LVL4', 'G2E_RC_001_MIXED'
  ]);
  pkg.level_banks.forEach((level) => {
    assert.equal(level.question_count_required, 10);
    assert.equal(level.questions.length, 10);
  });
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map((question) => question.question_id)).size, 50);
});

test('all records have required content, supported types, and schema validity', () => {
  const supportedTypes = new Set(['multiple_choice', 'short_response', 'text_evidence']);
  questions.forEach((question) => {
    assert.ok(question.prompt.trim(), `${question.question_id} prompt`);
    assert.ok(question.passage.trim(), `${question.question_id} passage`);
    assert.ok(question.explanation.trim(), `${question.question_id} explanation`);
    assert.ok(supportedTypes.has(question.question_type), `${question.question_id} interaction`);
    assert.doesNotMatch(JSON.stringify(question), /\b(?:todo|tbd|placeholder|lorem ipsum|unsupported sentence|unrelated detail)\b|\{\{[^}]+\}\}/i);
  });
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('choices and answer keys are normalized, unique, and complete', () => {
  questions.forEach((question) => {
    assert.equal(question.choices.length, 4, `${question.question_id} choice count`);
    const choices = question.choices.map(normalize);
    assert.ok(choices.every(Boolean), `${question.question_id} non-empty choices`);
    assert.equal(new Set(choices).size, 4, `${question.question_id} unique choices`);
    assert.equal(choices.filter((choice) => choice === normalize(question.correct_answer)).length, 1, `${question.question_id} scalar key`);
    if (question.question_type === 'short_response') {
      assert.ok(question.acceptable_answers.length > 0, `${question.question_id} acceptable answers`);
      const acceptable = question.acceptable_answers.map(normalize);
      assert.ok(acceptable.every(Boolean));
      assert.equal(new Set(acceptable).size, acceptable.length, `${question.question_id} normalized acceptable answers`);
    }
  });
});

test('authored answer positions meet the package balance rule', () => {
  const positional = questions.filter((question) => question.question_type !== 'short_response');
  const positions = [0, 0, 0, 0];
  positional.forEach((question) => positions[question.choices.map(normalize).indexOf(normalize(question.correct_answer))] += 1);
  assert.deepEqual(positions, [12, 12, 11, 11]);
  positions.forEach((count) => assert.ok(count / positional.length >= 0.15 && count / positional.length <= 0.35));
});

test('questions, passages, and answer sets are not duplicated', () => {
  assert.equal(new Set(questions.map(signature)).size, 50);
  assert.equal(new Set(questions.map((question) => normalize(question.passage))).size, 50);
  assert.equal(new Set(questions.map((question) => JSON.stringify(question.choices.map(normalize).sort()))).size, 50);
});

test('Mixed uses ten new passages and no focused question copies', () => {
  const focusedQuestions = pkg.level_banks.slice(0, 4).flatMap((level) => level.questions);
  const focusedSignatures = new Set(focusedQuestions.map(signature));
  const focusedPassages = new Set(focusedQuestions.map((question) => normalize(question.passage)));
  pkg.level_banks[4].questions.forEach((question) => {
    assert.equal(focusedSignatures.has(signature(question)), false, question.question_id);
    assert.equal(focusedPassages.has(normalize(question.passage)), false, question.question_id);
  });
});

test('text-evidence keys directly quote the supporting passage detail', () => {
  questions.filter((question) => question.question_type === 'text_evidence').forEach((question) => {
    assert.ok(normalize(question.passage).includes(normalize(question.correct_answer)), `${question.question_id} evidence occurs in passage`);
  });
});

test('representative interactions evaluate, retry, serialize, restore, and hide feedback before submission', () => {
  const direct = questions.find((question) => question.question_id === 'G2E_RC_001_LVL1_Q01');
  const evidence = questions.find((question) => question.question_id === 'G2E_RC_001_LVL3_Q02');
  const short = questions.find((question) => question.question_id === 'G2E_RC_001_LVL2_Q05');
  assert.equal(Renderer.evaluateAnswer(direct, direct.correct_answer), true);
  assert.equal(Renderer.evaluateAnswer(direct, direct.choices.find((choice) => normalize(choice) !== normalize(direct.correct_answer))), false);
  evidence.choices.forEach((choice) => assert.equal(Renderer.evaluateAnswer(evidence, choice), normalize(choice) === normalize(evidence.correct_answer)));
  assert.equal(Renderer.evaluateAnswer(short, 'by using its slime'), true);

  const level = pkg.level_banks[0];
  const state = Renderer.createState();
  Renderer.selectLevel(state, 0);
  const firstResult = Renderer.submitLevelAnswer(state, level, direct, direct.choices.find((choice) => choice !== direct.correct_answer));
  assert.equal(firstResult.correct, false);
  assert.equal(Renderer.retryLevelAnswer(state, level, direct), true);
  assert.equal(Renderer.submitLevelAnswer(state, level, direct, direct.correct_answer).correct, true);
  const serialized = JSON.stringify(state);
  const restored = JSON.parse(serialized);
  assert.deepEqual(restored.drill.levelAnswers, state.drill.levelAnswers);
  assert.equal(restored.drill.levelAnswers[`${level.level_id}:${direct.question_id}`].answer, direct.correct_answer);

  const fresh = Renderer.createState();
  Renderer.selectLevel(fresh, 0);
  const html = Renderer.renderSkillWorld(pkg, { state: fresh, mode: 'drill', failClosed: true }).html;
  assert.doesNotMatch(html, /data-(?:correct|answer-key)|correctAnswer|feedback[^>]*>[^<]*(?:correct|answer is)/i);
  assert.doesNotMatch(html, new RegExp(direct.explanation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('every interaction renders without fallback and learner responses are serializable', () => {
  [...new Set(questions.map((question) => question.question_type))].forEach((type) => {
    const question = questions.find((candidate) => candidate.question_type === type);
    const levelIndex = pkg.level_banks.findIndex((level) => level.questions.includes(question));
    const state = Renderer.createState();
    Renderer.selectLevel(state, levelIndex);
    const html = Renderer.renderSkillWorld(pkg, { state, mode: 'drill', failClosed: true }).html;
    assert.doesNotMatch(html, /unsupported question|renderer unavailable|data-renderer="fallback"/i);
    Renderer.submitLevelAnswer(state, pkg.level_banks[levelIndex], question, question.correct_answer);
    assert.doesNotThrow(() => JSON.stringify(state));
  });
});
