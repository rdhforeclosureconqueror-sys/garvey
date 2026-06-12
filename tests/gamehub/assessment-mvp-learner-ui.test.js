const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const appPath = path.join(root, 'public/assessment-mvp/app.js');
const htmlPath = path.join(root, 'public/assessment-mvp/index.html');
const cssPath = path.join(root, 'public/assessment-mvp/styles.css');

function freshApp() {
  delete require.cache[require.resolve(appPath)];
  return require(appPath);
}

function reset(app) {
  Object.assign(app.state, {
    view: 'setup',
    grade: '1',
    subject: 'Math',
    session: null,
    result: null,
    index: 0,
    responses: {},
    busy: false,
    message: '',
    selectedRecheck: {},
  });
}

function installDom() {
  const rootEl = {
    html: '',
    attributes: {},
    listeners: {},
    set innerHTML(value) { this.html = value; },
    get innerHTML() { return this.html; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, fn) { this.listeners[type] = fn; },
  };
  const liveEl = { textContent: '' };
  global.document = {
    readyState: 'complete',
    getElementById(id) {
      if (id === 'assessment-app') return rootEl;
      if (id === 'assessment-status') return liveEl;
      return null;
    },
    addEventListener() {},
  };
  global.window = {};
  return { rootEl, liveEl };
}

function uninstallDom() {
  delete global.document;
  delete global.window;
  delete global.fetch;
}

const publicItems = [
  {
    assessment_item_id: 'pub-1',
    item_identity: 'PKG_A::bank::Q1',
    source_package_id: 'PKG_A',
    question_type: 'multiple_choice',
    payload: { prompt: 'Pick one.', question_type: 'multiple_choice', options: ['A', 'B'], correct_answer: 'A' },
    internal_scoring_records: [{ secret: true }],
  },
  {
    assessment_item_id: 'pub-2',
    item_identity: 'PKG_B::bank::Q2',
    source_package_id: 'PKG_B',
    question_type: 'short_response',
    payload: { prompt: 'Type one.', question_type: 'short_response', acceptable_answers: ['cat'] },
  },
];

function sessionPayload(extra = {}) {
  return {
    session_id: 'amvp_11111111111111111111111111111111',
    assessment_role: 'baseline',
    grade: 4,
    subject: 'English',
    status: 'in_progress',
    public_items: publicItems,
    package_ids: ['PKG_A', 'PKG_B'],
    exposure: { item_ids: ['PKG_A::bank::Q1', 'PKG_B::bank::Q2'], duplicate_keys: ['d1', 'd2'] },
    correct_answer: 'private',
    scoring_rubric: 'private',
    ...extra,
  };
}

function resultPayload(extra = {}) {
  return {
    session_id: 'amvp_11111111111111111111111111111111',
    assessment_role: 'baseline',
    status: 'completed',
    package_ids: ['PKG_A', 'PKG_B'],
    skill_evidence: [
      { source_package_id: 'PKG_A', skill_id: 'PKG_A', skill: 'Skill A', provisional_label: 'Ready' },
      { source_package_id: 'PKG_B', skill_id: 'PKG_B', skill: 'Skill B', provisional_label: 'Developing' },
      { source_package_id: 'PKG_C', skill_id: 'PKG_C', skill: 'Skill C', provisional_label: 'Needs Support' },
      { source_package_id: 'PKG_D', skill_id: 'PKG_D', skill: 'Skill D', provisional_label: 'Not Enough Evidence' },
    ],
    recommendations: [
      { package_id: 'PKG_B', skill: 'Skill B', reason: 'Practice can help.', study_route: '/from-api/study-b', practice_route: '/from-api/practice-b' },
      { package_id: 'PKG_C', skill: 'Skill C', reason: 'Try a support step.', study_route: '/from-api/study-c', practice_route: '/from-api/practice-c' },
      { package_id: 'PKG_D', skill: 'Skill D', reason: 'Gather more evidence.', study_route: '/from-api/study-d', practice_route: '/from-api/practice-d' },
      { package_id: 'PKG_E', skill: 'Skill E', reason: 'Fourth item should not render.', study_route: '/from-api/study-e', practice_route: '/from-api/practice-e' },
    ],
    exposure: { item_ids: ['PKG_A::bank::Q1'], duplicate_keys: ['d1'] },
    ...extra,
  };
}

test('assessment MVP learner route files exist and expose the expected route shell', () => {
  assert.equal(fs.existsSync(htmlPath), true);
  assert.equal(fs.existsSync(appPath), true);
  assert.equal(fs.existsSync(cssPath), true);
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.match(html, /id="assessment-app"/);
  assert.match(html, /\/assessment-mvp\/app\.js/);
  assert.match(html, /aria-live="polite"/);
});

test('grade and subject can be selected and Start Assessment calls the create-session endpoint', async () => {
  installDom();
  const app = freshApp();
  reset(app);
  app.state.grade = '6';
  app.state.subject = 'English';
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: true, json: async () => sessionPayload() };
  };

  await app.startAssessment();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/assessment-mvp/sessions');
  assert.deepEqual(calls[0].body, { grade: 6, subject: 'English', itemsPerPackage: 3 });
  assert.equal(app.state.session.public_items.length, 2);
  uninstallDom();
});

test('only public session fields are consumed and protected fields are not retained', () => {
  const app = freshApp();
  const publicSession = app.publicSessionOnly(sessionPayload());
  const serialized = JSON.stringify(publicSession);
  assert.equal(publicSession.public_items[0].payload.prompt, 'Pick one.');
  assert.deepEqual(publicSession.public_items[0].payload.options, ['A', 'B']);
  assert.doesNotMatch(serialized, /correct_answer|acceptable_answers|internal_scoring_records|rubric|private/i);
});

test('server-style choices are preserved as learner options without exposing answers', () => {
  const app = freshApp();
  const publicSession = app.publicSessionOnly(sessionPayload({
    public_items: [{
      assessment_item_id: 'pub-choice',
      item_identity: 'PKG_A::bank::Q-choice',
      source_package_id: 'PKG_A',
      question_type: 'multiple_choice',
      payload: { prompt: 'Choose a shape.', question_type: 'multiple_choice', choices: ['circle', 'square', 'triangle'], answer: 'circle' },
    }],
  }));

  assert.deepEqual(publicSession.public_items[0].payload.options, ['circle', 'square', 'triangle']);
  assert.doesNotMatch(JSON.stringify(publicSession), /answer|correct|rubric/i);
});

test('one question is shown at a time with accessible progress text', () => {
  installDom();
  const app = freshApp();
  reset(app);
  app.state.session = app.publicSessionOnly(sessionPayload());
  app.state.view = 'question';
  app.render();

  assert.match(document.getElementById('assessment-app').innerHTML, /Question 1 of 2/);
  assert.match(document.getElementById('assessment-app').innerHTML, /Pick one\./);
  assert.doesNotMatch(document.getElementById('assessment-app').innerHTML, /Type one\./);

  app.state.index = 1;
  app.render();
  assert.match(document.getElementById('assessment-app').innerHTML, /Question 2 of 2/);
  assert.match(document.getElementById('assessment-app').innerHTML, /Type one\./);
  assert.doesNotMatch(document.getElementById('assessment-app').innerHTML, /Pick one\./);
  uninstallDom();
});

test('responses are associated with public item identity and submission sends no grade or subject overrides', async () => {
  installDom();
  const app = freshApp();
  reset(app);
  app.state.session = app.publicSessionOnly(sessionPayload());
  app.updateResponse('PKG_A::bank::Q1', 'B');
  app.updateResponse('PKG_B::bank::Q2', 'cat');
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: true, json: async () => resultPayload() };
  };

  await app.submitResponses();

  assert.equal(calls[0].url, '/api/assessment-mvp/sessions/amvp_11111111111111111111111111111111/responses');
  assert.deepEqual(calls[0].body, { responses: { 'PKG_A::bank::Q1': 'B', 'PKG_B::bank::Q2': 'cat' } });
  assert.equal(Object.prototype.hasOwnProperty.call(calls[0].body, 'grade'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(calls[0].body, 'subject'), false);
  uninstallDom();
});

test('the learner client does not perform local outcome calculation and prevents double submission', async () => {
  installDom();
  const app = freshApp();
  reset(app);
  app.state.session = app.publicSessionOnly(sessionPayload());
  app.updateResponse('PKG_A::bank::Q1', 'B');
  app.updateResponse('PKG_B::bank::Q2', 'cat');
  let resolveFetch;
  let count = 0;
  global.fetch = async () => {
    count += 1;
    return new Promise((resolve) => {
      resolveFetch = () => resolve({ ok: true, json: async () => resultPayload() });
    });
  };

  const first = app.submitResponses();
  const second = app.submitResponses();
  assert.equal(count, 1);
  resolveFetch();
  await Promise.all([first, second]);
  assert.deepEqual(app.APPROVED_LABELS, ['Ready', 'Developing', 'Needs Support', 'Not Enough Evidence']);
  uninstallDom();
});

test('results render only approved labels, omit prohibited language, and show no overall mastery label', () => {
  installDom();
  const app = freshApp();
  reset(app);
  app.state.session = app.publicSessionOnly(sessionPayload());
  app.state.result = app.publicResultOnly(resultPayload({
    overall_subject_mastery: 'private',
    overall_grade_mastery: 'private',
  }));
  app.state.view = 'results';
  app.render();
  const html = document.getElementById('assessment-app').innerHTML;

  for (const label of app.APPROVED_LABELS) assert.match(html, new RegExp(label));
  assert.doesNotMatch(html, /overall|certified placement|mastered|failed|behind|diagnosis|official placement/i);
  assert.match(html, /not an official school placement decision/i);
  assert.match(html, /Ready does not mean scientifically certified mastery/i);
  uninstallDom();
});

test('no more than three recommendations render and recommendation routes come from the API', () => {
  installDom();
  const app = freshApp();
  reset(app);
  app.state.session = app.publicSessionOnly(sessionPayload());
  app.state.result = app.publicResultOnly(resultPayload());
  app.state.view = 'results';
  app.render();
  const html = document.getElementById('assessment-app').innerHTML;

  assert.equal((html.match(/Start Skill World/g) || []).length, 3);
  assert.match(html, /\/from-api\/study-b/);
  assert.match(html, /\/from-api\/practice-c/);
  assert.doesNotMatch(html, /\/from-api\/study-e/);
  uninstallDom();
});

test('reassessment calls the correct endpoint and is limited to allowed package IDs', async () => {
  installDom();
  const app = freshApp();
  reset(app);
  app.state.session = app.publicSessionOnly(sessionPayload());
  app.state.result = app.publicResultOnly(resultPayload());
  assert.deepEqual(app.allowedReassessmentIds(), ['PKG_A', 'PKG_B', 'PKG_C', 'PKG_D']);
  app.state.selectedRecheck = { PKG_C: true, UNRELATED: true };
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: true, json: async () => sessionPayload({
      session_id: 'amvp_22222222222222222222222222222222',
      assessment_role: 'reassessment',
      requested_package_ids: ['PKG_C'],
      insufficient_evidence: [{ package_id: 'PKG_C', safe_non_repeated_item_count: 1, reason_code: 'insufficient_non_repeated_items' }],
      public_items: [publicItems[0]],
      package_ids: ['PKG_C'],
    }) };
  };

  await app.startReassessment();

  assert.equal(calls[0].url, '/api/assessment-mvp/sessions/amvp_11111111111111111111111111111111/reassessment');
  assert.deepEqual(calls[0].body, { package_ids: ['PKG_C'], itemsPerPackage: 3 });
  assert.equal(app.state.session.assessment_role, 'reassessment');
  uninstallDom();
});

test('insufficient non-repeated coverage is shown honestly', () => {
  installDom();
  const app = freshApp();
  reset(app);
  app.state.session = app.publicSessionOnly(sessionPayload({
    assessment_role: 'reassessment',
    insufficient_evidence: [{ package_id: 'PKG_C', safe_non_repeated_item_count: 1, reason_code: 'insufficient_non_repeated_items' }],
  }));
  app.state.result = app.publicResultOnly(resultPayload());
  app.state.view = 'reassessment setup';
  app.render();
  const html = document.getElementById('assessment-app').innerHTML;
  assert.match(html, /only 1 safe new question\(s\) are available/i);
  uninstallDom();
});

test('loading and API errors are visible and accessible', async () => {
  installDom();
  const app = freshApp();
  reset(app);
  global.fetch = async () => ({ ok: false, json: async () => ({ message: 'Service is resting.' }) });

  await app.startAssessment();

  assert.equal(document.getElementById('assessment-status').textContent, 'Service is resting.');
  assert.match(document.getElementById('assessment-app').innerHTML, /We need to pause/);
  assert.match(fs.readFileSync(htmlPath, 'utf8'), /aria-live="polite"/);
  uninstallDom();
});

test('answer controls are keyboard-operable form controls with visible focus styles', () => {
  const app = freshApp();
  const choiceHtml = app.renderAnswerControl(app.publicSessionOnly(sessionPayload()).public_items[0], 'multiple_choice', '');
  const shortHtml = app.renderAnswerControl(app.publicSessionOnly(sessionPayload()).public_items[1], 'short_response', '');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.match(choiceHtml, /type="radio"/);
  assert.match(choiceHtml, /<legend>Choose one answer<\/legend>/);
  assert.match(shortHtml, /<label for="short-response">Type your answer<\/label>/);
  assert.match(shortHtml, /type="text"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-height: 52px/);
});

test('client source does not reference protected answer or private evaluation fields', () => {
  const source = fs.readFileSync(appPath, 'utf8');
  assert.doesNotMatch(source, /correct_answer|acceptable_answers|accepted_answers|internal_scoring_records|scoring_rubric|score_key|solution|explanation|rubric/i);
});

test('supported shape stimulus survives learner mapper and renders', () => {
  installDom();
  const app = freshApp();
  reset(app);
  app.state.session = app.publicSessionOnly(sessionPayload({
    public_items: [{
      assessment_item_id: 'shape-1',
      item_identity: 'PKG_SHAPE::bank::Q1',
      source_package_id: 'PKG_SHAPE',
      question_type: 'multiple_choice',
      payload: { prompt: 'What shape is shown?', question_type: 'multiple_choice', choices: ['triangle', 'circle'], stimulus: { type: 'shape', shape: 'triangle' } },
    }],
  }));
  app.state.view = 'question';
  app.render();
  const html = document.getElementById('assessment-app').innerHTML;
  assert.match(html, /shape-triangle/);
  assert.equal(app.hasRenderableStimulus(app.state.session.public_items[0]), true);
  uninstallDom();
});

test('learner UI skips visual-dependent prompts that arrive without stimulus', async () => {
  installDom();
  const app = freshApp();
  reset(app);
  app.state.session = app.publicSessionOnly(sessionPayload({
    public_items: [{
      assessment_item_id: 'bad-1',
      item_identity: 'PKG_BAD::bank::Q1',
      source_package_id: 'PKG_BAD',
      question_type: 'multiple_choice',
      payload: { prompt: 'What time is shown on the clock?', question_type: 'multiple_choice', choices: ['1:00', '2:00'] },
    }],
  }));
  app.state.view = 'question';
  app.render();
  assert.match(document.getElementById('assessment-app').innerHTML, /missing something needed to answer it/i);
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: true, json: async () => resultPayload({ skill_evidence: [{ source_package_id: 'PKG_BAD', skill_id: 'PKG_BAD', provisional_label: 'Not Enough Evidence' }] }) };
  };
  await app.submitResponses();
  assert.deepEqual(calls[0].body.responses['PKG_BAD::bank::Q1'], { invalid_delivery: true });
  uninstallDom();
});
