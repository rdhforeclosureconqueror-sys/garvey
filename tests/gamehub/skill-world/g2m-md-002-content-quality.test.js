const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const packagePath = path.join(root, 'public/gamehub/skill-world/content/G2M_MD_002.skill-package.v1.json');
const Schema = require(path.join(root, 'public/gamehub/skill-world/engine/skill-package-schema.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const VisualRegistry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const questions = pkg.level_banks.flatMap((bank) => bank.questions);

test('selected canonical package has the expected identity, schema, counts, and IDs', () => {
  assert.equal(pkg.skill_id, 'G2M_MD_002');
  assert.deepEqual(pkg.level_banks.map((bank) => bank.questions.length), [10, 10, 10, 10, 10]);
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map((question) => question.question_id)).size, 50);
  questions.forEach((question) => assert.equal(question.id, question.question_id));
  const validation = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(validation.valid, true, validation.errors.join('; '));
});

test('production renderers do not print answers while asking learners to read clocks or count money', () => {
  const answerLeaks = [];
  const tasks = questions.filter((question) =>
    (question.visual_model === 'analog_clock' && /what time is shown/i.test(question.prompt)) ||
    (question.visual_model === 'money_counting' && /how much/i.test(question.prompt))
  );

  tasks.forEach((question) => {
    const escapedAnswer = String(question.correct_answer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const answerPattern = question.visual_model === 'analog_clock'
      ? new RegExp(`<strong>\\s*${escapedAnswer}\\s*</strong>`, 'i')
      : new RegExp(`Total shown:\\s*${escapedAnswer}\\s*cents`, 'i');
    for (const [renderPath, html] of [
      ['visual registry', VisualRegistry.render(question)],
      ['question card', Renderer.renderQuestionCard(question, 'practice', Renderer.createState(), pkg)],
    ]) {
      assert.ok(html.trim(), `${question.question_id}: ${renderPath} output is blank`);
      assert.match(html, new RegExp(`data-renderer="${question.visual_model}"`), `${question.question_id}: ${renderPath}`);
      if (answerPattern.test(html)) answerLeaks.push(`${question.question_id} via ${renderPath}`);
    }
  });

  assert.deepEqual(answerLeaks, [], `answer leakage from shared production renderers: ${answerLeaks.join(', ')}`);
});

const coinCents = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
const canonicalBanks = pkg.level_banks;

function visualSlice(html, renderer) {
  const start = html.indexOf(`data-renderer="${renderer}"`);
  assert.notEqual(start, -1, `${renderer}: renderer was not selected`);
  const outer = html.lastIndexOf('<div class="visual-model', start);
  const end = html.indexOf('</div><div class="answer-panel">', start);
  return end < 0 ? html.slice(outer) : html.slice(outer, end + 6);
}

test('all 50 activities have complete, answer-safe accessibility and unique teaching', () => {
  assert.equal(new Set(questions.map(({ prompt }) => prompt.trim().toLowerCase())).size, 50);
  const hintLadders = [];
  questions.forEach((question) => {
    assert.equal(typeof question.visual_description, 'string', `${question.id}: visual_description`);
    assert.ok(question.visual_description.length > 20, `${question.id}: visual_description is meaningful`);
    assert.equal(typeof question.accessible_description, 'string', `${question.id}: accessible_description`);
    assert.ok(question.accessible_description.length > 20, `${question.id}: accessible_description is meaningful`);
    assert.equal(question.question_audio?.label, 'Read Question', `${question.id}: audio label`);
    assert.ok(question.question_audio.text.startsWith(question.prompt), `${question.id}: audio includes complete prompt`);
    assert.ok(question.question_audio.text.includes(question.accessible_description), `${question.id}: audio includes visual context`);
    assert.equal(question.hints.length, 3, `${question.id}: exactly three hints`);
    ['Focus:', 'Strategy:', 'Verify:'].forEach((label, index) => assert.ok(question.hints[index].startsWith(label), `${question.id}: ${label}`));
    hintLadders.push(question.hints.join('\n'));
    assert.match(question.explanation, /because|so|therefore|gives|make|sum|worth|measure|since|adding|represents/i, `${question.id}: reasoning explanation`);
  });
  assert.equal(new Set(hintLadders).size, 50, 'every activity has a distinct hint ladder');
});

test('clock metadata, accepted formats, geometry, and both production paths agree for every clock', () => {
  questions.filter(({ visual_model }) => visual_model === 'analog_clock').forEach((question) => {
    assert.ok(Number.isInteger(question.hour) && question.hour >= 1 && question.hour <= 12, `${question.id}: hour`);
    assert.ok(Number.isInteger(question.minute) && question.minute >= 0 && question.minute < 60 && question.minute % 5 === 0, `${question.id}: minute`);
    const base = `${question.hour}:${String(question.minute).padStart(2, '0')}`;
    assert.ok(question.correct_answer.startsWith(base), `${question.id}: authored answer`);
    assert.ok(question.acceptable_answers.some((answer) => answer.startsWith(base)), `${question.id}: colon format`);
    assert.ok(question.acceptable_answers.some((answer) => answer.startsWith(base.replace(':', ' '))), `${question.id}: punctuation variant`);
    for (const html of [VisualRegistry.render(question), Renderer.renderQuestionCard(question, 'practice', Renderer.createState(), pkg)]) {
      const visual = visualSlice(html, 'analog_clock');
      assert.match(visual, /data-render-status="complete"/);
      assert.equal((visual.match(/class="clock-number/g) || []).length, 12, `${question.id}: numerals`);
      assert.match(visual, /class="clock-face"/, `${question.id}: clock face and CSS tick geometry`);
      assert.match(visual, new RegExp(`minute-hand" style="transform:rotate\\(${question.minute * 6}deg\\)`));
      assert.match(visual, new RegExp(`hour-hand" style="transform:rotate\\(${(question.hour % 12) * 30 + question.minute * 0.5}deg\\)`));
      assert.doesNotMatch(visual, new RegExp(`<strong>\\s*${base.replace(':', '\\:')}\\s*</strong>`, 'i'));
    }
  });
});

test('money metadata and both production paths preserve every authored coin without totals', () => {
  questions.filter(({ visual_model }) => visual_model === 'money_counting').forEach((question) => {
    const computed = question.coins.reduce((sum, coin) => sum + coinCents[coin], 0);
    assert.equal(question.total_cents, computed, `${question.id}: total_cents`);
    if (/how many cents/i.test(question.prompt)) assert.equal(Number(question.correct_answer), computed, `${question.id}: answer total`);
    for (const html of [VisualRegistry.render(question), Renderer.renderQuestionCard(question, 'practice', Renderer.createState(), pkg)]) {
      const visual = visualSlice(html, 'money_counting');
      assert.match(visual, /data-render-status="complete"/);
      assert.equal((visual.match(/class="pattern-token coin-token"/g) || []).length, question.coins.length, `${question.id}: coin count`);
      assert.doesNotMatch(visual, /Total shown|running|cumulative|final total|→/i, `${question.id}: no aggregate leakage`);
      let cursor = -1;
      question.coins.forEach((coin) => {
        const next = visual.indexOf(`<small>${coin}</small>`, cursor + 1);
        assert.ok(next > cursor, `${question.id}: preserves ${coin} order`);
        cursor = next;
      });
    }
  });
});

test('multiple-choice contracts and Mixed transfer bank are publication quality', () => {
  const positions = [];
  questions.filter(({ question_type }) => question_type === 'multiple_choice').forEach((question) => {
    assert.deepEqual(question.options, question.choices, `${question.id}: options and choices`);
    assert.equal(question.options.length, 4, `${question.id}: four choices`);
    assert.equal(new Set(question.options).size, 4, `${question.id}: unique choices`);
    const position = question.options.indexOf(question.correct_answer);
    assert.ok(position >= 0, `${question.id}: correct answer is selectable`);
    positions.push(position);
  });
  assert.deepEqual([...new Set(positions)].sort(), [0, 1, 2, 3], 'correct positions are balanced');
  const mixed = canonicalBanks[4].questions;
  const focused = canonicalBanks.slice(0, 4).flatMap(({ questions }) => questions);
  const focusedTimes = new Set(focused.filter((q) => q.hour).map((q) => `${q.hour}:${q.minute}`));
  const focusedCoins = new Set(focused.filter((q) => q.coins?.length > 1).map((q) => q.coins.join(',')));
  mixed.filter((q) => q.hour).forEach((q) => assert.ok(!focusedTimes.has(`${q.hour}:${q.minute}`), `${q.id}: new clock time`));
  mixed.filter((q) => q.coins?.length > 1).forEach((q) => assert.ok(!focusedCoins.has(q.coins.join(',')), `${q.id}: new coin arrangement`));
  assert.ok(mixed.some((q) => /unit/i.test(q.prompt)), 'Mixed selects a unit');
  assert.ok(mixed.some((q) => /greater than/i.test(q.prompt)), 'Mixed compares money');
  assert.ok(mixed.some((q) => /Can she buy/i.test(q.prompt)), 'Mixed makes a purchase decision');
});

test('Assessment MVP safely presents every canonical clock and money activity it routes', () => {
  const Selector = require(path.join(root, 'assessment-mvp/selectAssessmentItems.js'));
  const App = require(path.join(root, 'public/assessment-mvp/app.js'));
  questions.filter((q) => ['analog_clock', 'money_counting'].includes(q.visual_model)).forEach((question) => {
    const stimulus = Selector.publicStimulusFor(question, pkg.skill_id);
    if (!stimulus) return; // Activities without an Assessment MVP stimulus are not routed through this path.
    const html = App.renderStimulus({ payload: { stimulus } });
    assert.ok(html.trim(), `${question.id}: Assessment MVP is nonblank`);
    assert.doesNotMatch(html, /unsupported|placeholder|fallback|Total shown|cumulative|running total/i, `${question.id}: Assessment MVP production output`);
    if (question.visual_model === 'analog_clock') assert.doesNotMatch(html, new RegExp(question.correct_answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    if (question.visual_model === 'money_counting') assert.doesNotMatch(html, new RegExp(`(?:total|altogether)\\D{0,8}${question.total_cents}`, 'i'));
  });
});
