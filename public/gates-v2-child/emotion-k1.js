(() => {
  'use strict';
  const task = document.querySelector('#task');
  const progress = document.querySelector('#progress-label');
  const progressBar = document.querySelector('#progress-bar');
  const summaryDialog = document.querySelector('#parent-summary');
  let sessionId = null;
  let current = null;
  const progressWidths = { Beginning: '12%', Noticing: '38%', Choosing: '65%', Reflecting: '84%', Complete: '100%' };

  async function request(path, options = {}) {
    const response = await fetch(`/gates-v2-child/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'The path is resting. Please try again.');
    return result;
  }

  function welcome() {
    progress.textContent = 'Beginning';
    task.innerHTML = layout('✨', 'Welcome, Explorer', [
      '<p>Feelings can be big.</p><p>We can notice them and choose what to do next.</p><p>Help Maya explore what happens when her block tower tumbles.</p>',
      '<div class="actions"><button id="start" type="button">Start Adventure</button><button class="narrate" type="button" data-speak="Feelings can be big. We can notice them and choose what to do next.">🔊 Read to Me</button></div>'
    ].join(''), 'A princess guide and unicorn welcome you at a magical gate.');
    bindCommon();
    document.querySelector('#start').addEventListener('click', start);
  }

  async function start() {
    try { const result = await request('/start', { method: 'POST', body: '{}' }); sessionId = result.session_id; render(result); }
    catch (error) { showError(error); }
  }

  function render(result) {
    current = result;
    const node = result.projection.current_node;
    const vm = viewModel(node);
    progress.textContent = vm.progress;
    progressBar.style.width = progressWidths[vm.progress];
    let controls = '';
    if (node.node_type === 'content') controls = '<div class="actions"><button id="continue" type="button">Continue</button></div>';
    else if (node.node_type === 'completion') controls = '<div class="actions"><button id="replay" type="button">Try Another Choice</button><button id="return" class="quiet" type="button">Return to Gate</button></div>';
    else controls = `<div class="choices">${node.options.map((option) => `<button class="choice" type="button" data-option="${escapeHtml(option.option_id)}"><span class="choice-icon" aria-hidden="true">${iconFor(option.option_id)}</span><span>${escapeHtml(option.child_action_text)}</span></button>`).join('')}</div>`;
    const breathe = node.node_type === 'practice' ? '<div class="breath-orb" aria-hidden="true"></div><p class="breath-note">Follow the gentle circle—or breathe at your own pace.</p>' : '';
    const consequence = node.node_id.endsWith('_result') || node.node_id === 'push_result' ? '<p class="eyebrow">Let’s see what happened</p>' : `<p class="eyebrow">${escapeHtml(vm.progress)}</p>`;
    const narration = `<button class="narrate" type="button" data-speak="${escapeHtml(node.visible_text.join(' '))}">🔊 Read this screen</button>`;
    task.innerHTML = layout(vm.icon, vm.title, `${consequence}<div class="story-lines">${node.visible_text.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}</div>${breathe}${controls}<div class="actions">${narration}</div>`, node.accessibility_label);
    bindCommon();
    task.querySelector('#continue')?.addEventListener('click', () => act({}));
    task.querySelector('#replay')?.addEventListener('click', replay);
    task.querySelector('#return')?.addEventListener('click', welcome);
    task.querySelectorAll('[data-option]').forEach((button) => button.addEventListener('click', () => act({ option_id: button.dataset.option })));
    task.focus({ preventScroll: true });
  }

  async function act(action) { try { render(await request(`/session/${sessionId}/action`, { method: 'POST', body: JSON.stringify(action) })); } catch (error) { showError(error); } }
  async function replay() { try { render(await request(`/session/${sessionId}/replay`, { method: 'POST', body: '{}' })); } catch (error) { showError(error); } }

  function viewModel(node) {
    const titles = { opening: 'The Tower Tumbles', notice_feeling: 'Notice a Feeling', notice_body: 'Notice a Body Clue', pause: 'Pause Together', first_action: 'Choose Maya’s Next Step', ask_result: 'Leo Explains', space_result: 'Maya Takes Space', healthy_followup: 'Choose What Comes Next', push_result: 'The Problem Gets Bigger', repair_choice: 'A Chance to Repair', repair_result: 'Repair Begins', reflection: 'Think Together', complete: 'Adventure Complete' };
    const icons = { opening: '🏰', notice_feeling: '💭', notice_body: '🫶', pause: '🌬️', first_action: '🛤️', ask_result: '💬', space_result: '🌿', healthy_followup: '🤝', push_result: '🧱', repair_choice: '🪡', repair_result: '💛', reflection: '✨', complete: '🌈' };
    const p = node.node_id === 'opening' ? 'Beginning' : node.node_id.startsWith('notice') || node.node_id === 'pause' ? 'Noticing' : node.node_id === 'reflection' ? 'Reflecting' : node.node_id === 'complete' ? 'Complete' : 'Choosing';
    return { title: titles[node.node_id] || 'Emotion Gate', icon: icons[node.node_id] || '✨', progress: p };
  }

  function layout(icon, title, content, label) { return `<div class="scene" role="img" aria-label="${escapeHtml(label)}"><div class="gate"><span class="scene-icon" aria-hidden="true">${icon}</span></div><div class="companions" aria-hidden="true">👸🏾 ✦ 🦄</div></div><div class="copy"><h1>${escapeHtml(title)}</h1>${content}</div>`; }
  function iconFor(id) { return /adult/.test(id) ? '🧑‍🤝‍🧑' : /space/.test(id) ? '🌿' : /push/.test(id) ? '🧱' : /breath|pause/.test(id) ? '🌬️' : /face|hand|heart|body/.test(id) ? '🫶' : '✦'; }
  function escapeHtml(value) { const span = document.createElement('span'); span.textContent = String(value); return span.innerHTML.replace(/"/g, '&quot;'); }
  function showError(error) {
    task.querySelector('.error')?.remove();
    const message = error && error.message ? error.message : 'This path needs a fresh start.';
    const restart = '<button type="button" id="restart-after-error">Start again</button>';
    task.querySelector('.copy')?.insertAdjacentHTML('beforeend', `<div class="error" role="alert"><p>${escapeHtml(message)}</p><div class="actions">${restart}</div></div>`);
    task.querySelector('#restart-after-error')?.addEventListener('click', () => { sessionId = null; welcome(); });
  }
  function bindCommon() { task.querySelectorAll('[data-speak]').forEach((button) => button.addEventListener('click', () => speak(button.dataset.speak))); }
  function speak(text) { if (!('speechSynthesis' in window)) return showError(new Error('Read to Me is not available in this browser. The words are here to read together.')); window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); }

  document.querySelector('#calm-toggle').addEventListener('click', (event) => { const enabled = document.documentElement.classList.toggle('low-stimulation'); event.currentTarget.setAttribute('aria-pressed', String(enabled)); event.currentTarget.textContent = enabled ? 'Storybook view' : 'Calm view'; });
  document.querySelector('#exit-button').addEventListener('click', async () => {
    const result = sessionId ? await request(`/session/${sessionId}/exit`, { method: 'POST', body: '{}' }).catch(() => null) : null;
    const summary = result?.summary || { gate_practiced: 'Emotion Gate', experience_status: 'not started', tools_introduced: ['Notice, pause, and choose'], paths_explored: 0, repair_practiced: false, family_practice: 'Name emotional weather together.' };
    document.querySelector('#summary-content').innerHTML = `<ul class="summary-list"><li><strong>Practiced:</strong> ${escapeHtml(summary.gate_practiced)}</li><li><strong>Experience:</strong> ${escapeHtml(summary.experience_status)}</li><li><strong>Tools:</strong> ${summary.tools_introduced.map(escapeHtml).join(', ')}</li><li><strong>Paths explored:</strong> ${summary.paths_explored}</li><li><strong>Repair practiced:</strong> ${summary.repair_practiced ? 'Yes' : 'Not yet'}</li></ul><p><strong>Try together:</strong> ${escapeHtml(summary.family_practice)}</p><p>This early Gates learning summary stays local to this temporary session and is not saved.</p>`;
    summaryDialog.showModal();
  });
  document.querySelector('#keep-going').addEventListener('click', () => summaryDialog.close());
  document.querySelector('#leave-summary').addEventListener('click', () => { summaryDialog.close(); sessionId = null; welcome(); });
  welcome();
})();
