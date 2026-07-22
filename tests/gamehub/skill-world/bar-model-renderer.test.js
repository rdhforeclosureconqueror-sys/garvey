const test = require('node:test');
const assert = require('node:assert/strict');
const Registry = require('../../../public/gamehub/skill-world/renderers/visual-model-registry.js');

const fixtures = [
  ['part-part-whole', { equation: '8 + 5 = ?', problem_structure: 'part_part_whole', correct_answer: '13' }, ['8', '5']],
  ['result-unknown-addition', { equation: '14 + 7 = ?', correct_answer: '21' }, ['14', '7']],
  ['change-unknown', { equation: '12 + ? = 19', correct_answer: '7' }, ['12', '19']],
  ['start-unknown', { equation: '? + 6 = 15', prompt: 'Some birds were there at first.', correct_answer: '9' }, ['6', '15']],
  ['compare-more', { equation: '18 - 11 = ?', prompt: 'How many more?', correct_answer: '7' }, ['18', '11']],
  ['compare-less', { equation: '18 - 11 = ?', prompt: 'How many fewer?', correct_answer: '7' }, ['18', '11']],
  ['missing-addend', { equation: '? + 9 = 20', problem_structure: 'missing_addend', correct_answer: '11' }, ['9', '20']],
  ['missing-subtrahend', { equation: '20 - ? = 13', correct_answer: '7' }, ['20', '13']],
  ['missing-minuend', { equation: '? - 8 = 14', correct_answer: '22' }, ['8', '14']],
  ['result-unknown-subtraction', { equation: '25 - 9 = ?', correct_answer: '16' }, ['25', '9']],
];

for (const [structure, fixture, known] of fixtures) {
  test(`renders ${structure} without leaking its answer`, () => {
    const html = Registry.render({ visual_model: 'bar_model', ...fixture });
    assert.match(html, /data-renderer="bar_model"/);
    assert.match(html, new RegExp(`data-structure="${structure}"`));
    assert.equal((html.match(/data-quantity="unknown"/g) || []).length, 1);
    for (const quantity of known) assert.match(html, new RegExp(`<strong>${quantity}</strong>`));
    assert.doesNotMatch(html, new RegExp(`<strong>${fixture.correct_answer}</strong>`));
    assert.match(html, /role="img"/);
    assert.match(html, /aria-label="Bar model,/);
  });
}

test('supports a synthetic multi-step model and does not duplicate quantities', () => {
  const html = Registry.render({ visual_model: 'bar_model', equation: '10 + 4 - 3 = ?', correct_answer: '11' });
  assert.match(html, /data-structure="multi-step"/);
  for (const quantity of ['10', '4', '3']) {
    assert.equal((html.match(new RegExp(`<strong>${quantity}</strong>`, 'g')) || []).length, 1);
  }
  assert.doesNotMatch(html, /<strong>11<\/strong>/);
  assert.equal((html.match(/data-quantity="unknown"/g) || []).length, 1);
});

test('keeps registry fallback compatibility', () => {
  assert.match(Registry.render({ visual_model: 'not_registered' }), /data-renderer="visual_objects"/);
});
