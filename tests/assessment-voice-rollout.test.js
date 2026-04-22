const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const express = require('express');
const http = require('http');

const { createAssessmentVoiceRouter } = require('../server/assessmentVoiceRoutes');

async function startApp(options = {}) {
  const app = express();
  app.use(express.json());
  app.use('/api/assessment/voice', createAssessmentVoiceRouter(options));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function startVoiceRepo({ fail = false } = {}) {
  const calls = [];
  const app = express();
  app.use(express.json());

  app.post('/speak', (req, res) => {
    calls.push({ method: req.method, path: req.path, body: req.body, headers: req.headers });
    if (fail) return res.status(503).json({ error: 'provider_down' });
    return res.status(200).type('audio/mpeg').send(Buffer.from('fake-mpeg-audio-bytes', 'utf8'));
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  return {
    server,
    calls,
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => new Promise((resolve) => server.close(resolve)),
  };
}

test('assessment voice route uses upstream /speak and streams raw audio bytes', async (t) => {
  const voiceRepo = await startVoiceRepo();
  const app = await startApp({ voice_repo_base_url: voiceRepo.baseUrl });
  t.after(async () => {
    await voiceRepo.close();
    await new Promise((resolve) => app.server.close(resolve));
  });

  const cfgRes = await fetch(`${app.baseUrl}/api/assessment/voice/config`);
  const cfg = await cfgRes.json();
  assert.equal(cfgRes.status, 200);
  assert.equal(cfg.provider_ready, true);
  assert.equal(cfg.upstream_route, '/speak');

  const res = await fetch(`${app.baseUrl}/api/assessment/voice/section`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ surface: 'archetype_assessment', section_key: 'result_summary', voice_text: 'hello world', format: 'mp3' }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.voice_mode, 'provider_audio');
  assert.equal(body.provider_ready, true);
  assert.equal(body.upstream_route, '/speak');
  assert.equal(body.provider_audio_content_type, 'audio/mpeg');
  assert.equal(body.provider_audio_bytes > 0, true);
  assert.match(String(body.audio_url || ''), /\/api\/assessment\/voice\/stream\//);

  assert.equal(voiceRepo.calls.length, 1);
  assert.equal(voiceRepo.calls[0].method, 'POST');
  assert.equal(voiceRepo.calls[0].path, '/speak');
  assert.equal(voiceRepo.calls[0].body.text, 'hello world');
  assert.equal(voiceRepo.calls[0].body.format, 'mp3');

  const streamRes = await fetch(`${app.baseUrl}${body.audio_url}`);
  const streamBytes = Buffer.from(await streamRes.arrayBuffer());
  assert.equal(streamRes.status, 200);
  assert.equal(streamRes.headers.get('content-type'), 'audio/mpeg');
  assert.equal(streamBytes.equals(Buffer.from('fake-mpeg-audio-bytes', 'utf8')), true);
});

test('assessment voice route signals fallback only when upstream/provider is unavailable', async (t) => {
  const voiceRepo = await startVoiceRepo({ fail: true });
  const app = await startApp({ voice_repo_base_url: voiceRepo.baseUrl });
  t.after(async () => {
    await voiceRepo.close();
    await new Promise((resolve) => app.server.close(resolve));
  });

  const res = await fetch(`${app.baseUrl}/api/assessment/voice/section`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ surface: 'intake_assessment', section_key: 'result_summary', voice_text: 'fallback text' }),
  });
  const body = await res.json();
  assert.equal(body.voice_mode, 'fallback_browser_speech');
  assert.equal(body.provider_ready, false);
  assert.equal(body.fallback_reason, 'voice_repo_http_503');
});

test('assessment voice warmup preflights provider readiness without autoplay side effects', async (t) => {
  const voiceRepo = await startVoiceRepo();
  const app = await startApp({ voice_repo_base_url: voiceRepo.baseUrl });
  t.after(async () => {
    await voiceRepo.close();
    await new Promise((resolve) => app.server.close(resolve));
  });

  const res = await fetch(`${app.baseUrl}/api/assessment/voice/warmup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ surface: 'archetype_assessment', preflight: true, warm_text: 'warm test' }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.endpoint, '/api/assessment/voice/warmup');
  assert.equal(body.warmup_mode, 'provider_preflight');
  assert.equal(body.provider_ready, true);
  assert.equal(body.upstream_route, '/speak');
  assert.equal(body.voice_mode, 'provider_audio');
  assert.equal(voiceRepo.calls.length, 1);
  assert.equal(voiceRepo.calls[0].path, '/speak');
  assert.equal(voiceRepo.calls[0].body.text, 'warm test');
});

test('assessment surfaces include voice controls on results/sections and not question-by-question prompts', () => {
  const intake = fs.readFileSync('public/intake.html', 'utf8');
  const experienceHtml = fs.readFileSync('public/archetype-engines/experience.html', 'utf8');
  const experience = fs.readFileSync('public/archetype-engines/experience.js', 'utf8');
  const shared = fs.readFileSync('public/js/assessment-voice.js', 'utf8');
  const indexSource = fs.readFileSync('server/index.js', 'utf8');

  assert.match(intake, /assessment-voice\.js/);
  assert.doesNotMatch(intake, /section_key: "question_prompt"/);
  assert.match(intake, /section_key: "result_summary"/);
  assert.match(experienceHtml, /<script src="\/archetype-engines\/experience\.js"><\/script>/);
  assert.match(experienceHtml, /<script src="\/js\/assessment-voice\.js"><\/script>/);
  assert.doesNotMatch(experience, /createVoiceController\("archetype_assessment"/);
  assert.match(experience, /data-voice-diagnostic="question_flow_voice_disabled"/);
  assert.match(experience, /question_voice_controls_rendered:\s*false/);
  assert.match(experience, /createVoiceController\("archetype_result"/);
  assert.doesNotMatch(experience, /section_key: "question_prompt"/);
  assert.match(experience, /section_key: "result_summary_intro"/);
  assert.match(experience, /section_key: "primary_archetype_card"/);
  assert.match(experience, /section_key: "secondary_archetype_card"/);
  assert.match(experience, /section_key: "hybrid_summary"/);
  assert.match(experience, /section_key: "recommendations_action_plan"/);
  assert.match(experience, /\/api\/assessment\/voice\/warmup/);
  assert.doesNotMatch(experience, /autoplay/);
  assert.match(shared, /data-voice-action="play"/);
  assert.match(shared, /data-voice-route/);
  assert.match(shared, /__assessmentVoiceDiagnostics/);
  assert.match(shared, /playback_mode:\s*"provider_audio"/);
  assert.match(shared, /Warming AI voice/);
  assert.match(shared, /ready to hear summary/);
  assert.match(shared, /ready to hear full section/);
  assert.match(shared, /AI voice unavailable, using fallback/);
  assert.match(indexSource, /app\.use\("\/api\/assessment\/voice", createAssessmentVoiceRouter\(\)\);/);
});
