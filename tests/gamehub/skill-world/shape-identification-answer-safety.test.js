const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const Registry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));

const gradeTwoShapes = [
  'triangle', 'square', 'circle', 'rectangle', 'pentagon', 'hexagon', 'octagon',
  'cube', 'sphere', 'cylinder', 'cone', 'rectangular prism',
];

function attribute(html, name) {
  return html.match(new RegExp(`${name}="([^"]*)"`))?.[1] || '';
}

function caption(html) {
  return html.match(/<p class="sw-visual-caption"[^>]*>([^<]*)<\/p>/)?.[1] || '';
}

function assertAnswerSafe(html, answer, pathName) {
  assert.match(html, /data-renderer="shape_identification"/, `${pathName}: intended renderer`);
  const answerPattern = new RegExp(`\\b${answer.replace(/\s+/g, '\\s+')}\\b`, 'i');
  assert.doesNotMatch(caption(html), answerPattern, `${pathName}: visible caption`);
  assert.doesNotMatch(attribute(html, 'aria-label'), answerPattern, `${pathName}: accessible name`);
  assert.doesNotMatch(attribute(html, 'aria-description'), answerPattern, `${pathName}: accessible description`);
  assert.match(attribute(html, 'aria-label'), /shape|figure/i, `${pathName}: accessible name remains useful`);
  assert.match(attribute(html, 'aria-description'), /flat|solid|figure/i, `${pathName}: geometry remains accessible`);
}

test('shape-identification contract explicitly forbids answer leakage', () => {
  assert.deepEqual(Registry.getContract('shape_identification'), {
    answerSafe: true,
    accessible: true,
    forbiddenOutputs: ['visible caption', 'accessible name', 'accessible description'],
    permittedOutputs: ['geometry', 'orientation', 'size', 'fill', 'other non-answer attributes'],
  });
});

test('all supported Grade 2 shapes are withheld from captions and accessible text', () => {
  gradeTwoShapes.forEach((shape) => {
    const html = Registry.render({
      visual_model: 'shape_identification', shape,
      orientation: 'rotated', size: 'large', fill: 'outline',
    });
    assertAnswerSafe(html, shape, `production registry: ${shape}`);
    assert.match(attribute(html, 'aria-description'), /rotated, large, outline/);
  });
});

test('production question cards remain answer-safe in guided, adaptive, and checkpoint zones', () => {
  for (const zone of ['practice', 'challenge', 'checkpoint']) {
    for (const shape of gradeTwoShapes) {
      const question = {
        id: `${zone}-${shape}`, question_id: `${zone}-${shape}`,
        visual_model: 'shape_identification', question_type: 'multiple_choice',
        prompt: 'Which shape is shown?', shape, choices: [shape, 'another choice'], correct_answer: shape,
      };
      const html = Renderer.renderQuestionCard(question, zone, Renderer.createState(), {});
      const visual = html.match(/<div class="visual-model[\s\S]*?<\/p><\/div>/)?.[0] || '';
      assertAnswerSafe(visual, shape, `production question card (${zone}): ${shape}`);
    }
  }
});

test('unknown shapes fail closed without reflecting an authored answer into learner-facing text', () => {
  const html = Registry.render({ visual_model: 'shape_identification', shape: 'answer-injection' });
  assert.doesNotMatch(html, /answer-injection/i);
  assert.match(html, /unknown-shape/);
  assert.match(attribute(html, 'aria-description'), /unlabeled figure/i);
});
