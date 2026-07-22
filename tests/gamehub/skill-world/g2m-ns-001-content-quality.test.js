const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2M_NS_001.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const questions = pkg.level_banks.flatMap((bank) => bank.questions);
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/[,.-]/g, '').replace(/\s+/g, ' ');
const options = (q) => q.choices || q.options || [];

function numeric(value) {
  const cleaned = String(value).replace(/,/g, '');
  return /^\d+$/.test(cleaned) ? Number(cleaned) : null;
}

test('package exists with expected canonical banks, counts, and unique IDs', () => {
  assert.equal(fs.existsSync(packagePath), true);
  assert.deepEqual(pkg.level_banks.map((bank) => bank.level_id), [
    'G2M_NS_001_LVL1', 'G2M_NS_001_LVL2', 'G2M_NS_001_LVL3',
    'G2M_NS_001_LVL4', 'G2M_NS_001_MIXED',
  ]);
  assert.deepEqual(pkg.level_banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 12]);
  pkg.level_banks.forEach((bank) => assert.equal(bank.questions.length, bank.question_count_required));
  assert.equal(questions.length, 52);
  assert.equal(new Set(questions.map((q) => q.question_id)).size, 52);
});

test('all canonical questions have publication-quality instructional fields and valid schema', () => {
  questions.forEach((q) => {
    assert.ok(q.prompt && q.explanation && q.feedback?.correct && q.feedback?.incorrect, q.question_id);
    assert.equal(q.hints.length, 3, `${q.question_id} hints`);
    assert.ok(q.hints.every((hint) => normalize(hint)), `${q.question_id} empty hint`);
    assert.doesNotMatch(JSON.stringify(q), /\b(?:todo|tbd|placeholder|lorem ipsum)\b|\{\{[^}]+\}\}/i);
    assert.match(q.explanation, /because|place value|counts|counting|neighbor|words name|hundreds|adding|subtracting/i, `${q.question_id} teaching explanation`);
  });
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('every hint ladder is unique and follows focus, strategy, verification', () => {
  const ladders = questions.map((q) => q.hints.map(normalize));
  assert.equal(new Set(ladders.map(JSON.stringify)).size, 52);
  questions.forEach((q) => {
    assert.match(q.hints[0], /focus|notice|look|listen|start|pinecone|place|sequence/i, `${q.question_id} focus`);
    assert.match(q.hints[1], /add|subtract|remove|match|write|use|compare|name|read/i, `${q.question_id} strategy`);
    assert.match(q.hints[2], /verify|check/i, `${q.question_id} verification`);
    assert.notEqual(normalize(q.hints[2]), normalize(q.correct_answer), `${q.question_id} hint reveals answer alone`);
  });
});

test('choice interactions display four normalized-unique options and one answer', () => {
  const choiceQuestions = questions.filter((q) => q.question_type === 'multiple_choice');
  assert.equal(choiceQuestions.length, 8);
  choiceQuestions.forEach((q) => {
    const displayed = options(q).map(normalize);
    assert.equal(displayed.length, 4, q.question_id);
    assert.equal(new Set(displayed).size, 4, `${q.question_id} unique choices`);
    assert.equal(displayed.filter((choice) => choice === normalize(q.correct_answer)).length, 1, `${q.question_id} key`);
    const numericOptions = options(q).map(numeric).filter((value) => value !== null);
    assert.equal(new Set(numericOptions).size, numericOptions.length, `${q.question_id} duplicate numeric value`);
  });
});

test('authored multiple-choice answer positions are balanced', () => {
  const positions = [0, 0, 0, 0];
  questions.filter((q) => q.question_type === 'multiple_choice')
    .forEach((q) => { positions[options(q).map(normalize).indexOf(normalize(q.correct_answer))] += 1; });
  assert.deepEqual(positions, [2, 2, 2, 2]);
  positions.forEach((count) => assert.ok(count / 8 >= 0.15 && count / 8 <= 0.35));
});

test('number sequences, answers, operations, and units are mathematically sound', () => {
  questions.filter((q) => q.question_type === 'number_sequence').forEach((q) => {
    const filled = q.sequence.map((value) => value === '__' ? q.correct_answer : value).map(numeric);
    assert.ok(filled.every(Number.isInteger), q.question_id);
    for (let i = 1; i < filled.length; i += 1) assert.equal(filled[i] - filled[i - 1], q.step, `${q.question_id} step`);
    assert.ok(filled.every((value) => value >= 0 && value <= 1000), `${q.question_id} Grade 2 range`);
  });
  questions.forEach((q) => assert.doesNotMatch(q.prompt, /\b(?:cm|inch|feet|dollar|hour)s?\b/i, `${q.question_id} unexpected unit`));
});

test('word-form metadata and 100-more or 100-less instruction are exact', () => {
  const byId = Object.fromEntries(questions.map((q) => [q.question_id, q]));
  const thousand = byId.G2M_NS_001_L2_Q3;
  assert.deepEqual([thousand.thousands, thousand.hundreds, thousand.tens, thousand.ones], [1, 0, 0, 0]);
  assert.match(thousand.explanation, /1 in the thousands place/);

  const mixedWordForm = byId.G2M_NS_001_M_Q2;
  assert.deepEqual([mixedWordForm.number, mixedWordForm.hundreds, mixedWordForm.tens, mixedWordForm.ones], [864, 8, 6, 4]);
  assert.match(mixedWordForm.explanation, /8 hundreds, 6 tens, and 4 ones/);
  assert.doesNotMatch(JSON.stringify(mixedWordForm), /1000|1,000/);

  const more = byId.G2M_NS_001_L4_Q6;
  assert.match(more.explanation, /642 \+ 100 = 742/);
  assert.match(more.hints.join(' '), /add 1 hundred[\s\S]*subtracting 100/i);
  const less = byId.G2M_NS_001_L4_Q7;
  assert.match(less.explanation, /900 − 100 = 800/);
  assert.match(less.hints.join(' '), /remove 1 hundred[\s\S]*adding 100/i);
});

test('prompts and displayed answer sets are unique', () => {
  assert.equal(new Set(questions.map((q) => normalize(q.prompt))).size, 52);
  const choiceSets = questions.filter((q) => options(q).length).map((q) => JSON.stringify(options(q).map(normalize).sort()));
  assert.equal(new Set(choiceSets).size, choiceSets.length);
});

test('Mixed review uses new prompts, number sets, and answer sets', () => {
  const focused = pkg.level_banks.slice(0, 4).flatMap((bank) => bank.questions);
  const mixed = pkg.level_banks[4].questions;
  const focusedPrompts = new Set(focused.map((q) => normalize(q.prompt)));
  const focusedSequences = new Set(focused.filter((q) => q.sequence).map((q) => JSON.stringify(q.sequence)));
  const focusedSets = new Set(focused.filter((q) => options(q).length).map((q) => JSON.stringify(options(q).map(normalize).sort())));
  mixed.forEach((q) => {
    assert.equal(focusedPrompts.has(normalize(q.prompt)), false, `${q.question_id} prompt`);
    if (q.sequence) assert.equal(focusedSequences.has(JSON.stringify(q.sequence)), false, `${q.question_id} sequence`);
    if (options(q).length) assert.equal(focusedSets.has(JSON.stringify(options(q).map(normalize).sort())), false, `${q.question_id} set`);
  });
});

test('interactions render, evaluate, and avoid fallback UI', () => {
  const supported = new Set(['number_sequence', 'short_response', 'multiple_choice']);
  [...new Set(questions.map((q) => q.question_type))].forEach((type) => {
    assert.ok(supported.has(type), type);
    const q = questions.find((item) => item.question_type === type);
    const html = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
    assert.doesNotMatch(html, /unsupported question|renderer unavailable|data-renderer="fallback"/i);
    assert.equal(Renderer.evaluateAnswer(q, q.correct_answer), true);
    const wrong = options(q).find((choice) => normalize(choice) !== normalize(q.correct_answer)) || 'not the answer';
    assert.equal(Renderer.evaluateAnswer(q, wrong), false);
  });
});

test('Read Question audio is contextual and never isolated-answer Listen audio', () => {
  questions.forEach((q) => {
    assert.equal(q.question_audio.label, 'Read Question', q.question_id);
    assert.equal(q.question_audio.text, q.prompt, `${q.question_id} contextual narration`);
    assert.notEqual(normalize(q.question_audio.text), normalize(q.correct_answer), `${q.question_id} isolated answer`);
    const html = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
    assert.match(html, /question-read-button[\s\S]*Read Question/, q.question_id);
    assert.doesNotMatch(html, />\s*Listen\s*</i, `${q.question_id} isolated Listen control`);
  });
});
