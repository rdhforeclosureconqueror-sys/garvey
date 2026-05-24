const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const registry = require('../../public/gamehub/gamehub-registry.js');

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

test('GameHub index renders Where to start section with required guidance language', () => {
  const html = read('public/gamehub/index.html');
  assert.match(html, /Where to start/);
  assert.match(html, /Start anywhere\. These paths are suggestions, not requirements\./);
  assert.match(html, /getRecommendedStartingPaths\(/);
});

test('starting paths include required shape and use playable launch paths', () => {
  const paths = registry.getRecommendedStartingPaths();
  assert.equal(Array.isArray(paths), true);
  assert.equal(paths.length, 4);

  paths.forEach((entry) => {
    assert.equal(typeof entry.title, 'string');
    assert.equal(typeof entry.description, 'string');
    assert.ok(Array.isArray(entry.related_gates) && entry.related_gates.length > 0);
    assert.equal(typeof entry.safety_note, 'string');

    assert.ok(Array.isArray(entry.games));
    assert.ok(entry.games.length >= 2 && entry.games.length <= 4, `${entry.path_key} should have 2-4 games`);
    entry.games.forEach((game) => {
      assert.ok(typeof game.launch_path === 'string' && game.launch_path.endsWith('.html'));
      assert.equal(game.tracking_ready, false);
    });
  });
});

test('starting paths exclude checkers while hold_for_repair', () => {
  const paths = registry.getRecommendedStartingPaths();
  paths.forEach((entry) => {
    entry.games.forEach((game) => {
      assert.notEqual(game.game_key, 'checkers');
      assert.notEqual(game.instrumentation_status, 'hold_for_repair');
    });
  });
});

test('starting paths feature adds no scoring, ranking, tracking, or database logic', () => {
  const combined = `${read('public/gamehub/index.html')}\n${read('public/gamehub/gamehub-registry.js')}`.toLowerCase();
  assert.doesNotMatch(combined, /tracking_ready\s*:\s*true/);
  assert.doesNotMatch(combined, /gatesscoring|score_writeback|official gates score|rank children|child ranking|insert\s+into|update\s+gates_|database\s+write|db\./i);
});
