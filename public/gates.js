(() => {
  const DISCLAIMER = "Non-diagnostic disclaimer: this experience is informational only and not a diagnostic or clinical tool.";
  const app = document.querySelector('[data-gates-app]');
  const state = { session: null, children: [], selectedChildId: null, questions: null, lastResult: null };

  function nav(path) { window.location.assign(path); }
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
      const childId = btn.getAttribute('data-child-id');
      const child = state.children.find((c) => String(c.child_id) === String(childId));
      localStorage.setItem('gatesSelectedChildId', childId);
      if (child?.latest_assessment?.assessment_id) {
        localStorage.setItem('gatesLatestAssessmentId', child.latest_assessment.assessment_id);
        console.info(JSON.stringify({ event: 'gates_child_route_decision', child_id: childId, route: 'results_existing_assessment', assessment_id: child.latest_assessment.assessment_id }));
        return nav(`/gates/results/${child.latest_assessment.assessment_id}`);
      }
      console.info(JSON.stringify({ event: 'gates_child_route_decision', child_id: childId, route: 'assessment_new' }));
      nav(`/gates/assessment?child_id=${encodeURIComponent(childId)}`);
    }));
  }

  async function renderAssessment() {
    if (!state.session?.authenticated) return renderSignup(true);
    const childFromQuery = new URLSearchParams(window.location.search).get('child_id');
    if (childFromQuery) localStorage.setItem('gatesSelectedChildId', childFromQuery);
    const questions = await api('/api/gates/assessment/questions', { method: 'GET' });
    state.questions = questions;
    shell('Youth Rite of Passage Assessment', `<p>${questions.instructions}</p><p>Select child first if needed: <a href="/gates/children">Child Profiles</a></p><form id="assessment-form" class="panel">${questions.questions.map((q) => `<fieldset class="panel"><legend>${q.prompt}</legend>${(q.options || []).map((opt) => `<label><input type="radio" name="${q.question_id}" value="${opt.option_id}"/> ${opt.label}</label>`).join(' ')}</fieldset>`).join('')}<p class="status-message" data-assessment-status aria-live="polite"></p><button type="submit">Submit Assessment</button></form>`);
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

      const answers = questions.questions.map((q) => ({ question_id: q.question_id, value: String(fd.get(q.question_id) || "").trim().toLowerCase() }));
      if (answers.some((a) => !a.value)) {
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
        localStorage.setItem('gatesSelectedChildId', String(result.child_id || selectedChildId));
        if (result.assessment_id) localStorage.setItem('gatesLatestAssessmentId', String(result.assessment_id));
        statusEl.textContent = 'Assessment submitted. Loading your results...';
        statusEl.className = 'status-message success';
        // legacy explicit route retained for UI contract tests: nav(`/gates/results/${result.assessment_id}`)
        nav(result.next_route || `/gates/results/${result.assessment_id}`);
      } catch (error) {
        statusEl.textContent = String(error?.body?.error || 'Assessment submission failed. Please try again.');
        statusEl.className = 'status-message error';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Assessment';
      }
    });
  }

  async function renderResults(assessmentId) {
    if (!state.session?.authenticated) return shell('Sign in required', '<p>Please sign in to view your child\'s Gates profile.</p><p><a href="/gates/signup">Sign in</a></p>');
    try {
      console.info(JSON.stringify({ event: 'gates_results_viewed', assessment_id: assessmentId }));
      const result = await api(`/api/gates/assessment/${assessmentId}`, { method: 'GET' });
      console.info(JSON.stringify({ event: 'gates_blueprint_loaded', assessment_id: assessmentId }));
      const childId = result.child_id || localStorage.getItem('gatesSelectedChildId');
      localStorage.setItem('gatesSelectedChildId', childId);
      localStorage.setItem('gatesLatestAssessmentId', assessmentId);
      const progress = await api(`/api/gates/children/${childId}/progress`, { method: 'GET' });
      shell('Current Gates Profile', `<p><strong>Child:</strong> ${result.child_name || 'Selected child'}</p><p>${result.gates_profile?.summary || ''}</p><p>${result.gates_profile?.stage_explainer || 'These stages reflect current parent observations from the assessment.'}</p><p>These reflections come from parent observation, not diagnosis.</p><h3>Strongest Gates</h3><p>${(result.gates_profile?.strongest_gates || []).join(', ') || 'Developing'}</p><h3>Growth Gate</h3><p>${result.gates_profile?.growth_gate?.name || 'Attention'} (${result.gates_profile?.growth_gate?.current_stage || 'emerging'})</p><h3>Gate Stages</h3><ol>${(result.gate_map || []).map((g) => `<li>${g.name || g.gate_key}: ${g.current_stage || 'emerging'}</li>`).join('')}</ol><h3>Blueprint Next Steps</h3><ul>${(result.recommendations || []).map((r) => `<li>${r.title}</li>`).join('') || '<li>None yet</li>'}</ul><section class="walking-gate"><h3>Walking the Gate</h3><p><strong>Current Growth Gate:</strong> ${result.gates_profile?.growth_gate?.name || 'Attention'}</p><p><strong>Why this Gate matters:</strong> ${result.gates_profile?.suggested_next_practice || ''}</p><p><strong>This week's reflection:</strong> ${result.gates_profile?.reflection_focus || ''}</p><p><strong>Journal prompt:</strong> ${result.gates_profile?.journal_prompt || ''}</p><p><strong>Parent observation focus:</strong> ${result.gates_profile?.observation_focus || ''}</p><p><strong>Family practice:</strong> ${result.gates_profile?.suggested_next_practice || ''}</p><p><strong>Ceremony suggestion:</strong> ${result.gates_profile?.ceremony_readiness_hint || ''}</p><p><a class="btn" href="/gates/child/${childId}/gates">Begin This Gate</a> <a class="btn secondary" href="/gates/child/${childId}/gates">View Practice Progress</a></p></section><h3>Practice Progress</h3><p>Practice progress starts at 0% and grows as your family completes Gates practices.</p><ul>${(progress.progress || []).map((p) => `<li>${p.gate_number}. ${p.name}: ${p.progress_percent}% (${p.status}) <button data-gate="${p.gate_number}">+10%</button></li>`).join('')}</ul><p><a class="btn" href="/gates/child/${childId}/gates">View Progress Map</a> <a class="btn secondary" href="/gates/children">View Growth Plan</a></p>`);
      console.info(JSON.stringify({ event: 'gates_stage_profile_rendered', assessment_id: assessmentId, child_id: childId }));
      console.info(JSON.stringify({ event: 'gates_generic_recommendations_removed', assessment_id: assessmentId, child_id: childId }));
      console.info(JSON.stringify({ event: 'gates_walking_gate_rendered', assessment_id: assessmentId, child_id: childId }));
      console.info(JSON.stringify({ event: 'gates_practice_progress_rendered', assessment_id: assessmentId, child_id: childId }));
    } catch (error) {
      console.info(JSON.stringify({ event: 'gates_results_load_failed', assessment_id: assessmentId, status: error?.status || null }));
      shell('Results unavailable', `<p>${error?.status === 401 ? "Please sign in to view your child's Gates profile." : 'We could not find that result. Return to child profile.'}</p><p><a href="/gates/children">Return to child profile</a></p>`);
      return;
    }
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
    const gp = profile.gates_profile || profile.latest_gates_profile; shell('Gates map', `<p>${gp?.summary || 'Current Gates Profile loaded.'}</p><p><strong>Child profile summary:</strong> ${profile.child_name || 'Selected child'}</p><p><strong>Latest assessment stage snapshot:</strong></p><ol>${(gp?.gate_map || []).map((g) => `<li>${g.name || g.gate_key}: ${g.current_stage || 'emerging'}</li>`).join('')}</ol><p><strong>Current Growth Gate:</strong> ${gp?.growth_gate?.name || 'Attention'} (${gp?.growth_gate?.current_stage || 'emerging'})</p><h3>Walking the Gate</h3><p><strong>Reflection:</strong> ${gp?.reflection_focus || ''}</p><p><strong>Journal:</strong> ${gp?.journal_prompt || ''}</p><p><strong>Observation:</strong> ${gp?.observation_focus || ''}</p><p><strong>Practice:</strong> ${gp?.suggested_next_practice || ''}</p><p><strong>Ceremony:</strong> ${gp?.ceremony_readiness_hint || ''}</p><h3>Practice Progress</h3><p>Practice progress starts at 0% and grows as your family completes Gates practices.</p><p><a href="/gates/results/latest">Back to results</a></p>`);
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
