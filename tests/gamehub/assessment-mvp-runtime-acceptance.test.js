const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const express = require('express');

const { createAssessmentMvpRouter } = require('../../server/assessmentMvpRoutes');

const root = path.join(__dirname, '..', '..');
const publicRoot = path.join(root, 'public');
const appPath = path.join(root, 'public/assessment-mvp/app.js');
const htmlPath = path.join(root, 'public/assessment-mvp/index.html');
const cssPath = path.join(root, 'public/assessment-mvp/styles.css');

const forbiddenKeyPattern = /^(correct_answer|correctAnswer|acceptable_answers|acceptableAnswers|scoring_key|scoringKey|internal_scoring_records|rubric|partial_credit|answer_key|correct_option|distractor_rationale)$/i;
const forbiddenValuePattern = /private scoring records|source package answers|answer key/i;

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

async function startRuntimeHarness() {
  const app = express();
  app.use(express.json());
  app.use('/assessment-mvp', express.static(path.join(publicRoot, 'assessment-mvp')));
  app.use('/api/assessment-mvp', createAssessmentMvpRouter({ sessionStore: new Map(), requireAuthentication: false }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

function freshApp() {
  delete require.cache[require.resolve(appPath)];
  return require(appPath);
}

function resetApp(app) {
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

function assertNoForbiddenBrowserVisibleData(value, trail = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertNoForbiddenBrowserVisibleData(child, [...trail, String(index)]));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      assert.doesNotMatch(key, forbiddenKeyPattern, `forbidden browser-visible key leaked at ${[...trail, key].join('.')}`);
      assertNoForbiddenBrowserVisibleData(child, [...trail, key]);
    }
    return;
  }
  if (typeof value === 'string') {
    assert.doesNotMatch(value, forbiddenValuePattern, `forbidden browser-visible value leaked at ${trail.join('.')}`);
  }
}

function parseCapturedJsonResponses(captured) {
  return captured
    .filter((entry) => entry.contentType.includes('application/json') && entry.bodyText)
    .map((entry) => ({ ...entry, body: JSON.parse(entry.bodyText) }));
}

async function fetchText(baseUrl, route) {
  const response = await fetch(`${baseUrl}${route}`);
  return { status: response.status, contentType: response.headers.get('content-type') || '', text: await response.text() };
}

test('assessment MVP runtime acceptance covers the focused learner flow, privacy, accessibility, and error states', async () => {
  const { server, baseUrl } = await startRuntimeHarness();
  const nativeFetch = global.fetch;
  const captured = [];
  const consoleMessages = [];
  const originalConsole = { log: console.log, warn: console.warn, error: console.error };

  try {
    console.log = (...args) => consoleMessages.push({ level: 'log', args });
    console.warn = (...args) => consoleMessages.push({ level: 'warn', args });
    console.error = (...args) => consoleMessages.push({ level: 'error', args });

    const page = await fetchText(baseUrl, '/assessment-mvp/');
    assert.equal(page.status, 200);
    assert.match(page.text, /id="assessment-app"/);
    assert.match(page.text, /aria-live="polite"/);

    const script = await fetchText(baseUrl, '/assessment-mvp/app.js');
    assert.equal(script.status, 200);
    assert.match(script.contentType, /javascript/);

    const styles = await fetchText(baseUrl, '/assessment-mvp/styles.css');
    assert.equal(styles.status, 200);
    assert.match(styles.contentType, /css/);

    const directCreate = await nativeFetch(`${baseUrl}/api/assessment-mvp/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ grade: 1, subject: 'Math', itemsPerPackage: 3 }),
    });
    assert.equal(directCreate.status, 201);
    assertNoForbiddenBrowserVisibleData(await directCreate.json());

    const { rootEl, liveEl } = installDom();
    global.fetch = async (url, init) => {
      const absoluteUrl = new URL(url, baseUrl).toString();
      const response = await nativeFetch(absoluteUrl, init);
      const bodyText = await response.clone().text();
      captured.push({
        url: absoluteUrl,
        method: (init && init.method) || 'GET',
        status: response.status,
        contentType: response.headers.get('content-type') || '',
        bodyText,
      });
      return response;
    };

    const app = freshApp();
    resetApp(app);
    app.render();

    assert.match(rootEl.innerHTML, /<select id="grade-select"/);
    assert.match(rootEl.innerHTML, /<select id="subject-select"/);
    assert.match(rootEl.innerHTML, /data-action="start"/);

    await app.startAssessment();
    assert.equal(app.state.view, 'question');
    assert.equal(app.state.grade, '1');
    assert.equal(app.state.subject, 'Math');
    assert.ok(app.state.session.public_items.length > 1);
    assert.match(rootEl.innerHTML, /Question 1 of \d+/);
    assert.equal((rootEl.innerHTML.match(/class="question-card"/g) || []).length, 1);
    assert.match(liveEl.textContent, /Assessment ready/);
    assertNoForbiddenBrowserVisibleData(app.state.session);

    const total = app.state.session.public_items.length;
    for (let index = 0; index < total; index += 1) {
      assert.equal(app.state.index, index);
      assert.match(rootEl.innerHTML, new RegExp(`Question ${index + 1} of ${total}`));
      const item = app.state.session.public_items[index];
      if (item.question_type === 'multiple_choice') {
        assert.ok(item.payload.options.length > 0, `multiple-choice item ${item.item_identity} renders learner options`);
        assert.match(rootEl.innerHTML, /type="radio"/);
        app.updateResponse(item.item_identity, item.payload.options[0]);
      } else {
        assert.match(rootEl.innerHTML, /type="text"/);
        app.updateResponse(item.item_identity, '0');
      }
      if (index < total - 1) {
        app.state.index += 1;
        app.render();
        liveEl.textContent = `Question ${app.state.index + 1} of ${total}.`;
      }
    }

    assert.equal(Object.keys(app.state.responses).length, total);
    await app.submitResponses();
    assert.equal(app.state.view, 'results');
    assert.equal(app.state.result.status, 'completed');
    assert.match(rootEl.innerHTML, /Supportive skill results/);
    assert.match(rootEl.innerHTML, /Recommended next steps|No extra recommendations/);

    const labels = [...rootEl.innerHTML.matchAll(/status-pill [^"]+">([^<]+)</g)].map((match) => match[1]);
    assert.ok(labels.length > 0, 'skill/package evidence rendered');
    for (const label of labels) assert.ok(app.APPROVED_LABELS.includes(label), `${label} is an approved label`);
    assert.doesNotMatch(rootEl.innerHTML, /overall|grade-wide|subject-wide|certified placement|official placement|mastered|failed|behind|diagnosis/i);
    assert.ok(app.state.result.recommendations.length <= 3);
    for (const recommendation of app.state.result.recommendations) {
      assert.equal(recommendation.study_route, `/skill-world/${recommendation.package_id}`);
      assert.equal(recommendation.practice_route, `/skill-world/${recommendation.package_id}/drill`);
    }

    const priorNetworkResult = parseCapturedJsonResponses(captured).find((entry) => entry.url.endsWith('/responses')).body;
    const priorIds = new Set(priorNetworkResult.exposure.item_ids);
    const priorDuplicateKeys = new Set(priorNetworkResult.exposure.duplicate_keys);
    const recheckId = app.state.result.recommendations[0]?.package_id || app.state.result.package_ids[0];
    app.state.selectedRecheck = { [recheckId]: true };
    await app.startReassessment();
    assert.equal(app.state.session.assessment_role, 'reassessment');
    assert.equal(app.state.view, 'question');

    const reassessmentNetwork = parseCapturedJsonResponses(captured).filter((entry) => entry.url.endsWith('/reassessment')).at(-1).body;
    assert.equal(reassessmentNetwork.public_items.some((item) => priorIds.has(item.item_identity)), false);
    assert.equal(reassessmentNetwork.public_items.some((item) => priorDuplicateKeys.has(item.duplicate_key)), false);
    assert.ok(Array.isArray(reassessmentNetwork.insufficient_evidence));
    if (reassessmentNetwork.insufficient_evidence.length) {
      assert.match(JSON.stringify(reassessmentNetwork.insufficient_evidence), /safe_non_repeated_item_count|insufficient_non_repeated_items/);
    }

    for (const jsonEntry of parseCapturedJsonResponses(captured)) assertNoForbiddenBrowserVisibleData(jsonEntry.body);
    assert.equal(consoleMessages.length, 0, 'the learner client does not log full responses, scoring records, answer keys, or runtime errors');

    const html = fs.readFileSync(htmlPath, 'utf8');
    const css = fs.readFileSync(cssPath, 'utf8');
    assert.match(html, /aria-live="polite"/);
    assert.match(css, /:focus-visible/);
    assert.match(css, /min-height: 52px/);
    assert.match(css, /@media \(max-width: 700px\)/);
    assert.match(css, /grid-template-columns: 1fr/);
    assert.match(css, /button, \.route-button \{ width: 100%; \}/);
    assert.match(rootEl.innerHTML, /aria-label="Question \d+ of \d+"/);
    assert.match(rootEl.innerHTML, /type="radio"|type="text"/);

    resetApp(app);
    global.fetch = async () => ({ ok: false, json: async () => ({ message: 'Create session unavailable.' }) });
    await app.startAssessment();
    assert.equal(liveEl.textContent, 'Create session unavailable.');
    assert.match(rootEl.innerHTML, /We need to pause/);

    resetApp(app);
    app.state.session = app.publicSessionOnly({
      session_id: 'amvp_11111111111111111111111111111111',
      assessment_role: 'baseline',
      status: 'in_progress',
      public_items: [{ assessment_item_id: 'pub-unsupported', item_identity: 'PKG::Q', source_package_id: 'PKG', question_type: 'drag_drop', payload: { prompt: 'Move it.', question_type: 'drag_drop' } }],
      package_ids: ['PKG'],
    });
    app.state.view = 'question';
    app.render();
    assert.match(rootEl.innerHTML, /This question type is not ready/);

    resetApp(app);
    app.state.session = app.publicSessionOnly({
      session_id: 'amvp_22222222222222222222222222222222',
      assessment_role: 'baseline',
      status: 'in_progress',
      public_items: [{ assessment_item_id: 'pub-1', item_identity: 'PKG::Q1', source_package_id: 'PKG', question_type: 'short_response', payload: { prompt: 'Type.', question_type: 'short_response' } }],
      package_ids: ['PKG'],
    });
    app.state.view = 'question';
    app.updateResponse('PKG::Q1', 'kept answer');
    global.fetch = async () => ({ ok: false, json: async () => ({ error: 'session_not_found', message: 'This check-in was restarted. Please start a new assessment.' }) });
    await app.submitResponses();
    assert.equal(app.state.responses['PKG::Q1'], 'kept answer');
    assert.match(liveEl.textContent, /restarted|start a new assessment/i);

    resetApp(app);
    app.state.session = app.publicSessionOnly({
      session_id: 'amvp_33333333333333333333333333333333',
      assessment_role: 'baseline',
      status: 'in_progress',
      public_items: [{ assessment_item_id: 'pub-1', item_identity: 'PKG::Q1', source_package_id: 'PKG', question_type: 'short_response', payload: { prompt: 'Type.', question_type: 'short_response' } }],
      package_ids: ['PKG'],
    });
    app.updateResponse('PKG::Q1', 'same answer');
    let release;
    let submitCalls = 0;
    global.fetch = async () => {
      submitCalls += 1;
      return new Promise((resolve) => {
        release = () => resolve({ ok: false, json: async () => ({ message: 'Submission paused.' }) });
      });
    };
    const firstSubmit = app.submitResponses();
    const secondSubmit = app.submitResponses();
    assert.equal(submitCalls, 1);
    release();
    await Promise.all([firstSubmit, secondSubmit]);
  } finally {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    uninstallDom();
    await closeServer(server);
  }
});
