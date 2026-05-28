const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const gates = fs.readFileSync('public/gates.js', 'utf8');
const youthRoutes = fs.readFileSync('server/youthDevelopmentRoutes.js', 'utf8');
const hub = fs.readFileSync('public/gamehub/adaptive-v2-hub.html', 'utf8');
const recognitionPilot = fs.readFileSync('public/gamehub/recognition-selection-pilot.html', 'utf8');
const manifest = JSON.parse(fs.readFileSync('public/gamehub/content/adaptive-v2/grades/grade1/grade1-artifact-manifest.v1.json', 'utf8'));

test('adaptive card appears on gates/rite-of-passage child profile surfaces', () => {
  assert.match(gates, /Adaptive Learning/);
  assert.match(gates, /Grade 1–6 school-skill lessons, practice, and growth snapshots\./);
  assert.match(gates, /\/gamehub\/adaptive-v2-hub\.html/);
});

test('adaptive card appears on youth development dashboard', () => {
  assert.match(youthRoutes, /Open Adaptive V2 Lesson Hub/);
  assert.match(youthRoutes, /Grade 1–6 school-skill lessons, practice, and growth snapshots\./);
});

test('adaptive v2 hub supports grade 1 lessons and safe grades 2-6 coming soon state', () => {
  assert.match(hub, /const grades=\[1,2,3,4,5,6\]/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Coming soon\. Grade content is being wired for this grade\./);
  assert.doesNotMatch(hub, /grade\s*6[^\n]*\?/i);
});

test('grade 1 manifest carries development and secondary mapping metadata', () => {
  assert.equal(Array.isArray(manifest.metadata?.development_area_mapping), true);
  assert.equal(manifest.metadata.development_area_mapping.length, 7);
  assert.deepEqual(manifest.metadata?.secondary_signal_mapping?.allowed_targets, ['gates', 'rite_of_passage']);
});


test('recognition/selection pilot routes are discoverable from adaptive hub', () => {
  assert.match(hub, /Recognition \/ Selection Grade 1 pilot/);
  assert.match(hub, /recognition-selection-pilot\.html\?skill=/);
  assert.match(recognitionPilot, /const PILOT_MAP=\{/);
  assert.match(recognitionPilot, /g1e_rf_001/);
  assert.match(recognitionPilot, /g1m_dp_001/);
  assert.match(recognitionPilot, /Skill World Missions/);
});
