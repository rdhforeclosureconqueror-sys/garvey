const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const contentDir = path.join(root, 'public/gamehub/skill-world/content');
const VisualRegistry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const packages = fs.readdirSync(contentDir).filter((name) => /^G2M_.*\.skill-package\.v1\.json$/.test(name))
  .map((name) => JSON.parse(fs.readFileSync(path.join(contentDir, name), 'utf8')));
const questions = packages.flatMap((pkg) => pkg.level_banks.flatMap((bank) => bank.questions.map((question) => ({ pkg, question }))));
const visuals = [];

function collectVisuals(value, pkg, trail = pkg.skill_id) {
  if (!value || typeof value !== 'object') return;
  if (value.visual_model) visuals.push({ pkg, activity: value, id: value.question_id || value.id || trail });
  if (Array.isArray(value)) value.forEach((item, index) => collectVisuals(item, pkg, `${trail}[${index}]`));
  else Object.entries(value).forEach(([key, item]) => collectVisuals(item, pkg, `${trail}.${key}`));
}
packages.forEach((pkg) => collectVisuals(pkg, pkg));

function occurrences(html, pattern) { return (html.match(pattern) || []).length; }
function graphData(q) {
  const raw = q.data || q.categories || q.table || q.rows || [];
  return Array.isArray(raw) ? raw.map((item) => ({ label: item.label || item.category, value: Number(item.value ?? item.count) }))
    : Object.entries(raw).map(([label, value]) => ({ label, value: Number(value) }));
}

test('inventory covers all 11 packages, 556 practice questions, and 739 authored visuals', () => {
  assert.equal(packages.length, 11);
  assert.equal(questions.length, 556);
  assert.equal(visuals.length, 739);
});

test('every authored Grade 2 Math visual uses a real, nonempty renderer', () => {
  for (const { activity, id } of visuals) {
    assert.equal(VisualRegistry.hasRenderer(activity.visual_model), true, `${id}: supported ${activity.visual_model}`);
    const html = VisualRegistry.render(activity);
    assert.match(html, new RegExp(`data-renderer="${activity.visual_model}"`), `${id}: renderer identity`);
    assert.doesNotMatch(html, /data-renderer="(?:fallback|missing)"|Missing visual data|fallback object renderer/i, id);
    assert.match(html, /(?:aria-label|sw-visual-caption|<table)/, `${id}: accessible visual context`);
    assert.ok(html.replace(/<[^>]*>/g, '').trim().length > 10, `${id}: nonempty visual`);
  }
});

test('counts, place value, measurements, clocks, arrays, and graph data render from authored metadata', () => {
  for (const { activity: q, id } of visuals) {
    const html = VisualRegistry.render(q);
    if (q.visual_model === 'base_ten_blocks' && q.question_id) {
      const value = Number(q.value ?? q.number ?? q.correct_answer);
      const expected = {
        hundreds: q.hundreds ?? Math.floor(value / 100),
        tens: q.tens ?? Math.floor((value % 100) / 10),
        ones: q.ones ?? value % 10,
      };
      assert.equal(occurrences(html, /class="hundred-flat"/g), expected.hundreds, `${id}: hundreds`);
      assert.equal(occurrences(html, /class="ten-rod"/g), expected.tens, `${id}: tens`);
      assert.equal(occurrences(html, /class="one-cube"/g), expected.ones, `${id}: ones`);
    }
    if (q.visual_model === 'array_model') assert.equal(occurrences(html, /class="array-cell"/g), q.rows * q.columns, `${id}: array objects`);
    if (q.visual_model === 'ruler' && q.question_id) {
      assert.match(html, new RegExp(`measure ${q.length} ${q.unit}`), `${id}: ruler endpoint and unit`);
      assert.match(html, new RegExp(`ruler marked in ${q.unit}`), `${id}: ruler accessible unit`);
    }
    if (q.visual_model === 'analog_clock' && q.question_id) {
      const time = `${q.hour}:${String(q.minute).padStart(2, '0')}`;
      assert.match(html, new RegExp(`analog clock showing ${time}`), `${id}: accessible clock time`);
      assert.ok(html.includes(`hour-hand" style="transform:rotate(${((q.hour % 12) * 30) + (q.minute / 2)}deg)`), `${id}: hour hand`);
      assert.ok(html.includes(`minute-hand" style="transform:rotate(${q.minute * 6}deg)`), `${id}: minute hand`);
    }
    if (['picture_graph', 'bar_graph', 'data_table'].includes(q.visual_model)) {
      for (const datum of graphData(q)) assert.match(html, new RegExp(`${datum.label}[\\s\\S]*${datum.value}`), `${id}: ${datum.label} value`);
    }
  }
});

test('activity-ID regressions: shape is visible, place-value models are truthful, and graphs are described', () => {
  const byId = Object.fromEntries(visuals.map(({ id, activity }) => [id, activity]));
  const triangle = VisualRegistry.render(byId.G2M_GM_001_LVL1_Q1);
  assert.match(triangle, /big-shape triangle/);
  assert.match(triangle, /role="img" aria-label="triangle shape model"/);

  for (const id of ['G2M_PV_001_MIX_Q4', 'G2M_PV_001_MIX_Q8', 'G2M_PV_001_MIX_Q12']) {
    assert.equal(byId[id].visual_model, 'base_ten_blocks', `${id}: no capped generic object fallback`);
  }

  const pictureGraph = VisualRegistry.render(byId.G2M_MD_003_LVL1_Q4);
  assert.match(pictureGraph, /role="img" aria-label="Picture graph[^\"]*Soccer: 10; Art: 6; Music: 4/);
  assert.equal(occurrences(pictureGraph, /aria-hidden="true">⭐/g), 10, 'scale 2 creates 5 + 3 + 2 symbols');
  const table = VisualRegistry.render(byId.G2M_MD_003_LVL3_Q1);
  assert.match(table, /<th scope="col">Category<\/th>/);
  assert.match(table, /<th scope="row">/);
});

test('Read Question gives complete prompt context and never isolated-answer Listen audio', () => {
  for (const { pkg, question: q } of questions) {
    assert.equal(q.question_audio?.label, 'Read Question', q.question_id);
    assert.ok(String(q.question_audio?.text).trim().split(/\s+/).length >= 3, `${q.question_id}: complete spoken context`);
    assert.notEqual(String(q.question_audio.text).trim(), String(q.correct_answer).trim(), `${q.question_id}: not answer-only`);
    const html = Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg);
    assert.match(html, /question-read-button[\s\S]*Read Question/, q.question_id);
    assert.doesNotMatch(html, />\s*Listen\s*</i, q.question_id);
  }
});
