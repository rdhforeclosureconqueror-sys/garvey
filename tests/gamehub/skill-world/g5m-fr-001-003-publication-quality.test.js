const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const Registry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const ids = ['G5M_FR_001', 'G5M_FR_002', 'G5M_FR_003'];
const packages = Object.fromEntries(ids.map((id) => [id, JSON.parse(fs.readFileSync(path.join(root, `public/gamehub/skill-world/content/${id}.skill-package.v1.json`), 'utf8'))]));
const questions = (pkg) => pkg.level_banks.flatMap((bank) => bank.questions);
const norm = (value) => String(value ?? '').toLowerCase().replace(/[.,]$/, '').replace(/\s+/g, ' ').trim();
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
const rational = (value) => {
  const text = String(value).trim();
  const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return [(+mixed[1] * +mixed[3]) + +mixed[2], +mixed[3]];
  const fraction = text.match(/^(\d+)\/(\d+)$/);
  return fraction ? [+fraction[1], +fraction[2]] : [+text, 1];
};
const reduce = ([n, d]) => { const factor = gcd(n, d); return [n / factor, d / factor]; };
const equal = (left, right) => { const [a, b] = rational(left); const [c, d] = rational(right); return a * d === c * b; };

 test('exactly the next three dependency-sequence packages are complete and publication certified', () => {
  assert.deepEqual(Object.keys(packages), ids);
  for (const [id, pkg] of Object.entries(packages)) {
    assert.equal(pkg.metadata.production_status, 'publication_certified');
    assert.equal(pkg.metadata.audit_date, '2026-08-03');
    assert.deepEqual(pkg.level_banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 10]);
    assert.equal(new Set(questions(pkg).map((q) => q.question_id)).size, 50);
    const result = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
    assert.equal(result.valid, true, `${id}: ${result.errors.join('; ')}`);
  }
});

test('all 150 canonical activities have authored teaching, accessibility, and audio metadata', () => {
  for (const pkg of Object.values(packages)) for (const q of questions(pkg)) {
    assert.deepEqual(q.hints.map((hint) => hint.split(':')[0]), ['Focus', 'Strategy', 'Verify'], q.question_id);
    assert.ok(q.explanation.length > 150, q.question_id);
    assert.doesNotMatch(q.explanation, /^The answer is/i, q.question_id);
    assert.ok(q.visual_description.length > 180, q.question_id);
    assert.equal(q.accessible_description, q.visual_description, q.question_id);
    assert.equal(q.question_audio.label, 'Read Question', q.question_id);
    assert.equal(q.question_audio.text, q.read_aloud_text, q.question_id);
    assert.equal(norm(q.answer), norm(q.correct_answer), q.question_id);
    if (q.acceptable_answers) assert.equal(new Set(q.acceptable_answers.map(norm)).size, q.acceptable_answers.length, q.question_id);
    if (q.choices) {
      assert.equal(new Set(q.choices.map(norm)).size, q.choices.length, q.question_id);
      assert.equal(q.choices.filter((choice) => equal(choice, q.correct_answer)).length, 1, q.question_id);
    }
  }
});

test('G5M_FR_001 common denominators, sums, and differences recompute', () => {
  for (const q of questions(packages.G5M_FR_001)) {
    const common = q.prompt.match(/rename (\d+)\/(\d+) and (\d+)\/(\d+)/);
    if (common) { const answer = +q.correct_answer; assert.equal(answer % +common[2], 0, q.question_id); assert.equal(answer % +common[4], 0, q.question_id); continue; }
    const operation = q.equation.match(/([\d /]+)\s*([+-])\s*([\d /]+)/);
    const [a,b]=rational(operation[1]); const [c,d]=rational(operation[3]);
    const expected=reduce([operation[2] === '+' ? a*d+c*b : a*d-c*b,b*d]);
    assert.ok(equal(q.correct_answer, `${expected[0]}/${expected[1]}`), q.question_id);
  }
});

test('G5M_FR_002 products recompute from both factors', () => {
  for (const q of questions(packages.G5M_FR_002)) {
    const operation = q.equation.match(/([\d /]+)\s*×\s*([\d /]+)/);
    const [a,b]=rational(operation[1]); const [c,d]=rational(operation[2]); const expected=reduce([a*c,b*d]);
    assert.ok(equal(q.correct_answer, `${expected[0]}/${expected[1]}`), q.question_id);
  }
});

test('G5M_FR_003 quotients recompute from dividend and divisor metadata', () => {
  for (const q of questions(packages.G5M_FR_003)) {
    const [a,b]=rational(q.dividend); const [c,d]=rational(q.divisor); const expected=reduce([a*d,b*c]);
    assert.ok(equal(q.correct_answer, `${expected[0]}/${expected[1]}`), q.question_id);
  }
});

test('all canonical activities render through registry and production question-card paths answer safely', () => {
  for (const pkg of Object.values(packages)) for (const q of questions(pkg)) {
    const visual = Registry.render(q); const card = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
    for (const html of [visual, card]) { assert.ok(html.trim().length > 40, q.question_id); assert.doesNotMatch(html, /renderer unavailable|unsupported question|data-renderer="fallback"|>placeholder</i, q.question_id); }
    assert.match(visual, new RegExp(`data-renderer="${q.visual_model}"`), q.question_id);
    assert.match(card, /question-card/, q.question_id); assert.match(card, /question-read-button[\s\S]*Read Question/, q.question_id);
    assert.doesNotMatch(visual, /correct answer|answer:/i, q.question_id);
  }
});

test('all interaction types accept correct responses, reject wrong responses, and support retry', () => {
  for (const pkg of Object.values(packages)) for (const q of questions(pkg)) {
    assert.equal(Renderer.evaluateAnswer(q, q.correct_answer), true, q.question_id);
    const wrong = (q.choices || []).find((choice) => !Renderer.evaluateAnswer(q, choice)) || '__definitely_wrong__';
    assert.equal(Renderer.evaluateAnswer(q, wrong), false, q.question_id);
    const state = Renderer.createState(); assert.equal(Renderer.submitAnswer(state, 'practice', q, wrong).correct, false, q.question_id); assert.equal(state.attempts, 1, q.question_id);
    Renderer.retryAnswer(state, 'practice', q); assert.equal(Renderer.submitAnswer(state, 'practice', q, q.correct_answer).correct, true, q.question_id);
    assert.equal(state.attempts, 2, q.question_id); assert.equal(state.correct, 1, q.question_id);
  }
});
