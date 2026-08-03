const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const Registry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const ids = ['G5E_RC_001', 'G5E_RC_002', 'G5E_RC_003'];
const packages = Object.fromEntries(ids.map((id) => [id, JSON.parse(fs.readFileSync(path.join(root, `public/gamehub/skill-world/content/${id}.skill-package.v1.json`), 'utf8'))]));
const questions = (pkg) => pkg.level_banks.flatMap((bank) => bank.questions);
const norm = (value) => String(value ?? '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

test('exactly the next three Grade 5 English dependency packages are publication certified', () => {
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

test('all 150 activities have unique authored contexts and complete teaching and accessibility metadata', () => {
  for (const pkg of Object.values(packages)) {
    const qs = questions(pkg);
    for (const field of ['prompt', 'passage', 'explanation']) assert.equal(new Set(qs.map((q) => norm(q[field]))).size, 50, `${pkg.skill_id} ${field}`);
    assert.equal(new Set(qs.map((q) => norm(q.hints.join('|')))).size, 50, `${pkg.skill_id} hints`);
    for (const q of qs) {
      assert.deepEqual(q.hints.map((hint) => hint.split(':')[0]), ['Focus', 'Strategy', 'Verify'], q.question_id);
      assert.ok(q.explanation.length > 200, q.question_id);
      assert.doesNotMatch(q.explanation, /^The answer is/i, q.question_id);
      assert.ok(q.visual_description.length > 250, q.question_id);
      assert.equal(q.accessible_description, q.visual_description, q.question_id);
      assert.equal(q.question_audio.label, 'Read Question', q.question_id);
      assert.equal(q.question_audio.text, q.read_aloud_text, q.question_id);
      assert.ok(q.question_audio.text.startsWith(q.prompt), q.question_id);
      assert.match(q.question_audio.text, /The visual is /, q.question_id);
      assert.doesNotMatch(q.question_audio.text, /correct answer|the answer is/i, q.question_id);
      assert.equal(norm(q.answer), norm(q.correct_answer), q.question_id);
      assert.doesNotMatch(JSON.stringify(q), /\b(?:todo|tbd|placeholder|lorem ipsum)\b|\{\{[^}]+\}\}/i, q.question_id);
      if (q.acceptable_answers) assert.equal(new Set(q.acceptable_answers.map(norm)).size, q.acceptable_answers.length, q.question_id);
      if (q.choices) {
        assert.deepEqual(q.options, q.choices, q.question_id);
        assert.equal(new Set(q.choices.map(norm)).size, q.choices.length, q.question_id);
        assert.equal(q.choices.filter((choice) => norm(choice) === norm(q.correct_answer)).length, 1, q.question_id);
        assert.match(q.question_audio.text, new RegExp(`Choices: ${q.choices.map((choice) => String(choice).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(', ')}\\.$`), q.question_id);
      }
    }
  }
});

test('Mixed banks are authentic transfer with no focused prompts, contexts, passages, or hint ladders', () => {
  for (const pkg of Object.values(packages)) {
    const focused = questions(pkg).slice(0, 40); const mixed = questions(pkg).slice(40);
    for (const field of ['prompt', 'passage']) {
      const prior = new Set(focused.map((q) => norm(q[field])));
      mixed.forEach((q) => assert.equal(prior.has(norm(q[field])), false, `${q.question_id} ${field}`));
    }
    const priorHints = new Set(focused.map((q) => norm(q.hints.join('|'))));
    mixed.forEach((q) => { assert.equal(priorHints.has(norm(q.hints.join('|'))), false, q.question_id); assert.match(q.prompt, /independent transfer task/); });
    assert.ok(new Set(mixed.map((q) => q.visual_model)).size >= 3, pkg.skill_id);
  }
});

test('reading evidence and literature and informational representations are consistent', () => {
  for (const q of questions(packages.G5E_RC_001)) {
    assert.ok(q.evidence_spans.every((span) => q.passage.includes(span)), q.question_id);
    assert.ok(q.evidence_spans.includes(q.evidence), q.question_id);
  }
  for (const q of questions(packages.G5E_RC_002)) {
    assert.ok(['first person', 'third person'].includes(q.point_of_view), q.question_id);
    assert.ok(q.events.length >= 3 && q.character && q.setting && q.theme, q.question_id);
  }
  for (const q of questions(packages.G5E_RC_003)) {
    assert.ok(q.details.length >= 2 && q.main_idea && q.text_structure && q.text_feature, q.question_id);
    assert.equal(q.source_a.text, q.passage, q.question_id);
    assert.ok(q.source_a.details.length >= 2 && q.source_b.details.length >= 2 && q.compare_prompts.length >= 2, q.question_id);
  }
});

test('multiple-choice answers are balanced', () => {
  for (const pkg of Object.values(packages)) {
    const positions = questions(pkg).filter((q) => q.choices).map((q) => q.choices.findIndex((choice) => norm(choice) === norm(q.correct_answer)));
    const counts = positions.reduce((all, position) => ((all[position] = (all[position] || 0) + 1), all), {});
    assert.ok(Math.max(...Object.values(counts)) - Math.min(...Object.values(counts)) <= 1, `${pkg.skill_id}: ${JSON.stringify(counts)}`);
  }
});

test('all activities render through registry and production question card without fallback or leakage', () => {
  for (const pkg of Object.values(packages)) for (const q of questions(pkg)) {
    const visual = Registry.render(q); const card = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
    for (const html of [visual, card]) { assert.ok(html.trim().length > 40, q.question_id); assert.doesNotMatch(html, /renderer unavailable|unsupported question|data-renderer="fallback"|>placeholder</i, q.question_id); }
    assert.match(visual, new RegExp(`data-renderer="${q.visual_model}"`), q.question_id);
    assert.match(card, /question-card/); assert.match(card, /question-read-button[\s\S]*Read Question/);
    assert.doesNotMatch(visual, /correct answer|answer:/i, q.question_id);
  }
});

test('production evaluation, submission, retry, and interaction state work for all activities', () => {
  for (const pkg of Object.values(packages)) for (const q of questions(pkg)) {
    assert.equal(Renderer.evaluateAnswer(q, q.correct_answer), true, q.question_id);
    for (const alias of q.acceptable_answers || []) assert.equal(Renderer.evaluateAnswer(q, alias), true, `${q.question_id}: ${alias}`);
    const wrong = (q.choices || []).find((choice) => !Renderer.evaluateAnswer(q, choice)) || '__definitely_wrong__';
    assert.equal(Renderer.evaluateAnswer(q, wrong), false, q.question_id);
    const state = Renderer.createState(); const first = Renderer.submitAnswer(state, 'practice', q, wrong);
    assert.equal(first.correct, false); assert.equal(state.attempts, 1); Renderer.retryAnswer(state, 'practice', q);
    const second = Renderer.submitAnswer(state, 'practice', q, q.correct_answer);
    assert.equal(second.correct, true); assert.equal(state.attempts, 2); assert.equal(state.correct, 1);
  }
});
