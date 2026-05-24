const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '../..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

test('GameHub index renders parent-facing About these practice games status section', () => {
  const html = read('public/gamehub/index.html');
  assert.match(html, /About these practice games/);
  assert.match(html, /Games are playable and optional\./);
  assert.match(html, /You can explore them by Gate support areas or by practice path\./);
});

test('GameHub index status note includes required safety language for parents', () => {
  const html = read('public/gamehub/index.html');
  assert.match(html, /These games are not tests, grades, or diagnoses\./);
  assert.match(html, /Practice modes are only experience styles/);
  assert.match(html, /no game results are currently used to score Gates\./i);
});

test('parent-facing status note avoids technical or internal implementation terms', () => {
  const html = read('public/gamehub/index.html');
  const statusSection = html.match(/<section class="section" aria-labelledby="practice-games-status-title">[\s\S]*?<\/section>/i);
  assert.ok(statusSection, 'expected parent-facing status section in index');

  const forbiddenTerms = [
    /adapter/i,
    /telemetry/i,
    /local_pilot_ready/i,
    /registry internals/i,
    /instrumentation_status/i,
    /tracking_ready/i,
    /db\./i,
    /database write/i
  ];

  forbiddenTerms.forEach((term) => {
    assert.doesNotMatch(statusSection[0], term);
  });
});

test('PR32 scope guardrail: no tracking, scoring, or db write logic added', () => {
  const combined = [
    read('public/gamehub/index.html'),
    read('docs/gamehub-registry.md'),
    read('tests/gamehub/pr32-parent-status-note.test.js')
  ].join('\n');

  assert.doesNotMatch(combined, /tracking_ready\s*:\s*true/i);

  const runtimeSource = [
    read('public/gamehub/gamehub-session-adapter.js'),
    read('public/gamehub/gamehub-registry.js')
  ].join('\n').toLowerCase();

  assert.doesNotMatch(runtimeSource, /score_writeback|insert\s+into|update\s+gates_|\bfetch\s*\(|xmlhttprequest|indexeddb\.open|localstorage\.setitem/);
});
