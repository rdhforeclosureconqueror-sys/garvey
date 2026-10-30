const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../..');
const home = fs.readFileSync(path.join(root, 'public/tutoring.html'), 'utf8');
const hub = fs.readFileSync(path.join(root, 'public/gamehub/adaptive-v2-hub.html'), 'utf8');

test('public tutoring offers grades 1–6 and routes to the existing learning hub', () => {
  for (let n = 1; n <= 6; n++) assert.match(home, new RegExp('<option value="' + n + '">Grade ' + n + '</option>'));
  assert.match(home, /\/gamehub\/adaptive-v2-hub\.html\?grade=/);
  assert.match(home, /Math & English/);
  assert.match(home, /const available\s*=\s*\/\^\[1-6\]\$\/\.test\(grade\.value\)/);
  assert.match(home, /link\.href\s*=\s*available\s*\?\s*["']\/gamehub\/adaptive-v2-hub\.html\?grade=/);
  assert.match(hub, /const requestedGrade=Number\(launchParams\.get\('grade'\)\)/);
  assert.match(hub, /if\(grades\.includes\(requestedGrade\)\)selectGrade\(requestedGrade\)/);
});

test('public route context retains public defaults and separate youth and rite-of-passage return paths', () => {
  assert.match(hub, /const requestedProgramContext=\(launchParams\.get\('program_context'\)\|\|''\)\.trim\(\)/);
  assert.match(hub, /isSharedLearningContext\?requestedProgramContext:'public_learning'/);
  assert.match(hub, /requestedProgramContext==='youth_development'\?'\/youth-development\/parent-dashboard'/);
  assert.match(hub, /requestedProgramContext==='rite_of_passage'\?'\/gates\/children':'\/tutoring\.html'/);
});

test('parent links use current public destinations and do not hardcode backend URLs', () => {
  assert.match(home, /href="\/family-results\.html"/);
  assert.match(home, /location\.hostname\s*===\s*"garveyfrontend\.onrender\.com"/);
  assert.match(home, /https:\/\/garveybackend\.onrender\.com/);
  assert.doesNotMatch(home, /href="https:\/\/garveybackend\.onrender\.com/);
});

test('restored Sight Memory is linked from the public homepage', () => {
  const sight = fs.readFileSync(path.join(root, 'public/gamehub/sight-memory.html'), 'utf8');
  assert.match(home, /href="\/gamehub\/sight-memory\.html"/);
  assert.match(sight, /mountSightGame\(document\.getElementById\('sight-game'\)\)/);
  assert.match(sight, /successfulRounds >= 4/);
});

test('Sight Memory shuffles questions each round and offers parent skill explanations', () => {
  const sight = fs.readFileSync(path.join(root, 'public/gamehub/sight-memory.html'), 'utf8');
  assert.match(sight, /return shuffle\(questions\)\.slice\(0, 5\)/);
  assert.match(sight, /for \(let i = copy\.length - 1; i > 0; i--\)/);
  assert.match(sight, /const unique = \[\.\.\.new Set\(\[question\.answer/);
  assert.match(sight, /class="parent-insights"/);
  assert.match(sight, /Visual memory/);
  assert.match(sight, /Working memory/);
  assert.match(sight, /Selective attention/);
  assert.match(sight, /Cognitive flexibility/);
  assert.match(sight, /adinkra-library\/0DFE3FAC-312A-4FC0-BD75-A74D75470324\.png/);
});

test('Sight Memory has distinct emoji kids and adult modes with slider confirmation', () => {
  const sight = fs.readFileSync(path.join(root, 'public/gamehub/sight-memory.html'), 'utf8');
  assert.match(sight, /const EMOJIS =/);
  assert.match(sight, /mode = "child"/);
  assert.match(sight, /mode === "child"/);
  assert.match(sight, /Kids · Emojis/);
  assert.match(sight, /Adults · Letters & Numbers/);
  assert.match(sight, /slider\.type = "range"/);
  assert.match(sight, /slider\.addEventListener\("input", syncSlider\)/);
  assert.match(sight, /Lock Answer/);
  assert.match(sight, /return shuffle\(questions\)\.slice\(0,5\)/);
});
