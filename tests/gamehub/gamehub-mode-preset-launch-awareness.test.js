const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('affected games parse launch context mode_preset with standard fallback', () => {
  ['public/gamehub/surf', 'public/gamehub/brickblast', 'public/gamehub/adaptive_learning'].forEach((rel) => {
    const src = read(rel);
    assert.match(src, /mode_preset/);
    assert.match(src, /practice_path/);
    assert.match(src, /gate_context/);
    assert.match(src, /normalizeModePreset/);
    assert.match(src, /normalizeModePreset/);
    assert.match(src, /standard/);
  });
});

test('mode presets apply config-only tuning hooks for targeted games', () => {
  const surf = read('public/gamehub/surf');
  const brickblast = read('public/gamehub/brickblast');
  const adaptive = read('public/gamehub/adaptive_learning');

  assert.match(surf, /surfPresetConfig/);
  assert.match(surf, /questionRanges:appliedSurfPreset\.questionRanges/);

  assert.match(brickblast, /brickblastPresetConfig/);
  assert.match(brickblast, /powerupMultiplier/);
  assert.match(brickblast, /speedCurve:\{base:appliedBrickblastPreset\.speedCurve\.base/);

  assert.match(adaptive, /adaptivePresetConfig/);
  assert.match(adaptive, /defaultQuestionCount/);
  assert.match(adaptive, /startingDifficultyOverride/);
});

test('preset launch-awareness patch keeps tracking/db/scoring wiring off', () => {
  const combined = [
    read('public/gamehub/surf'),
    read('public/gamehub/brickblast'),
    read('public/gamehub/adaptive_learning')
  ].join('\n');
  assert.doesNotMatch(combined, /tracking_ready\s*:\s*true/i);
  assert.doesNotMatch(combined, /insert\s+into|update\s+gates_|db\.|database\s+write|gatesScoring/i);
});

test('game launch files remain playable HTML and include optional practice mode notice', () => {
  ['surf', 'brickblast', 'adaptive_learning'].forEach((name) => {
    const html = read(`public/gamehub/${name}.html`);
    assert.match(html, /<!DOCTYPE html>/i);
    assert.match(html, /Practice mode:\s*(Support|Standard|Challenge)/);
  });
});
