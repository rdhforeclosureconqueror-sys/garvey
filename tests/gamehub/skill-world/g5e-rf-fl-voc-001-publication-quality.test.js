const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const Registry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const ids = ['G5E_RF_001', 'G5E_FL_001', 'G5E_VOC_001'];
const packages = Object.fromEntries(ids.map((id) => [id, JSON.parse(fs.readFileSync(path.join(root, `public/gamehub/skill-world/content/${id}.skill-package.v1.json`), 'utf8'))]));
const questions = (pkg) => pkg.level_banks.flatMap((bank) => bank.questions);
const norm = (value) => String(value ?? '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

test('exactly the first three Grade 5 English dependency packages are publication certified', () => {
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

test('all 150 activities have distinct prompts and complete teaching and accessibility metadata', () => {
  for (const pkg of Object.values(packages)) {
    const qs = questions(pkg);
    assert.equal(new Set(qs.map((q) => norm(q.prompt))).size, 50, pkg.skill_id);
    assert.equal(new Set(qs.map((q) => norm(q.hints.join('|')))).size, 50, pkg.skill_id);
    assert.equal(new Set(qs.map((q) => norm(q.explanation))).size, 50, pkg.skill_id);
    for (const q of qs) {
      assert.deepEqual(q.hints.map((hint) => hint.split(':')[0]), ['Focus', 'Strategy', 'Verify'], q.question_id);
      assert.ok(q.explanation.length > 100, q.question_id);
      assert.doesNotMatch(q.explanation, /^The answer is/i, q.question_id);
      assert.ok(q.visual_description.length > 150, q.question_id);
      assert.equal(q.accessible_description, q.visual_description, q.question_id);
      assert.equal(q.question_audio.label, 'Read Question', q.question_id);
      assert.equal(q.question_audio.text, q.read_aloud_text, q.question_id);
      assert.ok(q.question_audio.text.startsWith(q.prompt), q.question_id);
      assert.match(q.question_audio.text, /The visual is /, q.question_id);
      assert.doesNotMatch(q.question_audio.text, /correct answer|the answer is/i, q.question_id);
      assert.equal(norm(q.answer), norm(q.correct_answer), q.question_id);
      assert.doesNotMatch(JSON.stringify(q), /\b(?:todo|tbd|placeholder|lorem ipsum)\b|\{\{[^}]+\}\}/i, q.question_id);
      if (q.acceptable_answers) assert.equal(new Set(q.acceptable_answers.map(norm)).size, q.acceptable_answers.length, q.question_id);
      const choices = q.choices || q.options;
      if (choices) {
        assert.equal(new Set(choices.map(norm)).size, choices.length, q.question_id);
        assert.equal(choices.filter((choice) => norm(choice) === norm(q.correct_answer)).length, 1, q.question_id);
      }
    }
  }
});

test('multiple-choice answer positions are balanced and synchronized with narration', () => {
  for (const pkg of Object.values(packages)) {
    const positions = [];
    for (const q of questions(pkg)) if (q.choices) {
      positions.push(q.choices.findIndex((choice) => norm(choice) === norm(q.correct_answer)));
      assert.match(q.question_audio.text, new RegExp(`Choices: ${q.choices.map((choice) => String(choice).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(', ')}\\.$`), q.question_id);
    }
    const counts = positions.reduce((all, position) => ((all[position] = (all[position] || 0) + 1), all), {});
    assert.ok(Math.max(...Object.values(counts)) - Math.min(...Object.values(counts)) <= 1, pkg.skill_id);
  }
});

test('word-analysis representations and authored answers recompute consistently', () => {
  for (const q of questions(packages.G5E_RF_001)) {
    if (q.syllables) {
      assert.equal(q.syllables.join('').toLowerCase(), q.word.toLowerCase(), q.question_id);
      assert.equal(q.syllables.join('-'), q.correct_answer, q.question_id);
      assert.equal(q.syllable_types.length, q.syllables.length, q.question_id);
    }
    if (q.word_parts) assert.equal(q.word_parts.length, q.part_roles.length, q.question_id);
    if (q.morphemes) assert.equal(q.morphemes.join('').replace(/-/g, '').toLowerCase(), q.word.replace(/-/g, '').toLowerCase(), q.question_id);
    if (q.tiles) assert.equal(q.tiles.join('').replace(/-/g, '').toLowerCase(), q.word.replace(/-/g, '').toLowerCase(), q.question_id);
  }
});

test('fluency evidence and vocabulary representations remain internally consistent', () => {
  for (const q of questions(packages.G5E_FL_001)) {
    assert.equal(q.text, q.sentence || q.passage, q.question_id);
    assert.deepEqual(Object.keys(q.fluency_scores).sort(), ['accuracy', 'expression', 'smoothness'], q.question_id);
    Object.values(q.fluency_scores).forEach((score) => assert.ok(score >= 0 && score <= 100, q.question_id));
    if (q.phrase_chunks) assert.equal(norm(q.phrase_chunks.join(' ').replace(/[,.!?]/g, '')), norm(q.text.replace(/[,.!?]/g, '')), q.question_id);
  }
  for (const q of questions(packages.G5E_VOC_001)) {
    if (q.visual_model === 'context_sentence') assert.ok(q.sentence.includes(q.word), q.question_id);
    if (q.visual_model === 'word_scale') assert.ok(q.scale_words.includes(q.target_word), q.question_id);
    if (q.visual_model === 'figurative_language_card') {
      assert.ok(q.phrase && q.figurative_type && q.literal_meaning && q.figurative_meaning, q.question_id);
    }
    if (q.pairs) {
      assert.ok(q.pairs.length >= 1, q.question_id);
      q.pairs.forEach((pair) => assert.notEqual(norm(pair.right), norm(q.correct_answer), q.question_id));
    }
  }
});

test('all activities render through registry and production question card without fallback or leakage', () => {
  for (const pkg of Object.values(packages)) for (const q of questions(pkg)) {
    const visual = Registry.render(q);
    const card = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
    for (const html of [visual, card]) {
      assert.ok(html.trim().length > 40, q.question_id);
      assert.doesNotMatch(html, /renderer unavailable|unsupported question|data-renderer="fallback"|>placeholder</i, q.question_id);
    }
    assert.match(visual, new RegExp(`data-renderer="${q.visual_model}"`), q.question_id);
    assert.match(card, /question-card/, q.question_id);
    assert.match(card, /question-read-button[\s\S]*Read Question/, q.question_id);
    assert.doesNotMatch(visual, /correct answer|answer:/i, q.question_id);
  }
});

test('production evaluation, acceptable answers, submission, retry, and state work for all activities', () => {
  for (const pkg of Object.values(packages)) for (const q of questions(pkg)) {
    assert.equal(Renderer.evaluateAnswer(q, q.correct_answer), true, q.question_id);
    for (const alias of q.acceptable_answers || []) assert.equal(Renderer.evaluateAnswer(q, alias), true, `${q.question_id}: ${alias}`);
    const candidates = q.choices || q.options || [];
    const wrong = candidates.find((choice) => !Renderer.evaluateAnswer(q, choice)) || '__definitely_wrong__';
    assert.equal(Renderer.evaluateAnswer(q, wrong), false, q.question_id);
    const state = Renderer.createState();
    const first = Renderer.submitAnswer(state, 'practice', q, wrong);
    assert.equal(first.correct, false, q.question_id); assert.equal(state.attempts, 1, q.question_id);
    Renderer.retryAnswer(state, 'practice', q);
    const second = Renderer.submitAnswer(state, 'practice', q, q.correct_answer);
    assert.equal(second.correct, true, q.question_id); assert.equal(state.attempts, 2, q.question_id); assert.equal(state.correct, 1, q.question_id);
  }
});
