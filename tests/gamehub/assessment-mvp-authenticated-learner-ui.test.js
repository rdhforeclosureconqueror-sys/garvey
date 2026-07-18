const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const appPath = path.join(root, 'public/assessment-mvp/app.js');
const adaptivePath = path.join(root, 'public/gamehub/adaptive_learning.html');

function freshApp() {
  delete require.cache[require.resolve(appPath)];
  return require(appPath);
}

function installDom(search = '') {
  const rootEl = {
    html: '', attributes: {}, listeners: {},
    set innerHTML(value) { this.html = value; }, get innerHTML() { return this.html; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, fn) { this.listeners[type] = fn; },
  };
  const liveEl = { textContent: '' };
  global.document = {
    readyState: 'complete',
    getElementById(id) { if (id === 'assessment-app') return rootEl; if (id === 'assessment-status') return liveEl; return null; },
    addEventListener() {},
  };
  global.window = { location: { search } };
  return { rootEl, liveEl };
}

function uninstallDom() {
  delete global.document;
  delete global.window;
  delete global.fetch;
}

function reset(app) {
  Object.assign(app.state, {
    view: 'setup', authChecked: true, authenticated: true, authOptional: false,
    children: [], selectedChildId: '', childRequiredMessage: '', grade: '1', subject: 'Math',
    currentSession: null, history: [], historyFilters: { grade: '', subject: '', assessment_role: '', status: '' },
    session: null, result: null, index: 0, responses: {}, busy: false, selectedRecheck: {}, error: '',
  });
}

const childA = { child_id: '101', child_name: 'Maya', child_grade_band: 'Grade 3', metadata: { grade: 3 } };
const childB = { child_id: '202', child_name: 'Noah', child_grade_band: '5-6', metadata: {} };
const session = {
  session_id: 'amvp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', assessment_role: 'baseline', grade: 3, subject: 'Math', status: 'in_progress', current_question_position: 1,
  public_items: [
    { assessment_item_id: 'p1', item_identity: 'PKG::Q1', source_package_id: 'PKG', question_type: 'short_response', payload: { prompt: 'One?', question_type: 'short_response' } },
    { assessment_item_id: 'p2', item_identity: 'PKG::Q2', source_package_id: 'PKG', question_type: 'short_response', payload: { prompt: 'Two?', question_type: 'short_response' } },
  ],
  package_ids: ['PKG'],
};
const completed = {
  session_id: 'amvp_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', assessment_role: 'baseline', grade: 3, subject: 'Math', status: 'completed', package_ids: ['PKG'],
  skill_evidence: [{ source_package_id: 'PKG', skill_id: 'PKG', skill: 'Skill', provisional_label: 'Developing' }],
  recommendations: [
    { package_id: 'PKG', skill: 'Skill', reason: 'API reason', study_route: '/api-study', practice_route: '/api-practice' },
    { package_id: 'PKG2', skill: 'Skill 2', reason: 'API reason', study_route: '/api-study2', practice_route: '/api-practice2' },
    { package_id: 'PKG3', skill: 'Skill 3', reason: 'API reason', study_route: '/api-study3', practice_route: '/api-practice3' },
    { package_id: 'PKG4', skill: 'Skill 4', reason: 'Hidden', study_route: '/api-study4', practice_route: '/api-practice4' },
  ],
};

test('authenticated assessment UI requires sign-in and loads only owned children', async () => {
  installDom();
  const app = freshApp();
  let mode = 'unauth';
  global.fetch = async (url) => {
    if (url === '/api/gates/auth/session' && mode === 'unauth') return { ok: false, status: 401, json: async () => ({ error: 'unauthenticated' }) };
    if (url === '/api/gates/auth/session') return { ok: true, json: async () => ({ authenticated: true }) };
    if (url === '/api/gates/canonical-learners') return { ok: true, json: async () => ({ children: [childA, childB] }) };
    if (String(url).includes('/current-session')) return { ok: false, status: 404, json: async () => ({ error: 'current_session_not_found' }) };
    if (String(url).includes('/history')) return { ok: true, json: async () => ({ sessions: [] }) };
    throw new Error(`unexpected ${url}`);
  };
  await app.initializeAuthenticatedFlow();
  assert.equal(app.state.view, 'sign-in required');
  assert.match(document.getElementById('assessment-app').innerHTML, /Gates Parent Sign In/);

  mode = 'auth';
  await app.initializeAuthenticatedFlow();
  assert.equal(app.state.children.length, 2);
  assert.deepEqual(app.state.children.map((c) => c.child_id), ['101', '202']);
  assert.doesNotMatch(JSON.stringify(app.state.children), /parent_profile|auth_user|learner_id|token/i);
  uninstallDom();
});

test('child selection is required, foreign IDs are rejected, and stored child grade defaults with mismatch note', async () => {
  installDom();
  const app = freshApp();
  reset(app);
  app.state.children = [app.publicChildOnly(childA)];
  app.render();
  await app.startAssessment();
  assert.match(app.state.childRequiredMessage, /Choose a learner/);
  assert.equal(app.selectChild('999'), false);
  assert.equal(app.selectChild('101'), true);
  assert.equal(app.state.grade, '3');
  app.state.grade = '4';
  app.render();
  assert.match(document.getElementById('assessment-app').innerHTML, /profile shows Grade 3, and you chose Grade 4/);
  uninstallDom();
});

test('current session discovery displays resume and resume uses persisted session position without duplicate create', async () => {
  installDom();
  const app = freshApp();
  reset(app);
  app.state.children = [app.publicChildOnly(childA)];
  app.selectChild('101');
  const calls = [];
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', body: init.body && JSON.parse(init.body) });
    if (String(url).includes('/current-session')) return { ok: true, json: async () => session };
    if (String(url).includes('/progress')) return { ok: true, json: async () => ({ ...session, current_question_position: init.body ? JSON.parse(init.body).current_question_position : 1 }) };
    if (String(url).includes('/history')) return { ok: true, json: async () => ({ sessions: [] }) };
    throw new Error(`unexpected ${url}`);
  };
  await app.loadCurrentSession();
  app.render();
  assert.match(document.getElementById('assessment-app').innerHTML, /Resume Assessment/);
  app.startAssessment();
  assert.equal(app.state.session.session_id, session.session_id);
  assert.equal(app.state.index, 1);
  assert.equal(calls.some((c) => c.url.endsWith('/sessions') && c.method === 'POST'), false);
  app.move(-1);
  await new Promise((resolve) => setImmediate(resolve));
  const patch = calls.find((c) => c.url.includes('/progress'));
  assert.equal(patch.method, 'PATCH');
  assert.deepEqual(patch.body, { current_question_position: 0 });
  uninstallDom();
});

test('history loads newest first, filters work, and completed results reload from API', async () => {
  installDom();
  const app = freshApp();
  reset(app);
  app.state.children = [app.publicChildOnly(childA)];
  app.selectChild('101');
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/history')) return { ok: true, json: async () => ({ sessions: [
      { session_id: completed.session_id, assessment_role: 'baseline', grade: 3, subject: 'Math', status: 'completed', completed_at: '2026-02-01T00:00:00Z', package_ids: ['PKG'], evidence_summary: completed.skill_evidence, recommendation_count: 4 },
      { session_id: session.session_id, assessment_role: 'baseline', grade: 3, subject: 'Math', status: 'in_progress', updated_at: '2026-06-01T00:00:00Z', current_question_position: 1, package_ids: ['PKG'], evidence_summary: [], recommendation_count: 0 },
    ] }) };
    if (String(url).endsWith('/' + completed.session_id)) return { ok: true, json: async () => completed };
    throw new Error(`unexpected ${url}`);
  };
  await app.loadHistory();
  assert.equal(app.state.history[0].session_id, session.session_id);
  app.state.historyFilters = { grade: '3', subject: 'Math', assessment_role: 'baseline', status: 'completed' };
  await app.loadHistory();
  assert.match(calls.at(-1), /grade=3&subject=Math&assessment_role=baseline&status=completed/);
  await app.openHistorySession(completed.session_id);
  assert.equal(app.state.view, 'results');
  assert.equal(app.state.result.recommendations.length, 3);
  assert.match(document.getElementById('assessment-app').innerHTML, /\/api-study/);
  assert.doesNotMatch(document.getElementById('assessment-app').innerHTML, /api-study4/);
  uninstallDom();
});

test('reassessment sends only allowed package IDs, omits grade and subject, and resumes existing reassessment', async () => {
  installDom();
  const app = freshApp();
  reset(app);
  app.state.children = [app.publicChildOnly(childA)];
  app.selectChild('101');
  app.state.result = app.publicResultOnly(completed);
  app.state.selectedRecheck = { PKG: true, FOREIGN: true };
  const calls = [];
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', body: init.body && JSON.parse(init.body) });
    if (String(url).includes('/current-session')) return { ok: true, json: async () => ({ ...session, session_id: 'amvp_cccccccccccccccccccccccccccccccc', assessment_role: 'reassessment' }) };
    throw new Error(`unexpected ${url}`);
  };
  await app.startReassessment();
  assert.equal(app.state.session.assessment_role, 'reassessment');
  assert.equal(calls.some((c) => c.url.includes('/reassessment') && c.method === 'POST'), false);

  app.state.result = app.publicResultOnly(completed);
  app.state.session = null;
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', body: init.body && JSON.parse(init.body) });
    if (String(url).includes('/current-session')) return { ok: false, status: 404, json: async () => ({}) };
    if (String(url).includes('/reassessment')) return { ok: true, json: async () => ({ ...session, assessment_role: 'reassessment', insufficient_evidence: [{ package_id: 'PKG', safe_non_repeated_item_count: 1 }] }) };
    throw new Error(`unexpected ${url}`);
  };
  await app.startReassessment();
  const post = calls.filter((c) => c.url.includes('/reassessment') && c.method === 'POST').at(-1);
  assert.deepEqual(post.body, { package_ids: ['PKG'], itemsPerPackage: 3 });
  assert.equal(Object.hasOwn(post.body, 'grade'), false);
  assert.equal(Object.hasOwn(post.body, 'subject'), false);
  app.state.result = app.publicResultOnly(completed);
  app.state.view = 'reassessment setup';
  app.render();
  assert.match(document.getElementById('assessment-app').innerHTML, /only 1 safe new question/);
  uninstallDom();
});

test('query parameters preselect valid grade and subject, ignore invalid values, and do not auto-start', async () => {
  installDom('?grade=6&subject=English');
  const app = freshApp();
  let posted = false;
  global.fetch = async (url) => {
    if (url === '/api/gates/auth/session') return { ok: true, json: async () => ({ authenticated: true }) };
    if (url === '/api/gates/canonical-learners') return { ok: true, json: async () => ({ children: [childA] }) };
    if (String(url).includes('/current-session')) return { ok: false, status: 404, json: async () => ({}) };
    if (String(url).includes('/history')) return { ok: true, json: async () => ({ sessions: [] }) };
    posted = true; return { ok: true, json: async () => session };
  };
  await app.initializeAuthenticatedFlow();
  assert.equal(app.state.grade, '6');
  assert.equal(app.state.subject, 'English');
  assert.equal(posted, false);
  uninstallDom();

  installDom('?grade=9&subject=Science');
  const app2 = freshApp();
  global.fetch = async (url) => {
    if (url === '/api/gates/auth/session') return { ok: true, json: async () => ({ authenticated: true }) };
    if (url === '/api/gates/canonical-learners') return { ok: true, json: async () => ({ children: [childA] }) };
    if (String(url).includes('/current-session')) return { ok: false, status: 404, json: async () => ({}) };
    if (String(url).includes('/history')) return { ok: true, json: async () => ({ sessions: [] }) };
    throw new Error(`unexpected ${url}`);
  };
  await app2.initializeAuthenticatedFlow();
  assert.equal(app2.state.grade, '3');
  assert.equal(app2.state.subject, 'Math');
  uninstallDom();
});

test('adaptive learning page exposes assessment button and grade/subject lesson practice browsing links', () => {
  const html = fs.readFileSync(adaptivePath, 'utf8');
  assert.match(html, /Take an Adaptive Assessment/);
  assert.match(html, /href="\/assessment-mvp"/);
  for (const grade of [1, 2, 3, 4, 5, 6]) assert.match(html, new RegExp(`data-browse-grade="${grade}"`));
  assert.match(html, /data-browse-subject="Math"/);
  assert.match(html, /data-browse-subject="English"/);
  assert.match(html, /Lessons/);
  assert.match(html, /Practice Skills/);
  assert.match(html, /\/skill-world\/'\+id/);
  assert.match(html, /\/skill-world\/'\+id\+'\/drill/);
  assert.match(html, /\/assessment-mvp\?grade=/);
});

test('assessment client source does not retain protected ownership or scoring fields', () => {
  const source = fs.readFileSync(appPath, 'utf8');
  assert.doesNotMatch(source, /parent_profile_id|auth_user_id|learner_id|token_hash|session_token|correct_answer|acceptable_answers|scoring_key|rubric/i);
});
