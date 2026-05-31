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
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-world-audio-'));
  const upstreamAudio = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0xaa]);
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
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
})();
