(function () {
  'use strict';

  const API_ROOT = '/api/assessment-mvp';
  const ITEMS_PER_PACKAGE = 3;
  const APPROVED_LABELS = ['Ready', 'Developing', 'Needs Support', 'Not Enough Evidence'];
  const LABEL_CLASS = {
    Ready: 'ready',
    Developing: 'developing',
    'Needs Support': 'needs-support',
    'Not Enough Evidence': 'not-enough-evidence',
  };
  const SUPPORTED_ITEM_TYPES = ['multiple_choice', 'short_response'];
  const SUPPORT_TEXT = {
    Ready: 'You look ready to keep building with this skill.',
    Developing: 'You are growing this skill. A little practice can help.',
    'Needs Support': 'This skill could use friendly practice and support.',
    'Not Enough Evidence': 'There was not enough information yet. Try a few more questions later.',
  };
  const LIMITATIONS = [
    'Results are provisional instructional guidance.',
    'Results are not an official school placement decision.',
    'Ready does not mean scientifically certified mastery.',
  ];

  const initialState = {
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
  };

  const state = { ...initialState };

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

  function publicSessionOnly(payload) {
    const items = Array.isArray(payload && payload.public_items) ? payload.public_items.map(publicItemOnly) : [];
    return {
      session_id: text(payload && payload.session_id),
      assessment_role: text(payload && payload.assessment_role),
      status: text(payload && payload.status),
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

  function publicPayloadOnly(payload) {
    const options = Array.isArray(payload && payload.options) ? payload.options : payload && payload.choices;
    return {
      prompt: text(payload && payload.prompt),
      question_type: text(payload && payload.question_type),
      options: Array.isArray(options) ? options.map(text) : [],
      items: Array.isArray(payload && payload.items) ? payload.items.map(text) : [],
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
      status: text(payload && payload.status),
      package_ids: Array.isArray(payload && payload.package_ids) ? payload.package_ids.map(text) : [],
      skill_evidence: Array.isArray(payload && payload.skill_evidence) ? payload.skill_evidence.map(publicEvidenceOnly) : [],
      recommendations: Array.isArray(payload && payload.recommendations) ? payload.recommendations.slice(0, 3).map(publicRecommendationOnly) : [],
      exposure: publicExposureOnly(payload && payload.exposure),
      limitations: Array.isArray(payload && payload.limitations) ? payload.limitations.map(text) : [],
    };
  }

  function publicEvidenceOnly(item) {
    return {
      source_package_id: text(item && item.source_package_id),
      skill_id: text(item && item.skill_id),
      skill: text(item && item.skill),
      domain: text(item && item.domain),
      provisional_label: APPROVED_LABELS.includes(item && item.provisional_label) ? item.provisional_label : 'Not Enough Evidence',
    };
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

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeJson(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || 'The assessment service needs a moment. Please try again.');
    return data;
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

  async function startAssessment() {
    if (state.busy) return;
    state.busy = true;
    setView('loading', 'Starting your assessment.');
    try {
      const data = await postJson(API_ROOT + '/sessions', {
        grade: Number(state.grade),
        subject: state.subject,
        itemsPerPackage: ITEMS_PER_PACKAGE,
      });
      state.session = publicSessionOnly(data);
      state.result = null;
      state.index = 0;
      state.responses = {};
      state.selectedRecheck = {};
      state.busy = false;
      validateCurrentItem();
      setView('question', 'Assessment ready.');
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
      for (const item of state.session.public_items) responseMap[item.item_identity] = state.responses[item.item_identity] || '';
      const data = await postJson(API_ROOT + '/sessions/' + encodeURIComponent(state.session.session_id) + '/responses', { responses: responseMap });
      state.result = publicResultOnly(data);
      state.busy = false;
      setView('results', 'Your supportive results are ready.');
    } catch (err) {
      state.busy = false;
      setError(err.message);
    }
  }

  async function startReassessment() {
    if (state.busy || !state.result || !state.session) return;
    const packageIds = allowedReassessmentIds().filter((id) => state.selectedRecheck[id]);
    if (!packageIds.length) {
      setStatus('Choose one skill to check again.');
      render();
      return;
    }
    state.busy = true;
    setView('loading', 'Getting new questions for your reassessment.');
    try {
      const data = await postJson(API_ROOT + '/sessions/' + encodeURIComponent(state.result.session_id) + '/reassessment', {
        package_ids: packageIds,
        itemsPerPackage: ITEMS_PER_PACKAGE,
      });
      state.session = publicSessionOnly(data);
      state.result = null;
      state.index = 0;
      state.responses = {};
      state.selectedRecheck = {};
      state.busy = false;
      validateCurrentItem();
      setView('question', 'Your reassessment uses new questions.');
    } catch (err) {
      state.busy = false;
      setError(err.message);
    }
  }

  function setError(message) {
    state.view = 'error';
    setStatus(message || 'Something went wrong.');
    render();
  }

  function currentItem() {
    return state.session && state.session.public_items ? state.session.public_items[state.index] : null;
  }

  function itemType(item) {
    return text((item && item.question_type) || (item && item.payload && item.payload.question_type));
  }

  function validateCurrentItem() {
    const item = currentItem();
    if (!item) throw new Error('No questions are available yet.');
    if (!SUPPORTED_ITEM_TYPES.includes(itemType(item))) throw new Error('This question type is not ready for the learner screen yet.');
  }

  function move(delta) {
    const nextIndex = state.index + delta;
    if (!state.session || nextIndex < 0 || nextIndex >= state.session.public_items.length) return;
    state.index = nextIndex;
    try {
      validateCurrentItem();
      setStatus('Question ' + (state.index + 1) + ' of ' + state.session.public_items.length + '.');
      render();
    } catch (err) {
      setError(err.message);
    }
  }

  function updateResponse(itemId, value) {
    state.responses[itemId] = value;
    setStatus('Answer saved for this question.');
  }

  function allowedReassessmentIds() {
    const ids = new Set();
    if (state.result) {
      for (const id of state.result.package_ids || []) ids.add(id);
      for (const item of state.result.skill_evidence || []) {
        if (item.source_package_id) ids.add(item.source_package_id);
        if (item.skill_id) ids.add(item.skill_id);
      }
      for (const item of state.result.recommendations || []) if (item.package_id) ids.add(item.package_id);
    }
    return Array.from(ids).filter(Boolean).sort();
  }

  function renderSetup() {
    return '<section class="panel" aria-labelledby="setup-title">' +
      '<h2 id="setup-title">Start Assessment</h2>' +
      '<p class="helper">Pick a grade and subject. We will keep the check-in short.</p>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="grade-select">Grade</label><select id="grade-select">' +
      [1, 2, 3, 4, 5, 6].map((grade) => '<option value="' + grade + '"' + (state.grade === String(grade) ? ' selected' : '') + '>Grade ' + grade + '</option>').join('') +
      '</select></div>' +
      '<div class="field"><label for="subject-select">Subject</label><select id="subject-select">' +
      ['Math', 'English'].map((subject) => '<option value="' + subject + '"' + (state.subject === subject ? ' selected' : '') + '>' + subject + '</option>').join('') +
      '</select></div>' +
      '</div>' +
      '<div class="actions"><button class="primary" data-action="start">Start Assessment</button></div>' +
      '</section>';
  }

  function renderLoading(label) {
    return '<section class="panel" aria-labelledby="loading-title" aria-busy="true">' +
      '<h2 id="loading-title">' + escapeHtml(label || 'Getting things ready…') + '</h2>' +
      '<p class="helper">Thanks for waiting. We are preparing a small set of questions.</p>' +
      '</section>';
  }

  function renderQuestion() {
    const item = currentItem();
    if (!item) return renderError('No question is available.');
    const type = itemType(item);
    if (!SUPPORTED_ITEM_TYPES.includes(type)) return renderError('This question type is not ready for the learner screen yet.');
    const total = state.session.public_items.length;
    const saved = state.responses[item.item_identity] || '';
    return '<section class="question-card" aria-labelledby="question-title">' +
      '<p class="progress-text" aria-label="Question ' + (state.index + 1) + ' of ' + total + '">Question ' + (state.index + 1) + ' of ' + total + '</p>' +
      '<h2 id="question-title">Your question</h2>' +
      '<p class="prompt">' + escapeHtml(item.payload.prompt) + '</p>' +
      renderAnswerControl(item, type, saved) +
      '<div class="actions">' +
      '<button class="secondary" data-action="back"' + (state.index === 0 ? ' disabled' : '') + '>Back</button>' +
      (state.index < total - 1 ? '<button class="primary" data-action="next">Next</button>' : '<button class="primary" data-action="submit"' + (state.busy ? ' disabled' : '') + '>Submit Assessment</button>') +
      '</div>' +
      '</section>';
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

  function renderResults() {
    const result = state.result || { skill_evidence: [], recommendations: [] };
    return '<section aria-labelledby="results-title">' +
      '<h2 id="results-title">Supportive skill results</h2>' +
      '<div class="notice"><strong>Important note</strong><ul class="limitations">' + LIMITATIONS.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul></div>' +
      '<div class="result-grid">' + result.skill_evidence.map(renderEvidence).join('') + '</div>' +
      renderRecommendations(result.recommendations) +
      renderReassessmentInvitation() +
      '</section>';
  }

  function renderEvidence(item) {
    const label = APPROVED_LABELS.includes(item.provisional_label) ? item.provisional_label : 'Not Enough Evidence';
    const name = item.skill || item.source_package_id || item.skill_id || 'Skill';
    return '<article class="result-card">' +
      '<h3>' + escapeHtml(name) + '</h3>' +
      '<p><span class="status-pill ' + LABEL_CLASS[label] + '">' + label + '</span></p>' +
      '<p>' + SUPPORT_TEXT[label] + '</p>' +
      '</article>';
  }

  function renderRecommendations(recommendations) {
    const shown = (recommendations || []).slice(0, 3);
    if (!shown.length) return '<div class="notice"><strong>Recommendations</strong><p class="helper">No extra recommendations are ready from this check-in.</p></div>';
    return '<section aria-labelledby="recommendations-title"><h2 id="recommendations-title">Recommended next steps</h2><div class="recommendation-grid">' +
      shown.map((item) => '<article class="recommendation-card"><h3>' + escapeHtml(item.skill || item.package_id || 'Skill') + '</h3><p>' + escapeHtml(item.reason || 'This is a friendly next practice step.') + '</p><div class="actions"><a class="route-button" href="' + escapeHtml(item.study_route) + '">Start Skill World</a><a class="route-button" href="' + escapeHtml(item.practice_route) + '">Practice This Skill</a></div></article>').join('') +
      '</div></section>';
  }

  function renderReassessmentInvitation() {
    if (!allowedReassessmentIds().length) return '';
    return '<section class="panel" aria-labelledby="recheck-invite-title">' +
      '<h2 id="recheck-invite-title">Want to check a skill again?</h2>' +
      '<p class="helper">A reassessment uses new questions when safe new questions are available.</p>' +
      '<div class="actions"><button class="primary" data-action="recheck-setup">Choose a Skill to Check Again</button></div>' +
      '</section>';
  }

  function renderReassessmentSetup() {
    const ids = allowedReassessmentIds();
    if (!ids.length) return '';
    return '<section class="panel" aria-labelledby="recheck-title">' +
      '<h2 id="recheck-title">Check a skill again</h2>' +
      '<p class="helper">A reassessment asks for new questions. If there are not enough new questions, we will say so.</p>' +
      renderCoverageNotice() +
      '<div class="checkbox-list">' + ids.map((id) => '<label><input type="checkbox" data-recheck-id="' + escapeHtml(id) + '"' + (state.selectedRecheck[id] ? ' checked' : '') + ' /> <span>' + escapeHtml(labelForPackage(id)) + '</span></label>').join('') + '</div>' +
      '<div class="actions"><button class="primary" data-action="reassessment">Start Reassessment</button></div>' +
      '</section>';
  }

  function renderCoverageNotice() {
    const coverage = state.session && Array.isArray(state.session.insufficient_evidence) ? state.session.insufficient_evidence : [];
    if (!coverage.length) return '';
    return '<div class="notice"><strong>New-question coverage</strong><ul>' + coverage.map((item) => '<li>' + escapeHtml(labelForPackage(item.package_id)) + ': only ' + item.safe_non_repeated_item_count + ' safe new question(s) are available.</li>').join('') + '</ul></div>';
  }

  function labelForPackage(packageId) {
    const evidence = state.result && (state.result.skill_evidence || []).find((item) => item.source_package_id === packageId || item.skill_id === packageId);
    if (evidence && evidence.skill) return evidence.skill;
    const recommendation = state.result && (state.result.recommendations || []).find((item) => item.package_id === packageId);
    return (recommendation && recommendation.skill) || packageId;
  }

  function renderError(message) {
    return '<section class="panel error" aria-labelledby="error-title"><h2 id="error-title">We need to pause.</h2><p>' + escapeHtml(message || state.message || 'Something went wrong.') + '</p><div class="actions"><button class="secondary" data-action="setup">Back to setup</button></div></section>';
  }

  function render() {
    const root = document.getElementById('assessment-app');
    if (!root) return;
    root.setAttribute('data-state', state.view);
    if (state.view === 'setup') root.innerHTML = renderSetup();
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
    if (target.id === 'grade-select') state.grade = target.value;
    if (target.id === 'subject-select') state.subject = target.value;
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
    if (action === 'back') move(-1);
    if (action === 'next') move(1);
    if (action === 'submit') submitResponses();
    if (action === 'recheck-setup') setView('reassessment setup', 'Choose a skill to check again.');
    if (action === 'setup') {
      Object.assign(state, { ...initialState, selectedRecheck: {}, responses: {} });
      setView('setup', 'Back at setup.');
    }
    if (action === 'reassessment') startReassessment();
  }

  function init() {
    const root = document.getElementById('assessment-app');
    if (!root) return;
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
    root.addEventListener('click', onClick);
    setStatus('Assessment setup is ready.');
    render();
  }

  const api = {
    APPROVED_LABELS,
    SUPPORTED_ITEM_TYPES,
    ITEMS_PER_PACKAGE,
    state,
    publicSessionOnly,
    publicResultOnly,
    allowedReassessmentIds,
    renderAnswerControl,
    startAssessment,
    submitResponses,
    startReassessment,
    updateResponse,
    render,
  };

  if (typeof window !== 'undefined') {
    window.AssessmentMvpLearner = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}());
