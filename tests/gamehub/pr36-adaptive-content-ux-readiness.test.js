const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const adaptive = fs.readFileSync('public/gamehub/adaptive_learning', 'utf8');
const adaptiveHtml = fs.readFileSync('public/gamehub/adaptive_learning.html', 'utf8');
const sampleBank = fs.readFileSync('public/gamehub/content/question-bank.sample.json', 'utf8');

test('adaptive includes parent-facing practice snapshot note', () => {
  const note = 'Practice snapshots are learning moments, not grades or labels.';
  assert.match(adaptive, new RegExp(note.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(adaptiveHtml, new RegExp(note.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('adaptive content framing emphasizes practice language and remains non-diagnostic', () => {
  assert.match(adaptive, /Start a Practice Session/);
  assert.match(adaptive, /Session style/);
  assert.match(adaptive, /Balanced Practice/);
  assert.doesNotMatch(adaptive, /tracking_ready\s*:\s*true/i);
  assert.doesNotMatch(adaptive, /fetch\(|XMLHttpRequest|indexedDB|database|db\./i);
  assert.doesNotMatch(adaptive, /diagnosis|diagnostic conclusion|grading label/i);
});

test('question-bank sample has lightweight metadata grouping for expansion readiness', () => {
  const parsed = JSON.parse(sampleBank);
  assert.equal(parsed.id, 'sample-questions');
  assert.ok(parsed.metadata);
  assert.equal(parsed.metadata.purpose, 'Adaptive Learning practice sample');
  assert.ok(Array.isArray(parsed.items));
  assert.ok(parsed.items.every((item) => Array.isArray(item.tags) && item.tags.some((tag) => tag.startsWith('subject:'))));
});
