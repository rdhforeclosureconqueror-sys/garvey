const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const shared = require('../../public/gamehub/shared-content-loader.js');

const wordBank = JSON.parse(fs.readFileSync('public/gamehub/content/word-bank.sample.json', 'utf8'));
const questionBank = JSON.parse(fs.readFileSync('public/gamehub/content/question-bank.sample.json', 'utf8'));
const wordSchema = JSON.parse(fs.readFileSync('public/gamehub/schema/word-bank-item.schema.json', 'utf8'));
const questionSchema = JSON.parse(fs.readFileSync('public/gamehub/schema/question-bank-item.schema.json', 'utf8'));
const spellingSource = fs.readFileSync('public/gamehub/spelling', 'utf8');
const sightWordsSource = fs.readFileSync('public/gamehub/1stgradesightwords', 'utf8');
const game6Source = fs.readFileSync('public/gamehub/game6', 'utf8');
const adaptiveSource = fs.readFileSync('public/gamehub/adaptive_learning', 'utf8');

test('word bank sample includes expansion metadata and structured tags', () => {
  assert.equal(wordBank.id, 'sample-k-3');
  assert.ok(wordBank.metadata);
  assert.equal(wordBank.metadata.purpose, 'Literacy practice sample');
  assert.ok(Array.isArray(wordBank.items));
  assert.ok(wordBank.items.every((item) => Array.isArray(item.tags)));
  assert.ok(wordBank.items.every((item) => item.tags.some((tag) => tag.startsWith('subject:'))));
  assert.ok(wordBank.items.some((item) => item.phonics_focus));
});

test('word and question schemas allow optional expansion metadata without breaking required core fields', () => {
  assert.ok(wordSchema.required.includes('id'));
  assert.ok(wordSchema.required.includes('word'));
  assert.ok(wordSchema.required.includes('definition'));
  assert.equal(wordSchema.properties.phonics_focus.type, 'string');
  assert.equal(wordSchema.properties.difficulty_label.type, 'string');

  assert.ok(questionSchema.required.includes('id'));
  assert.ok(questionSchema.required.includes('prompt'));
  assert.ok(questionSchema.required.includes('answer'));
  assert.equal(questionSchema.properties.category.type, 'string');
  assert.equal(questionSchema.properties.theme.type, 'string');
});

test('shared loader stays backward compatible across literacy and adaptive targets', () => {
  const spellingLesson = shared.fromWordBankToSpellingLesson(wordBank, '1');
  const sightDeck = shared.fromWordBankToSightWordsDeck(wordBank);
  const game6Set = shared.fromWordBankToGame6Set(wordBank);
  const adaptiveItems = shared.fromQuestionBankToAdaptiveItems(questionBank);

  assert.ok(spellingLesson.some((item) => item.word === 'tag'));
  assert.ok(sightDeck.includes('these'));
  assert.ok(game6Set.some((item) => item.word === 'vital' && item.syn === 'essential'));
  assert.ok(adaptiveItems.some((item) => item.id === 'm7_sample_1'));
});

test('foundation remains content-only with no gameplay rewrite or tracking/db/scoring enablement', () => {
  [spellingSource, sightWordsSource, game6Source, adaptiveSource].forEach((source) => {
    assert.doesNotMatch(source, /tracking_ready\s*:\s*true/i);
    assert.doesNotMatch(source, /fetch\([^)]*\/api\//i);
    assert.doesNotMatch(source, /indexedDB|localforage|database|db\./i);
    assert.doesNotMatch(source, /gate score|scoring pipeline|gradebook/i);
  });
});
