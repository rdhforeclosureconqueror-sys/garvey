'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const release = require('../../gates-v2/content/adinkra/gate-attention.pilot.json');
const adapter = require('../../public/gamehub/content/adinkra-lesson-adapter.js');

test('Gate 1 has seven unique valid lessons', () => {
  assert.equal(adapter.validateRelease(release), true);
  assert.deepEqual(release.lessons.map(x => x.day).sort(), [1,2,3,4,5,6,7]);
});
test('Sunday Keeper introduction uses the shared content', () => {
  const lesson = adapter.lessonForDay(release, 1);
  assert.equal(lesson.symbol_name, 'Mate Masie');
  assert.match(adapter.keeperIntroduction(lesson), /Mate Masie/);
});
test('rejects duplicate day and challenge IDs', () => {
  const invalid = JSON.parse(JSON.stringify(release));
  invalid.lessons[1].day = 1;
  assert.throws(() => adapter.validateRelease(invalid));
});
test('loads release from a same-origin URL', async () => {
  let requested;
  const result = await adapter.loadGateOne(async (url, options) => {
    requested = {url, options};
    return {ok:true,json:async()=>release};
  });
  assert.equal(result.lessons.length, 7);
  assert.equal(requested.url, adapter.LESSON_URL);
  assert.equal(requested.options.credentials, 'same-origin');
});
