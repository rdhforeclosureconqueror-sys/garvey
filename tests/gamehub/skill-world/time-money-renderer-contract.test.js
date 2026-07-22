const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const Registry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const Renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const shellPackage = JSON.parse(fs.readFileSync(path.join(root, 'public/gamehub/skill-world/content/G2M_MD_002.skill-package.v1.json')));

function paths(question) {
  return [Registry.render(question), Renderer.renderQuestionCard(question, 'practice', Renderer.createState(), shellPackage)];
}
function visual(html, renderer) {
  const start = html.indexOf(`data-renderer="${renderer}"`);
  assert.notEqual(start, -1);
  const outer = html.lastIndexOf('<div class="visual-model', start);
  const end = html.indexOf('</div><div class="answer-panel">', start);
  return end < 0 ? html : html.slice(outer, end + 6);
}
function assertClockSafe(html, answer) {
  const model = visual(html, 'analog_clock');
  assert.match(model, /data-render-status="complete"/);
  assert.match(model, /Read the time shown on the clock/);
  assert.match(model, /long minute hand points/);
  assert.match(model, /short hour hand (?:is|at)/);
  assert.doesNotMatch(model, new RegExp(`(?:showing|for|time:)\\s*${answer.replace(':', '\\:')}`, 'i'));
  assert.doesNotMatch(model, new RegExp(`<strong>${answer.replace(':', '\\:')}</strong>`, 'i'));
  assert.equal((model.match(/class="clock-number/g) || []).length, 12);
}

for (const [name, hour, minute, answer, hourAngle] of [
  ['whole hour', 4, 0, '4:00', 120],
  ['half hour', 7, 30, '7:30', 225],
  ['five-minute interval', 2, 25, '2:25', 72.5],
]) test(`analog clock ${name} is safe through both production paths`, () => {
  for (const html of paths({ visual_model: 'analog_clock', prompt: 'What time?', question_type: 'multiple_choice', choices: [answer], correct_answer: answer, hour, minute })) {
    assertClockSafe(html, answer);
    const model = visual(html, 'analog_clock');
    assert.match(model, new RegExp(`hour-hand" style="transform:rotate\\(${hourAngle}deg\\)`));
    assert.match(model, new RegExp(`minute-hand" style="transform:rotate\\(${minute * 6}deg\\)`));
    if (minute) assert.match(model, new RegExp(`short hour hand is between ${hour} and ${hour + 1}`));
  }
});

for (const [name, fixture, reason] of [
  ['invalid hour', { hour: 13, minute: 0 }, /hour must be an integer/],
  ['invalid minute', { hour: 2, minute: 60 }, /minute must be an integer/],
  ['malformed metadata', { hour: 'noon', minute: [] }, /hour must be an integer/],
]) test(`analog clock rejects ${name}`, () => paths({ visual_model: 'analog_clock', ...fixture }).forEach((html) => {
  assert.match(visual(html, 'analog_clock'), /data-render-status="invalid"/);
  assert.match(visual(html, 'analog_clock'), reason);
}));

test('explicit and legacy known-time illustration modes retain authored labels', () => {
  for (const fixture of [{ hour: 9, minute: 5, presentation_mode: 'known_time_illustration' }, { time: '9:05' }]) {
    for (const html of paths({ visual_model: 'analog_clock', ...fixture })) {
      const model = visual(html, 'analog_clock');
      assert.match(model, /data-presentation-mode="known_time_illustration"/);
      assert.match(model, /Known time: <strong>9:05<\/strong>/);
    }
  }
});

function assertMoneySafe(html, expectedCoins) {
  const model = visual(html, 'money_counting');
  assert.match(model, /data-render-status="complete"/);
  assert.match(model, /Count the total value of the coins shown/);
  assert.equal((model.match(/class="pattern-token coin-token"/g) || []).length, expectedCoins);
  assert.doesNotMatch(model, /Total shown|running|→|cumulative/i);
}
for (const [name, coins, labels] of [
  ['identical coins', ['dime', 'dime', 'dime'], ['10¢']],
  ['mixed coins', ['quarter', 'dime', 'penny'], ['25¢', '10¢', '1¢']],
  ['single-coin identification', ['nickel'], ['5¢']],
  ['dollars and cents', [{ denomination: 'dollar', count: 1 }, { denomination: 'quarter', count: 2 }], ['$1', '25¢']],
]) test(`money counting supports ${name} through both production paths`, () => paths({ visual_model: 'money_counting', prompt: 'How much?', coins }).forEach((html) => {
  assertMoneySafe(html, coins.reduce((n, c) => n + (typeof c === 'string' ? 1 : c.count), 0));
  for (const label of labels) assert.match(visual(html, 'money_counting'), new RegExp(label.replace('$', '\\$')));
}));

for (const [name, fixture, reason] of [
  ['missing denomination', { coins: [{ count: 2 }] }, /missing denomination/],
  ['unsupported denomination', { coins: ['euro'] }, /unsupported denomination/],
  ['negative count', { coins: [{ denomination: 'dime', count: -1 }] }, /nonnegative integer/],
  ['fractional count', { coins: [{ denomination: 'dime', count: 1.5 }] }, /nonnegative integer/],
  ['malformed arrays', { coins: 'dime' }, /coins must be an array/],
  ['malformed array entries', { coins: [[]] }, /each coin must/],
  ['conflicting totals', { coins: ['quarter'], total_cents: 30 }, /conflicts with the displayed coins/],
]) test(`money counting rejects ${name}`, () => paths({ visual_model: 'money_counting', ...fixture }).forEach((html) => {
  const model = visual(html, 'money_counting');
  assert.match(model, /data-render-status="invalid"/);
  assert.match(model, reason);
  assert.doesNotMatch(model, /Total shown/);
}));

test('Assessment MVP clock payload and browser rendering remove authored digital-time accessibility leaks', () => {
  const Selector = require(path.join(root, 'assessment-mvp/selectAssessmentItems.js'));
  const App = require(path.join(root, 'public/assessment-mvp/app.js'));
  const stimulus = Selector.publicStimulusFor({ visual_model: 'analog_clock', hour: 5, minute: 30, prompt: 'What time?', question_type: 'multiple_choice' }, 'G1M_MD_TIME_001');
  assert.match(stimulus.accessibility_text, /long minute hand points at 6/);
  assert.doesNotMatch(stimulus.accessibility_text, /5:30/);
  const html = App.renderStimulus({ payload: { stimulus: { ...stimulus, accessibility_text: 'Analog clock showing 5:30' } } });
  assert.match(html, /long minute hand points at 6/);
  assert.doesNotMatch(html, /5:30|Analog clock showing/);
});

test('every canonical activity selecting either renderer is safe through both production paths', () => {
  const contentDir = path.join(root, 'public/gamehub/skill-world/content');
  const files = fs.readdirSync(contentDir).filter((name) => name.endsWith('.skill-package.v1.json'));
  const activities = [];
  function visit(value, file) {
    if (Array.isArray(value)) return value.forEach((item) => visit(item, file));
    if (!value || typeof value !== 'object') return;
    if ((value.visual_model === 'analog_clock' || value.visual_model === 'money_counting') && (value.question_id || value.id)) activities.push([file, value]);
    Object.values(value).forEach((item) => visit(item, file));
  }
  files.forEach((file) => visit(JSON.parse(fs.readFileSync(path.join(contentDir, file))), file));
  assert.ok(activities.length > 100);
  for (const [file, question] of activities) for (const html of paths(question)) {
    const model = visual(html, question.visual_model);
    assert.match(model, /data-render-status="complete"/, `${file}: ${question.id || question.question_id}`);
    if (question.visual_model === 'analog_clock' && question.hour !== undefined) assertClockSafe(html, `${question.hour}:${String(question.minute).padStart(2, '0')}`);
    if (question.visual_model === 'money_counting') assertMoneySafe(html, question.coins.length);
  }
});
