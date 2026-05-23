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


test('question bank sample validates and adapts for adaptive_learning', async ()=> {
  const fetchImpl = async (p)=>({ok:true,json:async()=>readJson(`public${p}`)});
  const bank = await shared.loadQuestionBank('/gamehub/content/question-bank.sample.json', null, fetchImpl);
  assert.ok(bank.items.length >= 2);
  const adapted = shared.fromQuestionBankToAdaptiveItems(bank);
  assert.ok(adapted.every((item)=>item.id && item.prompt && item.correct_answer));
  assert.ok(adapted.some((item)=> item.subject === 'Math' && Array.isArray(item.choices)));
});

test('adaptive_learning keeps fallback QUESTION_BANK while supporting shared loader', ()=> {
  const adaptive = fs.readFileSync(path.join(root, 'public/gamehub/adaptive_learning'),'utf8');
  assert.match(adaptive, /const QUESTION_BANK=\[/);
  assert.match(adaptive, /bootstrapQuestionBank/);
  assert.match(adaptive, /loadQuestionBank/);
});

test('no tracking or gates wiring introduced for adaptive_learning extraction', ()=> {
  const adaptive = fs.readFileSync(path.join(root, 'public/gamehub/adaptive_learning'),'utf8');
  assert.doesNotMatch(adaptive, /gates tracking|track event|track\(/i);
});

test('question bank sample remains small', ()=> {
  const bank = readJson('public/gamehub/content/question-bank.sample.json');
  assert.ok(bank.items.length <= 10);
});


test('difficulty and mode config loaders support fallback on invalid/missing data', async ()=> {
  const goodFetch = async (p)=>({ok:true,json:async()=>readJson(`public${p}`)});
  const badFetch = async ()=>({ok:true,json:async()=>({oops:true})});
  const missingFetch = async ()=>({ok:false,json:async()=>({})});

  const fallbackDifficulty = { difficulties:[{id:'fallback',label:'Fallback'}] };
  const fallbackPresets = { presets:[{id:'fallback',label:'Fallback'}] };

  const difficulty = await shared.loadDifficultyConfig('/gamehub/config/difficulty.sample.json', fallbackDifficulty, goodFetch);
  const presets = await shared.loadModePresets('/gamehub/config/mode-presets.sample.json', fallbackPresets, goodFetch);
  assert.ok(difficulty.difficulties.length >= 3);
  assert.ok(presets.presets.some((p)=>p.id === 'support'));

  assert.equal(await shared.loadDifficultyConfig('/missing.json', fallbackDifficulty, missingFetch), fallbackDifficulty);
  assert.equal(await shared.loadModePresets('/missing.json', fallbackPresets, missingFetch), fallbackPresets);
  assert.equal(await shared.loadDifficultyConfig('/broken.json', fallbackDifficulty, badFetch), fallbackDifficulty);
  assert.equal(await shared.loadModePresets('/broken.json', fallbackPresets, badFetch), fallbackPresets);
});

test('surf and brickblast remain fallback-safe and config-ready without gates/tracking wiring', ()=> {
  const surf = fs.readFileSync(path.join(root, 'public/gamehub/surf'),'utf8');
  const brick = fs.readFileSync(path.join(root, 'public/gamehub/brickblast'),'utf8');
  assert.match(surf, /SURF_DEFAULT_CONFIG/);
  assert.match(brick, /BRICKBLAST_DEFAULT_CONFIG/);
  assert.doesNotMatch(surf, /gate|track\(/i);
  assert.doesNotMatch(brick, /gate|track\(/i);
});
