const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2E_FL_001.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const normalize = (value) => String(value ?? '').trim().toLowerCase()
  .replace(/[.,!?;:—“”'’]+$/g, '').replace(/^[“”'’]+/g, '').replace(/\s+/g, ' ');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const questions = pkg.level_banks.flatMap((bank) => bank.questions);
const answerSet = (question) => JSON.stringify(question.choices.map(normalize).sort());

test('package exists with five 10-question banks and 50 unique IDs', () => {
  assert.equal(fs.existsSync(packagePath), true);
  assert.deepEqual(pkg.level_banks.map(({ level_id }) => level_id), [
    'G2E_FL_001_LVL1', 'G2E_FL_001_LVL2', 'G2E_FL_001_LVL3',
    'G2E_FL_001_LVL4', 'G2E_FL_001_MIXED',
  ]);
  assert.deepEqual(pkg.level_banks.map(({ questions: bankQuestions }) => bankQuestions.length), [10, 10, 10, 10, 10]);
  pkg.level_banks.forEach((bank) => assert.equal(bank.questions.length, bank.question_count_required));
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map(({ question_id }) => question_id)).size, 50);
});

test('every activity has complete teaching content and passes the production schema', () => {
  questions.forEach((question) => {
    ['prompt', 'explanation', 'feedback', 'target_word', 'topic'].forEach((field) => {
      assert.ok(normalize(question[field]), `${question.question_id} ${field}`);
    });
    assert.equal(question.hints.length, 3, `${question.question_id} hint count`);
    question.hints.forEach((hint) => assert.ok(normalize(hint), `${question.question_id} empty hint`));
    assert.doesNotMatch(JSON.stringify(question), /\b(?:todo|tbd|placeholder|lorem ipsum)\b|\{\{[^}]+\}\}|\$\{[^}]+\}/i);
  });
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
  assert.deepEqual(validation.warnings, []);
});

test('every hint ladder is unique, progressive, specific, and ends with verification', () => {
  const ladders = questions.map((question) => question.hints.map(normalize));
  assert.equal(new Set(ladders.map(JSON.stringify)).size, 50);
  questions.forEach((question) => {
    assert.ok(question.hints[0].length >= 15, `${question.question_id} substantive attention cue`);
    assert.ok(question.hints[1].length >= 40, `${question.question_id} substantive concept cue`);
    assert.match(normalize(question.hints[2]), /check|confirm|verify|reread|read|compare|match|listen|make sure|trace|face|act|cover|point|clap|follow|spell|try|say|pause|use/,
      `${question.question_id} verification cue`);
    assert.doesNotMatch(question.hints.join(' '), /sentence meaning, word spelling, phrase grouping, or punctuation clue/i,
      `${question.question_id} generic omnibus hint`);
  });
});

test('Listen support reads the activity text instead of an isolated answer', () => {
  questions.forEach((question) => {
    assert.equal(question.question_audio.text, question.prompt, `${question.question_id} Read Question text`);
    assert.equal(question.audio.text, question.prompt, `${question.question_id} Listen text`);
    assert.equal(question.audio.label, 'Hear the text', `${question.question_id} Listen label`);
    assert.notEqual(normalize(question.audio.text), normalize(question.correct_answer),
      `${question.question_id} Listen must not announce the key alone`);
  });
});

test('each activity has four normalized-unique choices and exactly one displayed key', () => {
  questions.forEach((question) => {
    assert.equal(question.choices.length, 4, `${question.question_id} choice count`);
    const choices = question.choices.map(normalize);
    assert.ok(choices.every(Boolean), `${question.question_id} blank choice`);
    assert.equal(new Set(choices).size, 4, `${question.question_id} normalized choices`);
    assert.equal(choices.filter((choice) => choice === normalize(question.correct_answer)).length, 1,
      `${question.question_id} displayed key`);
    if (['short_response', 'sentence_completion'].includes(question.question_type)) {
      assert.deepEqual(question.acceptable_answers.map(normalize), [normalize(question.correct_answer)]);
    }
  });
});

test('authored answer positions are balanced across A, B, C, and D', () => {
  const positions = [0, 0, 0, 0];
  questions.forEach((question) => {
    positions[question.choices.map(normalize).indexOf(normalize(question.correct_answer))] += 1;
  });
  assert.deepEqual(positions, [13, 13, 12, 12]);
  positions.forEach((count) => assert.ok(count / 50 >= 0.15 && count / 50 <= 0.35));
});

test('prompts, topics, target words, and displayed answer sets are unique', () => {
  ['prompt', 'topic', 'target_word'].forEach((field) => {
    assert.equal(new Set(questions.map((question) => normalize(question[field]))).size, 50, field);
  });
  assert.equal(new Set(questions.map(answerSet)).size, 50);
});

test('Mixed review uses new prompts, topics, targets, and answer sets', () => {
  const focused = questions.slice(0, 40);
  const mixed = questions.slice(40);
  ['prompt', 'topic', 'target_word'].forEach((field) => {
    const prior = new Set(focused.map((question) => normalize(question[field])));
    mixed.forEach((question) => assert.equal(prior.has(normalize(question[field])), false,
      `${question.question_id} ${field}`));
  });
  const focusedSets = new Set(focused.map(answerSet));
  mixed.forEach((question) => assert.equal(focusedSets.has(answerSet(question)), false,
    `${question.question_id} answer set`));
});

test('authored interaction types have renderer support and correct evaluation', () => {
  const supportedTypes = new Set(['multiple_choice', 'short_response', 'sentence_completion']);
  [...new Set(questions.map(({ question_type }) => question_type))].forEach((type) => {
    assert.ok(supportedTypes.has(type), type);
    const question = questions.find(({ question_type }) => question_type === type);
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
