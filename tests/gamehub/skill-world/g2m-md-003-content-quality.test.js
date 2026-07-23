const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2M_MD_003.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const Registry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const banks = pkg.level_banks;
const questions = banks.flatMap((bank) => bank.questions);
const signature = (q) => q.values ? `title:${q.graph_title}:values:${q.values.join(',')}` : `title:${q.graph_title}:data:${JSON.stringify(q.data)}:scale:${q.scale || 1}`;

test('canonical package identity, production schema, banks, counts, and IDs are exact', () => {
  assert.equal(pkg.skill_id, 'G2M_MD_003');
  assert.equal(pkg.metadata.source_plan, 'curriculum-framework/plans/grade2-math-completion-plan.v1.json');
  assert.deepEqual(banks.map((b) => b.level_id), ['G2M_MD_003_LVL1','G2M_MD_003_LVL2','G2M_MD_003_LVL3','G2M_MD_003_LVL4','G2M_MD_003_MIXED']);
  assert.deepEqual(banks.map((b) => b.questions.length), [10,10,10,10,10]);
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map((q) => q.id)).size, 50);
  questions.forEach((q) => assert.equal(q.id, q.question_id));
  const result = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('all authored graph mathematics, answers, metadata, and mirrored previews agree', () => {
  for (const q of questions) {
    assert.equal(q.answer, q.correct_answer, `${q.id}: answer fields`);
    if (q.values) {
      assert.ok(q.values.every(Number.isInteger), `${q.id}: integer measurements`);
      assert.equal(q.min, Math.min(...q.values), `${q.id}: min`);
      assert.equal(q.max, Math.max(...q.values), `${q.id}: max`);
    } else {
      assert.equal(Object.keys(q.data).length, 3, `${q.id}: categories`);
      assert.ok(Object.values(q.data).every((n) => Number.isInteger(n) && n >= 0), `${q.id}: counts`);
      if (q.visual_model === 'picture_graph') assert.ok(Object.values(q.data).every((n) => n % q.scale === 0), `${q.id}: complete symbols`);
    }
    assert.ok(Renderer.evaluateAnswer(q, q.correct_answer), `${q.id}: canonical evaluates`);
    assert.equal(Renderer.evaluateAnswer(q, '__unrelated__'), false, `${q.id}: unrelated answer rejected`);
  }
  assert.deepEqual(pkg.guided_practice, banks[0].questions.slice(0, 3));
  assert.deepEqual(pkg.adaptive_question_bank, [...banks[1].questions.slice(0,2), ...banks[2].questions.slice(0,2), ...banks[3].questions.slice(0,2)]);
  assert.deepEqual(pkg.checkpoint, banks[4].questions.slice(0,3));
});

test('every activity has clear unique teaching, accessibility, and complete Read Question context', () => {
  assert.equal(new Set(questions.map((q) => q.prompt.toLowerCase())).size, 50, 'unique prompts');
  assert.equal(new Set(questions.map(signature)).size, 50, 'unique data/visual arrangements');
  assert.equal(new Set(questions.map((q) => q.hints.join('\n'))).size, 50, 'unique hint ladders');
  for (const q of questions) {
    assert.equal(q.hints.length, 3, `${q.id}: three hints`);
    ['Focus:', 'Strategy:', 'Verify:'].forEach((label, i) => assert.ok(q.hints[i].startsWith(label), `${q.id}: ${label}`));
    assert.match(q.explanation, /subtract|adding|count|comparing|groups|row|stack|rightmost|greatest|difference|gives|therefore/i, `${q.id}: reasoning`);
    for (const field of ['visual_description','accessible_description']) assert.ok(q[field].length > 70, `${q.id}: ${field}`);
    assert.equal(q.question_audio.label, 'Read Question');
    assert.ok(q.question_audio.text.startsWith(q.prompt), `${q.id}: complete prompt in audio`);
    assert.ok(q.question_audio.text.includes(q.accessible_description), `${q.id}: visual audio context`);
    assert.doesNotMatch(q.accessible_description, new RegExp(`(?:answer|equals|total is)\\s*${String(q.correct_answer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'));
  }
});

test('multiple-choice contracts are synchronized, unique, selectable, and position-balanced', () => {
  const choices = questions.filter((q) => q.question_type === 'multiple_choice');
  const positions = choices.map((q) => {
    assert.deepEqual(q.options, q.choices, `${q.id}: option mirrors`);
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.options.includes(q.correct_answer));
    return q.options.indexOf(q.correct_answer);
  });
  assert.deepEqual([...new Set(positions)].sort(), [0,1,2,3]);
});

test('Mixed bank is fresh transfer and requires choosing a previously learned method', () => {
  const focused = banks.slice(0,4).flatMap((b) => b.questions);
  const mixed = banks[4].questions;
  const focusedSignatures = new Set(focused.map(signature));
  const focusedTitles = new Set(focused.map((q) => q.graph_title));
  mixed.forEach((q) => {
    assert.match(q.prompt, /^Choose the useful graph-reading method\./);
    assert.ok(!focusedSignatures.has(signature(q)), `${q.id}: fresh values/arrangement`);
    assert.ok(!focusedTitles.has(q.graph_title), `${q.id}: fresh context`);
    assert.match(q.hints[0], /Decide whether/);
  });
  assert.deepEqual([...new Set(mixed.map((q) => q.visual_model))].sort(), ['bar_graph','data_table','line_plot','picture_graph']);
});

function visualPart(html, model) {
  const at = html.indexOf(`data-renderer="${model}"`);
  assert.ok(at >= 0, `${model}: selected`);
  return html.slice(Math.max(0, html.lastIndexOf('<div class="visual-model', at)), html.indexOf('</div><div class="answer-panel">', at));
}

test('all activities render completely through registry and question card without visual fallback or solution text', () => {
  for (const q of questions) for (const [name, html] of [['registry', Registry.render(q)], ['card', Renderer.renderQuestionCard(q, 'practice', Renderer.createState(), pkg)]]) {
    assert.ok(html.trim(), `${q.id}: ${name} nonblank`);
    const visual = visualPart(html, q.visual_model);
    assert.doesNotMatch(visual, /unsupported visual|visual placeholder|no renderer/i, `${q.id}: ${name}`);
    assert.match(visual, new RegExp(q.graph_title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    if (q.values) assert.equal((visual.match(/<span>×<\/span>/g) || []).length, q.values.length, `${q.id}: every X`);
    else Object.keys(q.data).forEach((label) => assert.match(visual, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
    assert.doesNotMatch(visual, /correct answer|the answer is|therefore the answer/i, `${q.id}: no solution leakage`);
  }
  const whole = Renderer.renderSkillWorld(pkg, { state: Renderer.createState(), failClosed: true });
  assert.ok(whole.html.includes('Practice zone'));
});

test('production evaluation and interaction submission update state once and reject wrong work', () => {
  for (const q of questions) {
    const state = Renderer.createState();
    assert.equal(Renderer.submitAnswer(state, 'practice', q, '__wrong__').correct, false);
    assert.equal(state.attempts, 1);
    assert.equal(state.misconceptionTags.at(-1), q.misconception_tag);
    Renderer.retryAnswer(state, 'practice', q);
    assert.equal(Renderer.submitAnswer(state, 'practice', q, q.correct_answer).correct, true);
    assert.equal(state.attempts, 2);
    assert.equal(state.correct, 1);
  }
});
