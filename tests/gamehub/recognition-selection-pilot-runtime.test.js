const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const pilotPage = fs.readFileSync(path.join(root, 'public/gamehub/recognition-selection-pilot.html'), 'utf8');
const engine = require(path.join(root, 'public/gamehub/engines/recognition-selection/recognition-selection-engine.js'));

const pilotSkills = ['g1e_rf_001', 'g1e_rf_002', 'g1e_rf_004', 'g1m_ns_003', 'g1m_gm_001', 'g1m_dp_001'];

function readPilotConfig(skill) {
  const configPath = path.join(
    root,
    'public/gamehub/content/adaptive-v2/grades/grade1/pilot-recognition-selection',
    `${skill}.config.v1.json`
  );
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

test('recognition selection pilot map includes all six live route skills', () => {
  for (const skill of pilotSkills) {
    assert.match(pilotPage, new RegExp(`${skill}\\.config\\.v1\\.json`));
  }
});

test('all six pilot configs validate and create playable runtime sessions', () => {
  for (const skill of pilotSkills) {
    const config = readPilotConfig(skill);
    const normalized = engine.validateConfig(config);
    assert.ok(normalized.skill_id);
    const session = engine.createEngineSession(normalized, {});
    const view = session.getQuestionView();
    assert.ok(view && Array.isArray(view.choices) && view.choices.length >= 2, `${skill} should expose playable choices`);
  }
});

test('runtime fallback messaging is learner-safe when mission cannot load', () => {
  assert.match(pilotPage, /Mission unavailable/);
  assert.doesNotMatch(pilotPage, /Config invalid for \$\{skillKey\}: \$\{message\}/);
  assert.doesNotMatch(pilotPage, /Failed loading config \(\$\{response\.status\}\): \$\{configPath\}/);
});
