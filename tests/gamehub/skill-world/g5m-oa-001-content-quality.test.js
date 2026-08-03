const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G5M_OA_001.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const Registry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const questions = pkg.level_banks.flatMap((bank) => bank.questions);
const norm = (v) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const options = (q) => q.choices || q.options || [];

test('G5M_OA_001 is the complete, schema-valid first Grade 5 package', () => {
  assert.equal(pkg.skill_id, 'G5M_OA_001');
  assert.equal(pkg.metadata.production_status, 'publication_certified');
  assert.deepEqual(pkg.level_banks.map((b) => b.level_id), ['G5M_OA_001_L1', 'G5M_OA_001_L2', 'G5M_OA_001_L3', 'G5M_OA_001_L4', 'G5M_OA_001_MIXED']);
  assert.deepEqual(pkg.level_banks.map((b) => b.questions.length), [10, 10, 10, 10, 10]);
  pkg.level_banks.forEach((b) => assert.equal(b.questions.length, b.question_count_required));
  assert.equal(new Set(questions.map((q) => q.question_id)).size, 50);
  const result = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('all canonical activities have unique prompts, contexts, hint ladders, and teaching explanations', () => {
  assert.equal(new Set(questions.map((q) => norm(q.prompt))).size, 50);
  assert.equal(new Set(questions.map((q) => JSON.stringify(q.hints.map(norm)))).size, 50);
  questions.forEach((q) => {
    assert.equal(q.hints.length, 3, q.question_id);
    assert.match(q.hints[0], /^Focus:/); assert.match(q.hints[1], /^Strategy:/); assert.match(q.hints[2], /^Verify:/);
    assert.match(q.explanation, /because|represents|first|then|order|coordinate|group|rule|symbols/i, q.question_id);
    assert.doesNotMatch(q.explanation, /^The answer is/i, q.question_id);
    assert.doesNotMatch(JSON.stringify(q), /\b(?:todo|tbd|placeholder|lorem ipsum)\b|\{\{[^}]+\}\}/i);
  });
  const choiceSets = questions.filter((q) => options(q).length).map((q) => JSON.stringify(options(q).map(norm).sort()));
  assert.equal(new Set(choiceSets).size, choiceSets.length);
});

test('authored expressions, evaluations, patterns, and coordinates are mathematically consistent', () => {
  questions.forEach((q) => {
    assert.equal(q.answer, q.correct_answer, `${q.question_id} duplicated answer`);
    if (q.expression_parts) assert.equal(q.expression, q.expression_parts.join(' ').replace('( ', '(').replace(' )', ')'), q.question_id);
    if (q.question_type === 'short_response' && q.expression) {
      const [a, b, c] = q.expression.match(/\d+/g).map(Number);
      assert.equal(Number(q.correct_answer), (a + b) * c, q.question_id);
    }
    if (q.pattern_rows) {
      const [m, a] = q.rule.match(/\d+/g).map(Number);
      q.pattern_rows.forEach((r) => assert.equal(r.output, r.input * m + a, q.question_id));
      const input = Number(q.prompt.match(/input (?:of )?(\d+)/i)?.[1]);
      assert.equal(Number(q.correct_answer), input * m + a, q.question_id);
    }
    if (Number.isInteger(q.x)) assert.equal(q.correct_answer, `(${q.x}, ${q.y})`, q.question_id);
  });
});

test('choices are synchronized, unique, and contain exactly one production answer', () => {
  questions.filter((q) => options(q).length).forEach((q) => {
    assert.equal(options(q).length, 4, q.question_id);
    assert.equal(new Set(options(q).map(norm)).size, 4, q.question_id);
    assert.equal(options(q).filter((o) => norm(o) === norm(q.correct_answer)).length, 1, q.question_id);
  });
});

test('accessibility and Read Question narration are complete and answer-safe', () => {
  questions.forEach((q) => {
    assert.ok(q.visual_description.length > 60, q.question_id);
    assert.ok(q.accessible_description.length > 60, q.question_id);
    assert.equal(q.question_audio.label, 'Read Question');
    assert.ok(q.question_audio.text.length >= q.prompt.length * 0.7, q.question_id);
    assert.notEqual(norm(q.question_audio.text), norm(q.correct_answer), q.question_id);
    if (q.question_type === 'coordinate_response' || (q.x && q.y)) assert.doesNotMatch(q.question_audio.text, new RegExp(`\\(${q.x}.*,.*${q.y}\\)`));
  });
});

test('every activity renders through registry and question card without blank, placeholder, fallback, or leakage', () => {
  questions.forEach((q) => {
    const visual = Registry.render(q);
    const card = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
    for (const html of [visual, card]) {
      assert.ok(html.trim().length > 40, q.question_id);
      assert.doesNotMatch(html, /renderer unavailable|unsupported question|data-renderer="fallback"|placeholder/i, q.question_id);
    }
    assert.match(card, /question-card/);
    assert.match(card, /question-read-button[\s\S]*Read Question/);
    if (q.question_type === 'coordinate_response' || q.question_type === 'multiple_choice') assert.doesNotMatch(visual, /correct answer|answer:/i);
  });
});

test('production evaluation, submission, retry, and interaction state work for every activity', () => {
  questions.forEach((q) => {
    assert.equal(Renderer.evaluateAnswer(q, q.correct_answer), true, q.question_id);
    const wrong = options(q).find((o) => !Renderer.evaluateAnswer(q, o)) || '__wrong__';
    assert.equal(Renderer.evaluateAnswer(q, wrong), false, q.question_id);
    const state = Renderer.createState();
    const first = Renderer.submitAnswer(state, 'practice', q, wrong);
    assert.equal(first.correct, false); assert.equal(state.attempts, 1);
    Renderer.retryAnswer(state, 'practice', q);
    const second = Renderer.submitAnswer(state, 'practice', q, q.correct_answer);
    assert.equal(second.correct, true); assert.equal(state.attempts, 2); assert.equal(state.correct, 1);
  });
});
