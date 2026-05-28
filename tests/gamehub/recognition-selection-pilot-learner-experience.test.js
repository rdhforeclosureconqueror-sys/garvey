const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const pilotPagePath = path.join(root, 'public/gamehub/recognition-selection-pilot.html');
const pilotPage = fs.readFileSync(pilotPagePath, 'utf8');
const engine = require(path.join(root, 'public/gamehub/engines/recognition-selection/recognition-selection-engine.js'));

const pilotSkills = ['g1e_rf_001', 'g1e_rf_002', 'g1e_rf_004', 'g1m_ns_003', 'g1m_gm_001', 'g1m_dp_001'];

const learnerSafeNames = {
  g1e_rf_001: 'Sound Safari',
  g1e_rf_002: 'Blend Bridge',
  g1e_rf_004: 'Word Rocket',
  g1m_ns_003: 'Number Trail',
  g1m_gm_001: 'Shape Scout',
  g1m_dp_001: 'Data Detectives'
};

function readPilotConfig(skill) {
  const configPath = path.join(
    root,
    'public/gamehub/content/adaptive-v2/grades/grade1/pilot-recognition-selection',
    `${skill}.config.v1.json`
  );
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

test('learner flow includes full mission sequence for the pilot page', () => {
  const requiredStages = [
    'Story Mission',
    'Mini Lesson',
    'Watch Me',
    'Practice Zone',
    'Challenge',
    'Checkpoint',
    'Badge / Mission Complete',
    'Growth Data Saved'
  ];

  for (const stage of requiredStages) {
    assert.match(pilotPage, new RegExp(stage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('learner page avoids exposing debug and developer-facing language', () => {
  const disallowedLearnerText = [
    /Runtime status/i,
    /QA checklist/i,
    /config path/i,
    /raw route instructions/i,
    /\[object Object\]/,
    /undefined\/undefined/
  ];

  for (const disallowed of disallowedLearnerText) {
    assert.doesNotMatch(pilotPage, disallowed);
  }
});

test('profile and hub launch language is child-friendly and avoids raw skill IDs in primary labels', () => {
  assert.match(pilotPage, /Choose another mission/);

  for (const skillId of pilotSkills) {
    assert.doesNotMatch(
      pilotPage,
      new RegExp(`Skill World:\\s*${skillId}`, 'i'),
      `raw skill ID should not appear as the learner-visible Skill World title label (${skillId})`
    );
  }

  for (const name of Object.values(learnerSafeNames)) {
    assert.match(pilotPage, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('completion summary and saved screen include learner-safe progress fields', () => {
  assert.match(pilotPage, /Accuracy\s*\$?\{accuracy\(\)\}%/);
  assert.match(pilotPage, /hints used/i);
  assert.match(pilotPage, /Mastery level:/);
  assert.match(pilotPage, /Choose another mission/);
});

test('each of the six pilot skills validates and boots engine session without debug leakage in question view', () => {
  for (const skill of pilotSkills) {
    const config = readPilotConfig(skill);
    const normalized = engine.validateConfig(config);
    const session = engine.createEngineSession(normalized, {});
    const firstView = session.getQuestionView();

    assert.ok(firstView && typeof firstView.prompt === 'string' && firstView.prompt.trim().length > 0, `${skill} should have a learner prompt`);
    assert.ok(Array.isArray(firstView.choices) && firstView.choices.length >= 2, `${skill} should expose learner choices`);

    const displayBlob = `${firstView.prompt} ${(firstView.choices || []).map((c) => c.label || c.text || '').join(' ')}`;
    assert.doesNotMatch(displayBlob, /\[object Object\]|undefined\/undefined|config path|runtime status|qa checklist|raw route instructions/i);
  }
});
