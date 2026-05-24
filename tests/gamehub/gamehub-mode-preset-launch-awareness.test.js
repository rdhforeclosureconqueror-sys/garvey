const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('expanded eligible games parse launch context mode_preset with standard fallback', () => {
  ['public/gamehub/spelling', 'public/gamehub/1stgradesightwords', 'public/gamehub/game6'].forEach((rel) => {
    const src = read(rel);
    assert.match(src, /mode_preset/);
    assert.match(src, /practice_path/);
    assert.match(src, /gate_context/);
    assert.match(src, /normalizeModePreset/);
    assert.match(src, /standard/);
  });
});

test('mode presets apply config-only tuning hooks for targeted literacy games', () => {
  const spelling = read('public/gamehub/spelling');
  const sightwords = read('public/gamehub/1stgradesightwords');
  const game6 = read('public/gamehub/game6');

  assert.match(spelling, /spellingPresetConfig/);
  assert.match(spelling, /lessonWordCount/);

  assert.match(sightwords, /sightWordsPresetConfig/);
  assert.match(sightwords, /defaultMatchSize/);

  assert.match(game6, /game6PresetConfig/);
  assert.match(game6, /durationBands/);
});

test('preset launch-awareness patch keeps tracking/db/scoring wiring off', () => {
  const combined = [
    read('public/gamehub/spelling'),
    read('public/gamehub/1stgradesightwords'),
    read('public/gamehub/game6')
  ].join('\n');
  assert.doesNotMatch(combined, /tracking_ready\s*:\s*true/i);
  assert.doesNotMatch(combined, /insert\s+into|update\s+gates_|db\.|database\s+write|diagnos|score\s+children|gatesScoring/i);
});

test('game launch files remain playable HTML and include optional practice mode notice', () => {
  ['spelling', '1stgradesightwords', 'game6'].forEach((name) => {
    const html = read(`public/gamehub/${name}.html`);
    assert.match(html, /<!DOCTYPE html>/i);
    assert.match(html, /Practice mode:\s*(Support|Standard|Challenge)/);
  });
});
