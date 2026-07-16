const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');
const { createAdaptiveV2Router } = require('../server/adaptiveV2Routes');
const { sha256 } = require('../server/gatesAuth');

const PRINCESS_NIA_CHILD_ID = '101';
const PARENT_PROFILE_ID = 55;
const AUTH_USER_ID = 501;

function princessNiaFirstName() {
  return JSON.stringify({ child_name: 'Princess Nia', child_age_band: '6-8', child_grade_band: 'Grade 1' });
}

function makeAuthenticatedCookie(token = 'parent-token-princess-nia') {
  return `gates_parent_session=${encodeURIComponent(token)}`;
}

function makePool() {
  const state = {
    progress: new Map(),
    attempts: [],
    skillWorlds: new Map(),
    gatesWrites: 0,
    sessions: new Map(),
    childProfiles: new Map([[PRINCESS_NIA_CHILD_ID, { id: Number(PRINCESS_NIA_CHILD_ID), parent_id: PARENT_PROFILE_ID, first_name: princessNiaFirstName() }]]),
  };
  function addSession(token = 'parent-token-princess-nia') {
    state.sessions.set(sha256(token), {
      id: state.sessions.size + 1,
      user_id: AUTH_USER_ID,
      tenant_id: 1,
      role: 'parent',
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      email: 'parent@example.com',
      parent_profile_id: PARENT_PROFILE_ID,
      display_name: 'Princess Nia Parent',
    });
    return makeAuthenticatedCookie(token);
  }
  addSession();
  return {
    state,
    addSession,
    async query(sql, params = []) {
      const q = String(sql);
      if (q.includes('FROM auth_sessions s') && q.includes('gates_parent_profiles')) {
        const row = state.sessions.get(params[0]);
        return { rows: row ? [row] : [] };
      }
      if (q.includes('SELECT id, parent_id, first_name FROM gates_child_profiles WHERE id = $1')) {
        const row = state.childProfiles.get(String(params[0]));
        return { rows: row ? [row] : [] };
      }
      if (q.includes('INSERT INTO adaptive_v2_skill_progress')) {
        state.progress.set(String(params[0]), {
          child_id: String(params[0]),
          grade: '1',
          runtime_version: 'adaptive_v2',
          selected_skill_id: params[1],
          checkpoint_attempts: params[2],
          correct_count: params[3],
          total_count: params[4],
          hint_usage_count: params[5],
          mastery_band: params[6],
          next_recommended_skill_id: params[7],
          parent_summary_snapshot: JSON.parse(params[8]),
          parent_profile_id: String(params[9]),
          auth_user_id: params[10],
          learner_display_name: params[11],
          created_at: '2026-07-16T10:00:00Z',
          updated_at: '2026-07-16T10:00:00Z',
        });
        return { rows: [] };
      }
      if (q.includes('INSERT INTO adaptive_v2_checkpoint_attempts')) {
        state.attempts.push({ child_id: String(params[0]), skill_id: params[1], checkpoint_id: params[2], is_correct: params[3], mastery_band_after: params[4], next_recommended_skill_id: params[5], parent_profile_id: String(params[6]), auth_user_id: params[7], created_at: '2026-07-16T10:00:00Z' });
        return { rows: [] };
      }
      if (q.includes('INSERT INTO skill_world_progress')) {
        const key = `${params[0]}:${params[4]}:${params[5]}`;
        state.skillWorlds.set(key, { child_id: String(params[0]), parent_profile_id: String(params[1]), auth_user_id: params[2], learner_display_name: params[3], skill_id: params[4], mode: params[5], status: params[6], progress_percent: params[7], attempts: params[8], correct: params[9], score_percent: params[10], hints_used: params[11], last_step: params[12], profile: JSON.parse(params[13]), state_snapshot: JSON.parse(params[14]), created_at: '2026-07-16T10:15:00Z', updated_at: '2026-07-16T10:15:00Z' });
        return { rows: [] };
      }
      if (q.includes('INSERT INTO gates_') || q.includes('UPDATE gates_')) { state.gatesWrites += 1; return { rows: [] }; }
      if (q.includes('FROM skill_world_progress')) return { rows: [...state.skillWorlds.values()].filter((row) => String(row.child_id) === String(params[0]) && (!params[1] || String(row.parent_profile_id) === String(params[1]))) };
      if (q.includes('FROM adaptive_v2_checkpoint_attempts')) return { rows: state.attempts.filter((row) => String(row.child_id) === String(params[0]) && (!params[1] || String(row.parent_profile_id) === String(params[1]))) };
      if (q.includes('FROM adaptive_v2_skill_progress')) {
        const row = state.progress.get(String(params[0]));
        return { rows: row && (!params[1] || String(row.parent_profile_id) === String(params[1])) ? [row] : [] };
      }
      if (q.includes('FROM assessment_sessions')) return { rows: [] };
      return { rows: [] };
    },
  };
}

async function start() { const pool = makePool(); const app = express(); app.use(express.json()); app.use(createAdaptiveV2Router({ pool })); const server = http.createServer(app); await new Promise(r=>server.listen(0,r)); return { pool, server, baseUrl:`http://127.0.0.1:${server.address().port}`}; }

function checkpointPayload(overrides = {}) {
  return { child_id: PRINCESS_NIA_CHILD_ID, grade:'1', runtime_version:'adaptive_v2', skill_id:'G1-MATH-05', checkpoint_id: 'lesson-5-checkpoint', checkpoint_attempts:1, correct_count:1, total_count:1, hint_usage_count:0, mastery_band:'consistent', next_recommended_skill_id:'G1-MATH-06', parent_summary_snapshot:{ note:'supportive summary only' }, ...overrides };
}

test('adaptive v2 grade1 progress write/read and guardrails require owned Princess Nia context', async () => {
  const { server, baseUrl, pool } = await start();
  try {
    const bad = await fetch(`${baseUrl}/api/adaptive-v2/progress/checkpoint-attempt`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ child_id:PRINCESS_NIA_CHILD_ID, grade:'2', runtime_version:'adaptive_v2', skill_id:'s1' }) });
    assert.equal(bad.status, 400);

    const unauth = await fetch(`${baseUrl}/api/adaptive-v2/progress/checkpoint-attempt`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(checkpointPayload()) });
    assert.equal(unauth.status, 401);

    const fakeChild = await fetch(`${baseUrl}/api/adaptive-v2/progress/checkpoint-attempt`, { method:'POST', headers:{'content-type':'application/json', cookie: makeAuthenticatedCookie()}, body: JSON.stringify(checkpointPayload({ child_id: 'guest-1' })) });
    assert.equal(fakeChild.status, 400);

    const ok = await fetch(`${baseUrl}/api/adaptive-v2/progress/checkpoint-attempt`, { method:'POST', headers:{'content-type':'application/json', cookie: makeAuthenticatedCookie()}, body: JSON.stringify(checkpointPayload({ next_recommended_skill_id:'G1-MATH-06' })) });
    assert.equal(ok.status, 200);

    const read = await fetch(`${baseUrl}/api/adaptive-v2/progress/summary/${PRINCESS_NIA_CHILD_ID}`);
    const body = await read.json();
    assert.equal(body.empty_state, false);
    assert.equal(body.progress.next_recommended_skill_id, 'G1-MATH-06');
    assert.equal(body.summary_contract_version, 'pr_f_v1');
    assert.equal(Array.isArray(body.parent_summary.practiced_skills), true);
    assert.equal(typeof body.parent_summary.recommended_next_step, 'string');
    assert.equal(pool.state.attempts.length, 1);
    assert.equal(pool.state.attempts[0].child_id, PRINCESS_NIA_CHILD_ID);
    assert.equal(pool.state.attempts[0].parent_profile_id, String(PARENT_PROFILE_ID));
    assert.equal(JSON.stringify(body).toLowerCase().includes('diagnosis'), false);

    const journey = await fetch(`${baseUrl}/api/learning-journey/${PRINCESS_NIA_CHILD_ID}`, { headers:{ cookie: makeAuthenticatedCookie() } });
    const journeyBody = await journey.json();
    assert.equal(journeyBody.ok, true);
    assert.equal(journeyBody.child_name, 'Princess Nia');
    assert.equal(journeyBody.current.lesson, 'G1-MATH-05');
    assert.equal(journeyBody.current.recommendation.activity_id, 'G1-MATH-06');
  } finally { await new Promise(r=>server.close(r)); }
});


test('adaptive v2 summary route empty state includes parent summary scaffold fields', async () => {
  const { server, baseUrl } = await start();
  try {
    const read = await fetch(`${baseUrl}/api/adaptive-v2/progress/summary/999`);
    const body = await read.json();
    assert.equal(body.empty_state, true);
    assert.equal(body.parent_summary, null);
    assert.equal(body.summary_contract_version, 'pr_f_v1');
  } finally { await new Promise(r=>server.close(r)); }
});


test('adaptive v2 grade1 mapper route returns read-only candidate signals and safe aggregates', async () => {
  const { server, baseUrl, pool } = await start();
  try {
    await fetch(`${baseUrl}/api/adaptive-v2/progress/checkpoint-attempt`, {
      method:'POST', headers:{'content-type':'application/json', cookie: makeAuthenticatedCookie()},
      body: JSON.stringify(checkpointPayload({ skill_id:'G1-MATH-01', checkpoint_attempts:3, correct_count:2, total_count:3, hint_usage_count:2, mastery_band:'developing', next_recommended_skill_id:'G1-MATH-02', parent_summary_snapshot:{ note:'aggregate only' } }))
    });

    const read = await fetch(`${baseUrl}/api/adaptive-v2/gates-signals/${PRINCESS_NIA_CHILD_ID}`);
    const body = await read.json();

    assert.equal(read.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.source, 'adaptive_v2_grade1');
    assert.equal(body.empty_state, false);
    assert.equal(Array.isArray(body.signals), true);
    assert.equal(body.signals.length > 0, true);
    assert.equal(body.signals.every((s) => s.source === 'adaptive_v2_grade1'), true);
    assert.equal(body.signals.every((s) => typeof s.gate_key === 'string' && typeof s.gate_name === 'string'), true);
    assert.equal(body.signals.every((s) => typeof s.signal_category === 'string' && typeof s.confidence_band === 'string'), true);
    assert.equal(pool.state.progress.has(PRINCESS_NIA_CHILD_ID), true);

    const serialized = JSON.stringify(body).toLowerCase();
    assert.equal(serialized.includes('prompt'), false);
    assert.equal(serialized.includes('answer'), false);
    assert.equal(serialized.includes('diagnos'), false);
    assert.equal(serialized.includes('pass'), false);
    assert.equal(serialized.includes('fail'), false);
    assert.equal(pool.state.gatesWrites, 0);
  } finally { await new Promise(r=>server.close(r)); }
});

test('adaptive v2 grade1 mapper empty-state and grade1 guard behavior', async () => {
  const { server, baseUrl } = await start();
  try {
    const empty = await fetch(`${baseUrl}/api/adaptive-v2/gates-signals/999`);
    const body = await empty.json();
    assert.equal(empty.status, 200);
    assert.equal(body.empty_state, true);
    assert.deepEqual(body.signals, []);

    const bad = await fetch(`${baseUrl}/api/adaptive-v2/progress/checkpoint-attempt`, { method:'POST', headers:{'content-type':'application/json', cookie: makeAuthenticatedCookie()}, body: JSON.stringify({ child_id:PRINCESS_NIA_CHILD_ID, grade:'2', runtime_version:'adaptive_v2', skill_id:'s1' }) });
    assert.equal(bad.status, 400);
  } finally { await new Promise(r=>server.close(r)); }
});


test('adaptive v2 production-style journey persists across refresh and parent re-login', async () => {
  const { server, baseUrl, pool } = await start();
  try {
    const firstLoginCookie = makeAuthenticatedCookie();
    const lesson = await fetch(`${baseUrl}/api/adaptive-v2/progress/checkpoint-attempt`, { method:'POST', headers:{'content-type':'application/json', cookie:firstLoginCookie}, body: JSON.stringify(checkpointPayload({ correct_count: 50, total_count: 50, mastery_band: 'consistent' })) });
    assert.equal(lesson.status, 200);

    const skillWorld = await fetch(`${baseUrl}/api/skill-world/progress`, { method:'POST', headers:{'content-type':'application/json', cookie:firstLoginCookie}, body: JSON.stringify({ child_id: PRINCESS_NIA_CHILD_ID, skill_id: 'FRACTION-WORLD', mode: 'mission', status: 'completed', progress_percent: 100, attempts: 2, correct: 10, score_percent: 95, hints_used: 1, last_step: 'mission-complete', profile: { subject: 'Math' }, state_snapshot: { completed: true } }) });
    assert.equal(skillWorld.status, 200);

    const refreshJourney = await (await fetch(`${baseUrl}/api/learning-journey/${PRINCESS_NIA_CHILD_ID}`, { headers:{ cookie:firstLoginCookie } })).json();
    assert.equal(refreshJourney.history.completed_skill_worlds.length, 1);
    assert.equal(refreshJourney.history.completed_lessons.length, 1);
    assert.equal(refreshJourney.current.recommendation.type, 'enrichment');

    const loggedOut = await fetch(`${baseUrl}/api/learning-journey/${PRINCESS_NIA_CHILD_ID}`);
    const loggedOutBody = await loggedOut.json();
    assert.equal(loggedOutBody.diagnostics.authenticated, false);

    const secondLoginCookie = pool.addSession('parent-token-princess-nia-second-login');
    const parentDashboard = await (await fetch(`${baseUrl}/api/adaptive-v2/parent-dashboard/${PRINCESS_NIA_CHILD_ID}`, { headers:{ cookie:secondLoginCookie } })).json();
    const reloggedJourney = await (await fetch(`${baseUrl}/api/learning-journey/${PRINCESS_NIA_CHILD_ID}`, { headers:{ cookie:secondLoginCookie } })).json();
    const curriculumProgress = await (await fetch(`${baseUrl}/api/adaptive-v2/progress/summary/${PRINCESS_NIA_CHILD_ID}`)).json();

    assert.equal(parentDashboard.child.child_name, 'Princess Nia');
    assert.equal(parentDashboard.learning_journey.history.completed_skill_worlds.length, 1);
    assert.equal(reloggedJourney.current.recommendation.activity_id, 'G1-MATH-06');
    assert.equal(reloggedJourney.child_view.headline, 'Continue Your Adventure');
    assert.equal(curriculumProgress.progress.selected_skill_id, 'G1-MATH-05');
    assert.equal(curriculumProgress.progress.next_recommended_skill_id, 'G1-MATH-06');
  } finally { await new Promise(r=>server.close(r)); }
});


test('adaptive v2 grade1 voice sections route exists and falls back safely', async () => {
  const { server, baseUrl } = await start();
  try {
    const res = await fetch(`${baseUrl}/api/adaptive-v2/voice/sections`, {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ grade:'1', runtime_version:'adaptive_v2', section_key:'lesson_snippet', text_content:'Count by ones to solve this.' })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.voice_mode, 'fallback_browser_speech');
    assert.equal(typeof body.playable_text, 'string');
  } finally { await new Promise(r=>server.close(r)); }
});

test('adaptive v2 grade1 voice sections rejects unsafe/private text and disallowed sections', async () => {
  const { server, baseUrl } = await start();
  try {
    const badSection = await fetch(`${baseUrl}/api/adaptive-v2/voice/sections`, {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ grade:'1', runtime_version:'adaptive_v2', section_key:'raw_prompt', text_content:'safe text' })
    });
    assert.equal(badSection.status, 400);

    const privatePayload = await fetch(`${baseUrl}/api/adaptive-v2/voice/sections`, {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ grade:'1', runtime_version:'adaptive_v2', section_key:'hints', text_content:'Email is kid@example.com' })
    });
    assert.equal(privatePayload.status, 400);
    const body = await privatePayload.json();
    assert.equal(body.error, 'unsafe_or_private_text');
  } finally { await new Promise(r=>server.close(r)); }
});
