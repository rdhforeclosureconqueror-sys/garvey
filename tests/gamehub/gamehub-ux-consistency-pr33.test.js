const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const games = [
  '1stgradesightwords',
  'adaptive_learning',
  'braingame2',
  'braingames',
  'brickblast',
  'checkers',
  'game6',
  'spelling',
  'surf'
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('game launch files include shared lightweight GameHub identity and navigation affordances', () => {
  games.forEach((name) => {
    const source = read(`public/gamehub/${name}.html`);
    assert.match(source, /gamehub-shared-identity-style/, `${name} missing shared identity style`);
    assert.match(source, /GameHub Practice/, `${name} missing GameHub badge copy`);
    assert.match(source, /Practice mode:/, `${name} missing practice mode display`);
    assert.match(source, /Back to GameHub/, `${name} missing back-to-hub link`);
  });
});

test('canonical and html launch files remain aligned after UX consistency pass', () => {
  games.forEach((name) => {
    assert.equal(
      read(`public/gamehub/${name}`),
      read(`public/gamehub/${name}.html`),
      `${name} canonical and .html launch copy diverged`
    );
  });
});

test('ux consistency pass does not add tracking/scoring/db logic or diagnostics', () => {
  const combined = games
    .flatMap((name) => [read(`public/gamehub/${name}`), read(`public/gamehub/${name}.html`)])
    .join('\n');

  assert.doesNotMatch(combined, /tracking_ready\s*:\s*true/i);
  assert.doesNotMatch(combined, /gatesScoring|insert\s+into|update\s+gates_|db\.|database\s+write/i);
});
