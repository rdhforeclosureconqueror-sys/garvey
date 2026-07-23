const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const VisualRegistry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));

const count = (html, pattern) => (html.match(pattern) || []).length;

test('shared shape and estimation renderers never return empty visual containers', () => {
  const shape = VisualRegistry.render({ visual_model: 'shape_identification', shape: 'triangle' });
  assert.match(shape, /big-shape triangle/);
  assert.match(shape, /role="img" aria-label="Unlabeled shape for identification"/);

  const estimate = VisualRegistry.render({ visual_model: 'visual_objects', prompt: 'Estimate the object length.' });
  assert.match(estimate, /estimation-object/);
  assert.match(estimate, /aria-label="Estimation model/);
});

test('shared operation models preserve exact quantities above the object-token limit', () => {
  const addition = VisualRegistry.render({ visual_model: 'addition_model', a: 39, b: 25 });
  assert.match(addition, /data-quantity="39"[\s\S]*3 tens \+ 9 ones/);
  assert.match(addition, /data-quantity="25"[\s\S]*2 tens \+ 5 ones/);
  assert.equal(count(addition, /class="quantity-ten"/g), 5);
  assert.equal(count(addition, /class="quantity-one"/g), 14);

  const subtraction = VisualRegistry.render({ visual_model: 'subtraction_model', a: 60, b: 10 });
  assert.match(subtraction, /data-quantity="60"[\s\S]*6 tens \+ 0 ones/);
  assert.match(subtraction, /data-quantity="10"/);
});

test('shared place-value charts show only relevant whole-number places', () => {
  const gradeTwoRange = VisualRegistry.render({ visual_model: 'place_value_chart', value: 342 });
  assert.doesNotMatch(gradeTwoRange, /Millions|Hundred Thousands|Ten Thousands|Thousands/);
  assert.match(gradeTwoRange, /Hundreds[\s\S]*Tens[\s\S]*Ones/);

  const largeNumber = VisualRegistry.render({ visual_model: 'place_value_chart', value: 3482615 });
  assert.match(largeNumber, /Millions[\s\S]*Hundred Thousands[\s\S]*Ones/);

  const comparison = VisualRegistry.render({ visual_model: 'place_value_chart', left_value: 412, right_value: 589 });
  assert.match(comparison, /aria-label="Place-value comparison of 412 and 589"/);
  assert.match(comparison, />412<[\s\S]*>589</);
});

test('shared base-ten and number-line comparison models display both authored values', () => {
  const blocks = VisualRegistry.render({ visual_model: 'base_ten_blocks', left_value: 287, right_value: 187 });
  assert.match(blocks, /aria-label="Base-ten comparison of 287 and 187"/);
  assert.equal(count(blocks, /class="hundred-flat"/g), 3);

  const line = VisualRegistry.render({
    visual_model: 'number_line', prompt: 'Compare 701 and 699. Choose a symbol.',
    left_value: 701, right_value: 699, min: 695, max: 705, hide_value: false,
  });
  assert.match(line, />701<\/b>/);
  assert.match(line, />699<\/b>/);
  assert.doesNotMatch(line, /decimal benchmark/i);
});

test('shared graph and table renderers expose complete labels, values, keys, and scales', () => {
  const data = { Cats: 6, Dogs: 4, Fish: 3 };
  const picture = VisualRegistry.render({ visual_model: 'picture_graph', title: 'Class Choices', data, scale: 2 });
  assert.match(picture, /role="img" aria-label="Picture graph Class Choices\. Key or scale: 2\. Cats: 6; Dogs: 4; Fish: 3\./);
  assert.equal(count(picture, /aria-hidden="true">⭐/g), 6);
  assert.equal(count(picture, /partial-symbol/g), 1);

  const bars = VisualRegistry.render({ visual_model: 'bar_graph', title: 'Class Choices', data, scale: 1 });
  assert.match(bars, /aria-label="Bar graph Class Choices[^\"]*Cats: 6; Dogs: 4; Fish: 3/);

  const table = VisualRegistry.render({ visual_model: 'data_table', title: 'Class Choices', data });
  assert.match(table, /<th scope="col">Category<\/th>/);
  assert.match(table, /<th scope="row">Cats<\/th><td>6<\/td>/);
});

test('shared ten frames contain complete visible cells and truthful fill counts', () => {
  const html = VisualRegistry.render({ visual_model: 'ten_frame', a: 10, b: 4 });
  assert.equal(count(html, /class="ten-frame-grid"/g), 2);
  assert.equal(count(html, /class="ten-frame-cell/g), 20);
  assert.equal(count(html, /is-filled/g), 14);
  assert.match(html, /Total shown: 14/);
});

test('shared measurement comparisons carry values and units in accessible context', () => {
  const html = VisualRegistry.render({
    visual_model: 'measurement_comparison', left: 'Red ribbon', right: 'Blue ribbon',
    left_length: 9, right_length: 5, unit: 'inches',
  });
  assert.match(html, /aria-label="Measurement comparison: Red ribbon is 9; Blue ribbon is 5; unit inches"/);
  assert.match(html, /same inches/);
});
