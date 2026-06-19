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

test('prK uses shared assessment voice section route and fallback-safe browser speech', () => {
  assert.match(adaptive, /\/api\/assessment\/voice\/section/);
  assert.match(adaptive, /speechSynthesis/);
});

test('prK keeps grade1-only voice with no grades 2-6 voice wiring, gates scoring, or diagnosis\/pass-fail language', () => {
  assert.doesNotMatch(adaptive, /grade\s*[2-6].*voice|voice.*grade\s*[2-6]/i);
  assert.doesNotMatch(adaptive, /gatesScoring|gate score|insert\s+into\s+gates_|update\s+gates_/i);
  assert.doesNotMatch(adaptive, /voice.*diagnos|voice.*pass\/?fail|assessment\/voice\/section[^\n]*diagnos/i);
});


test('prK voice fallback path and status messages are wired', () => {
  assert.match(adaptive, /body\.voice_mode==='provider_audio'&&body\.audio_url/);
  assert.match(adaptive, /speechSynthesis\.speak\(new SpeechSynthesisUtterance/);
  assert.match(adaptive, /AI voice is starting…/);
  assert.match(adaptive, /Playing AI voice\./);
  assert.match(adaptive, /Voice unavailable in this browser\. Please read the text on screen\./);
  assert.match(adaptive, /Voice stopped\./);
});

test('prK stop voice cancels browser speech', () => {
  assert.match(adaptive, /function stopGrade1Voice\(\)\{if\(grade1ActiveAudio\)\{grade1ActiveAudio\.pause\(\)/);
});

test('prK adaptive learning html and non-html runtime stay synced for voice logic', () => {
  const adaptiveNoExt = fs.readFileSync(path.join(__dirname, '../../public/gamehub/adaptive_learning'), 'utf8');
  assert.equal(adaptiveNoExt, adaptive);
});
