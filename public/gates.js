(() => {
  const DISCLAIMER = "Non-diagnostic disclaimer: this experience is informational only and not a diagnostic or clinical tool.";
  const app = document.querySelector('[data-gates-app]');
  const state = { session: null, children: [], selectedChildId: null, questions: null, lastResult: null };

  function nav(path) { window.location.assign(path + (window.location.search || "")); }
  function gateList() {
    return ["Attention", "Emotion", "Choice", "Body", "Discipline", "Truth", "Repair", "Creation", "Community", "Legacy"];
  }
  async function api(path, options = {}) {
    const res = await fetch(path, { credentials: 'include', headers: { 'content-type': 'application/json', ...(options.headers || {}) }, ...options });
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const body = isJson ? await res.json() : await res.text();
    if (!res.ok) throw { status: res.status, body };
    return body;
  }

  function shell(title, bodyHtml) {
    app.innerHTML = `<main class="gates-shell"><section class="gates-card"><h1>The Gates</h1><h2>${title}</h2><p class="disclaimer">${DISCLAIMER}</p>${bodyHtml}</section></main>`;
  }

  async function loadSession() {
    try { state.session = await api('/api/gates/auth/session', { method: 'GET' }); }
    catch { state.session = { authenticated: false }; }
  }

  function renderLanding() {
    const primaryHref = state.session?.authenticated ? '/gates/children' : '/gates/signup';
    shell('Pilot experience', `
      <p class="lede">Parents can now run the Youth Rite of Passage pilot flow end-to-end for their child.</p>
      <h3>10 Gates Overview</h3>
      <ol class="gate-overview">${gateList().map((x) => `<li>${x}</li>`).join('')}</ol>
      <div class="stack"><a class="btn" href="${primaryHref}">Start Youth Rite of Passage Assessment</a><a class="btn secondary" href="/gates/signup">Parent Sign In</a></div>
    `);
  }

  function renderSignup(authRequired = false) {
    shell('Parent account access', `
      ${authRequired ? '<p class="status">Please sign in to continue.</p>' : ''}
      <div class="card-grid"><form class="panel" id="signup-form"><h3>Create account</h3><input name="parent_name" placeholder="Parent name" required/><input name="email" type="email" placeholder="Email" required/><input name="password" type="password" placeholder="Password" required minlength="8"/><button type="submit">Create Parent Account</button></form>
      <form class="panel" id="signin-form"><h3>Sign in</h3><input name="email" type="email" placeholder="Email" required/><input name="password" type="password" placeholder="Password" required/><button type="submit">Parent Sign In</button></form></div>
      <p><a href="/gates">Back to Gates</a></p>
    `);
    document.querySelector('#signup-form').addEventListener('submit', async (e) => {
      e.preventDefault(); const fd = new FormData(e.target);
      await api('/api/gates/auth/signup', { method: 'POST', body: JSON.stringify(Object.fromEntries(fd.entries())) });
      nav('/gates/children');
    });
    document.querySelector('#signin-form').addEventListener('submit', async (e) => {
      e.preventDefault(); const fd = new FormData(e.target);
      await api('/api/gates/auth/signin', { method: 'POST', body: JSON.stringify(Object.fromEntries(fd.entries())) });
      nav('/gates/children');
    });
  }

  async function renderChildren() {
    if (!state.session?.authenticated) return renderSignup(true);
    const data = await api('/api/gates/children', { method: 'GET' });
    state.children = data.children || [];
    shell('Child profiles', `
      <form class="panel" id="child-form"><input name="child_name" placeholder="Child name" required/><input name="child_age_band" placeholder="Age band" required/><input name="child_grade_band" placeholder="Grade band" required/><button type="submit">Create Child Profile</button></form>
      <section class="card-grid">${state.children.map((c) => `<article class="panel gate-card"><h3>${c.child_name}</h3><p>${c.child_age_band} · ${c.child_grade_band}</p><button data-child-id="${c.child_id}">Select Child</button></article>`).join('') || '<p>No child profiles yet.</p>'}</section>
      <p><a href="/gates/assessment">Continue to Assessment</a></p>`);
    document.querySelector('#child-form').addEventListener('submit', async (e) => {
      e.preventDefault(); const fd = new FormData(e.target); const payload = Object.fromEntries(fd.entries()); payload.metadata = { source: 'parent_manual' };
      await api('/api/gates/children', { method: 'POST', body: JSON.stringify(payload) });
      nav('/gates/children');
    });
    app.querySelectorAll('[data-child-id]').forEach((btn) => btn.addEventListener('click', () => {
      localStorage.setItem('gatesSelectedChildId', btn.getAttribute('data-child-id')); nav('/gates/assessment');
    }));
  }

  async function renderAssessment() {
    if (!state.session?.authenticated) return renderSignup(true);
    const selected = localStorage.getItem('gatesSelectedChildId');
    const questions = await api('/api/gates/assessment/questions', { method: 'GET' });
    state.questions = questions;
    shell('Youth Rite of Passage Assessment', `<p>${questions.instructions}</p><p>Select child first if needed: <a href="/gates/children">Child Profiles</a></p><form id="assessment-form" class="panel">${questions.questions.map((q) => `<fieldset class="panel"><legend>${q.prompt}</legend>${[1,2,3,4,5].map((v) => `<label><input type="radio" name="${q.question_id}" value="${v}"/> ${v}</label>`).join(' ')}</fieldset>`).join('')}<p class="status-message" data-assessment-status aria-live="polite"></p><button type="submit">Submit Assessment</button></form>`);
    document.querySelector('#assessment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = document.querySelector('[data-assessment-status]');
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const selectedChildId = localStorage.getItem('gatesSelectedChildId');
      const fd = new FormData(e.target);

      if (!selectedChildId) {
        statusEl.textContent = 'Please select a child profile before submitting the assessment.';
        statusEl.className = 'status-message error';
        return;
      }

      const answers = questions.questions.map((q) => ({ question_id: q.question_id, answer: Number(fd.get(q.question_id)) }));
      if (answers.some((a) => !Number.isFinite(a.answer) || a.answer < 1 || a.answer > 5)) {
        statusEl.textContent = 'Please answer every question before submitting.';
        statusEl.className = 'status-message error';
        return;
      }

      statusEl.textContent = 'Submitting assessment...';
      statusEl.className = 'status-message';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      try {
        const result = await api('/api/gates/assessment/submit', { method: 'POST', body: JSON.stringify({ child_id: selectedChildId, assessment_version: questions.assessment_version, answers }) });
        statusEl.textContent = 'Assessment submitted. Loading your results...';
        statusEl.className = 'status-message success';
        nav(`/gates/results/${result.assessment_id}`);
      } catch {
        statusEl.textContent = 'Assessment submission failed. Please try again.';
        statusEl.className = 'status-message error';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Assessment';
      }
    });
  }

  async function renderResults(assessmentId) {
    if (!state.session?.authenticated) return renderSignup(true);
    const childId = localStorage.getItem('gatesSelectedChildId');
    const profile = await api(`/api/gates/children/${childId}/profile`, { method: 'GET' });
    const recommendations = await api(`/api/gates/children/${childId}/recommendations`, { method: 'GET' });
    const progress = await api(`/api/gates/children/${childId}/progress`, { method: 'GET' });
    shell('Results', `<p>Assessment ID: ${assessmentId}</p><p>${profile.gates_profile?.summary || ''}</p><h3>Recommendations</h3><ul>${(recommendations.recommendations || []).map((r) => `<li>${r.title}</li>`).join('') || '<li>None yet</li>'}</ul><h3>Progress</h3><ul>${(progress.progress || []).map((p) => `<li>${p.gate_number}. ${p.name}: ${p.progress_percent}% (${p.status}) <button data-gate="${p.gate_number}">+10%</button></li>`).join('')}</ul><p><a href="/gates/child/${childId}/gates">Open Gates Map</a></p>`);
    app.querySelectorAll('[data-gate]').forEach((btn) => btn.addEventListener('click', async () => {
      const gateNumber = Number(btn.getAttribute('data-gate'));
      const item = (progress.progress || []).find((x) => Number(x.gate_number) === gateNumber);
      await api(`/api/gates/children/${childId}/progress`, { method: 'POST', body: JSON.stringify({ gate_number: gateNumber, status: 'practicing', progress_percent: Math.min(100, Number(item?.progress_percent || 0) + 10), parent_note: 'Updated from pilot UI', observed_response: 'Observed progress' }) });
      nav(`/gates/results/${assessmentId}`);
    }));
  }

  async function renderGateMap(childId) {
    if (!state.session?.authenticated) return renderSignup(true);
    const profile = await api(`/api/gates/children/${childId}/profile`, { method: 'GET' });
    shell('Gates map', `<p>${profile.gates_profile?.summary || 'No Gates profile yet.'}</p><ol>${(profile.gates_profile?.gate_map || []).map((g) => `<li>${g.gate_name || g.name || g.gate_key}</li>`).join('')}</ol><p><a href="/gates/results/latest">Back to results</a></p>`);
  }

  async function init() {
    await loadSession();
    const p = window.location.pathname;
    if (p === '/gates') return renderLanding();
    if (p === '/gates/signup') return renderSignup();
    if (p === '/gates/children') return renderChildren();
    if (p === '/gates/assessment') return renderAssessment();
    if (p.startsWith('/gates/results/')) return renderResults(p.split('/').pop());
    if (p.startsWith('/gates/child/') && p.endsWith('/gates')) return renderGateMap(p.split('/')[3]);
    return renderLanding();
  }
  init();
})();
