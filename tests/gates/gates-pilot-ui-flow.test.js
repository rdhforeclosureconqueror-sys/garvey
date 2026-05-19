const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('path');
const http = require('http');
const { createGatesRouter } = require('../../server/gatesRoutes');

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', '..', 'public')));
  app.use(createGatesRouter());
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

test('gates pilot ui shells and entry links render', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const gates = await fetch(`${baseUrl}/gates`);
    const gatesHtml = await gates.text();
    assert.equal(gates.status, 200);
    assert.doesNotMatch(gatesHtml, /coming soon/i);
    assert.match(gatesHtml, /Start Youth Rite of Passage Assessment/);

    const signup = await fetch(`${baseUrl}/gates/signup`);
    assert.equal(signup.status, 200);

    const children = await fetch(`${baseUrl}/gates/children`);
    assert.equal(children.status, 200);

    const assessment = await fetch(`${baseUrl}/gates/assessment`);
    assert.equal(assessment.status, 200);

    const results = await fetch(`${baseUrl}/gates/results/test-id`);
    assert.equal(results.status, 200);

    const map = await fetch(`${baseUrl}/gates/child/test-child/gates`);
    assert.equal(map.status, 200);

  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
