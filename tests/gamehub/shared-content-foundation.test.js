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
  assert.ok(bank.items.length >= 2);
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

test('games keep fallback and no tracking wiring', ()=> {
  const spelling = fs.readFileSync(path.join(root, 'public/gamehub/spelling'),'utf8');
  const sight = fs.readFileSync(path.join(root, 'public/gamehub/1stgradesightwords'),'utf8');
  assert.match(spelling, /WORDS_FALLBACK/);
  assert.match(sight, /WORDS_FALLBACK/);
  assert.doesNotMatch(spelling, /track|gate score|gates tracking/i);
  assert.doesNotMatch(sight, /track|gate score|gates tracking/i);
});
