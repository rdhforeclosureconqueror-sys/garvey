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
  assert.match(hub, /sharedLearningContexts=\['youth_development','rite_of_passage'\]/);
  assert.match(hub, /requestedProgramContext==='youth_development'\?'\/youth-development\/parent-dashboard'/);
  assert.match(hub, /ownership_verified:true/);
  assert.doesNotMatch(hub, /rite-adventures/);
  assert.match(hub, /withRouteContext\(`\/assessment-mvp\?grade=/);
  assert.match(hub, /withRouteContext\(`\/gamehub\/skill-world/);
});

test('assessment and game runtimes preserve the selected child for each scoped pathway', () => {
  assert.match(assessment, /function isScopedAdaptiveContext\(\)/);
  assert.match(assessment, /state\.programContext === 'youth_development' \|\| state\.programContext === 'rite_of_passage'/);
  assert.match(assessment, /scopedContextLabel\(\) \+ ' learner is already selected/);
  assert.match(adaptive, /ctx\.program_context==='youth_development'\|\|ctx\.program_context==='rite_of_passage'/);
  assert.match(adaptive, /program_context:getRuntimeContext\(\)\.program_context/);
  assert.match(skillWorld, /program_context:learnerCtx\.program_context/);
});

test('Rite of Passage gets the same adaptive engine through an explicit Rite context', () => {
  assert.match(hub, /rite_of_passage/);
  assert.match(hub, /sharedLearningContexts/);
  assert.match(hub, /requestedProgramContext==='rite_of_passage'\?'\/gates\/children'/);
  const gates = fs.readFileSync('public/gates.js', 'utf8');
  assert.match(gates, /program_context', 'rite_of_passage'/);
  assert.match(gates, /Academic learning progress stays separate from Gate assessment and practice progress/);
});

test('unscoped adaptive access remains separate from the Rite dashboard', () => {
  assert.match(adaptive, /fetch\('\/api\/gates\/canonical-learners'/);
  assert.match(skillWorld, /fetch\('\/api\/gates\/canonical-learners'/);
});
