const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const express = require('express');
const http = require('http');

const { createAssessmentVoiceRouter } = require('../server/assessmentVoiceRoutes');

async function startApp(adapter) {
  const app = express();
  app.use(express.json());
  app.use('/api/assessment/voice', createAssessmentVoiceRouter({ adapter }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

test('assessment voice route exposes provider-ready payload and fallback distinction', async (t) => {
  const adapter = {
    isAvailable: () => true,
    health: async () => ({ gateway_reachable: true, provider: 'openai-via-gateway' }),
    synthesizeReportSection: async () => ({
      provider_status: 'available',
      provider: 'openai-via-gateway',
      playable_text: 'hello world',
      audio_url: 'https://audio.example/voice.mp3',
      replay_token: 'replay_1',
    }),
    resolveAsset: async () => ({ resolved: false }),
  };
  const app = await startApp(adapter);
  t.after(async () => new Promise((resolve) => app.server.close(resolve)));

  const cfgRes = await fetch(`${app.baseUrl}/api/assessment/voice/config`);
  const cfg = await cfgRes.json();
  assert.equal(cfgRes.status, 200);
  assert.equal(cfg.provider_ready, true);

  const res = await fetch(`${app.baseUrl}/api/assessment/voice/section`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ surface: 'archetype_assessment', section_key: 'question_prompt', voice_text: 'hello world' }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.voice_mode, 'provider_audio');
  assert.equal(body.provider_ready, true);
  assert.equal(typeof body.voice_chunk_id, 'string');
});

test('assessment voice route signals fallback mode without pretending provider audio', async (t) => {
  const adapter = {
    isAvailable: () => false,
    health: async () => ({ gateway_reachable: false }),
    synthesizeReportSection: async () => ({
      provider_status: 'fallback',
      provider: 'browser_speech_synthesis',
      fallback_reason: 'voice_gateway_unavailable',
      playable_text: 'fallback text',
    }),
    resolveAsset: async () => ({ resolved: false }),
  };
  const app = await startApp(adapter);
  t.after(async () => new Promise((resolve) => app.server.close(resolve)));

  const res = await fetch(`${app.baseUrl}/api/assessment/voice/section`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ surface: 'intake_assessment', section_key: 'result_summary', voice_text: 'fallback text' }),
  });
  const body = await res.json();
  assert.equal(body.voice_mode, 'fallback_browser_speech');
  assert.equal(body.provider_ready, false);
  assert.equal(body.fallback_reason, 'voice_gateway_unavailable');
});

test('assessment surfaces include reusable voice wiring and visible controls', () => {
  const intake = fs.readFileSync('public/intake.html', 'utf8');
  const experience = fs.readFileSync('public/archetype-engines/experience.js', 'utf8');
  const shared = fs.readFileSync('public/js/assessment-voice.js', 'utf8');
  const indexSource = fs.readFileSync('server/index.js', 'utf8');

  assert.match(intake, /assessment-voice\.js/);
  assert.match(intake, /section_key: "question_prompt"/);
  assert.match(intake, /section_key: "result_summary"/);
  assert.match(experience, /createVoiceController\("archetype_assessment"/);
  assert.match(experience, /section_key: "recommendations_action_plan"/);
  assert.match(shared, /data-voice-action="play"/);
  assert.match(shared, /AI voice unavailable, using fallback browser speech\./);
  assert.match(indexSource, /app\.use\(\"\/api\/assessment\/voice\", createAssessmentVoiceRouter\(\)\);/);
});
