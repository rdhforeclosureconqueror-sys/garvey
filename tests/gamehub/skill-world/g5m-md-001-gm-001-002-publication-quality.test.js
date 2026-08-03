const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const Registry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const ids = ['G5M_MD_001', 'G5M_GM_001', 'G5M_GM_002'];
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
      assert.equal(q.choices.filter((choice) => Renderer.evaluateAnswer(q, choice)).length, 1, q.question_id);
    }
  }
});

test('G5M_MD_001 conversions, volumes, and line-plot counts recompute', () => {
  for (const q of questions(packages.G5M_MD_001)) {
    if (q.factor) assert.equal(q.converted, q.amount * q.factor, q.question_id);
    if (q.length) assert.equal(Number.parseFloat(q.correct_answer), q.length * q.width * q.height, q.question_id);
    if (q.values && q.prompt.includes('exactly one X mark')) {
      assert.equal(q.values.filter((value) => value === q.correct_answer).length, 1, q.question_id);
    }
  }
});

test('G5M_GM_001 points, answers, tables, and graph patterns agree', () => {
  for (const q of questions(packages.G5M_GM_001)) {
    if (!q.rule) assert.equal(q.correct_answer, `(${q.x}, ${q.y})`, q.question_id);
    if (q.pattern_rows) {
      assert.deepEqual(q.points, q.pattern_rows.map((row) => [row.input, row.output]), q.question_id);
      assert.ok(q.pattern_rows.some((row) => row.input === q.x && row.output === q.y), q.question_id);
      assert.equal(Number(q.correct_answer), q.y, q.question_id);
    }
  }
});

test('G5M_GM_002 classifications are supported by authored attributes', () => {
  for (const q of questions(packages.G5M_GM_002)) {
    assert.equal(q.correct_answer, q.target, q.question_id);
    assert.ok(q.attributes.includes(q.target), q.question_id);
    assert.ok(q.cards.some((card) => card.shape.includes(q.shape) || q.shape.includes(card.shape)), q.question_id);
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
