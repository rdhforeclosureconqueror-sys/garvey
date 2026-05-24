const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const registry = require('../../public/gamehub/gamehub-registry.js');

const root = path.join(__dirname, '../..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

test('gates/gamehub integration remains planning-only with tracking disabled', () => {
  const allGames = registry.listGames();
  assert.ok(allGames.length > 0);
  allGames.forEach((entry) => {
    assert.equal(entry.tracking_ready, false, `${entry.game_key} tracking must remain disabled`);
  });
});

test('before-tracking checklist is documented for product planning', () => {
  const doc = read('docs/gamehub-registry.md').toLowerCase();
  assert.match(doc, /before tracking can be enabled/);
  assert.match(doc, /parent consent flow/);
  assert.match(doc, /server event ingestion architecture/);
  assert.match(doc, /aggregation-only reducer/);
});
