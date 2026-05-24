const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const registry = require('../../public/gamehub/gamehub-registry.js');

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

test('GameHub index includes parent-facing Gates alignment summary section and safety language', () => {
  const html = read('public/gamehub/index.html');
  assert.match(html, /How these games support the Gates/);
  assert.match(html, /These games are optional developmental practices\. They are not tests, grades, or diagnoses\./);
  assert.match(html, /getGateAlignmentSummary\(/);
});

test('gate alignment summary groups mapped games and excludes checkers while hold_for_repair', () => {
  const summary = registry.getGateAlignmentSummary();
  assert.ok(Array.isArray(summary));
  assert.ok(summary.length > 0);

  const learningGroup = summary.find((group) => group.gate_key === 'learning');
  assert.ok(learningGroup, 'expected learning group to exist');
  assert.ok(learningGroup.games.some((entry) => entry.game_key === 'adaptive_learning'));

  summary.forEach((group) => {
    assert.ok(Array.isArray(group.games));
    group.games.forEach((game) => {
      assert.notEqual(game.game_key, 'checkers');
      assert.equal(game.tracking_ready, false);
      assert.ok(game.launch_path && game.launch_path.endsWith('.html'));
      assert.ok(Array.isArray(game.signal_categories) && game.signal_categories.length > 0);
      assert.ok(typeof game.signal_confidence === 'string' && game.signal_confidence.length > 0);
    });
  });
});

test('alignment summary/index changes do not add tracking scoring or database wiring and preserve playable links', () => {
  const combined = `${read('public/gamehub/index.html')}\n${read('public/gamehub/gamehub-registry.js')}`;
  assert.doesNotMatch(combined, /tracking_ready\s*:\s*true/i);
  assert.doesNotMatch(combined, /gatesScoring|insert\s+into|update\s+gates_|db\.|database\s+write/i);
  assert.match(combined, /entry\.launch_path\s*\|\|\s*entry\.file_path/);
});
