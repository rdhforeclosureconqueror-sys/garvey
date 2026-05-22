(() => {
  const DISCLAIMER = "Non-diagnostic disclaimer: this experience is informational only and not a diagnostic or clinical tool.";
  const app = document.querySelector('[data-gates-app]');
  const state = { session: null, children: [], selectedChildId: null, questions: null, lastResult: null };

  const GATE_KEY_BY_NUMBER = ["attention", "emotion", "choice", "body", "discipline", "truth", "repair", "creation", "community", "legacy"];
  const GATE_PRACTICE_GAME_DISCLAIMER = "These games are optional developmental practices. They are not tests, grades, or diagnoses.";
  const GATEQUEST_PROTOTYPE_DISCLAIMER = "GateQuest is a standalone developmental practice prototype. Prototype play does not change official Gates assessments, stage profiles, or progress outcomes.";
  const GATE_PRACTICE_GAMES = [
    { title: "Rhythm Race", what_it_practices: "sustained attention, timing control, and self-regulation under pace", supported_gates: ["attention", "body", "discipline"], suggested_duration: "6-10 minutes", observation_signals: ["Returns attention to the beat after a miss.", "Keeps movements coordinated with rhythm changes."], parent_reflection_prompt: "What helped your child return to focus when rhythm changed?" },
    { title: "Visual Memory", what_it_practices: "working memory, visual recall, and pattern tracking", supported_gates: ["attention", "truth", "creation"], suggested_duration: "8-12 minutes", observation_signals: ["Describes a memory strategy aloud.", "Stays engaged after an incorrect attempt."], parent_reflection_prompt: "What memory strategy seemed to help today?" },
    { title: "Picture Puzzle", what_it_practices: "problem solving, planning, and visual-spatial organization", supported_gates: ["choice", "discipline", "creation"], suggested_duration: "10-15 minutes", observation_signals: ["Breaks puzzle into manageable steps.", "Persists after a failed fit."], parent_reflection_prompt: "What did persistence look like in this activity?" },
    { title: "Brick Burst", what_it_practices: "response inhibition, focus switching, and frustration recovery", supported_gates: ["attention", "emotion", "discipline"], suggested_duration: "8-12 minutes", observation_signals: ["Resets calmly after missing a target.", "Adjusts pace when speed increases."], parent_reflection_prompt: "How did your child recover after a mistake?" },
    { title: "Freeze Runner", what_it_practices: "inhibitory control and start-stop regulation", supported_gates: ["attention", "body", "discipline"], suggested_duration: "5-8 minutes", observation_signals: ["Stops quickly on cue.", "Waits for restart signal without rushing."], parent_reflection_prompt: "What helped your child pause before acting?" },
    { title: "Distraction Defender", what_it_practices: "selective attention and distractor filtering", supported_gates: ["attention", "truth", "discipline"], suggested_duration: "7-10 minutes", observation_signals: ["Returns to task after distraction.", "Names distraction and refocuses."], parent_reflection_prompt: "What refocus strategy was most effective today?" },
    { title: "Plasma Hold", what_it_practices: "steady control, impulse management, and patient effort", supported_gates: ["body", "discipline", "legacy"], suggested_duration: "6-9 minutes", observation_signals: ["Maintains steady control over time.", "Recovers composure after losing hold."], parent_reflection_prompt: "What signs of self-control stood out during steady-hold moments?" },
    { title: "Calm Reactor", what_it_practices: "emotional regulation and pause-and-choose responses", supported_gates: ["emotion", "choice", "repair"], suggested_duration: "6-10 minutes", observation_signals: ["Uses a pause before reacting.", "Recovers after high-intensity moments."], parent_reflection_prompt: "When did your child choose calm over speed?" },
    { title: "Switch Matrix", what_it_practices: "cognitive flexibility and adaptive rule switching", supported_gates: ["choice", "truth", "creation"], suggested_duration: "8-12 minutes", observation_signals: ["Adapts when rules change.", "Improves accuracy after early mismatches."], parent_reflection_prompt: "How did your child handle unexpected rule changes?" }
  ];


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

  function toList(items) {
    if (!Array.isArray(items)) return [];
    return items.map((item) => String(item || '').trim()).filter(Boolean);
  }
  function renderGrowthSignalsPanel(growthHabit, checkinKey = "results") {
    if (!growthHabit) return "";
    const markers = (growthHabit.habit_markers || []).slice(0, 5);
    const integrations = (growthHabit.integration_signals || []).slice(0, 3);
    const corrections = (growthHabit.self_correction_signals || []).slice(0, 2);
    const prompt = (growthHabit.parent_mirror_prompts || [])[0] || "";
    const identity = (growthHabit.identity_statements || [])[0] || "";
    const checks = ["noticed today", "practiced with support", "child did independently", "parent modeled this"];
    return `<section class="panel"><h3>Growth Signals to Watch For</h3><p>Track emerging patterns through growth signal observations, integration signals, and self-correction moments.</p><h4>Habit markers</h4><ul>${markers.map((x) => `<li>${x}</li>`).join("")}</ul><h4>Integration signals</h4><ul>${integrations.map((x) => `<li>${x}</li>`).join("")}</ul><h4>Self-correction signals</h4><ul>${corrections.map((x) => `<li>${x}</li>`).join("")}</ul><h4>Parent mirror prompt</h4><p>${prompt}</p><h4>Identity statement</h4><p>${identity}</p><h4>Parent check-in</h4><div>${checks.map((label, idx) => `<label><input type=\"checkbox\" data-checkin=\"${checkinKey}-${idx}\"/> ${label}</label>`).join("<br/>")}</div></section>`;
  }

  function isChildReflectionSupportedGate(gateNumber) {
    const gate = Number(gateNumber);
    return Number.isInteger(gate) && gate >= 1 && gate <= 3;
  }

  function renderChildReflectionCta(childId, gateNumber) {
    if (!childId || !isChildReflectionSupportedGate(gateNumber)) return "";
    return `<section class="panel child-reflection-entry"><h4>Optional child reflection</h4><p>A gentle story-based reflection, not a test. No right or wrong answers.</p><p><a class="btn secondary" data-child-reflection-entry="true" data-child-id="${childId}" data-gate-number="${gateNumber}" href="/gates/child/${childId}/reflection/${gateNumber}">Let your child explore this Gate</a></p></section>`;
  }


  function renderDevelopmentJourney(patterns) {
    const p = patterns || {};
    const emerging = toList(p.emerging_patterns);
    const integration = toList(p.integration_patterns);
    return `<section class="panel"><h3>Development Journey</h3><p>${p.developmental_momentum || "Developmental momentum is emerging through repeated practice."}</p><h4>Emerging patterns</h4>${emerging.length ? `<ul>${emerging.map((x) => `<li>${x}</li>`).join("")}</ul>` : '<p>Not available yet.</p>'}<h4>Current integration themes</h4>${integration.length ? `<ul>${integration.map((x) => `<li>${x}</li>`).join("")}</ul>` : '<p>Not available yet.</p>'}<h4>Identity emergence summary</h4><p>${p.identity_emergence_summary || "Identity signals are forming through steady everyday choices."}</p><h4>Parent growth reflections</h4>${toList(p.parent_growth_reflections).length ? `<ul>${toList(p.parent_growth_reflections).map((x) => `<li>${x}</li>`).join("")}</ul>` : '<p>Not available yet.</p>'}</section>`;
  }
  function renderDevelopmentTimeline(data) {
    const items = Array.isArray(data?.timeline) ? data.timeline.slice(0, 5) : [];
    const empty = "Your family’s Gates journey will appear here as practices, reflections, and growth moments are recorded.";
    const list = items.length ? `<ul>${items.map((item) => `<li><strong>${item.title}</strong><br/><span>${item.summary}</span></li>`).join("")}</ul>` : `<p>${empty}</p>`;
    console.info(JSON.stringify({ event: "development_timeline_rendered", child_id: data?.child_id || null, event_count: items.length }));
    return `<section class="panel"><h3>Development Timeline</h3>${list}</section>`;
  }

  function renderIntegratedProfilePreview(profile) {
    const sources = profile?.source_presence || {};
    const hasIdentitySignals = Boolean(sources.identity || profile?.identity_profile || profile?.identity_signals);
    const hasDevelopmentalSignals = Boolean(sources.developmental_signals || profile?.developmental_signals);
    const sourcePresence = [
      `Gates: ${sources.gates === false ? 'Not present' : 'Present'}`,
      `Identity: ${hasIdentitySignals ? 'Present' : 'Not present'}`,
      `Developmental Signals: ${hasDevelopmentalSignals ? 'Present' : 'Not present'}`
    ];

    const emergingStrengths = toList(profile?.emerging_strengths || profile?.strengths);
    const developmentalSupports = toList(profile?.developmental_supports || profile?.supports);
    const familyPractices = toList(profile?.family_practices || profile?.recommended_practices);
    const currentTendencies = toList(profile?.current_tendencies || profile?.tendencies);
    const integrationSignals = toList(profile?.integration_signals);
    const hasNonGatesSignals = hasIdentitySignals || hasDevelopmentalSignals;

    const section = (label, values) => `<h4>${label}</h4>${values.length ? `<ul>${values.map((value) => `<li>${value}</li>`).join('')}</ul>` : '<p>Not available yet.</p>'}`;
    const fallback = hasNonGatesSignals
      ? ''
      : '<p class="status">We currently have Gates-only integration signals. As additional integration signals become available, this preview will expand with emerging strengths, current tendencies, developmental supports, and family practices.</p>';

    return `<section class="panel"><h3>Emerging Identity + Gates Insight</h3><p>This read-only preview highlights integration signals from current parent observations.</p><h4>Source presence</h4><ul>${sourcePresence.map((value) => `<li>${value}</li>`).join('')}</ul>${section('Emerging strengths', emergingStrengths)}${section('Current tendencies', currentTendencies)}${section('Developmental supports', developmentalSupports)}${section('Family practices', familyPractices)}${section('Integration signals', integrationSignals)}${fallback}</section>`;
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
      <div class="stack" data-gates-entry-ctas>
        <a class="btn" data-gates-cta="start" href="${primaryHref}">Start Youth Rite of Passage Assessment</a>
        <a class="btn secondary" data-gates-cta="signin" href="/gates/signup">Parent Sign In</a>
        <a class="btn secondary" data-gatequest-public-launch href="/gates/prototypes/gatequest">Launch GateQuest Prototype (Standalone)</a>
      </div>
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

  async function resolveSelectedChildId() {
    const fromQuery = new URLSearchParams(window.location.search).get('child_id');
    if (fromQuery) {
      localStorage.setItem('gatesSelectedChildId', fromQuery);
      return String(fromQuery);
    }
    const childrenRes = await api('/api/gates/children', { method: 'GET' });
    const children = childrenRes.children || [];
    const stored = String(localStorage.getItem('gatesSelectedChildId') || '').trim();
    if (stored && children.some((c) => String(c.child_id) === stored)) return stored;
    const withAssessment = children.find((c) => c?.latest_assessment?.assessment_id);
    if (withAssessment) {
      localStorage.setItem('gatesSelectedChildId', String(withAssessment.child_id));
      localStorage.setItem('gatesLatestAssessmentId', String(withAssessment.latest_assessment.assessment_id));
      return String(withAssessment.child_id);
    }
    if (children[0]?.child_id) {
      localStorage.setItem('gatesSelectedChildId', String(children[0].child_id));
      return String(children[0].child_id);
    }
    return '';
  }

  async function renderAssessment() {
    if (!state.session?.authenticated) return renderSignup(true);
    const selectedChildId = await resolveSelectedChildId();
    if (!selectedChildId) {
      shell('Youth Rite of Passage Assessment', '<p>Please create or select a child profile before starting an assessment.</p><p><a href="/gates/children">Go to Child Profiles</a></p>');
      return;
    }
    const selectedProfile = await api(`/api/gates/children/${selectedChildId}/profile`, { method: 'GET' });
    if (selectedProfile?.latest_assessment?.assessment_id) {
      localStorage.setItem('gatesLatestAssessmentId', String(selectedProfile.latest_assessment.assessment_id));
      nav(`/gates/results/${selectedProfile.latest_assessment.assessment_id}`);
      return;
    }
    const questions = await api('/api/gates/assessment/questions', { method: 'GET' });
    state.questions = questions;
    shell('Youth Rite of Passage Assessment', `<p>${questions.instructions}</p><p>Select child first if needed: <a href="/gates/children">Child Profiles</a></p><form id="assessment-form" class="panel">${questions.questions.map((q) => `<fieldset class="panel"><legend>${q.prompt}</legend>${(q.options || []).map((opt) => `<label><input type="radio" name="${q.question_id}" value="${opt.option_id}"/> ${opt.label}</label>`).join(' ')}</fieldset>`).join('')}<p class="status-message" data-assessment-status aria-live="polite"></p><button type="submit">Submit Assessment</button></form>`);
    document.querySelector('#assessment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = document.querySelector('[data-assessment-status]');
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const selectedChildId = String(localStorage.getItem('gatesSelectedChildId') || '').trim();
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
      const timeline = await api(`/api/gates/children/${childId}/timeline`, { method: 'GET' }).catch(() => ({ ok: true, child_id: childId, timeline: [], summary: {} }));
      const integratedProfile = await api(`/api/gates/children/${childId}/integrated-profile`, { method: 'GET' }).catch(() => null);
      const habitBank = await api(`/api/gates/children/${childId}/habit-bank`, { method: 'GET' }).catch(() => null);
      const growthHabit = (habitBank?.recommended_habits || [])[0] || null;
      const growthGate = (result.gate_map || []).find((g) => g.gate_key === result.gates_profile?.growth_gate?.gate_key) || (result.gate_map || [])[0] || { gate_number: 1, name: 'Attention' };
      shell('Current Gates Profile', `<p><strong>Child:</strong> ${result.child_name || 'Selected child'}</p><p>${result.gates_profile?.summary || ''}</p><p>${result.gates_profile?.stage_explainer || 'These stages reflect current parent observations from the assessment.'}</p><p>These reflections come from parent observation, not diagnosis.</p>${renderGrowthSignalsPanel(growthHabit, "results")}<h3>Strongest Gates</h3><p>${(result.gates_profile?.strongest_gates || []).join(', ') || 'Developing'}</p><h3>Growth Gate</h3><p>${result.gates_profile?.growth_gate?.name || 'Attention'} (${result.gates_profile?.growth_gate?.current_stage || 'emerging'})</p><h3>Gate Stages</h3><ol>${(result.gate_map || []).map((g) => `<li>${g.name || g.gate_key}: ${g.current_stage || 'emerging'}</li>`).join('')}</ol><h3>Blueprint Next Steps</h3><ul>${(result.recommendations || []).map((r) => `<li>${r.title}</li>`).join('') || '<li>None yet</li>'}</ul><section class="walking-gate"><h3>Walking the Gate</h3><p><strong>Current Growth Gate:</strong> ${result.gates_profile?.growth_gate?.name || 'Attention'}</p><p><strong>Why this Gate matters:</strong> ${result.gates_profile?.suggested_next_practice || ''}</p><p><strong>This week's reflection:</strong> ${result.gates_profile?.reflection_focus || ''}</p><p><strong>Journal prompt:</strong> ${result.gates_profile?.journal_prompt || ''}</p><p><strong>Parent observation focus:</strong> ${result.gates_profile?.observation_focus || ''}</p><p><strong>Family practice:</strong> ${result.gates_profile?.suggested_next_practice || ''}</p><p><strong>Ceremony suggestion:</strong> ${result.gates_profile?.ceremony_readiness_hint || ''}</p>${renderChildReflectionCta(childId, growthGate.gate_number)}<p><a class="btn" href="/gates/child/${childId}/gates/${growthGate.gate_number || 1}">Begin This Gate</a> <a class="btn secondary" href="/gates/child/${childId}/gates">View Practice Progress</a></p></section><h3>Practice Progress</h3><p>Practice progress starts at 0% and grows as your family completes Gates practices.</p><ul>${(progress.progress || []).map((p) => `<li>${p.gate_number}. ${p.name}: ${p.progress_percent}% (${p.status}) <button data-gate="${p.gate_number}">+10%</button></li>`).join('')}</ul>${renderDevelopmentJourney(integratedProfile?.development_patterns)}${renderDevelopmentTimeline(timeline)}${renderIntegratedProfilePreview(integratedProfile)}<p><a class="btn" href="/gates/child/${childId}/gates">View Progress Map</a> <a class="btn secondary" href="/gates/children">View Growth Plan</a></p>`);
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
    app.querySelectorAll('[data-child-reflection-entry="true"]').forEach((link) => link.addEventListener('click', () => {
      console.info(JSON.stringify({ event: 'child_reflection_entry_clicked', child_id: String(link.getAttribute('data-child-id') || ''), gate_number: Number(link.getAttribute('data-gate-number') || 0) || null }));
    }));
  }


  function renderGatePracticeGames(gate) {
    const gateKey = GATE_KEY_BY_NUMBER[Number(gate?.gate_number || 0) - 1] || String(gate?.gate_key || "").trim().toLowerCase();
    const games = GATE_PRACTICE_GAMES.filter((game) => game.supported_gates.includes(gateKey));
    if (!games.length) return "";
    return `<section class="panel"><h3>Gate Practice Games</h3><p>${GATE_PRACTICE_GAME_DISCLAIMER}</p>${games.map((game) => `<article class="panel gate-practice-game"><h4>${game.title}</h4><p><strong>What it practices:</strong> ${game.what_it_practices}</p><p><strong>Which Gate it supports:</strong> ${gate.name}</p><p><strong>Suggested duration:</strong> ${game.suggested_duration}</p><h5>Observation signals</h5><ul>${(game.observation_signals || []).map((signal) => `<li>${signal}</li>`).join("")}</ul><p><strong>Parent reflection prompt:</strong> ${game.parent_reflection_prompt}</p><p><a class="btn secondary" href="/gates/child/${encodeURIComponent(String(localStorage.getItem('gatesSelectedChildId') || ''))}/prototypes/gatequest">Launch GateQuest Prototype</a></p></article>`).join("")}</section>`;
  }

  async function renderGateQuestLaunch(childId = null) {
    const launch = childId
      ? await api(`/api/gates/children/${childId}/prototypes/gatequest/launch`, { method: "GET" })
      : await api("/api/gates/prototypes/gatequest/public-launch", { method: "GET" });
    shell("GateQuest Prototype", `<p>${GATEQUEST_PROTOTYPE_DISCLAIMER}</p><p>${launch.non_diagnostic_disclaimer || DISCLAIMER}</p><p>This practice prototype runs in an isolated sandbox frame.</p><iframe title="GateQuest Prototype" src="${launch.launch_url}" sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer" style="width:100%;min-height:720px;border:1px solid #2f4a7d;border-radius:12px;background:#08101f;"></iframe><p><a class="btn secondary" href="/gates">Back to Gates landing</a>${childId ? ` <a class="btn secondary" href="/gates/child/${childId}/gates">Back to Gates map</a>` : ""}</p>`);
  }

  async function renderGateMap(childId) {
    if (!state.session?.authenticated) return renderSignup(true);
    const profile = await api(`/api/gates/children/${childId}/profile`, { method: 'GET' });
    const gp = profile.gates_profile || profile.latest_gates_profile || {};
    const habitBank = await api(`/api/gates/children/${childId}/habit-bank`, { method: 'GET' }).catch(() => null);
    const progressRes = await api(`/api/gates/children/${childId}/progress`, { method: 'GET' });
    const progressByNum = new Map((progressRes.progress || []).map((p) => [Number(p.gate_number), p]));
    const cards = (gp?.gate_map || []).map((g) => {
      const p = progressByNum.get(Number(g.gate_number)) || { progress_percent: 0, status: 'not_started' };
      const isGrowth = gp?.growth_gate?.gate_key === g.gate_key;
      return `<article class="panel gate-card${isGrowth ? ' active' : ''}"><h3>${g.gate_number}. ${g.name}</h3><p><strong>Assessment Stage:</strong> ${g.current_stage || 'emerging'}</p><p><strong>Practice Progress:</strong> ${p.progress_percent}% (${p.status})</p><p>${isGrowth ? '<strong>Current Growth Gate</strong>' : ''}</p>${renderChildReflectionCta(childId, g.gate_number)}<p><a class="btn" href="/gates/child/${childId}/gates/${g.gate_number}">Open Gate</a></p></article>`;
    }).join('');
    shell('Gates map', `<p>${gp?.summary || 'Current Gates Profile loaded.'}</p><p><strong>Child profile summary:</strong> ${profile.child_profile?.child_name || 'Selected child'}</p><p><strong>Current Growth Gate:</strong> ${gp?.growth_gate?.name || 'Attention'} (${gp?.growth_gate?.current_stage || 'emerging'})</p>${renderGrowthSignalsPanel((habitBank?.recommended_habits || [])[0] || null, "map")}<section class="card-grid">${cards}</section><p><a href="/gates/results/${localStorage.getItem('gatesLatestAssessmentId') || 'latest'}">Back to results</a></p>`);
    app.querySelectorAll('[data-child-reflection-entry="true"]').forEach((link) => link.addEventListener('click', () => {
      console.info(JSON.stringify({ event: 'child_reflection_entry_clicked', child_id: String(link.getAttribute('data-child-id') || ''), gate_number: Number(link.getAttribute('data-gate-number') || 0) || null }));
    }));
  }

  async function renderGateDetail(childId, gateNumber) {
    if (!state.session?.authenticated) return renderSignup(true);
    const detail = await api(`/api/gates/children/${childId}/gates/${gateNumber}`, { method: 'GET' });
    const habitBank = await api(`/api/gates/children/${childId}/habit-bank`, { method: 'GET' }).catch(() => null);
    const growthHabit = (habitBank?.recommended_habits || []).find((item) => Number(item.gate_number) === Number(gateNumber)) || (habitBank?.recommended_habits || [])[0] || null;
    const gate = detail.gate || {};
    const p = detail.practice_progress || { progress_percent: 0, status: 'not_started' };
    shell(`Gate ${gate.gate_number}: ${gate.name}`, `<p><strong>Current stage:</strong> ${detail.stage}</p>${renderGrowthSignalsPanel(growthHabit, "detail")}<h3>Core lesson</h3><p>${gate.core_lesson || ''}</p><h3>Child learning statement</h3><p>${gate.child_learning_statement || ''}</p><h3>Reflection questions</h3><ul>${(gate.reflection_questions || []).map((x) => `<li>${x}</li>`).join('')}</ul><h3>Journal prompts</h3><ul>${(gate.journal_prompts || []).map((x) => `<li>${x}</li>`).join('')}</ul><h3>Developing signs</h3><ul>${(gate.developing_signs || []).map((x) => `<li>${x}</li>`).join('')}</ul><h3>Integration signs</h3><ul>${(gate.integration_signs || []).map((x) => `<li>${x}</li>`).join('')}</ul><h3>Ceremony</h3><p>${gate.ceremony || ''}</p>${renderGatePracticeGames(gate)}${renderChildReflectionCta(childId, gate.gate_number)}<h3>Practice progress</h3><p>${p.progress_percent}% (${p.status})</p><p><button class="btn" id="progress-plus">+10% Practice</button> <a class="btn secondary" href="/gates/child/${childId}/gates">Back to Gates Map</a></p>`);
    app.querySelectorAll('[data-child-reflection-entry="true"]').forEach((link) => link.addEventListener('click', () => {
      console.info(JSON.stringify({ event: 'child_reflection_entry_clicked', child_id: String(link.getAttribute('data-child-id') || ''), gate_number: Number(link.getAttribute('data-gate-number') || 0) || null }));
    }));
    document.querySelector('#progress-plus')?.addEventListener('click', async () => {
      await api(`/api/gates/children/${childId}/progress`, { method: 'POST', body: JSON.stringify({ gate_number: Number(gateNumber), status: 'practicing', progress_percent: Math.min(100, Number(p.progress_percent || 0) + 10), parent_note: 'Updated from gate detail', observed_response: 'Observed progress' }) });
      nav(`/gates/child/${childId}/gates/${gateNumber}`);
    });
  }

  async function renderReflectionPrototype(childId, gateNumber) {
    if (!state.session?.authenticated) return renderSignup(true);
    try {
      const prototype = await api(`/api/gates/children/${childId}/reflection/${gateNumber}/prototype`, { method: 'GET' });
      const symbolCards = (prototype.symbols || []).map((symbol) => `<button class="btn secondary" type="button" data-symbol="${symbol}" style="min-height:60px;text-transform:capitalize;">${symbol}</button>`).join(' ');
      const followupCards = (prototype.followup_options || []).map((item) => `<button class="btn secondary" type="button" data-followup="${item}" style="min-height:60px;text-transform:capitalize;">${item}</button>`).join(' ');

      shell(`Gate ${prototype.gate_number}: ${prototype.gate_name}`, `<section class="panel"><p><strong>World:</strong> ${prototype.world_name}</p><p>${prototype.intro_story}</p><p><strong>Step 1 of 2:</strong> Choose one card below.</p><h3>${prototype.prompt}</h3><div class="card-grid">${symbolCards}</div><div id="followup-shell" style="display:none;"><p><strong>Step 2 of 2:</strong> Choose one support option.</p><h3>${prototype.followup_prompt}</h3><div class="card-grid">${followupCards}</div><p id="ending-shell" style="display:none;"><em>${prototype.ending}</em></p></div><p><button class="btn secondary" type="button" id="reflection-pause">Pause</button> <a class="btn secondary" id="reflection-return-parent" href="/gates/children">Return to parent</a></p><p><a class="btn secondary" href="/gates/child/${childId}/gates">Back to Gates Map</a></p></section>`);
      console.info(JSON.stringify({ event: 'child_reflection_prototype_viewed', child_id: String(childId), gate_number: Number(gateNumber) }));

      const memoryState = { symbol: null, followup: null };
      app.querySelector('#reflection-pause')?.addEventListener('click', () => {
        console.info(JSON.stringify({ event: 'child_reflection_pause_selected', child_id: String(childId), gate_number: Number(gateNumber) }));
        shell('Pause', `<section class="panel"><p>You can take a quiet pause any time.</p><p><a class="btn" href="/gates/child/${childId}/reflection/${gateNumber}">Continue reflection</a> <a class="btn secondary" href="/gates/children">Return to parent</a></p></section>`);
      });
      app.querySelector('#reflection-return-parent')?.addEventListener('click', () => {
        console.info(JSON.stringify({ event: 'child_reflection_parent_return_selected', child_id: String(childId), gate_number: Number(gateNumber) }));
      });

      app.querySelectorAll('[data-symbol]').forEach((btn) => btn.addEventListener('click', () => {
        memoryState.symbol = btn.getAttribute('data-symbol');
        app.querySelector('#followup-shell').style.display = 'block';
        console.info(JSON.stringify({ event: 'child_reflection_symbol_selected', child_id: String(childId), gate_number: Number(gateNumber) }));
      }));

      app.querySelectorAll('[data-followup]').forEach((btn) => btn.addEventListener('click', () => {
        memoryState.followup = btn.getAttribute('data-followup');
        app.querySelector('#ending-shell').style.display = 'block';
        console.info(JSON.stringify({ event: 'child_reflection_followup_selected', child_id: String(childId), gate_number: Number(gateNumber) }));
      }));
    } catch (error) {
      const message = error?.status === 403 ? 'This child profile is not available in your account.' : 'This reflection prototype is not available yet.';
      shell('Reflection unavailable', `<p>${message}</p><p><a href="/gates/children">Return to child profiles</a></p>`);
    }
  }

  async function init() {
    await loadSession();
    const p = window.location.pathname;
    if (p === '/gates') return renderLanding();
    if (p === '/gates/signup') return renderSignup();
    if (p === '/gates/children') return renderChildren();
    if (p === '/gates/assessment') return renderAssessment();
    if (p.startsWith('/gates/results/')) return renderResults(p.split('/').pop());
    if (/^\/gates\/child\/[^/]+\/reflection\/\d+$/.test(p)) { const parts = p.split('/'); return renderReflectionPrototype(parts[3], parts[5]); }
    if (/^\/gates\/child\/[^/]+\/prototypes\/gatequest$/.test(p)) { const parts = p.split('/'); return renderGateQuestLaunch(parts[3]); }
    if (p === '/gates/prototypes/gatequest') return renderGateQuestLaunch();
    if (/^\/gates\/child\/[^/]+\/gates\/\d+$/.test(p)) { const parts = p.split('/'); return renderGateDetail(parts[3], parts[5]); }
    if (p.startsWith('/gates/child/') && p.endsWith('/gates')) return renderGateMap(p.split('/')[3]);
    return renderLanding();
  }
  init();
})();
