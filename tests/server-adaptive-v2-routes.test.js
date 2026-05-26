const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');
const { createAdaptiveV2Router } = require('../server/adaptiveV2Routes');

function makePool() {
  const state = { progress: new Map(), attempts: [], gatesWrites: 0 };
  return {
    state,
    async query(sql, params = []) {
      const q = String(sql);
      if (q.includes('INSERT INTO adaptive_v2_skill_progress')) {
        state.progress.set(params[0], { selected_skill_id: params[1], checkpoint_attempts: params[2], correct_count: params[3], total_count: params[4], hint_usage_count: params[5], mastery_band: params[6], next_recommended_skill_id: params[7], parent_summary_snapshot: JSON.parse(params[8]) });
        return { rows: [] };
      }
      if (q.includes('INSERT INTO adaptive_v2_checkpoint_attempts')) { state.attempts.push(params); return { rows: [] }; }
      if (q.includes('INSERT INTO gates_') || q.includes('UPDATE gates_')) { state.gatesWrites += 1; return { rows: [] }; }
      if (q.includes('FROM adaptive_v2_skill_progress')) {
        const row = state.progress.get(params[0]);
        return { rows: row ? [row] : [] };
      }
      return { rows: [] };
    },
  };
}

async function start() { const pool = makePool(); const app = express(); app.use(express.json()); app.use(createAdaptiveV2Router({ pool })); const server = http.createServer(app); await new Promise(r=>server.listen(0,r)); return { pool, server, baseUrl:`http://127.0.0.1:${server.address().port}`}; }

test('adaptive v2 grade1 progress write/read and guardrails', async () => {
  const { server, baseUrl, pool } = await start();
  try {
    const bad = await fetch(`${baseUrl}/api/adaptive-v2/progress/checkpoint-attempt`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ child_id:'c1', grade:'2', runtime_version:'adaptive_v2', skill_id:'s1' }) });
    assert.equal(bad.status, 400);

    const ok = await fetch(`${baseUrl}/api/adaptive-v2/progress/checkpoint-attempt`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ child_id:'c1', grade:'1', runtime_version:'adaptive_v2', skill_id:'s1', checkpoint_attempts:1, correct_count:1, total_count:1, hint_usage_count:0, mastery_band:'developing', next_recommended_skill_id:'s2', parent_summary_snapshot:{ note:'supportive summary only' } }) });
    assert.equal(ok.status, 200);

    const read = await fetch(`${baseUrl}/api/adaptive-v2/progress/summary/c1`);
    const body = await read.json();
    assert.equal(body.empty_state, false);
    assert.equal(body.progress.next_recommended_skill_id, 's2');
    assert.equal(body.summary_contract_version, 'pr_f_v1');
    assert.equal(Array.isArray(body.parent_summary.practiced_skills), true);
    assert.equal(typeof body.parent_summary.recommended_next_step, 'string');
    assert.equal(pool.state.attempts.length, 1);
    assert.equal(JSON.stringify(body).toLowerCase().includes('diagnosis'), false);
  } finally { await new Promise(r=>server.close(r)); }
});


test('adaptive v2 summary route empty state includes parent summary scaffold fields', async () => {
  const { server, baseUrl } = await start();
  try {
    const read = await fetch(`${baseUrl}/api/adaptive-v2/progress/summary/none-yet`);
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
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ child_id:'c2', grade:'1', runtime_version:'adaptive_v2', skill_id:'math-1', checkpoint_attempts:3, correct_count:2, total_count:3, hint_usage_count:2, mastery_band:'developing', next_recommended_skill_id:'math-2', parent_summary_snapshot:{ note:'aggregate only' } })
    });

    const read = await fetch(`${baseUrl}/api/adaptive-v2/gates-signals/c2`);
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
    const empty = await fetch(`${baseUrl}/api/adaptive-v2/gates-signals/none`);
    const body = await empty.json();
    assert.equal(empty.status, 200);
    assert.equal(body.empty_state, true);
    assert.deepEqual(body.signals, []);

    const bad = await fetch(`${baseUrl}/api/adaptive-v2/progress/checkpoint-attempt`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ child_id:'c3', grade:'2', runtime_version:'adaptive_v2', skill_id:'s1' }) });
    assert.equal(bad.status, 400);
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
