const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const adaptive = fs.readFileSync(path.join(__dirname, '../../public/gamehub/adaptive_learning.html'), 'utf8');

test('prK renders Grade 1 voice controls', () => {
  assert.match(adaptive, /Listen to lesson/);
  assert.match(adaptive, /Listen to example/);
  assert.match(adaptive, /Listen to hint/);
  assert.match(adaptive, /Stop voice/);
});

test('prK uses adaptive-v2 voice sections route and fallback-safe browser speech', () => {
  assert.match(adaptive, /\/api\/adaptive-v2\/voice\/sections/);
  assert.match(adaptive, /speechSynthesis/);
});

test('prK keeps grade1-only voice with no grades 2-6 voice wiring, gates scoring, or diagnosis\/pass-fail language', () => {
  assert.doesNotMatch(adaptive, /grade\s*[2-6].*voice|voice.*grade\s*[2-6]/i);
  assert.doesNotMatch(adaptive, /gatesScoring|gate score|insert\s+into\s+gates_|update\s+gates_/i);
  assert.doesNotMatch(adaptive, /voice.*diagnos|voice.*pass\/?fail|adaptive-v2\/voice\/sections[^\n]*diagnos/i);
});


test('prK voice fallback path and status messages are wired', () => {
  assert.match(adaptive, /voice_mode\|\|""\)==="fallback_browser_speech"/);
  assert.match(adaptive, /speechSynthesis\.speak\(new SpeechSynthesisUtterance/);
  assert.match(adaptive, /Voice is starting…/);
  assert.match(adaptive, /Voice is playing\./);
  assert.match(adaptive, /Voice unavailable in this browser\. Please read the text on screen\./);
  assert.match(adaptive, /Voice stopped\./);
});

test('prK stop voice cancels browser speech', () => {
  assert.match(adaptive, /function stopGrade1Voice\(\)\{if\(window\.speechSynthesis\) window\.speechSynthesis\.cancel\(\)/);
});

test('prK adaptive learning html and non-html runtime stay synced for voice logic', () => {
  const adaptiveNoExt = fs.readFileSync(path.join(__dirname, '../../public/gamehub/adaptive_learning'), 'utf8');
  assert.equal(adaptiveNoExt, adaptive);
});
