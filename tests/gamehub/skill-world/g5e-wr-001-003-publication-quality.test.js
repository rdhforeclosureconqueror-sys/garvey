'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const Registry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const ids = ['G5E_WR_001', 'G5E_WR_002', 'G5E_WR_003'];
const packages = Object.fromEntries(ids.map((id) => [id, JSON.parse(fs.readFileSync(path.join(root, `public/gamehub/skill-world/content/${id}.skill-package.v1.json`), 'utf8'))]));
const questions = (pkg) => pkg.level_banks.flatMap((bank) => bank.questions);
const norm = (value) => String(value ?? '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

const requiredChecks = {
  G5E_WR_001: ['opinion present', 'reasons present', 'evidence present', 'organization present'],
  G5E_WR_002: ['topic present', 'facts present', 'definitions or explanations present', 'logical organization'],
  G5E_WR_003: ['clear event sequence', 'pacing support', 'description present'],
};

test('only the selected writing sequence is certified and schema-valid', () => {
  assert.deepEqual(Object.keys(packages), ids);
  for (const [id, pkg] of Object.entries(packages)) {
    assert.equal(pkg.skill_id, id);
    assert.equal(pkg.metadata.production_status, 'publication_certified');
    assert.equal(pkg.metadata.audit_date, '2026-08-03');
    assert.deepEqual(pkg.level_banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 10]);
    assert.equal(new Set(questions(pkg).map((q) => q.question_id)).size, 50);
    const result = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
    assert.equal(result.valid, true, `${id}: ${result.errors.join('; ')}`);
  }
});

test('all 150 canonical activities provide explicit, activity-specific pedagogy and scaffolding', () => {
  for (const [id, pkg] of Object.entries(packages)) for (const q of questions(pkg)) {
    assert.equal(q.prompt, q.question, q.question_id);
    assert.deepEqual(q.hints.map((hint) => hint.split(':')[0]), ['Focus', 'Strategy', 'Verify'], q.question_id);
    assert.ok(q.hints.every((hint) => hint.length > 45), q.question_id);
    assert.ok(q.explanation.length > 500, q.question_id);
    assert.match(q.explanation, /immediate task|meets the/i, q.question_id);
    assert.match(q.explanation, /prompt and visual organizer/i, q.question_id);
    assert.match(q.explanation, /minor spelling or phrasing differences/i, q.question_id);
    assert.equal(norm(q.answer), norm(q.correct_answer), q.question_id);
    const checks = new Set([...(q.validation_checks || []), ...(q.writing_validation?.checks || [])]);
    for (const required of requiredChecks[id]) assert.ok(checks.has(required), `${q.question_id}: ${required}`);
    if (q.writing_validation) {
      assert.equal(q.writing_validation.do_not_over_penalize, true, q.question_id);
      assert.match(q.writing_validation.rule_based_checks, /child-friendly paraphrases.*reasonable variation/i, q.question_id);
      assert.ok(q.writing_validation.acceptable_sample_responses.length > 0, q.question_id);
    }
    assert.doesNotMatch(JSON.stringify(q), /\b(?:todo|tbd|placeholder|lorem ipsum)\b|\{\{[^}]+\}\}/i, q.question_id);
  }
});

test('accessibility and narration describe every production visual without relying on color', () => {
  for (const pkg of Object.values(packages)) for (const q of questions(pkg)) {
    assert.ok(q.visual_description.length > 300, q.question_id);
    assert.equal(q.accessible_description, q.visual_description, q.question_id);
    assert.match(q.visual_description, new RegExp(q.visual_model.replaceAll('_', ' '), 'i'), q.question_id);
    assert.match(q.visual_description, /No color-only direction/, q.question_id);
    assert.equal(q.question_audio.label, 'Read Question', q.question_id);
    assert.equal(q.question_audio.text, q.read_aloud_text, q.question_id);
    assert.ok(q.question_audio.text.startsWith(q.prompt), q.question_id);
    assert.match(q.question_audio.text, /The visual is /, q.question_id);
    assert.equal(q.question_audio.browser_speech_fallback, true, q.question_id);
  }
});

test('answer metadata is internally consistent and usable by assessment', () => {
  for (const pkg of Object.values(packages)) for (const q of questions(pkg)) {
    assert.ok(q.correct_answer !== undefined && norm(q.correct_answer), q.question_id);
    assert.equal(Renderer.evaluateAnswer(q, q.correct_answer), true, q.question_id);
    for (const alias of q.acceptable_answers || []) assert.equal(Renderer.evaluateAnswer(q, alias), true, `${q.question_id}: ${alias}`);
    if (q.choices) {
      assert.deepEqual(q.options, q.choices, q.question_id);
      assert.equal(new Set(q.choices.map(norm)).size, q.choices.length, q.question_id);
      assert.equal(q.choices.filter((choice) => norm(choice) === norm(q.correct_answer)).length, 1, q.question_id);
      const wrong = q.choices.find((choice) => !Renderer.evaluateAnswer(q, choice));
      assert.ok(wrong, q.question_id);
      assert.equal(Renderer.evaluateAnswer(q, wrong), false, q.question_id);
    }
  }
});

test('every canonical activity renders with its authored production renderer and interaction', () => {
  for (const pkg of Object.values(packages)) for (const q of questions(pkg)) {
    assert.equal(Registry.hasRenderer(q.visual_model), true, q.question_id);
    const visual = Registry.render(q);
    const card = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
    for (const html of [visual, card]) {
      assert.ok(html.trim().length > 80, q.question_id);
      assert.doesNotMatch(html, /renderer unavailable|unsupported question|data-renderer="fallback"|>placeholder</i, q.question_id);
    }
    assert.match(visual, new RegExp(`data-renderer="${q.visual_model}"`), q.question_id);
    assert.match(card, /question-card/, q.question_id);
    assert.match(card, /question-read-button[\s\S]*Read Question/, q.question_id);
  }
});

test('adaptive banks and production submission state remain compatible', () => {
  for (const pkg of Object.values(packages)) {
    assert.equal(pkg.level_banks.length, 5, pkg.skill_id);
    assert.match(pkg.level_banks[4].level_id, /mixed/i, pkg.skill_id);
    assert.ok(pkg.remediation_skill_id && pkg.next_skill_id, pkg.skill_id);
    for (const q of questions(pkg)) {
      const state = Renderer.createState();
      const first = Renderer.submitAnswer(state, 'practice', q, q.correct_answer);
      assert.equal(first.correct, true, q.question_id);
      assert.equal(state.attempts, 1, q.question_id);
      assert.equal(state.correct, 1, q.question_id);
      assert.equal(state.answeredByZoneQuestion[`practice:${q.question_id}`].submitted, true, q.question_id);
    }
  }
});
