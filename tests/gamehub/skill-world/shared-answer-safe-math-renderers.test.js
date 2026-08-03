const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const Registry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const contentDir = path.join(root, 'public/gamehub/skill-world/content');
const affected = ['algorithm_steps', 'partial_products_model', 'division_model', 'remainder_model', 'decimal_grid', 'rounding_model', 'area_model'];

const fixtures = {
  algorithm_steps: { visual_model: 'algorithm_steps', question_type: 'short_response', prompt: 'Find 31 × 14.', operands: [31, 14], operation: '×', correct_answer: '434', answer: '434', steps: ['Multiply to get 434.'] },
  partial_products_model: { visual_model: 'partial_products_model', question_type: 'short_response', prompt: 'Find 35 × 15.', factors: [35, 15], partial_products: [450, 75], correct_answer: '525', answer: '525' },
  division_model: { visual_model: 'division_model', question_type: 'short_response', prompt: 'Find 180 ÷ 4.', dividend: 180, divisor: 4, quotient: 45, correct_answer: '45', answer: '45', object: 'counters' },
  remainder_model: { visual_model: 'remainder_model', question_type: 'short_response', prompt: 'Find the remainder when 122 is divided by 6.', dividend: 122, divisor: 6, quotient: 20, remainder: 2, correct_answer: '2', answer: '2', object: 'students' },
  decimal_grid: { visual_model: 'decimal_grid', question_type: 'short_response', prompt: 'Write thirty-five hundredths as a decimal.', grid_base: 100, shaded: 35, decimal_label: '0.35 = thirty-five hundredths', correct_answer: '0.35', answer: '0.35' },
  rounding_model: { visual_model: 'rounding_model', question_type: 'short_response', prompt: 'Round 3.46 to the nearest tenth.', value: 3.46, round_to: 0.1, rounded: 3.5, correct_answer: '3.5', answer: '3.5' },
  area_model: { visual_model: 'area_model', question_type: 'short_response', prompt: 'Find 27 × 13.', rows: 27, columns: 13, area: 351, correct_answer: '351', answer: '351' },
};

function assertQuestionSafe(key, html) {
  assert.match(html, new RegExp(`data-renderer="${key}"`));
  assert.match(html, /data-answer-visibility="question"/);
  assert.doesNotMatch(html, /data-correct|correct-answer|show-answer|<audio|question_audio/i);
  if (key === 'algorithm_steps') {
    assert.match(html, /<span>\?<\/span>/);
    assert.doesNotMatch(html, />434</);
  } else if (key === 'partial_products_model') {
    assert.match(html, /<strong>Total: \?<\/strong>/);
    assert.doesNotMatch(html, /Total: 525/);
  } else if (key === 'division_model') {
    assert.match(html, /180 ÷ 4 = \?/);
    assert.doesNotMatch(html, /= 45|45 counters|of 45/);
  } else if (key === 'remainder_model') {
    assert.match(html, /122 ÷ 6 = \? R \?/);
    assert.doesNotMatch(html, /20 R2|Remainder 2|20 in each|2 left over/);
  } else if (key === 'decimal_grid') {
    assert.match(html, /Determine the decimal represented by the grid/);
    assert.doesNotMatch(html, /0\.35|thirty-five hundredths/);
  } else if (key === 'rounding_model') {
    assert.doesNotMatch(html, /target|>rounded<|round up|round down|to 3\.5/);
    assert.match(html, /choose the nearer endpoint/);
  } else if (key === 'area_model') {
    assert.match(html, /27 rows × 13 columns = \?/);
    assert.doesNotMatch(html, /= 351|351 square units/);
  }
}

function assertSolutionVisible(key, html) {
  assert.match(html, /data-answer-visibility="solution"/);
  const expected = {
    algorithm_steps: />434</,
    partial_products_model: /Total: 525/,
    division_model: /180 ÷ 4 = 45/,
    remainder_model: /122 ÷ 6 = 20 R2/,
    decimal_grid: /0\.35 = thirty-five hundredths/,
    rounding_model: /target[\s\S]*rounded|rounded[\s\S]*target/,
    area_model: /27 rows × 13 columns = 351 square units/,
  }[key];
  assert.match(html, expected);
}

test('affected renderers publish an explicit question-default and solution-opt-in contract', () => {
  affected.forEach((key) => assert.deepEqual(Registry.getContract(key), {
    defaultMode: 'question',
    modes: ['question', 'solution'],
    solutionOptIn: ['render options: {mode="solution"}', 'render options: {showAnswer:true}', 'question.visual_mode="solution"', 'question.show_answer=true'],
  }));
});

test('default question mode suppresses answers from visible, caption, tooltip, accessibility, and audio HTML', () => {
  affected.forEach((key) => assertQuestionSafe(key, Registry.render(fixtures[key])));
});

test('production question cards use answer-safe question mode before interaction', () => {
  affected.forEach((key) => {
    const q = { id: `fixture-${key}`, question_id: `fixture-${key}`, hints: ['Focus', 'Strategy', 'Verify'], question_audio: { label: 'Read Question', text: fixtures[key].prompt }, ...fixtures[key] };
    const card = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), { skill_id: 'FIXTURE', lesson: {} });
    const visual = card.match(/<div class="kid-visual-area skill-visual">([\s\S]*?)<\/div><div class="answer-panel">/)?.[1] || '';
    assertQuestionSafe(key, visual);
  });
});

test('solution mode remains available through render options and backwards-compatible metadata aliases', () => {
  affected.forEach((key) => {
    assertSolutionVisible(key, Registry.render(fixtures[key], { mode: 'solution' }));
    assertSolutionVisible(key, Registry.render(fixtures[key], { showAnswer: true }));
    assertSolutionVisible(key, Registry.render({ ...fixtures[key], visual_mode: 'solution' }));
    assertSolutionVisible(key, Registry.render({ ...fixtures[key], show_answer: true }));
  });
});

test('every manifested use of an affected renderer defaults to answer-safe question mode', () => {
  const files = fs.readdirSync(contentDir).filter((file) => file.endsWith('.skill-package.v1.json'));
  const uses = [];
  function walk(value, skillId) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) return value.forEach((item) => walk(item, skillId));
    if (affected.includes(value.visual_model)) {
      uses.push([skillId, value]);
      const html = Registry.render(value);
      assert.match(html, /data-answer-visibility="question"/, `${skillId} ${value.id || value.question_id || value.visual_model}`);
    }
    Object.values(value).forEach((item) => walk(item, skillId));
  }
  files.forEach((file) => {
    const pkg = JSON.parse(fs.readFileSync(path.join(contentDir, file), 'utf8'));
    walk(pkg, pkg.skill_id);
  });
  assert.equal(uses.length, 367);
  assert.deepEqual([...new Set(uses.map(([skillId]) => skillId))].sort(), [
    'G3M_DIV_001', 'G3M_GM_001', 'G3M_PV_001', 'G4M_MD_001', 'G4M_NBT_001', 'G4M_NBT_002',
    'G4M_NBT_003', 'G4M_NBT_004', 'G5M_FR_003', 'G5M_NBT_001', 'G5M_NBT_002', 'G5M_NBT_003',
    'G6M_GM_001', 'G6M_NS_002',
  ]);
});
