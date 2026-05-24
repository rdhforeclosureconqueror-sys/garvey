const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const registry = require('../../public/gamehub/gamehub-registry.js');

const ROOT = path.join(__dirname, '../..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

test('all registry games include complete integration status metadata fields', () => {
  registry.listGames().forEach((entry) => {
    ['game_key', 'instrumentation_status', 'local_instrumentation_ready', 'tracking_ready', 'launch_path'].forEach((field) => {
      assert.ok(Object.prototype.hasOwnProperty.call(entry, field), `missing ${field} for ${entry.game_key}`);
    });

    assert.equal(typeof entry.local_instrumentation_ready, 'boolean');
    assert.equal(typeof entry.tracking_ready, 'boolean');
    assert.ok(['local_pilot_ready', 'not_instrumented', 'hold_for_repair'].includes(entry.instrumentation_status));
  });
});

test('tracking_ready remains false for all games', () => {
  registry.listGames().forEach((entry) => {
    assert.equal(entry.tracking_ready, false, `${entry.game_key} must keep tracking_ready false`);
  });
});

test('documentation includes integration status table and before-tracking checklist', () => {
  const registryDoc = read('docs/gamehub-registry.md');

  assert.match(registryDoc, /\| Game \| Playable \| Local instrumentation \| Mode preset aware \| Gate mapped \| Gate Detail recommendation ready \| Tracking ready \| Notes \|/);
  assert.match(registryDoc, /Before tracking can be enabled/);

  [
    'privacy review',
    'parent consent flow',
    'server event ingestion',
    'child identity handoff design',
    'aggregation-only reducer',
    'no raw answer payload rules',
    'deletion/export policy',
    'clinical/diagnostic language guardrails'
  ].forEach((phrase) => {
    assert.match(registryDoc.toLowerCase(), new RegExp(phrase));
  });
});

test('PR31 scope guardrail: no runtime tracking, scoring, or db writes added', () => {
  const combined = [
    read('docs/gamehub-registry.md'),
    read('docs/gamehub-session-adapter.md'),
    read('tests/gamehub/gamehub-integration-status-dashboard.test.js')
  ].join('\n');

  assert.doesNotMatch(combined, /tracking_ready\s*:\s*true/i);

  const runtimeSource = [
    read('public/gamehub/gamehub-session-adapter.js'),
    read('public/gamehub/gamehub-registry.js')
  ].join('\n').toLowerCase();

  assert.doesNotMatch(runtimeSource, /score_writeback|insert\s+into|update\s+gates_|\bfetch\s*\(|xmlhttprequest|indexeddb\.open|localstorage\.setitem/);
});
