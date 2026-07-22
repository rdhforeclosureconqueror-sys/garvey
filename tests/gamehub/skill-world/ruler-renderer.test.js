const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const Registry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'public/gamehub/skill-world/content/G2M_MD_001.skill-package.v1.json')));

function paths(fixture) {
  const q = { id: 'SYNTHETIC_RULER', question_id: 'SYNTHETIC_RULER', prompt: 'Measure the object.', question_type: 'multiple_choice', answer_options: ['1'], correct_answer: '1', visual_model: 'ruler', ...fixture };
  return [Registry.render(q), Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg)];
}

function assertComplete(html, { start, end, length, unit, structure, text }) {
  assert.match(html, /data-renderer="ruler"/);
  assert.match(html, /data-render-status="complete"/);
  assert.match(html, new RegExp(`data-start="${start}"`));
  assert.match(html, new RegExp(`data-end="${end}"`));
  assert.match(html, new RegExp(`data-length="${length}"`));
  assert.match(html, new RegExp(`data-unit="${unit}"`));
  assert.match(html, new RegExp(`data-measurement-structure="${structure}"`));
  assert.match(html, new RegExp(`data-value="${start}"`));
  assert.match(html, new RegExp(`data-value="${end}"`));
  assert.match(html, new RegExp(`data-span="${length}"`));
  assert.match(html, text);
  assert.match(html, /role="img" aria-label="A ruler marked from/);
  assert.match(html, /begins at .*ends at/);
  assert.doesNotMatch(html, /data-renderer="visual_objects"|missing-visual|placeholder|unsupported/i);
  assert.ok(html.trim().length > 100);
}

function presentedText(html) {
  return {
    accessible: html.match(/role="img" aria-label="([^"]+)"/)?.[1] || '',
    caption: html.match(/<p class="sw-visual-caption">([^<]+)<\/p>/)?.[1] || '',
  };
}

function assertNoAnswerLeak(html, { length, unit }) {
  const { accessible, caption } = presentedText(html);
  assert.ok(accessible, 'accessible ruler description is present');
  assert.ok(caption, 'visible ruler instruction is present');
  const solutionStatement = new RegExp(`(?:distance|length|span(?:s|ning)?)\\s+(?:is|of|:)?\\s*${length}\\s+${unit}`, 'i');
  assert.doesNotMatch(accessible, solutionStatement, 'accessible description must not state the computed answer');
  assert.doesNotMatch(caption, solutionStatement, 'visible caption must not state the computed answer');
  assert.doesNotMatch(accessible, /spanning|distance is|length is/i);
  assert.doesNotMatch(caption, /spanning|distance is|length is/i);
}

const completeFixtures = [
  ['zero-based measurement', { unit: 'inches', start: 0, end: 6, length: 6 }, { start: 0, end: 6, length: 6, unit: 'inches', structure: 'zero-based-measurement', text: /begins at the 0-inch mark and ends at the 6-inch mark/ }],
  ['off-zero inches', { unit: 'inches', start: 2, end: 8, length: 6 }, { start: 2, end: 8, length: 6, unit: 'inches', structure: 'off-zero-interval', text: /begins at the 2-inch mark and ends at the 8-inch mark/ }],
  ['off-zero centimeters', { unit: 'centimeters', start: 3, end: 10, length: 7 }, { start: 3, end: 10, length: 7, unit: 'centimeters', structure: 'off-zero-interval', text: /begins at the 3-centimeter mark and ends at the 10-centimeter mark/ }],
  ['endpoint reading', { unit: 'inches', measurement_structure: 'endpoint-reading', endpoint: 5 }, { start: 0, end: 5, length: 5, unit: 'inches', structure: 'endpoint-reading', text: /Read the ruler mark where the object ends/ }],
  ['half-unit ticks', { unit: 'inches', start: 1.5, end: 4, length: 2.5, tick_interval: 0.5, max: 5 }, { start: 1.5, end: 4, length: 2.5, unit: 'inches', structure: 'off-zero-interval', text: /begins at the 1.5-inch mark and ends at the 4-inch mark/ }],
];

for (const [name, fixture, expected] of completeFixtures) {
  test(`${name} is complete through both production paths`, () => {
    for (const html of paths(fixture)) {
      assertComplete(html, expected);
      assertNoAnswerLeak(html, expected);
    }
    if (name.includes('off-zero')) paths(fixture).forEach((html) => assert.doesNotMatch(html, /Start at 0/i));
  });
}

const invalidFixtures = [
  ['missing start', { unit: 'inches', measurement_structure: 'interval-measurement', end: 6, length: 6 }, /missing start/],
  ['missing end', { unit: 'inches', measurement_structure: 'interval-measurement', start: 0, length: 6 }, /missing end/],
  ['inconsistent length', { unit: 'inches', start: 2, end: 8, length: 8 }, /length does not equal/],
  ['reversed endpoints', { unit: 'inches', start: 8, end: 2, length: -6 }, /end is less than start/],
  ['unsupported unit', { unit: 'yards', start: 0, end: 3, length: 3 }, /unsupported unit/],
  ['ambiguous legacy fields', { unit: 'inches', start: 1, from: 2, end: 5, length: 4 }, /ambiguous start fields/],
];

for (const [name, fixture, reason] of invalidFixtures) {
  test(`${name} produces deterministic invalid ruler output`, () => {
    for (const html of paths(fixture)) {
      assert.match(html, /data-renderer="ruler"/);
      assert.match(html, /data-render-status="invalid"/);
      assert.match(html, reason);
      assert.match(html, /role="img" aria-label="Invalid ruler metadata:/);
      assert.match(html, /cannot be drawn without changing the mathematics/);
      assert.doesNotMatch(html, /data-renderer="visual_objects"|missing-visual|placeholder|unsupported renderer/i);
      assert.ok(html.trim().length > 100);
    }
  });
}

test('every canonical ruler activity renders completely through registry and question card', () => {
  const questions = pkg.level_banks.flatMap((bank) => bank.questions).filter((q) => q.visual_model === 'ruler');
  assert.equal(questions.length, 24);
  for (const q of questions) {
    for (const html of [Registry.render(q), Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg)]) {
      assert.match(html, /data-renderer="ruler"/i, q.id);
      assert.match(html, /data-render-status="complete"/, q.id);
      assert.match(html, /role="img" aria-label="A ruler marked from/, q.id);
      assertNoAnswerLeak(html, { length: q.length, unit: q.unit });
      assert.doesNotMatch(html, /data-renderer="(?:visual_objects|missing)"|placeholder|unsupported renderer|missing-visual/i, q.id);
    }
  }
});
