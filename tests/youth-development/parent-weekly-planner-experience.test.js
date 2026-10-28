const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');

function withServer(app) {
  const server = http.createServer(app);
  return new Promise((resolve) => server.listen(0, () => resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` })));
}

test('program route is a parent-friendly Genius Growth Plan, not a scheduler', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({}));
  const { server, baseUrl } = await withServer(app);
  try {
    const html = await (await fetch(`${baseUrl}/youth-development/program`)).text();
    assert.match(html, /Genius Growth Plan/);
    assert.match(html, /Strength to build from/);
    assert.match(html, /Growth focus/);
    assert.match(html, /Try this at home/);
    assert.match(html, /Parent reflection/);
    assert.match(html, /Open adaptive learning/);
    assert.doesNotMatch(html, /Today’s Session/);
    assert.doesNotMatch(html, /Weekly Planner Calendar/);
    assert.doesNotMatch(html, /Preferred time/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Growth Plan keeps account and child scope when linking to dashboard and learning', async () => {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({}));
  const { server, baseUrl } = await withServer(app);
  try {
    const html = await (await fetch(`${baseUrl}/youth-development/program?tenant=demo&email=parent%40example.com&child_id=child-1`)).text();
    assert.match(html, /parent-dashboard\/latest/);
    assert.match(html, /program_context','youth_development/);
    assert.match(html, /return_url/);
    assert.match(html, /child_id/);
    const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
    assert.doesNotThrow(() => new Function(script));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
