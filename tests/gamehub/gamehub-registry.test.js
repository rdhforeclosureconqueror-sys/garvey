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
