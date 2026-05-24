const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const registryModule = require('../../public/gamehub/gamehub-registry.js');

const REQUIRED_FIELDS = [
  'game_key',
  'title',
  'file_path',
  'description',
  'game_type',
  'primary_capacities',
  'suggested_age_range',
  'supported_gate_tags',
  'content_source_type',
  'config_ready',
  'tracking_ready',
  'adapter_ready',
  'local_instrumentation_ready',
  'instrumentation_status',
  'public_launch_allowed',
  'parent_context_launch_allowed',
  'child_context_launch_allowed',
  'safety_notes'
];

function listStandaloneGameFiles() {
  const directory = path.join(root, 'public/gamehub');
  return fs.readdirSync(directory)
    .filter((name) => {
      const fullPath = path.join(directory, name);
      if (!fs.statSync(fullPath).isFile()) return false;
      if (name.endsWith('.js') || name.endsWith('.json') || name.endsWith('.html')) return false;
      return !name.startsWith('.');
    })
    .sort();
}

test('registry includes every current standalone public/gamehub game file', () => {
  const standaloneFiles = listStandaloneGameFiles();
  const registryPaths = registryModule.listGames().map((entry) => entry.file_path.replace('/gamehub/', '')).sort();
  assert.deepEqual(registryPaths, standaloneFiles);
});

test('every registry entry includes required metadata and explicit launch flags', () => {
  registryModule.listGames().forEach((entry) => {
    REQUIRED_FIELDS.forEach((fieldName) => {
      assert.ok(Object.prototype.hasOwnProperty.call(entry, fieldName), `missing field ${fieldName} in ${entry.game_key}`);
    });
    assert.equal(typeof entry.public_launch_allowed, 'boolean');
    assert.equal(typeof entry.parent_context_launch_allowed, 'boolean');
    assert.equal(typeof entry.child_context_launch_allowed, 'boolean');
  });
});

test('launch paths in registry point to existing files', () => {
  registryModule.listGames().forEach((entry) => {
    const relPath = entry.file_path.replace(/^\//, '');
    assert.equal(fs.existsSync(path.join(root, 'public', relPath)), true, `missing file for ${entry.game_key}`);
  });
});

test('tracking_ready is false for all games in PR5 foundation phase', () => {
  registryModule.listGames().forEach((entry) => {
    assert.equal(entry.tracking_ready, false, `${entry.game_key} tracking_ready must remain false`);
  });
});


test('adapter readiness is explicit and checkers remains hold_for_repair', () => {
  registryModule.listGames().forEach((entry) => {
    assert.equal(typeof entry.adapter_ready, 'boolean');
    assert.equal(typeof entry.local_instrumentation_ready, 'boolean');
    assert.ok(['local_pilot_ready', 'not_instrumented', 'hold_for_repair'].includes(entry.instrumentation_status));
  });

  const checkers = registryModule.getGameByKey('checkers');
  assert.equal(checkers.adapter_ready, true);
  assert.equal(checkers.local_instrumentation_ready, false);
  assert.equal(checkers.instrumentation_status, 'hold_for_repair');
});
test('registry helper returns context-specific launchable lists without scoring/tracking logic', () => {
  const publicGames = registryModule.getLaunchableGames('public');
  const parentGames = registryModule.getLaunchableGames('parent');
  const childGames = registryModule.getLaunchableGames('child');
  assert.ok(publicGames.length > 0);
  assert.ok(parentGames.length > 0);
  assert.ok(childGames.length > 0);

  const registrySource = fs.readFileSync(path.join(root, 'public/gamehub/gamehub-registry.js'), 'utf8');
  assert.doesNotMatch(registrySource, /track\(|gatesScoring|gates\/gatesScoring/i);
});

test('instrumented games are local_pilot_ready and map to pilot docs/tests', () => {
  const instrumented = ['1stgradesightwords','spelling','game6','adaptive_learning','surf','brickblast','braingames','braingame2'];
  const registrySource = fs.readFileSync(path.join(root, 'public/gamehub/gamehub-registry.js'), 'utf8');
  const adapterDoc = fs.readFileSync(path.join(root, 'docs/gamehub-session-adapter.md'), 'utf8');

  instrumented.forEach((key) => {
    const entry = registryModule.getGameByKey(key === '1stgradesightwords' ? 'first_grade_sight_words' : key);
    assert.ok(entry, `missing registry entry for ${key}`);
    assert.equal(entry.adapter_ready, true);
    assert.equal(entry.local_instrumentation_ready, true);
    assert.equal(entry.tracking_ready, false);
    assert.equal(entry.instrumentation_status, 'local_pilot_ready');
    assert.match(adapterDoc.toLowerCase(), new RegExp((key === '1stgradesightwords' ? 'sight words' : key).replace(/_/g, ' ')));
  });

  assert.doesNotMatch(registrySource, /tracking_ready\s*:\s*true/i);
  assert.doesNotMatch(registrySource, /fetch\(|XMLHttpRequest|gatesScoring|database|db\.|insert into/i);
});
