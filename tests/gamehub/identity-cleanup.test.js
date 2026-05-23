const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const gamehubDir = path.join(root, 'public/gamehub');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

const canonicalGames = [
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

const launchPairs = canonicalGames.map((name) => [`public/gamehub/${name}`, `public/gamehub/${name}.html`]);

const forbiddenIdentityTokens = [
  /\bava\b/i,
  /\bemma\b/i,
  /\bliam\b/i,
  /\bnoah\b/i,
  /\bsophia\b/i
];

test('adaptive learning identity UI uses neutral learner defaults', () => {
  const adaptive = read('public/gamehub/adaptive_learning');
  assert.match(adaptive, /<label>Learner name<\/label>/);
  assert.match(adaptive, /DEFAULT_LEARNER_NAME="Demo Learner"/);
  assert.doesNotMatch(adaptive, /Marley Adaptive Learning System/i);
});

test('adaptive learning removes hardcoded active child names and keeps playable generic defaults', () => {
  const adaptive = read('public/gamehub/adaptive_learning');
  assert.doesNotMatch(adaptive, /Marley and I went to the library\./);
  assert.doesNotMatch(adaptive, /Yesterday, Marley went to the store\./);
  assert.match(adaptive, /The learner and I went to the library\./);
  assert.match(adaptive, /Yesterday, the learner went to the store\./);
  assert.match(adaptive, /child_display_name:"Learner"/);
  assert.match(adaptive, /studentName:DEFAULT_LEARNER_NAME/);
});

test('adaptive learning local storage keys are neutral with legacy fallback read only', () => {
  const adaptive = read('public/gamehub/adaptive_learning');
  assert.match(adaptive, /gamehub_adaptive_learning_history_/);
  assert.match(adaptive, /LEGACY_HISTORY_STORAGE_KEY="marley_adaptive_history"/);
  assert.match(adaptive, /getLegacyHistory\(\)/);
  assert.doesNotMatch(adaptive, /localStorage\.setItem\(LEGACY_HISTORY_STORAGE_KEY/);
});

test('all gamehub canonical files and html launch files avoid hardcoded active-child identity names', () => {
  const files = launchPairs.flat();
  files.forEach((rel) => {
    const source = read(rel);
    forbiddenIdentityTokens.forEach((token) => {
      assert.doesNotMatch(source, token, `${rel} contains forbidden identity token ${token}`);
    });
    if (!rel.includes('adaptive_learning')) {
      assert.doesNotMatch(source, /marley/i, `${rel} contains deprecated Marley identity`);
    }
  });
});

test('neutral identity fallback labels exist across gamehub launch files', () => {
  const adaptive = read('public/gamehub/adaptive_learning');
  const spelling = read('public/gamehub/spelling');
  assert.match(adaptive, /DEFAULT_LEARNER_NAME="Demo Learner"/);
  assert.match(adaptive, /child_display_name:"Learner"/);
  assert.match(spelling, /child_display_name:"Player"/);
});

test('canonical source files and .html launch copies stay aligned', () => {
  launchPairs.forEach(([canonical, html]) => {
    assert.equal(read(canonical), read(html), `${canonical} and ${html} diverged`);
  });
});

test('no tracking or gates writeback introduced in identity cleanup', () => {
  const files = [
    ...launchPairs.flat(),
    'public/gamehub/gamehub-registry.js',
    'public/gamehub/index.html'
  ];
  const combined = files.map((rel) => read(rel)).join('\n');
  assert.doesNotMatch(combined, /track\(|track event|tracking_ready\s*:\s*true/i);
  assert.doesNotMatch(combined, /gatesScoring|insert\s+into|update\s+gates_|db\.|database\s+write/i);
});

