const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('adaptive_learning launch copy is synchronized one-way from authoritative html source', () => {
  const authoritative = read('public/gamehub/adaptive_learning.html');
  const launchCopy = read('public/gamehub/adaptive_learning');

  assert.equal(
    launchCopy,
    authoritative,
    'Run npm run sync:adaptive-runtime to copy public/gamehub/adaptive_learning.html to public/gamehub/adaptive_learning'
  );
});
