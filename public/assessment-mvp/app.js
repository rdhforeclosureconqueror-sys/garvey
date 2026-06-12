(function () {
  'use strict';

  const API_ROOT = '/api/assessment-mvp';
  const GATES_SESSION_URL = '/api/gates/auth/session';
  const GATES_CHILDREN_URL = '/api/gates/children';
  const GATES_SIGNIN_URL = '/gates/signup';
  const ITEMS_PER_PACKAGE = 3;
  const GRADES = ['1', '2', '3', '4', '5', '6'];
  const SUBJECTS = ['Math', 'English'];
  const ROLES = ['baseline', 'reassessment'];
  const STATUSES = ['in_progress', 'completed', 'abandoned', 'expired'];
  const APPROVED_LABELS = ['Ready', 'Developing', 'Needs Support', 'Not Enough Evidence'];
  const LABEL_CLASS = {
    Ready: 'ready',
    Developing: 'developing',
    'Needs Support': 'needs-support',
    'Not Enough Evidence': 'not-enough-evidence',
  };
  const SUPPORTED_ITEM_TYPES = ['multiple_choice', 'short_response'];
  const INVALID_DELIVERY_RESPONSE = { invalid_delivery: true };
  const SUPPORT_TEXT = {
    Ready: 'You look ready to keep building with this skill.',
    Developing: 'You are growing this skill. A little practice can help.',
    'Needs Support': 'This skill could use friendly practice and support.',
    'Not Enough Evidence': 'There was not enough information yet. Try a few more questions later.',
  };
  const DEFAULT_LIMITATIONS = [
    'Results are provisional instructional guidance.',
    'Results are not an official school placement decision.',
    'Ready does not mean scientifically certified mastery.',
  ];

  const initialState = {
    view: 'auth loading',
    authChecked: false,
    authenticated: false,
    authOptional: false,
    childrenLoading: false,
    children: [],
    selectedChildId: '',
    childRequiredMessage: '',
    grade: '1',
    subject: 'Math',
    queryGrade: '',
    querySubject: '',
    currentSession: null,
    currentLoading: false,
    history: [],
    historyLoading: false,
    historyFilters: { grade: '', subject: '', assessment_role: '', status: '' },
    session: null,
    result: null,
    index: 0,
    responses: {},
    busy: false,
    message: '',
    selectedRecheck: {},
    error: '',
  };

  const state = { ...initialState, historyFilters: { ...initialState.historyFilters } };

  function text(value) {
    return String(value === undefined || value === null ? '' : value);
  }

  function escapeHtml(value) {
    return text(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeJson(value) {
    return JSON.stringify(value || {});
  }

  function isValidGrade(value) {
    return GRADES.includes(text(value));
  }

  function isValidSubject(value) {
    return SUBJECTS.includes(text(value));
  }

  function parseQuery() {
    if (typeof window === 'undefined' || !window.location) return;
    const params = new URLSearchParams(window.location.search || '');
    const grade = params.get('grade');
    const subject = params.get('subject');
    if (isValidGrade(grade)) {
      state.grade = text(grade);
      state.queryGrade = text(grade);
    }
    if (isValidSubject(subject)) {
      state.subject = text(subject);
      state.querySubject = text(subject);
    }
  }

  function normalizeStoredGrade(child) {
    const candidates = [child && child.child_grade_band, child && child.stored_grade_band, child && child.grade, child && child.metadata && child.metadata.grade, child && child.metadata && child.metadata.grade_band];
    for (const candidate of candidates) {
      const raw = text(candidate).trim();
      const exact = raw.match(/^[1-6]$/);
      if (exact) return exact[0];
      const named = raw.match(/grade\s*([1-6])\b/i);
      if (named) return named[1];
      const range = raw.match(/\b([1-6])\s*[-–]\s*([1-6])\b/);
      if (range) return range[1];
    }
    return '';
  }

  function selectedChild() {
    return state.children.find((child) => child.child_id === state.selectedChildId) || null;
  }

  function publicChildOnly(child) {
    return {
      child_id: text(child && child.child_id),
      child_name: text(child && child.child_name) || 'Learner',
      child_grade_band: text(child && child.child_grade_band),
      stored_grade: normalizeStoredGrade(child),
    };
  }

  function publicSessionOnly(payload) {
    const items = Array.isArray(payload && payload.public_items) ? payload.public_items.map(publicItemOnly) : [];
    return {
      session_id: text(payload && payload.session_id),
      assessment_role: text(payload && payload.assessment_role) || 'baseline',
      grade: payload && payload.grade,
      subject: text(payload && payload.subject),
      status: text(payload && payload.status),
      resumed: Boolean(payload && payload.resumed),
      current_question_position: Math.max(0, Number(payload && payload.current_question_position) || 0),
      public_items: items,
      package_ids: Array.isArray(payload && payload.package_ids) ? payload.package_ids.map(text) : [],
      requested_package_ids: Array.isArray(payload && payload.requested_package_ids) ? payload.requested_package_ids.map(text) : [],
      insufficient_evidence: Array.isArray(payload && payload.insufficient_evidence) ? payload.insufficient_evidence.map(publicCoverageOnly) : [],
      exposure: publicExposureOnly(payload && payload.exposure),
    };
  }

  function publicItemOnly(item) {
    return {
      assessment_item_id: text(item && item.assessment_item_id),
      item_identity: text(item && item.item_identity),
      source_package_id: text(item && item.source_package_id),
      grade: item && item.grade,
      subject: text(item && item.subject),
      domain: text(item && item.domain),
      question_type: text(item && item.question_type),
      payload: publicPayloadOnly(item && item.payload),
    };
  }

  function publicStimulusOnly(stimulus) {
    if (!stimulus || typeof stimulus !== 'object') return null;
    if (stimulus.type === 'shape' && ['circle', 'square', 'triangle', 'rectangle', 'hexagon'].includes(text(stimulus.shape))) {
      return { type: 'shape', shape: text(stimulus.shape) };
    }
    if (stimulus.type === 'model' && stimulus.fields && typeof stimulus.fields === 'object') {
      const fields = {};
      for (const key of Object.keys(stimulus.fields)) {
        const value = stimulus.fields[key];
        fields[text(key)] = Array.isArray(value) ? value.map(text) : text(value);
      }
      if (Object.keys(fields).length) return { type: 'model', model: text(stimulus.model), fields };
    }
    if (['sentence', 'word', 'letter_tiles'].includes(text(stimulus.type)) && stimulus.content && typeof stimulus.content === 'object') {
      const presentation = stimulus.presentation && typeof stimulus.presentation === 'object' ? {
        renderer: text(stimulus.presentation.renderer),
        label: text(stimulus.presentation.label),
      } : {};
      if (stimulus.type === 'letter_tiles') {
        const tiles = Array.isArray(stimulus.content.tiles) ? stimulus.content.tiles.map(text).filter(Boolean) : [];
        if (tiles.length) return { type: 'letter_tiles', content: { tiles }, accessibility_text: text(stimulus.accessibility_text), presentation };
      } else {
        const contentText = text(stimulus.content.text);
        if (contentText) return { type: text(stimulus.type), content: { text: contentText }, accessibility_text: text(stimulus.accessibility_text), presentation };
      }
    }
    return null;
  }

  function publicPayloadOnly(payload) {
    const options = Array.isArray(payload && payload.options) ? payload.options : payload && payload.choices;
    return {
      prompt: text(payload && payload.prompt),
      question_type: text(payload && payload.question_type),
      options: Array.isArray(options) ? options.map(text) : [],
      items: Array.isArray(payload && payload.items) ? payload.items.map(text) : [],
      stimulus: publicStimulusOnly(payload && payload.stimulus),
    };
  }

  function publicCoverageOnly(item) {
    return {
      package_id: text(item && item.package_id),
      safe_non_repeated_item_count: Number(item && item.safe_non_repeated_item_count) || 0,
      reason_code: text(item && item.reason_code),
    };
  }

  function publicExposureOnly(exposure) {
    return {
      item_ids: Array.isArray(exposure && exposure.item_ids) ? exposure.item_ids.map(text) : [],
      duplicate_keys: Array.isArray(exposure && exposure.duplicate_keys) ? exposure.duplicate_keys.map(text) : [],
      limitations: Array.isArray(exposure && exposure.limitations) ? exposure.limitations.map(text) : [],
    };
  }

  function publicResultOnly(payload) {
    return {
      session_id: text(payload && payload.session_id),
      assessment_role: text(payload && payload.assessment_role),
      grade: payload && payload.grade,
      subject: text(payload && payload.subject),
      status: text(payload && payload.status),
      package_ids: Array.isArray(payload && payload.package_ids) ? payload.package_ids.map(text) : [],
      skill_evidence: Array.isArray(payload && payload.skill_evidence) ? payload.skill_evidence.map(publicEvidenceOnly) : [],
      recommendations: Array.isArray(payload && payload.recommendations) ? payload.recommendations.slice(0, 3).map(publicRecommendationOnly) : [],
      exposure: publicExposureOnly(payload && payload.exposure),
      limitations: Array.isArray(payload && payload.limitations) ? payload.limitations.map(publicLimitationText) : DEFAULT_LIMITATIONS,
    };
  }

  function publicEvidenceOnly(item) {
    const label = APPROVED_LABELS.includes(item && item.provisional_label) ? item.provisional_label : 'Not Enough Evidence';
    return {
      source_package_id: text(item && item.source_package_id),
      skill_id: text(item && item.skill_id),
      skill: text(item && item.skill),
      domain: text(item && item.domain),
      provisional_label: label,
    };
  }


  function publicLimitationText(value) {
    return text(value)
      .replace(/not an official placement decision/ig, 'not an official school placement decision')
      .replace(/scientific mastery certification/ig, 'scientifically certified mastery');
  }

  function publicRecommendationOnly(item) {
    return {
      package_id: text(item && item.package_id),
      skill: text(item && item.skill),
      domain: text(item && item.domain),
      reason: text(item && item.reason),
      study_route: text(item && item.study_route),
      practice_route: text(item && item.practice_route),
    };
  }

  function publicHistoryEntryOnly(entry) {
    return {
      session_id: text(entry && entry.session_id),
      assessment_role: text(entry && entry.assessment_role),
      grade: entry && entry.grade,
      subject: text(entry && entry.subject),
      status: text(entry && entry.status),
      created_at: text(entry && entry.created_at),
      updated_at: text(entry && entry.updated_at),
      completed_at: text(entry && entry.completed_at),
      current_question_position: Math.max(0, Number(entry && entry.current_question_position) || 0),
      package_ids: Array.isArray(entry && entry.package_ids) ? entry.package_ids.map(text) : [],
      evidence_summary: Array.isArray(entry && entry.evidence_summary) ? entry.evidence_summary.map(publicEvidenceOnly) : [],
      recommendation_count: Math.max(0, Number(entry && entry.recommendation_count) || 0),
    };
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || data.error || 'The assessment service needs a moment. Please try again.');
      error.status = response.status;
      error.body = data;
      throw error;
    }
    return data;
  }

  function postJson(url, body) {
    return requestJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: safeJson(body) });
  }

  function patchJson(url, body) {
    return requestJson(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: safeJson(body) });
  }

  function setStatus(message) {
    state.message = message;
    const live = document.getElementById('assessment-status');
    if (live) live.textContent = message;
  }

  function setView(view, message) {
    state.view = view;
    if (message) setStatus(message);
    render();
  }

  async function initializeAuthenticatedFlow() {
    parseQuery();
    setView('auth loading', 'Checking parent sign-in.');
    try {
      const auth = await requestJson(GATES_SESSION_URL);
      state.authChecked = true;
      state.authenticated = Boolean(auth && auth.authenticated);
      state.authOptional = false;
      if (!state.authenticated) {
        setView('sign-in required', 'Please sign in to choose a learner.');
        return;
      }
      await loadChildren();
    } catch (err) {
      state.authChecked = true;
      if (err.status === 401) {
        state.authenticated = false;
        setView('sign-in required', 'Please sign in to choose a learner.');
        return;
      }
      state.authOptional = true;
      state.authenticated = true;
      state.children = [];
      setView('setup', 'Assessment setup is ready.');
    }
  }

  async function loadChildren() {
    state.childrenLoading = true;
    setView('child loading', 'Loading learners for this parent account.');
    try {
      const data = await requestJson(GATES_CHILDREN_URL);
      state.children = (Array.isArray(data && data.children) ? data.children : []).map(publicChildOnly).filter((child) => child.child_id);
      state.childrenLoading = false;
      if (!state.children.length) {
        setView('no children', 'No learner profiles are available yet.');
        return;
      }
      if (state.children.length === 1) selectChild(state.children[0].child_id, { renderAfter: false });
      setView('setup', 'Choose a learner, grade, and subject.');
      if (state.selectedChildId) await afterChildSelectionChanged();
    } catch (err) {
      state.childrenLoading = false;
      if (err.status === 401) setView('sign-in required', 'Please sign in to choose a learner.');
      else setError(err.message);
    }
  }

  function selectChild(childId, options) {
    const owned = state.children.find((child) => child.child_id === text(childId));
    if (!owned) {
      state.selectedChildId = '';
      state.childRequiredMessage = 'Choose one of the learners from this account before starting.';
      return false;
    }
    state.selectedChildId = owned.child_id;
    state.childRequiredMessage = '';
    if (!state.queryGrade && owned.stored_grade) state.grade = owned.stored_grade;
    if (!options || options.renderAfter !== false) render();
    return true;
  }

  function selectedCurrentSessionMatches() {
    return state.currentSession
      && state.currentSession.status === 'in_progress'
      && String(state.currentSession.grade) === String(state.grade)
      && state.currentSession.subject === state.subject;
  }

  function currentSessionUrl(extra) {
    const params = new URLSearchParams();
    const grade = extra && extra.grade ? String(extra.grade) : state.grade;
    const subject = extra && extra.subject ? String(extra.subject) : state.subject;
    if (isValidGrade(grade)) params.set('grade', grade);
    if (isValidSubject(subject)) params.set('subject', subject);
    if (extra && extra.assessment_role) params.set('assessment_role', extra.assessment_role);
    const query = params.toString();
    return API_ROOT + '/children/' + encodeURIComponent(state.selectedChildId) + '/current-session' + (query ? '?' + query : '');
  }

  async function afterChildSelectionChanged() {
    if (!selectedChild()) return;
    await Promise.all([loadCurrentSession(), loadHistory()]);
  }

  async function loadCurrentSession() {
    if (!selectedChild()) return;
    state.currentLoading = true;
    render();
    try {
      const data = await requestJson(currentSessionUrl());
      state.currentSession = publicSessionOnly(data);
      state.currentLoading = false;
      setStatus('A saved assessment is ready to resume.');
      render();
    } catch (err) {
      state.currentLoading = false;
      state.currentSession = null;
      if (err.status === 404) setStatus('No in-progress assessment for this grade and subject.');
      else setStatus(err.message);
      render();
    }
  }

  function historyQuery() {
    const params = new URLSearchParams();
    const filters = state.historyFilters;
    if (isValidGrade(filters.grade)) params.set('grade', filters.grade);
    if (isValidSubject(filters.subject)) params.set('subject', filters.subject);
    if (ROLES.includes(filters.assessment_role)) params.set('assessment_role', filters.assessment_role);
    if (STATUSES.includes(filters.status)) params.set('status', filters.status);
    return params.toString();
  }

  async function loadHistory() {
    if (!selectedChild()) return;
    state.historyLoading = true;
    render();
    try {
      const query = historyQuery();
      const data = await requestJson(API_ROOT + '/children/' + encodeURIComponent(state.selectedChildId) + '/history' + (query ? '?' + query : ''));
      const entries = Array.isArray(data && data.sessions) ? data.sessions : [];
      state.history = entries.map(publicHistoryEntryOnly).sort((a, b) => Date.parse(b.completed_at || b.updated_at || b.created_at || 0) - Date.parse(a.completed_at || a.updated_at || a.created_at || 0));
      state.historyLoading = false;
      setStatus('Assessment history loaded.');
      render();
    } catch (err) {
      state.historyLoading = false;
      setStatus(err.message);
      render();
    }
  }

  function requireOwnedSelectedChild() {
    const child = selectedChild();
    if (state.authOptional || !state.authChecked) return { child_id: undefined };
    if (!child) {
      state.childRequiredMessage = 'Choose a learner from this parent account before starting or resuming.';
      setStatus(state.childRequiredMessage);
      render();
      return null;
    }
    return child;
  }

  async function startAssessment() {
    if (state.busy) return;
    const child = requireOwnedSelectedChild();
    if (!child) return;
    if (!state.authOptional && state.authChecked && selectedCurrentSessionMatches()) {
      resumeCurrentSession();
      return;
    }
    state.busy = true;
    setView('loading', 'Starting your assessment.');
    try {
      const body = { grade: Number(state.grade), subject: state.subject, itemsPerPackage: ITEMS_PER_PACKAGE };
      if (!state.authOptional && state.authChecked) body.child_id = child.child_id;
      const data = await postJson(API_ROOT + '/sessions', body);
      state.session = publicSessionOnly(data);
      state.currentSession = state.session.status === 'in_progress' ? state.session : null;
      state.result = null;
      state.index = boundedPosition(state.session.current_question_position, state.session.public_items.length);
      state.responses = { ...state.responses };
      state.selectedRecheck = {};
      state.busy = false;
      validateCurrentItem();
      setView('question', data && data.resumed ? 'Resuming saved progress.' : 'Assessment ready. Submitted progress is saved.');
    } catch (err) {
      state.busy = false;
      setError(err.message);
    }
  }

  function boundedPosition(position, total) {
    const max = Math.max(0, Number(total || 0) - 1);
    const parsed = Number(position) || 0;
    return Math.min(Math.max(0, parsed), max);
  }

  function resumeCurrentSession() {
    if (!state.currentSession) return;
    state.session = state.currentSession;
    state.result = null;
    state.index = boundedPosition(state.session.current_question_position, state.session.public_items.length);
    validateCurrentItem();
    setView('question', 'Resuming from saved progress. Draft answers on this device are still here until you submit.');
  }

  async function openHistorySession(sessionId) {
    if (!sessionId || state.busy) return;
    state.busy = true;
    setView('loading', 'Opening saved assessment.');
    try {
      const data = await requestJson(API_ROOT + '/sessions/' + encodeURIComponent(sessionId));
      if (data && data.status === 'completed') {
        state.result = publicResultOnly(data);
        state.session = null;
        state.busy = false;
        setView('results', 'Saved results loaded.');
      } else {
        state.session = publicSessionOnly(data);
        state.currentSession = state.session;
        state.index = boundedPosition(state.session.current_question_position, state.session.public_items.length);
        state.busy = false;
        validateCurrentItem();
        setView('question', 'Resuming saved assessment.');
      }
    } catch (err) {
      state.busy = false;
      setError(err.message);
    }
  }

  async function submitResponses() {
    if (state.busy || !state.session) return;
    state.busy = true;
    setView('submitting', 'Sending your answers safely.');
    try {
      const responseMap = {};
      for (const item of state.session.public_items) responseMap[item.item_identity] = state.responses[item.item_identity] || (!hasRenderableStimulus(item) ? INVALID_DELIVERY_RESPONSE : '');
      const data = await postJson(API_ROOT + '/sessions/' + encodeURIComponent(state.session.session_id) + '/responses', { responses: responseMap });
      state.result = publicResultOnly(data);
      state.currentSession = null;
      state.busy = false;
      await loadHistory().catch(() => {});
      setView('results', 'Your supportive results are ready.');
    } catch (err) {
      state.busy = false;
      setError(err.message);
    }
  }

  async function startReassessment() {
    if (state.busy || !state.result) return;
    const packageIds = allowedReassessmentIds().filter((id) => state.selectedRecheck[id]);
    if (!packageIds.length) {
      setStatus('Choose one skill to check again.');
      render();
      return;
    }
    state.busy = true;
    setView('loading', 'Checking for an in-progress reassessment first.');
    try {
      if (selectedChild()) {
        try {
          const data = await requestJson(currentSessionUrl({ assessment_role: 'reassessment', grade: state.result.grade, subject: state.result.subject }));
          state.session = publicSessionOnly(data);
          state.result = null;
          state.index = boundedPosition(state.session.current_question_position, state.session.public_items.length);
          state.busy = false;
          validateCurrentItem();
          setView('question', 'Resuming your in-progress reassessment.');
          return;
        } catch (err) {
          if (err.status !== 404) throw err;
        }
      }
      setStatus('Getting new questions for your reassessment.');
      const data = await postJson(API_ROOT + '/sessions/' + encodeURIComponent(state.result.session_id) + '/reassessment', {
        package_ids: packageIds,
        itemsPerPackage: ITEMS_PER_PACKAGE,
      });
      state.session = publicSessionOnly(data);
      state.result = null;
      state.index = boundedPosition(state.session.current_question_position, state.session.public_items.length);
      state.responses = {};
      state.selectedRecheck = {};
      state.busy = false;
      validateCurrentItem();
      setView('question', 'Your reassessment uses new questions when enough safe questions are available.');
    } catch (err) {
      state.busy = false;
      setError(err.message);
    }
  }

  function setError(message) {
    state.error = message || 'Something went wrong.';
    state.view = 'error';
    setStatus(state.error);
    render();
  }

  function currentItem() {
    return state.session && state.session.public_items ? state.session.public_items[state.index] : null;
  }

  function itemType(item) {
    return text((item && item.question_type) || (item && item.payload && item.payload.question_type));
  }

  function hasRenderableStimulus(item) {
    const stimulus = item && item.payload && item.payload.stimulus;
    if (!stimulus) return !/\b(shown|picture|clock|objects?|a\s+or\s+b|graph|table|diagram|image|longer|taller|heavier|shorter|compare|model)\b/i.test(text(item && item.payload && item.payload.prompt));
    if (stimulus.type === 'shape') return ['circle', 'square', 'triangle', 'rectangle', 'hexagon'].includes(text(stimulus.shape));
    if (stimulus.type === 'model') return stimulus.fields && Object.keys(stimulus.fields).length > 0;
    if (stimulus.type === 'sentence' || stimulus.type === 'word') return Boolean(text(stimulus.content && stimulus.content.text));
    if (stimulus.type === 'letter_tiles') return Array.isArray(stimulus.content && stimulus.content.tiles) && stimulus.content.tiles.some((tile) => text(tile));
    return false;
  }

  function validateCurrentItem() {
    const item = currentItem();
    if (!item) throw new Error('No questions are available yet.');
    if (!SUPPORTED_ITEM_TYPES.includes(itemType(item))) throw new Error('This question type is not ready for the learner screen yet.');
    if (!hasRenderableStimulus(item)) return false;
    return true;
  }

  async function persistPosition(position) {
    if (!state.session || state.authOptional) return;
    const total = state.session.public_items.length;
    if (position < 0 || position >= total) return;
    await patchJson(API_ROOT + '/sessions/' + encodeURIComponent(state.session.session_id) + '/progress', { current_question_position: position });
  }

  function move(delta) {
    const nextIndex = state.index + delta;
    if (!state.session || nextIndex < 0 || nextIndex >= state.session.public_items.length) return;
    state.index = nextIndex;
    persistPosition(nextIndex).catch((err) => setStatus(err.message || 'Progress save needs a retry.'));
    try {
      validateCurrentItem();
      setStatus('Question ' + (state.index + 1) + ' of ' + state.session.public_items.length + '. Submitted progress is saved.');
      render();
    } catch (err) {
      setError(err.message);
    }
  }

  function updateResponse(itemId, value) {
    state.responses[itemId] = value;
    setStatus('Draft answer saved on this device. Submitted progress is saved after you submit.');
  }

  function allowedReassessmentIds() {
    const ids = new Set();
    if (state.result) {
      for (const id of state.result.package_ids || []) ids.add(id);
      for (const item of state.result.skill_evidence || []) if (item.source_package_id) ids.add(item.source_package_id);
      for (const item of state.result.recommendations || []) if (item.package_id) ids.add(item.package_id);
    }
    return Array.from(ids).filter(Boolean).sort();
  }

  function gradeMismatchNote() {
    const child = selectedChild();
    if (!child || !child.stored_grade || child.stored_grade === state.grade) return '';
    return '<div class="notice" role="note"><strong>Grade choice note</strong><p>The learner profile shows Grade ' + escapeHtml(child.stored_grade) + ', and you chose Grade ' + escapeHtml(state.grade) + ' for this assessment.</p></div>';
  }

  function renderAuthLoading() {
    return '<section class="panel" aria-labelledby="auth-loading-title" aria-busy="true"><h2 id="auth-loading-title">Checking sign-in…</h2><p class="helper">We are checking your Gates parent session before showing learner choices.</p></section>';
  }

  function renderSignInRequired() {
    return '<section class="panel" aria-labelledby="signin-title"><h2 id="signin-title">Please sign in to continue</h2><p class="helper">Adaptive assessments are saved to your child profile, so a Gates parent sign-in is required before an assessment can be created.</p><div class="actions"><a class="route-button primary" href="' + GATES_SIGNIN_URL + '">Go to Gates Parent Sign In</a></div></section>';
  }

  function renderNoChildren() {
    return '<section class="panel" aria-labelledby="no-children-title"><h2 id="no-children-title">No learners yet</h2><p class="helper">Create a child profile in Gates first. Then return here to start or resume an assessment.</p><div class="actions"><a class="route-button primary" href="/gates/children">Go to Gates Children</a></div></section>';
  }

  function renderSetup() {
    if (state.authChecked && !state.authOptional && !state.authenticated) return renderSignInRequired();
    if (state.childrenLoading) return renderLoading('Loading learner profiles…');
    if (state.authChecked && !state.authOptional && !state.children.length) return renderNoChildren();
    const current = selectedCurrentSessionMatches() ? state.currentSession : null;
    return '<section class="panel" aria-labelledby="setup-title">' +
      '<h2 id="setup-title">Assessment setup</h2>' +
      '<p class="helper">Choose an existing learner, then choose the grade and subject. Nothing starts until you press Start or Resume.</p>' +
      (state.queryGrade || state.querySubject ? '<div class="notice"><strong>Browsing choice applied</strong><p>Valid page choices were preselected, but the assessment will not auto-start.</p></div>' : '') +
      renderSelectorGrid() +
      gradeMismatchNote() +
      (state.childRequiredMessage ? '<div class="notice error" role="alert"><strong>Choose a learner</strong><p>' + escapeHtml(state.childRequiredMessage) + '</p></div>' : '') +
      renderCurrentSession(current) +
      '<div class="actions"><button class="primary" data-action="' + (current ? 'resume' : 'start') + '">' + (current ? 'Resume Assessment' : 'Start Assessment') + '</button></div>' +
      renderHistorySection() +
      '</section>';
  }

  function renderSelectorGrid() {
    const childSelect = state.authOptional
      ? '<div class="notice"><strong>Development mode</strong><p>Authentication was not available in this harness.</p></div>'
      : '<div class="field"><label for="child-select">Learner</label><select id="child-select"><option value="">Choose a learner</option>' + state.children.map((child) => '<option value="' + escapeHtml(child.child_id) + '"' + (state.selectedChildId === child.child_id ? ' selected' : '') + '>' + escapeHtml(child.child_name) + (child.child_grade_band ? ' — ' + escapeHtml(child.child_grade_band) : '') + '</option>').join('') + '</select></div>';
    return '<div class="form-grid">' + childSelect +
      '<div class="field"><label for="grade-select">Assessment grade</label><select id="grade-select">' + GRADES.map((grade) => '<option value="' + grade + '"' + (state.grade === grade ? ' selected' : '') + '>Grade ' + grade + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="subject-select">Subject</label><select id="subject-select">' + SUBJECTS.map((subject) => '<option value="' + subject + '"' + (state.subject === subject ? ' selected' : '') + '>' + subject + '</option>').join('') + '</select></div>' +
      '</div>';
  }

  function renderCurrentSession(current) {
    if (state.currentLoading) return '<div class="notice" aria-busy="true"><strong>Checking saved work…</strong><p class="helper">Looking for an in-progress assessment for this learner.</p></div>';
    if (!selectedChild() && !state.authOptional) return '';
    if (!current) return '<div class="notice"><strong>No current session for this choice</strong><p class="helper">Start Assessment will create one saved assessment for this learner.</p></div>';
    return '<div class="notice current-session"><strong>Current session available</strong><p>' + escapeHtml(roleLabel(current.assessment_role)) + ' · Grade ' + escapeHtml(current.grade) + ' · ' + escapeHtml(current.subject) + '</p><p>Progress: question ' + (boundedPosition(current.current_question_position, current.public_items.length) + 1) + ' of ' + current.public_items.length + '. Packages: ' + current.package_ids.length + '.</p><p class="helper">Submitted progress is saved. Draft answers stay on this device until draft-response persistence is available.</p></div>';
  }

  function renderLoading(label) {
    return '<section class="panel" aria-labelledby="loading-title" aria-busy="true"><h2 id="loading-title">' + escapeHtml(label || 'Getting things ready…') + '</h2><p class="helper">Thanks for waiting. We are preparing a safe assessment view.</p></section>';
  }

  function renderQuestion() {
    const item = currentItem();
    if (!item) return renderError('No question is available.');
    const type = itemType(item);
    if (!SUPPORTED_ITEM_TYPES.includes(type)) return renderError('This question type is not ready for the learner screen yet.');
    if (!hasRenderableStimulus(item)) return renderInvalidQuestionSkip(item);
    const total = state.session.public_items.length;
    const saved = state.responses[item.item_identity] || '';
    return '<section class="question-card" aria-labelledby="question-title">' +
      '<p class="progress-text" aria-label="Question ' + (state.index + 1) + ' of ' + total + '">Question ' + (state.index + 1) + ' of ' + total + '</p>' +
      '<p class="helper">' + escapeHtml(roleLabel(state.session.assessment_role)) + ' · Grade ' + escapeHtml(state.session.grade) + ' · ' + escapeHtml(state.session.subject) + ' · Submitted progress is saved.</p>' +
      '<h2 id="question-title">Your question</h2>' +
      '<p class="prompt">' + escapeHtml(item.payload.prompt) + '</p>' +
      renderStimulus(item) +
      renderAnswerControl(item, type, saved) +
      '<div class="actions">' +
      '<button class="secondary" data-action="back"' + (state.index === 0 ? ' disabled' : '') + '>Back</button>' +
      (state.index < total - 1 ? '<button class="primary" data-action="next">Next</button>' : '<button class="primary" data-action="submit"' + (state.busy ? ' disabled' : '') + '>Submit Assessment</button>') +
      '</div></section>';
  }

  function renderInvalidQuestionSkip(item) {
    if (item && item.item_identity) state.responses[item.item_identity] = INVALID_DELIVERY_RESPONSE;
    const total = state.session.public_items.length;
    return '<section class="question-card" aria-labelledby="missing-question-title" role="alert">' +
      '<p class="progress-text">Question ' + (state.index + 1) + ' of ' + total + '</p>' +
      '<h2 id="missing-question-title">We’ll skip this one safely.</h2>' +
      '<p class="helper">This question is missing something needed to answer it. We’ll skip it safely.</p>' +
      '<div class="actions">' +
      '<button class="secondary" data-action="back"' + (state.index === 0 ? ' disabled' : '') + '>Back</button>' +
      (state.index < total - 1 ? '<button class="primary" data-action="next">Next</button>' : '<button class="primary" data-action="submit"' + (state.busy ? ' disabled' : '') + '>Submit Assessment</button>') +
      '</div></section>';
  }

  function renderStimulus(item) {
    const stimulus = item && item.payload && item.payload.stimulus;
    if (!stimulus) return '';
    if (stimulus.type === 'shape') {
      return '<div class="assessment-stimulus shape-stimulus" aria-label="Shape shown: ' + escapeHtml(stimulus.shape) + '"><span class="shape shape-' + escapeHtml(stimulus.shape) + '"></span></div>';
    }
    if (stimulus.type === 'model') {
      const fields = Object.entries(stimulus.fields || {}).map(([key, value]) => '<span class="stimulus-chip"><strong>' + escapeHtml(key.replace(/_/g, ' ')) + '</strong> ' + escapeHtml(Array.isArray(value) ? value.join(', ') : value) + '</span>').join('');
      return '<div class="assessment-stimulus model-stimulus" aria-label="Question model"><div class="model-title">Model</div><div class="stimulus-chip-list">' + fields + '</div></div>';
    }
    if (stimulus.type === 'sentence') {
      const sentence = text(stimulus.content && stimulus.content.text);
      return '<div class="assessment-stimulus literacy-stimulus sentence-stimulus" aria-label="' + escapeHtml(stimulus.accessibility_text || ('Sentence: ' + sentence)) + '"><p class="literacy-card sentence-card">' + escapeHtml(sentence) + '</p><p class="stimulus-help">Read the sentence carefully.</p></div>';
    }
    if (stimulus.type === 'word') {
      const word = text(stimulus.content && stimulus.content.text);
      return '<div class="assessment-stimulus literacy-stimulus word-stimulus" aria-label="' + escapeHtml(stimulus.accessibility_text || ('Word: ' + word)) + '"><p class="literacy-card word-card">' + escapeHtml(word) + '</p><p class="stimulus-help">Use the printed word to answer.</p></div>';
    }
    if (stimulus.type === 'letter_tiles') {
      const tiles = Array.isArray(stimulus.content && stimulus.content.tiles) ? stimulus.content.tiles.map(text).filter(Boolean) : [];
      const tileHtml = tiles.map((tile, index) => '<span class="letter-tile" aria-label="Tile ' + (index + 1) + ': ' + escapeHtml(tile) + '"><strong>' + escapeHtml(tile) + '</strong></span>').join('');
      const label = text(stimulus.presentation && stimulus.presentation.label) || 'Blend the sounds in order.';
      return '<div class="assessment-stimulus literacy-stimulus letter-tiles-stimulus" aria-label="' + escapeHtml(stimulus.accessibility_text || ('Letter tiles: ' + tiles.join(', '))) + '"><div class="letter-tile-row">' + tileHtml + '</div><p class="stimulus-help">' + escapeHtml(label) + '</p></div>';
    }
    return '';
  }

  function renderAnswerControl(item, type, saved) {
    if (type === 'multiple_choice') {
      const options = item.payload.options || [];
      return '<fieldset class="choice-list"><legend>Choose one answer</legend>' + options.map((option, index) => {
        const id = 'choice-' + state.index + '-' + index;
        return '<label class="choice-option" for="' + id + '"><input id="' + id + '" type="radio" name="response-' + state.index + '" value="' + escapeHtml(option) + '" data-response-for="' + escapeHtml(item.item_identity) + '"' + (saved === option ? ' checked' : '') + ' /> <span>' + escapeHtml(option) + '</span></label>';
      }).join('') + '</fieldset>';
    }
    return '<div class="field"><label for="short-response">Type your answer</label><input id="short-response" type="text" autocomplete="off" data-response-for="' + escapeHtml(item.item_identity) + '" value="' + escapeHtml(saved) + '" /></div>';
  }

  function renderHistorySection() {
    if (!selectedChild() && !state.authOptional) return '';
    return '<section class="history-panel" aria-labelledby="history-title"><div class="section-row"><h2 id="history-title">Assessment history</h2><button class="secondary compact" data-action="reload-history">Refresh history</button></div>' +
      renderHistoryFilters() +
      (state.historyLoading ? '<p class="helper" aria-busy="true">Loading history…</p>' : '') +
      '<div class="history-list">' + (state.history.length ? state.history.map(renderHistoryEntry).join('') : '<p class="helper">No saved assessment history for these filters yet.</p>') + '</div></section>';
  }

  function renderHistoryFilters() {
    const filters = state.historyFilters;
    return '<div class="history-filters" aria-label="Assessment history filters">' +
      '<div class="field"><label for="history-grade">Grade</label><select id="history-grade"><option value="">All grades</option>' + GRADES.map((grade) => '<option value="' + grade + '"' + (filters.grade === grade ? ' selected' : '') + '>Grade ' + grade + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="history-subject">Subject</label><select id="history-subject"><option value="">All subjects</option>' + SUBJECTS.map((subject) => '<option value="' + subject + '"' + (filters.subject === subject ? ' selected' : '') + '>' + subject + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="history-role">Role</label><select id="history-role"><option value="">All roles</option>' + ROLES.map((role) => '<option value="' + role + '"' + (filters.assessment_role === role ? ' selected' : '') + '>' + roleLabel(role) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="history-status">Status</label><select id="history-status"><option value="">All statuses</option>' + STATUSES.map((status) => '<option value="' + status + '"' + (filters.status === status ? ' selected' : '') + '>' + statusLabel(status) + '</option>').join('') + '</select></div>' +
      '</div>';
  }

  function renderHistoryEntry(entry) {
    const date = entry.completed_at || entry.updated_at || entry.created_at || '';
    const evidenceCount = entry.evidence_summary.length;
    let action = '';
    if (entry.status === 'in_progress') action = '<button class="primary compact" data-action="open-session" data-session-id="' + escapeHtml(entry.session_id) + '">Resume</button>';
    else if (entry.status === 'completed') action = '<button class="secondary compact" data-action="open-session" data-session-id="' + escapeHtml(entry.session_id) + '">View Results</button>';
    else action = '<button class="secondary compact" data-action="start">Start Reassessment</button>';
    return '<article class="history-entry"><h3>' + escapeHtml(roleLabel(entry.assessment_role)) + '</h3><p>Grade ' + escapeHtml(entry.grade) + ' · ' + escapeHtml(entry.subject) + ' · ' + escapeHtml(statusLabel(entry.status)) + '</p><p class="helper">' + escapeHtml(formatDate(date)) + ' · Packages: ' + entry.package_ids.length + ' · Evidence summaries: ' + evidenceCount + ' · Recommendations: ' + entry.recommendation_count + '</p><div class="actions">' + action + '</div></article>';
  }

  function renderResults() {
    const result = state.result || { skill_evidence: [], recommendations: [] };
    const limitations = result.limitations && result.limitations.length ? result.limitations : DEFAULT_LIMITATIONS;
    return '<section aria-labelledby="results-title">' +
      '<h2 id="results-title">Supportive skill results</h2>' +
      '<div class="notice"><strong>Important note</strong><ul class="limitations">' + limitations.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></div>' +
      '<div class="result-grid">' + result.skill_evidence.map(renderEvidence).join('') + '</div>' +
      renderRecommendations(result.recommendations) +
      renderReassessmentInvitation() +
      '</section>';
  }

  function renderEvidence(item) {
    const label = APPROVED_LABELS.includes(item.provisional_label) ? item.provisional_label : 'Not Enough Evidence';
    const name = item.skill || item.source_package_id || item.skill_id || 'Skill';
    return '<article class="result-card"><h3>' + escapeHtml(name) + '</h3><p><span class="status-pill ' + LABEL_CLASS[label] + '">' + label + '</span></p><p>' + SUPPORT_TEXT[label] + '</p></article>';
  }

  function renderRecommendations(recommendations) {
    const shown = (recommendations || []).slice(0, 3);
    if (!shown.length) return '<div class="notice"><strong>Recommendations</strong><p class="helper">No extra recommendations are ready from this check-in.</p></div>';
    return '<section aria-labelledby="recommendations-title"><h2 id="recommendations-title">Recommended next steps</h2><div class="recommendation-grid">' + shown.map((item) => '<article class="recommendation-card"><h3>' + escapeHtml(item.skill || item.package_id || 'Skill') + '</h3><p>' + escapeHtml(item.reason || 'This is a friendly next practice step.') + '</p><div class="actions"><a class="route-button" href="' + escapeHtml(item.study_route) + '">Start Skill World</a><a class="route-button" href="' + escapeHtml(item.practice_route) + '">Practice This Skill</a></div></article>').join('') + '</div></section>';
  }

  function renderReassessmentInvitation() {
    if (!allowedReassessmentIds().length) return '';
    return '<section class="panel" aria-labelledby="recheck-invite-title"><h2 id="recheck-invite-title">Want to check a skill again?</h2><p class="helper">A reassessment uses assessed packages, saved evidence, saved recommendations, and new questions when they are safely available.</p><div class="actions"><button class="primary" data-action="recheck-setup">Choose a Skill to Check Again</button><button class="secondary" data-action="setup">Back to setup and history</button></div></section>';
  }

  function renderReassessmentSetup() {
    const ids = allowedReassessmentIds();
    if (!ids.length) return renderError('No reassessment packages are available from saved results.');
    return '<section class="panel" aria-labelledby="recheck-title"><h2 id="recheck-title">Check a skill again</h2><p class="helper">A reassessment asks for new questions. If there are not enough safe new questions, we will say so.</p>' + renderCoverageNotice() + '<div class="checkbox-list">' + ids.map((id) => '<label><input type="checkbox" data-recheck-id="' + escapeHtml(id) + '"' + (state.selectedRecheck[id] ? ' checked' : '') + ' /> <span>' + escapeHtml(labelForPackage(id)) + '</span></label>').join('') + '</div><div class="actions"><button class="primary" data-action="reassessment">Start Reassessment</button><button class="secondary" data-action="results">Back to results</button></div></section>';
  }

  function renderCoverageNotice() {
    const coverage = state.session && Array.isArray(state.session.insufficient_evidence) ? state.session.insufficient_evidence : [];
    if (!coverage.length) return '<div class="notice"><strong>New-question coverage</strong><p class="helper">Coverage will be checked before new questions are shown.</p></div>';
    return '<div class="notice"><strong>Insufficient safe new-question coverage</strong><ul>' + coverage.map((item) => '<li>' + escapeHtml(labelForPackage(item.package_id)) + ': only ' + item.safe_non_repeated_item_count + ' safe new question(s) are available.</li>').join('') + '</ul></div>';
  }

  function labelForPackage(packageId) {
    const evidence = state.result && (state.result.skill_evidence || []).find((item) => item.source_package_id === packageId || item.skill_id === packageId);
    if (evidence && evidence.skill) return evidence.skill;
    const recommendation = state.result && (state.result.recommendations || []).find((item) => item.package_id === packageId);
    return (recommendation && recommendation.skill) || packageId;
  }

  function renderError(message) {
    return '<section class="panel error" aria-labelledby="error-title" role="alert"><h2 id="error-title">We need to pause.</h2><p>' + escapeHtml(message || state.error || state.message || 'Something went wrong.') + '</p><div class="actions"><button class="secondary" data-action="setup">Back to setup</button></div></section>';
  }

  function roleLabel(role) {
    return role === 'reassessment' ? 'Reassessment' : 'Baseline assessment';
  }

  function statusLabel(status) {
    return text(status).replace(/_/g, ' ') || 'unknown';
  }

  function formatDate(value) {
    if (!value) return 'Date not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function render() {
    const root = document.getElementById('assessment-app');
    if (!root) return;
    root.setAttribute('data-state', state.view);
    if (state.view === 'auth loading') root.innerHTML = renderAuthLoading();
    else if (state.view === 'sign-in required') root.innerHTML = renderSignInRequired();
    else if (state.view === 'child loading') root.innerHTML = renderLoading('Loading learner profiles…');
    else if (state.view === 'no children') root.innerHTML = renderNoChildren();
    else if (state.view === 'setup') root.innerHTML = renderSetup();
    else if (state.view === 'loading') root.innerHTML = renderLoading('Getting your questions…');
    else if (state.view === 'question') root.innerHTML = renderQuestion();
    else if (state.view === 'submitting') root.innerHTML = renderLoading('Sending your answers…');
    else if (state.view === 'results') root.innerHTML = renderResults();
    else if (state.view === 'reassessment setup') root.innerHTML = renderReassessmentSetup();
    else root.innerHTML = renderError();
  }

  function onInput(event) {
    const target = event.target;
    if (!target) return;
    if (target.id === 'child-select') {
      selectChild(target.value, { renderAfter: false });
      afterChildSelectionChanged();
    }
    if (target.id === 'grade-select') {
      state.grade = target.value;
      loadCurrentSession();
    }
    if (target.id === 'subject-select') {
      state.subject = target.value;
      loadCurrentSession();
    }
    if (target.id === 'history-grade') { state.historyFilters.grade = target.value; loadHistory(); }
    if (target.id === 'history-subject') { state.historyFilters.subject = target.value; loadHistory(); }
    if (target.id === 'history-role') { state.historyFilters.assessment_role = target.value; loadHistory(); }
    if (target.id === 'history-status') { state.historyFilters.status = target.value; loadHistory(); }
    const itemId = target.getAttribute && target.getAttribute('data-response-for');
    if (itemId) updateResponse(itemId, target.value);
    const recheckId = target.getAttribute && target.getAttribute('data-recheck-id');
    if (recheckId) state.selectedRecheck[recheckId] = target.checked;
  }

  function onClick(event) {
    const button = event.target && event.target.closest ? event.target.closest('[data-action]') : null;
    if (!button) return;
    const action = button.getAttribute('data-action');
    if (action === 'start') startAssessment();
    if (action === 'resume') resumeCurrentSession();
    if (action === 'back') move(-1);
    if (action === 'next') move(1);
    if (action === 'submit') submitResponses();
    if (action === 'reload-history') loadHistory();
    if (action === 'open-session') openHistorySession(button.getAttribute('data-session-id'));
    if (action === 'recheck-setup') setView('reassessment setup', 'Choose a skill to check again.');
    if (action === 'results') setView('results', 'Back to results.');
    if (action === 'setup') {
      state.view = 'setup';
      state.busy = false;
      state.error = '';
      setStatus('Back at setup.');
      render();
    }
    if (action === 'reassessment') startReassessment();
  }

  function init() {
    const root = document.getElementById('assessment-app');
    if (!root) return;
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
    root.addEventListener('click', onClick);
    initializeAuthenticatedFlow();
  }

  const api = {
    APPROVED_LABELS,
    SUPPORTED_ITEM_TYPES,
    ITEMS_PER_PACKAGE,
    state,
    publicSessionOnly,
    publicResultOnly,
    publicChildOnly,
    publicHistoryEntryOnly,
    allowedReassessmentIds,
    renderAnswerControl,
    renderStimulus,
    hasRenderableStimulus,
    startAssessment,
    submitResponses,
    startReassessment,
    updateResponse,
    move,
    selectChild,
    loadCurrentSession,
    loadHistory,
    openHistorySession,
    resumeCurrentSession,
    initializeAuthenticatedFlow,
    normalizeStoredGrade,
    render,
  };

  if (typeof window !== 'undefined') {
    window.AssessmentMvpLearner = api;
    if (!(typeof module !== 'undefined' && module.exports)) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
      else init();
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}());
