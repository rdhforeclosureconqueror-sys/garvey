'use strict';

const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { createSkillWorldAudioRouter, createSkillWorldAudioHash } = require('../../../server/skillWorldAudioRoutes');

async function createTestServer(fetchImpl, cacheDir) {
  const app = express();
  app.use(express.json());
  app.use('/generated-audio/skill-world', express.static(cacheDir));
  app.use('/api/skill-world', createSkillWorldAudioRouter({ fetch_impl: fetchImpl, cache_dir: cacheDir, tts_url: 'https://voice.example.test/speak' }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return { server, baseUrl };
}

async function postJson(baseUrl, payload) {
  const response = await fetch(`${baseUrl}/api/skill-world/audio`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let body = null;
  try { body = await response.json(); } catch (_) { body = null; }
  return { response, body };
}

(async () => {
  const originalToken = process.env.SKILL_WORLD_TTS_TOKEN;
  delete process.env.SKILL_WORLD_TTS_TOKEN;

  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-world-audio-'));
  const upstreamAudio = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0xaa]);
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, headers: { ...(options.headers || {}) }, body: JSON.parse(options.body) });
    return new Response(upstreamAudio, { status: 200, headers: { 'content-type': 'audio/mpeg' } });
  };

  const { server, baseUrl } = await createTestServer(fetchImpl, cacheDir);
  try {
    const missing = await postJson(baseUrl, { text: '   ' });
    assert.equal(missing.response.status, 400, 'missing text returns validation error');
    assert.equal(missing.body.error, 'text_required');

    const invalidFormat = await postJson(baseUrl, { text: 'Hello world', format: 'ogg' });
    assert.equal(invalidFormat.response.status, 400, 'invalid format is rejected');
    assert.equal(invalidFormat.body.error, 'invalid_format');

    const request = {
      text: 'Which card shows uppercase letter S?',
      voice: 'alloy',
      format: 'mp3',
      speed: 0.9,
      pitch: 0,
      cache_key: 'skill-world:G1E_RF_001:question:abc123',
    };
    const first = await postJson(baseUrl, request);
    assert.equal(first.response.status, 200);
    assert.equal(first.body.cached, false);
    assert.match(first.body.audio_url, /^\/generated-audio\/skill-world\/[a-f0-9]{32}\.mp3$/, 'returned audio_url points to generated audio path');
    assert.equal(calls.length, 1, 'first cache miss hits upstream once');
    assert.equal(calls[0].url, 'https://voice.example.test/speak');
    assert.equal(calls[0].headers['content-type'], 'application/json', 'upstream request keeps JSON content type');
    assert.equal(Object.prototype.hasOwnProperty.call(calls[0].headers, 'x-internal-token'), false, 'token header is omitted when SKILL_WORLD_TTS_TOKEN is absent');
    assert.deepEqual(calls[0].body, { text: request.text, voice: request.voice, format: request.format, speed: request.speed, pitch: request.pitch });

    const expectedHash = createSkillWorldAudioHash(request);
    const savedPath = path.join(cacheDir, `${expectedHash}.mp3`);
    assert.deepEqual(await fs.readFile(savedPath), upstreamAudio, 'upstream raw audio bytes are saved correctly');

    const staticAudio = await fetch(`${baseUrl}${first.body.audio_url}`);
    assert.equal(staticAudio.status, 200, 'generated audio is exposed statically');
    assert.deepEqual(Buffer.from(await staticAudio.arrayBuffer()), upstreamAudio);

    const second = await postJson(baseUrl, request);
    assert.equal(second.response.status, 200);
    assert.equal(second.body.cached, true, 'second identical request returns cached response');
    assert.equal(second.body.audio_url, first.body.audio_url);
    assert.equal(calls.length, 1, 'cached second call does not hit upstream');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(cacheDir, { recursive: true, force: true });
  }

  const tokenCacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-world-audio-token-'));
  const tokenCalls = [];
  const secretToken = 'shared-secret-for-test';
  process.env.SKILL_WORLD_TTS_TOKEN = secretToken;
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  const consoleMessages = [];
  for (const method of Object.keys(originalConsole)) {
    console[method] = (...args) => { consoleMessages.push(args.map(String).join(' ')); };
  }
  const tokenFetchImpl = async (url, options) => {
    tokenCalls.push({ url, headers: { ...(options.headers || {}) }, body: JSON.parse(options.body) });
    return new Response(upstreamAudio, { status: 200, headers: { 'content-type': 'audio/mpeg' } });
  };
  const tokenServer = await createTestServer(tokenFetchImpl, tokenCacheDir);
  try {
    const tokenResult = await postJson(tokenServer.baseUrl, { text: 'Token protected voice request', format: 'mp3' });
    assert.equal(tokenResult.response.status, 200);
    assert.equal(tokenCalls.length, 1, 'token scenario hits upstream');
    assert.equal(tokenCalls[0].headers['content-type'], 'application/json', 'token scenario keeps JSON content type');
    assert.equal(tokenCalls[0].headers['x-internal-token'], secretToken, 'token header is sent when SKILL_WORLD_TTS_TOKEN is set');
    assert.equal(consoleMessages.some((message) => message.includes(secretToken)), false, 'token value is not logged');
  } finally {
    for (const [method, original] of Object.entries(originalConsole)) console[method] = original;
    await new Promise((resolve) => tokenServer.server.close(resolve));
    await fs.rm(tokenCacheDir, { recursive: true, force: true });
  }

  const authCacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-world-audio-auth-'));
  process.env.SKILL_WORLD_TTS_TOKEN = secretToken;
  const authServer = await createTestServer(async () => new Response('unauthorized', { status: 401 }), authCacheDir);
  try {
    const authResult = await postJson(authServer.baseUrl, { text: 'Auth failure should fall back', format: 'mp3' });
    assert.equal(authResult.response.status, 401);
    assert.deepEqual(authResult.body, {
      ok: false,
      error: 'tts_upstream_auth_failed',
      status: 401,
      fallback: 'browser_speech',
    }, 'upstream 401 maps to the Skill World auth-failure fallback contract');
  } finally {
    await new Promise((resolve) => authServer.server.close(resolve));
    await fs.rm(authCacheDir, { recursive: true, force: true });
    if (originalToken === undefined) {
      delete process.env.SKILL_WORLD_TTS_TOKEN;
    } else {
      process.env.SKILL_WORLD_TTS_TOKEN = originalToken;
    }
  }
})();
