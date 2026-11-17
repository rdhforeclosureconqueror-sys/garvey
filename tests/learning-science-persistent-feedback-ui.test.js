'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const appPath = path.join(__dirname, '../public/assessment-mvp/app.js');
const storePath = path.join(__dirname, '../server/assessmentMvpStore.js');

test('saved assessment results reconstruct learning next steps from persisted evidence', () => {
  const source = fs.readFileSync(storePath, 'utf8');
  const method = source.slice(source.indexOf('async getCompletedAssessmentResult('), source.indexOf('async submitPersistentAssessmentResponses('));
  assert.match(method, /learning_next_steps: makeLearningNextSteps\(\{ skillEvidence: skill_evidence, recommendations \}\)/);
});

test('browser displays strengths and safe practice links from saved result payload', () => {
  delete require.cache[require.resolve(appPath)];
  const app = require(appPath);
  app.state.result = app.publicResultOnly({
    status: 'completed',
    skill_evidence: [], recommendations: [],
    learning_next_steps: {
      headline: 'Look at what you are learning!',
      strengths: [{ skill: 'Equal groups', message: 'Promising progress' }],
      practice: [{ title: 'Practice this next', skill: 'Place value',
        message: 'Try another round', practice_route: '/skill-world/G3_MATH_B/drill' }],
      encouragement: 'Keep trying!', note: 'Practice suggestions',
      untrusted_hidden_field: 'private-secret',
    },
  });
  const html = app.renderResults();
  assert.match(html, /Equal groups/);
  assert.match(html, /Place value/);
  assert.match(html, /\/skill-world\/G3_MATH_B\/drill/);
  assert.match(html, /Keep trying!/);
  assert.doesNotMatch(html, /private-secret/);
});

test('browser escapes student-facing text and rejects unsafe practice links', () => {
  delete require.cache[require.resolve(appPath)];
  const app = require(appPath);
  app.state.result = app.publicResultOnly({
    status: 'completed', skill_evidence: [], recommendations: [],
    learning_next_steps: {
      headline: '<img src=x onerror=alert(1)>',
      strengths: [{ skill: '<script>alert(1)</script>', message: 'Nice try' }],
      practice: [{ title: 'Practice', skill: 'Numbers', message: 'Try', practice_route: 'javascript:alert(1)' }],
    },
  });
  const html = app.renderResults();
  assert.doesNotMatch(html, /<script>|<img/);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.match(html, /&lt;script&gt;/);
});

test('older saved results without feedback still render normally', () => {
  delete require.cache[require.resolve(appPath)];
  const app = require(appPath);
  app.state.result = app.publicResultOnly({ status: 'completed', skill_evidence: [], recommendations: [] });
  assert.match(app.renderResults(), /Supportive skill results/);
});
