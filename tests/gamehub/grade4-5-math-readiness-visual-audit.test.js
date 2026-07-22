const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const contentDir = path.join(root, 'public/gamehub/skill-world/content');
const manifest = JSON.parse(fs.readFileSync(path.join(contentDir, 'manifest.json'), 'utf8'));
const hub = fs.readFileSync(path.join(root, 'public/gamehub/adaptive-v2-hub.html'), 'utf8');
const VisualRegistry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));

const grade4MathSkillIds = [
  'G4M_NBT_001',
  'G4M_OA_001',
  'G4M_NBT_002',
  'G4M_NBT_003',
  'G4M_NBT_004',
  'G4M_FR_001',
  'G4M_FR_002',
  'G4M_FR_003',
  'G4M_MD_001',
  'G4M_GM_001'
];

const grade5MathSkillIds = [
  'G5M_NBT_001',
  'G5M_OA_001',
  'G5M_NBT_002',
  'G5M_NBT_003',
  'G5M_FR_001',
  'G5M_FR_002',
  'G5M_FR_003',
  'G5M_MD_001',
  'G5M_GM_001',
  'G5M_GM_002'
];

const expectedSkillIds = [...grade4MathSkillIds, ...grade5MathSkillIds];

function readPackage(skillId) {
  return JSON.parse(fs.readFileSync(path.join(contentDir, `${skillId}.skill-package.v1.json`), 'utf8'));
}

function collectQuestions(pkg) {
  return [
    ...(pkg.guided_practice || []),
    ...(pkg.adaptive_question_bank || []),
    ...(pkg.checkpoint || []),
    ...(pkg.level_banks || []).flatMap((level) => level.questions || [])
  ];
}

function collectVisualUsage(pkg) {
  return new Set(collectQuestions(pkg).map((q) => q.visual_model || q.support_type).filter(Boolean));
}

function hasRealLevelBanks(pkg) {
  const levels = pkg.level_banks || [];
  const focused = levels.filter((level) => !/(^|_)mixed$/i.test(String(level.level_id || '')) && !/^mixed$/i.test(String(level.label || '')));
  const mixed = levels.some((level) => /(^|_)mixed$/i.test(String(level.level_id || '')) || /^mixed$/i.test(String(level.label || '')));
  return levels.length >= 5 && focused.length >= 4 && mixed && levels.every((level) => (level.questions || []).length >= 10);
}

test('Grade 4 and Grade 5 Math packages exist, are manifested, and have production learning routes', () => {
  const packages = expectedSkillIds.map(readPackage);
  assert.equal(packages.filter((pkg) => Number(pkg.grade) === 4 && pkg.subject === 'Math').length, 10);
  assert.equal(packages.filter((pkg) => Number(pkg.grade) === 5 && pkg.subject === 'Math').length, 10);

  for (const skillId of expectedSkillIds) {
    assert.ok(fs.existsSync(path.join(contentDir, `${skillId}.skill-package.v1.json`)), `${skillId} package exists`);
    assert.ok(manifest.packages.includes(`${skillId}.skill-package.v1.json`), `${skillId} is in manifest`);
    const pkg = readPackage(skillId);
    assert.equal(hasRealLevelBanks(pkg), true, `${skillId} has real level_banks`);
    assert.ok(pkg.page_audio?.text || Object.values(pkg.page_audio || {}).some((audio) => audio?.text && audio?.label === 'Read This Page') || pkg.lesson?.audio?.text, `${skillId} has Read This Page narration`);
    assert.equal(collectQuestions(pkg).every((q) => q.question_audio?.text || q.read_aloud_text), true, `${skillId} has Read Question narration`);
    assert.equal(`/skill-world/${encodeURIComponent(skillId)}`, `/skill-world/${skillId}`);
    assert.equal(`/skill-world/${encodeURIComponent(skillId)}/drill`, `/skill-world/${skillId}/drill`);
  }

  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
});

test('Grade 4 and Grade 5 Math visual models render structural visuals instead of placeholder labels', () => {
  const samples = {
    fraction_bar: {visual_model: 'fraction_bar', numerator: 2, denominator: 5},
    fraction_circle: {visual_model: 'fraction_circle', numerator: 3, denominator: 4},
    fraction_area_model: {visual_model: 'fraction_area_model', numerator_a: 1, denominator_a: 2, numerator_b: 2, denominator_b: 3},
    fraction_division_model: {visual_model: 'fraction_division_model', whole_count: 3, unit_denominator: 4},
    measurement_conversion_table: {visual_model: 'measurement_conversion_table', from_unit: 'feet', to_unit: 'inches', conversion_rate: 12, amount: 3, converted: 36},
    line_plot: {visual_model: 'line_plot', values: [1, 2, 2, 3], min: 1, max: 3},
    graph_interpretation: {visual_model: 'graph_interpretation', pattern_rows: [{input: 1, output: 2}, {input: 2, output: 4}], points: [[1, 2], [2, 4]]},
    bar_graph: {visual_model: 'bar_graph', data: [{label: 'A', value: 2}, {label: 'B', value: 4}]},
    picture_graph: {visual_model: 'picture_graph', data: [{label: 'A', value: 2}, {label: 'B', value: 4}]},
    data_table: {visual_model: 'data_table', data: [{label: 'A', value: 2}, {label: 'B', value: 4}]},
    angle_model: {visual_model: 'angle_model', degrees: 75},
    protractor_model: {visual_model: 'protractor_model', degrees: 120},
    line_relationships: {visual_model: 'line_relationships', relationship: 'parallel'},
    symmetry_model: {visual_model: 'symmetry_model', shape: 'rectangle', symmetry_lines: 2},
    shape_identification: {visual_model: 'shape_identification', shape: 'triangle'},
    attribute_sort: {visual_model: 'attribute_sort', attributes: ['4 sides'], shapes: ['square', 'triangle']},
    hierarchy_diagram: {visual_model: 'hierarchy_diagram'},
    geometry_card_sort: {visual_model: 'geometry_card_sort'},
    coordinate_plane: {visual_model: 'coordinate_plane', points: [[2, 3], [4, 1]]},
    ordered_pair_plot: {visual_model: 'ordered_pair_plot', x: 2, y: 4},
    pattern_table: {visual_model: 'pattern_table', rows: [[1, 2], [2, 4], [3, 6]], rule: 'multiply by 2'},
    volume_model: {visual_model: 'volume_model', length: 3, width: 2, height: 2},
    rectangular_prism_model: {visual_model: 'rectangular_prism_model', length: 4, width: 3, height: 2},
    algorithm_steps: {visual_model: 'algorithm_steps', operands: [348, 129], operation: '+', correct_answer: 477, steps: ['Line up place values.', 'Add ones.', 'Regroup tens.']},
    partial_products_model: {visual_model: 'partial_products_model', partial_products: [80, 12], correct_answer: 92},
    regrouping_model: {visual_model: 'regrouping_model', trades: ['1 ten becomes 10 ones']},
    estimation_number_line: {visual_model: 'estimation_number_line', exact: 487, estimate: 500, min: 400, max: 600},
    remainder_model: {visual_model: 'remainder_model', dividend: 17, divisor: 5}
  };

  const structuralChecks = {
    fraction_bar: [/fraction-bar-cell/],
    fraction_circle: [/<svg/, /fraction-circle-sector/],
    fraction_area_model: [/fraction-area-cell/],
    fraction_division_model: [/fraction-division-piece/],
    measurement_conversion_table: [/<table/, /<tr>/, /36 inches/],
    line_plot: [/line-plot-tick/, /<span>×<\/span>/],
    graph_interpretation: [/graph-canvas/, /graph-dot/, /graph-table/],
    bar_graph: [/bar-fill/],
    picture_graph: [/picture-symbols/, /sw-token/],
    data_table: [/<tbody><tr><th scope="row">A<\/th><td>2<\/td><\/tr>/],
    angle_model: [/<svg/, /<line/],
    protractor_model: [/protractor-shell/, /protractor-tick/, /protractor-ray/],
    line_relationships: [/relationship-canvas/, /line-a/, /line-b/],
    symmetry_model: [/symmetry-shape/, /symmetry-line/],
    shape_identification: [/big-shape triangle/],
    attribute_sort: [/attribute-chip/, /shape-card/],
    hierarchy_diagram: [/hierarchy-map/, /hierarchy-node/],
    geometry_card_sort: [/geometry-sort-card/, /big-shape/],
    coordinate_plane: [/coordinate-plane-grid/, /coordinate-axis-name/, /coordinate-point/],
    ordered_pair_plot: [/coordinate-plane-grid/, /ordered-pair-plot-visual/, /coordinate-point/],
    pattern_table: [/<table/, /<td>1<\/td><td>2<\/td>/],
    volume_model: [/volume-layer/, /unit-cube/],
    rectangular_prism_model: [/prism-face/, /dimension-label/],
    algorithm_steps: [/algorithm-column/, /algorithm-step-list/],
    partial_products_model: [/partial-products-grid/, /Part 1: 80/],
    regrouping_model: [/regrouping-trades/, /trade-card/],
    estimation_number_line: [/estimate-point/, /exact-point/],
    remainder_model: [/equal-group-card/, /remainder-leftovers/]
  };

  for (const [model, question] of Object.entries(samples)) {
    assert.equal(VisualRegistry.hasRenderer(model), true, `${model} renderer exists`);
    const html = VisualRegistry.render(question);
    assert.match(html, new RegExp(`data-renderer="${model}"`), `${model} renderer identity is present`);
    assert.doesNotMatch(html, /fallback object renderer|Missing visual data/i, `${model} does not fall back to placeholder text`);
    for (const pattern of structuralChecks[model]) {
      assert.match(html, pattern, `${model} includes expected structural markup ${pattern}`);
    }
  }
});

test('Expected Grade 4 and Grade 5 Math packages use audited visual models only through real renderers', () => {
  const auditedModels = new Set([
    'fraction_bar', 'fraction_circle', 'fraction_area_model', 'fraction_division_model',
    'measurement_conversion_table', 'line_plot', 'graph_interpretation', 'bar_graph', 'picture_graph', 'data_table',
    'angle_model', 'protractor_model', 'line_relationships', 'symmetry_model', 'shape_identification', 'attribute_sort', 'hierarchy_diagram', 'geometry_card_sort',
    'coordinate_plane', 'ordered_pair_plot', 'pattern_table',
    'volume_model', 'rectangular_prism_model',
    'algorithm_steps', 'partial_products_model', 'regrouping_model', 'estimation_number_line', 'remainder_model'
  ]);

  for (const skillId of expectedSkillIds) {
    const pkg = readPackage(skillId);
    for (const model of collectVisualUsage(pkg)) {
      if (auditedModels.has(model)) {
        assert.equal(VisualRegistry.hasRenderer(model), true, `${skillId} uses rendered ${model}`);
      }
    }
  }
});
