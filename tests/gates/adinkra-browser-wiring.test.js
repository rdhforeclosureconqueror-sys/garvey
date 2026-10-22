'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(root,'public/gamehub/content/index.html'),'utf8');
const game = fs.readFileSync(path.join(root,'public/gamehub/content/game.js'),'utf8');
const adapter = fs.readFileSync(path.join(root,'public/gamehub/content/adinkra-lesson-adapter.js'),'utf8');
test('HTML loads the adapter and challenge before the game', () => {
  const a = html.indexOf('src="./adinkra-lesson-adapter.js"');
  const c = html.indexOf('src="./mate-masie-challenge.js"');
  const g = html.indexOf('src="./game.js"');
  assert.ok(a >= 0 && c > a && g > c);
});
test('Keeper interaction uses the curriculum and challenge', () => {
  assert.match(game, /window\.TenGatesAdinkra\.keeperIntroduction\(adinkraSunday\)/);
  assert.match(game, /window\.MateMasieChallenge/);
  assert.match(game, /activity\.checkAnswer\(option\.id\)/);
  assert.match(game, /Hear the clue again/);
  assert.match(game, /mate_masie_listening/);
});
test('restart resets Keeper introduction', () => {
  assert.match(game, /n\.adinkraIntroduced=false/);
});
test('browser curriculum is served from the game directory', () => {
  assert.match(adapter, /gamehub\/content\/gate-attention\.pilot\.json/);
  const release = JSON.parse(fs.readFileSync(path.join(root,'public/gamehub/content/gate-attention.pilot.json'),'utf8'));
  assert.equal(release.lessons.length,7);
});
