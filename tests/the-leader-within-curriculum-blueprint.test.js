'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const blueprintPath = 'public/the-leader-within/programs/leadership-curriculum-blueprint.md';
const blueprint = fs.readFileSync(blueprintPath, 'utf8');

test('Leadership Curriculum Blueprint exists above weekly lessons with required sections', () => {
  assert.ok(fs.existsSync(blueprintPath));
  for (const heading of [
    'Program philosophy',
    'Shared leadership progression',
    '32-week full curriculum map',
    '12-week core curriculum map',
    '8-week condensed curriculum map',
    'How the three versions relate',
    'Voice/audio guidance',
    'Future PocketPT/live-coach integration note',
    'Implementation notes to avoid repo bloat',
  ]) assert.match(blueprint, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('blueprint maps all three program lengths and preserves non-labeling philosophy', () => {
  assert.equal((blueprint.match(/^\| \d+ \|/gm) || []).length, 52);
  for (const token of [
    'Leadership Is Already Happening',
    'Where is leadership already showing up in my life?',
    'What leadership capacities appeared?',
    'Vision Drive',
    'Structure Drive',
    'Relational Intelligence',
    'Influence Expression',
    'Adaptive Control',
    'should not permanently label participants',
  ]) assert.match(blueprint, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('blueprint documents voice and PocketPT boundaries without live-coach implementation', () => {
  for (const token of [
    'Garvey AI Voice should read weekly introductions',
    'should not read facilitator notes',
    'Do not build live voice-response coaching yet',
    'PocketPT may later provide live voice coaching',
    'avoid active PocketPT handoff buttons unless already existing',
    'Do not create unnecessary new components',
  ]) assert.match(blueprint, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(blueprint, /token=|secret|x-pocketpt-token|api key/i);
});
