'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'public/gamehub/skill-world/content/G5E_LANG_001.skill-package.v1.json'), 'utf8'));
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const Registry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const questions = pkg.level_banks.flatMap((bank) => bank.questions);
const norm = (value) => String(value ?? '').toLowerCase().replace(/[“”]/g, '"').replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();

test('G5E_LANG_001 is the single certified, schema-valid package with fifty canonical activities', () => {
  assert.equal(pkg.skill_id, 'G5E_LANG_001');
  assert.equal(pkg.metadata.production_status, 'publication_certified');
  assert.equal(pkg.metadata.audit_date, '2026-08-03');
  assert.deepEqual(pkg.level_banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 10]);
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map((q) => q.question_id)).size, 50);
  const result = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('every activity has unique instructional content, three purposeful hints, and a teaching explanation', () => {
  assert.equal(new Set(questions.map((q) => norm(q.prompt))).size, 50);
  assert.equal(new Set(questions.map((q) => norm(q.hints.join('|')))).size, 50);
  for (const q of questions) {
    assert.equal(q.prompt, q.question, q.question_id);
    assert.deepEqual(q.hints.map((h) => h.split(':')[0]), ['Focus', 'Strategy', 'Verify'], q.question_id);
    assert.ok(q.hints.every((h) => h.length > 75), q.question_id);
    assert.ok(q.explanation.length > 450, q.question_id);
    assert.match(q.explanation, /because|rule|meaning/i, q.question_id);
    assert.doesNotMatch(JSON.stringify(q), /\b(?:todo|tbd|placeholder|lorem ipsum)\b|\{\{[^}]+\}\}/i, q.question_id);
  }
});

test('answers, aliases, and multiple-choice distractors are consistent and deterministic', () => {
  const positions = [];
  for (const q of questions) {
    assert.equal(norm(q.answer), norm(q.correct_answer), q.question_id);
    assert.deepEqual(q.acceptable_answers, [q.correct_answer], q.question_id);
    assert.equal(Renderer.evaluateAnswer(q, q.correct_answer), true, q.question_id);
    assert.equal(Renderer.evaluateAnswer(q, '__certainly incorrect__'), false, q.question_id);
    if (q.question_type === 'multiple_choice') {
      assert.deepEqual(q.options, q.choices, q.question_id);
      assert.equal(q.choices.length, 4, q.question_id);
      assert.equal(new Set(q.choices.map(norm)).size, 4, q.question_id);
      assert.equal(q.choices.filter((c) => norm(c) === norm(q.correct_answer)).length, 1, q.question_id);
      positions.push(q.choices.findIndex((c) => norm(c) === norm(q.correct_answer)));
      for (const choice of q.choices) assert.equal(Renderer.evaluateAnswer(q, choice), norm(choice) === norm(q.correct_answer), `${q.question_id}: ${choice}`);
    }
  }
  const counts = positions.reduce((a, p) => (a[p] = (a[p] || 0) + 1, a), {});
  assert.ok(Math.max(...Object.values(counts)) - Math.min(...Object.values(counts)) <= 4, JSON.stringify(counts));
});

test('all authored visuals, cards, narration, and accessibility metadata are answer-safe', () => {
  for (const q of questions) {
    assert.equal(Registry.hasRenderer(q.visual_model), true, q.question_id);
    assert.equal(q.accessible_description, q.visual_description, q.question_id);
    assert.ok(q.visual_description.length > 250, q.question_id);
    assert.match(q.visual_description, new RegExp(q.visual_model.replaceAll('_', ' '), 'i'), q.question_id);
    assert.match(q.visual_description, /without.*revealing/i, q.question_id);
    assert.equal(q.question_audio.text, q.read_aloud_text, q.question_id);
    assert.ok(q.question_audio.text.startsWith(q.prompt), q.question_id);
    assert.equal(q.question_audio.label, 'Read Question', q.question_id);
    const visual = Registry.render(q);
    const card = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
    for (const html of [visual, card]) {
      assert.ok(html.trim().length > 80, q.question_id);
      assert.doesNotMatch(html, /renderer unavailable|unsupported question|data-renderer="fallback"|>placeholder</i, q.question_id);
    }
    assert.match(visual, new RegExp(`data-renderer="${q.visual_model}"`), q.question_id);
    assert.match(card, /question-card/, q.question_id);
  }
});

test('mixed work is original transfer and production state supports an incorrect attempt followed by correction', () => {
  const focused = pkg.level_banks.slice(0, 4).flatMap((b) => b.questions);
  const mixed = pkg.level_banks[4].questions;
  assert.match(pkg.level_banks[4].level_id, /mixed/i);
  for (const q of mixed) {
    assert.ok(!focused.some((f) => norm(f.prompt) === norm(q.prompt)), q.question_id);
    const state = Renderer.createState();
    const wrong = Renderer.submitAnswer(state, 'practice', q, '__certainly incorrect__');
    assert.equal(wrong.correct, false, q.question_id);
    assert.equal(state.attempts, 1, q.question_id);
    assert.equal(state.correct, 0, q.question_id);
    const locked = Renderer.submitAnswer(state, 'practice', q, q.correct_answer);
    assert.equal(locked.correct, false, q.question_id);
    assert.equal(state.attempts, 1, q.question_id);
    const retryState = Renderer.createState();
    const corrected = Renderer.submitAnswer(retryState, 'practice', q, q.correct_answer);
    assert.equal(corrected.correct, true, q.question_id);
    assert.equal(retryState.attempts, 1, q.question_id);
    assert.equal(retryState.correct, 1, q.question_id);
    assert.equal(retryState.answeredByZoneQuestion[`practice:${q.question_id}`].submitted, true, q.question_id);
  }
});
