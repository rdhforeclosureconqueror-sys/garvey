const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2E_RF_002.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const normalize = (value) => String(value ?? '').trim().toLowerCase()
  .replace(/[.,!?;:—“”'’]+$/g, '').replace(/^[“”'’]+/g, '').replace(/\s+/g, ' ');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const questions = pkg.level_banks.flatMap((bank) => bank.questions);
const answerSet = (question) => JSON.stringify(question.choices.map(normalize).sort());

test('package exists with the expected bank structure, counts, and unique IDs', () => {
  assert.equal(fs.existsSync(packagePath), true);
  assert.deepEqual(pkg.level_banks.map((bank) => bank.level_id), [
    'G2E_RF_002_LVL1', 'G2E_RF_002_LVL2', 'G2E_RF_002_LVL3',
    'G2E_RF_002_LVL4', 'G2E_RF_002_MIXED',
  ]);
  assert.deepEqual(pkg.level_banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 10]);
  pkg.level_banks.forEach((bank) => assert.equal(bank.questions.length, bank.question_count_required));
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map(({ question_id }) => question_id)).size, 50);
});

test('every question has complete instructional content and passes schema validation', () => {
  questions.forEach((question) => {
    ['prompt', 'explanation', 'feedback', 'word'].forEach((field) => {
      assert.ok(normalize(question[field]), `${question.question_id} ${field}`);
    });
    assert.ok(Array.isArray(question.hints) && question.hints.length === 3, `${question.question_id} hints`);
    question.hints.forEach((hint) => assert.ok(normalize(hint), `${question.question_id} empty hint`));
    assert.doesNotMatch(JSON.stringify(question), /\b(?:todo|tbd|placeholder|lorem ipsum)\b|\{\{[^}]+\}\}|\$\{[^}]+\}/i);
  });
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('hint ladders are unique, progressive, and specific to the word-part concept', () => {
  const ladders = questions.map((question) => question.hints.map(normalize));
  assert.equal(new Set(ladders.map(JSON.stringify)).size, questions.length);
  questions.forEach((question) => {
    const text = normalize(question.hints.join(' '));
    const parts = [question.word, question.base_word, ...(question.word_parts || [])].map(normalize);
    assert.ok(parts.some((part) => part && text.includes(part)), `${question.question_id} word-specific cue`);
    assert.match(text, /prefix|suffix|base word|ending|-ing|-ed|-es|-ful|-less|-ly|-ness|re-|un-|pre-|dis-|parts|split|join|attach|remove|drop|double|meaning/,
      `${question.question_id} morphology cue`);
    assert.match(normalize(question.hints[2]), /check|verify|match|read|reread|blend|confirm|meaning/,
      `${question.question_id} verification cue`);
  });
});

test('choices are normalized-unique and display exactly one correct answer', () => {
  questions.forEach((question) => {
    assert.equal(question.choices.length, 4, `${question.question_id} choice count`);
    const choices = question.choices.map(normalize);
    assert.ok(choices.every(Boolean), `${question.question_id} empty choice`);
    assert.equal(new Set(choices).size, 4, `${question.question_id} repeated choice`);
    assert.equal(choices.filter((choice) => choice === normalize(question.correct_answer)).length, 1,
      `${question.question_id} displayed key`);
    if (question.question_type === 'short_response') {
      const acceptable = question.acceptable_answers.map(normalize);
      assert.equal(new Set(acceptable).size, acceptable.length, `${question.question_id} repeated acceptable answer`);
      assert.ok(acceptable.includes(normalize(question.correct_answer)), `${question.question_id} acceptable key`);
    }
  });
});

test('authored answer positions are balanced across A, B, C, and D', () => {
  const positions = [0, 0, 0, 0];
  questions.forEach((question) => {
    positions[question.choices.map(normalize).indexOf(normalize(question.correct_answer))] += 1;
  });
  assert.deepEqual(positions, [13, 13, 12, 12]);
  positions.forEach((count) => assert.ok(count / questions.length >= 0.15 && count / questions.length <= 0.35));
});

test('prompts, answer sets, and target words are unique', () => {
  assert.equal(new Set(questions.map((question) => normalize(question.prompt))).size, questions.length);
  assert.equal(new Set(questions.map(answerSet)).size, questions.length);
  assert.equal(new Set(questions.map((question) => normalize(question.word))).size, questions.length);
});

test('Mixed review transfers learning without focused-bank duplication', () => {
  const focused = pkg.level_banks.slice(0, 4).flatMap((bank) => bank.questions);
  const mixed = pkg.level_banks[4].questions;
  const focusedPrompts = new Set(focused.map((question) => normalize(question.prompt)));
  const focusedSets = new Set(focused.map(answerSet));
  const focusedWords = new Set(focused.map((question) => normalize(question.word)));
  mixed.forEach((question) => {
    assert.equal(focusedPrompts.has(normalize(question.prompt)), false, `${question.question_id} prompt`);
    assert.equal(focusedSets.has(answerSet(question)), false, `${question.question_id} answers`);
    assert.equal(focusedWords.has(normalize(question.word)), false, `${question.question_id} target word`);
  });
});

test('all authored interaction types are supported and render without fallback UI', () => {
  const supportedTypes = new Set(['multiple_choice', 'short_response', 'word_building']);
  [...new Set(questions.map((question) => question.question_type))].forEach((type) => {
    assert.ok(supportedTypes.has(type), type);
    const question = questions.find((candidate) => candidate.question_type === type);
    const levelIndex = pkg.level_banks.findIndex((bank) => bank.questions.includes(question));
    const state = Renderer.createState();
    Renderer.selectLevel(state, levelIndex);
    const html = Renderer.renderSkillWorld(pkg, { state, mode: 'drill', failClosed: true }).html;
    assert.doesNotMatch(html, /unsupported question|renderer unavailable|data-renderer="fallback"/i);
    assert.equal(Renderer.evaluateAnswer(question, question.correct_answer), true);
    const wrong = question.choices.find((choice) => normalize(choice) !== normalize(question.correct_answer));
    assert.equal(Renderer.evaluateAnswer(question, wrong), false);
  });
});
