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

const ALLOWED_CONFIDENCE = ['strong', 'medium', 'light'];
const ALLOWED_SIGNAL_CATEGORIES = [
  'attention_focus',
  'persistence',
  'recovery_after_setback',
  'challenge_choice',
  'emotional_regulation',
  'cognitive_flexibility',
  'literacy_practice',
  'adaptive_reasoning',
  'body_timing',
  'strategy_use'
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

test('instrumented games have developmental mapping metadata and safe signal categories', () => {
  const readyGames = registryModule.listGames().filter((entry) => entry.instrumentation_status === 'local_pilot_ready');
  readyGames.forEach((entry) => {
    assert.ok(Array.isArray(entry.primary_gates) && entry.primary_gates.length > 0, `${entry.game_key} missing primary_gates`);
    assert.ok(Array.isArray(entry.signal_categories) && entry.signal_categories.length > 0, `${entry.game_key} missing signal_categories`);
    assert.ok(Array.isArray(entry.secondary_gates), `${entry.game_key} missing secondary_gates`);
    assert.ok(ALLOWED_CONFIDENCE.includes(entry.signal_confidence), `${entry.game_key} has invalid signal_confidence`);
    entry.signal_categories.forEach((category) => {
      assert.ok(ALLOWED_SIGNAL_CATEGORIES.includes(category), `${entry.game_key} has invalid signal category ${category}`);
    });
    assert.equal(typeof entry.parent_reflection_prompt, 'string', `${entry.game_key} missing parent_reflection_prompt`);
    assert.notEqual(entry.parent_reflection_prompt.trim(), '', `${entry.game_key} parent_reflection_prompt must not be empty`);
    assert.doesNotMatch(entry.parent_reflection_prompt.toLowerCase(), /diagnosis|diagnostic|disorder|deficit|condition|score|grade/i);
  });

  const checkers = registryModule.getGameByKey('checkers');
  assert.notEqual(checkers.instrumentation_status, 'local_pilot_ready');
  assert.equal(typeof checkers.primary_gates, 'undefined');
  assert.equal(typeof checkers.signal_categories, 'undefined');
});

test('getGamesByGate helper returns expected mappings', () => {
  const byLearning = registryModule.getGamesByGate('learning').map((game) => game.game_key);
  assert.ok(byLearning.includes('adaptive_learning'));
  assert.ok(byLearning.includes('spelling'));

  const byNumericAlias = registryModule.getGamesByGate(2).map((game) => game.game_key);
  assert.ok(byNumericAlias.includes('adaptive_learning'));
  assert.ok(byNumericAlias.includes('braingames'));
});

test('mapping remains interpretation-only with no diagnostic language or score/writeback wiring', () => {
  const registrySource = fs.readFileSync(path.join(root, 'public/gamehub/gamehub-registry.js'), 'utf8').toLowerCase();
  assert.doesNotMatch(registrySource, /diagnostic conclusion|diagnosis|disorder|deficit/i);
  assert.doesNotMatch(registrySource, /gates score|official gates score|score_writeback|insert into|database|db\.|fetch\(|xmlhttprequest/i);
  assert.doesNotMatch(registrySource, /tracking_ready\s*:\s*true/i);
});

test('suggested metadata is optional and valid when present', () => {
  registryModule.listGames().forEach((entry) => {
    assert.equal(registryModule.hasValidSuggestedMetadata(entry), true, `${entry.game_key} has invalid suggested metadata`);
  });
});
