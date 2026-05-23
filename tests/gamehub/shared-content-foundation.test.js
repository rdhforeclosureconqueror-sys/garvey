const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const shared = require('../../public/gamehub/shared-content-loader.js');

const root = path.join(__dirname, '../..');

function readJson(rel){ return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); }

test('schemas exist', ()=> {
  ['word-bank-item','question-bank-item','lesson-pool','difficulty-config','mode-preset'].forEach((n)=> {
    assert.equal(fs.existsSync(path.join(root, `public/gamehub/schema/${n}.schema.json`)), true);
  });
});

test('sample content loads + validates', async ()=> {
  const fetchImpl = async (p)=>({ok:true,json:async()=>readJson(`public${p}`)});
  const bank = await shared.loadWordBank('/gamehub/content/word-bank.sample.json', null, fetchImpl);
  assert.ok(bank.items.length >= 3);
});

test('adapter creates spelling lesson items', ()=> {
  const bank = readJson('public/gamehub/content/word-bank.sample.json');
  const lesson = shared.fromWordBankToSpellingLesson(bank, 1);
  assert.ok(lesson.some((i)=>i.word === 'tag'));
});

test('adapter creates sight words deck', ()=> {
  const bank = readJson('public/gamehub/content/word-bank.sample.json');
  const deck = shared.fromWordBankToSightWordsDeck(bank);
  assert.ok(deck.includes('these'));
});

test('adapter creates game6 set', ()=> {
  const bank = readJson('public/gamehub/content/word-bank.sample.json');
  const set = shared.fromWordBankToGame6Set(bank);
  assert.ok(set.some((i)=> i.word === 'vital' && i.syn === 'essential' && i.ant === 'unimportant'));
});

test('one shared bank supports spelling, sight words, and game6', ()=> {
  const bank = readJson('public/gamehub/content/word-bank.sample.json');
  const spelling = shared.fromWordBankToSpellingLesson(bank);
  const sight = shared.fromWordBankToSightWordsDeck(bank);
  const game6 = shared.fromWordBankToGame6Set(bank);
  assert.ok(spelling.length > 0);
  assert.ok(sight.length > 0);
  assert.ok(game6.length > 0);
});

test('games keep fallback and no tracking wiring', ()=> {
  const spelling = fs.readFileSync(path.join(root, 'public/gamehub/spelling'),'utf8');
  const sight = fs.readFileSync(path.join(root, 'public/gamehub/1stgradesightwords'),'utf8');
  const game6 = fs.readFileSync(path.join(root, 'public/gamehub/game6'),'utf8');
  assert.match(spelling, /WORDS_FALLBACK/);
  assert.match(sight, /WORDS_FALLBACK/);
  assert.match(game6, /let words = \[/);
  assert.doesNotMatch(spelling, /track|gate score|gates tracking/i);
  assert.doesNotMatch(sight, /track|gate score|gates tracking/i);
  assert.doesNotMatch(game6, /track|gate score|gates tracking/i);
});
