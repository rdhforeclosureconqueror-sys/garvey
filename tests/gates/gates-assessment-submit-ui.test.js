const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
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

test('assessment submit UI wiring and payload/redirect expectations are present', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const assessment = await fetch(`${baseUrl}/gates/assessment`);
    const html = await assessment.text();
    assert.equal(assessment.status, 200);
    assert.match(html, /Start Youth Rite of Passage Assessment/);

    const jsPath = path.join(__dirname, '..', '..', 'public', 'gates.js');
    const js = fs.readFileSync(jsPath, 'utf8');

    assert.match(js, /#assessment-form'\)\.addEventListener\('submit'/);
    assert.match(js, /child_id:\s*selectedChildId/);
    assert.match(js, /assessment_version:\s*questions\.assessment_version/);
    assert.match(js, /questions\.questions\.map\(\(q\) => \(\{ question_id: q\.question_id, value: String\(fd\.get\(q\.question_id\) \|\| ""\)\.trim\(\)\.toLowerCase\(\) \}\)\)/);
    assert.match(js, /api\('\/api\/gates\/assessment\/submit'/);
    assert.match(js, /Please select a child profile before submitting the assessment\./);
    assert.match(js, /Please answer every question before submitting\./);
    assert.match(js, /nav\(`\/gates\/results\/\$\{result\.assessment_id\}`\)/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
