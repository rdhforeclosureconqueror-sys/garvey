const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const dashboard = fs.readFileSync('server/youthDevelopmentRoutes.js', 'utf8');
const hub = fs.readFileSync('public/gamehub/adaptive-v2-hub.html', 'utf8');
const assessment = fs.readFileSync('public/assessment-mvp/app.js', 'utf8');
const adaptive = fs.readFileSync('public/gamehub/adaptive_learning.html', 'utf8');
const skillWorld = fs.readFileSync('public/gamehub/skill-world/index.html', 'utf8');

test('Youth Development dashboard opens a Youth Development-scoped adaptive route', () => {
  assert.match(dashboard, /id="openAdaptiveV2HubBtn" href="\/youth-development\/adaptive-learning"/);
  assert.match(dashboard, /program_context", "youth_development"/);
  assert.match(dashboard, /return_url", "\/youth-development\/parent-dashboard"/);
  assert.doesNotMatch(dashboard, /id="openAdaptiveV2HubBtn" href="\/gamehub\/adaptive-v2-hub\.html"/);
});

test('Youth Development adaptive hub preserves selected learner and hides Gates adventures', () => {
  assert.match(hub, /program_context:'youth_development'/);
  assert.match(hub, /source_registry:'youth_development'/);
  assert.match(hub, /ownership_verified:true/);
  assert.match(hub, /routeContext\.program_context==='youth_development'\?'':`<section class="panel rite-adventures"/);
  assert.match(hub, /withRouteContext\(`\/assessment-mvp\?grade=/);
  assert.match(hub, /withRouteContext\(`\/skill-world\//);
});

test('assessment and game runtimes do not fall through to Gates learner selection for Youth Development', () => {
  assert.match(assessment, /state\.programContext === 'youth_development'/);
  assert.match(assessment, /Youth Development learner selected automatically/);
  assert.match(adaptive, /if\(ctx\.program_context==='youth_development'\)return ctx/);
  assert.match(adaptive, /program_context:getRuntimeContext\(\)\.program_context/);
  assert.match(skillWorld, /program_context:learnerCtx\.program_context/);
});

test('Gates path remains available when no Youth Development route context is supplied', () => {
  assert.match(hub, /Rite of Passage Adventure/);
  assert.match(adaptive, /fetch\('\/api\/gates\/canonical-learners'/);
  assert.match(skillWorld, /fetch\('\/api\/gates\/canonical-learners'/);
});
