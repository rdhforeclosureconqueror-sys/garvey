const test = require('node:test');
const assert = require('node:assert/strict');

const adapter = require('../../public/gamehub/gamehub-session-adapter.js');

test('adapter exports required session interface and canonical events', () => {
  assert.equal(typeof adapter.startSession, 'function');
  assert.equal(typeof adapter.endSession, 'function');
  assert.equal(typeof adapter.emit, 'function');
  assert.equal(typeof adapter.getSessionSnapshot, 'function');
  assert.deepEqual(adapter.CANONICAL_EVENT_NAMES, [
    'game_session_started',
    'game_session_ended',
    'activity_selected',
    'round_started',
    'round_completed',
    'level_changed',
    'retry_started',
    'recovery_after_miss',
    'challenge_selected',
    'accuracy_summary',
    'persistence_signal'
  ]);
});

test('adapter remains in-memory only and does not call network/storage/database APIs', () => {
  let fetchCalls = 0;
  let xhrCalls = 0;
  let localStorageCalls = 0;
  let dbCalls = 0;

  const originalFetch = global.fetch;
  const originalXhr = global.XMLHttpRequest;
  const originalLocalStorage = global.localStorage;
  const originalIndexedDB = global.indexedDB;

  global.fetch = () => { fetchCalls += 1; return Promise.resolve({ ok: true }); };
  global.XMLHttpRequest = function MockXHR() { xhrCalls += 1; };
  global.localStorage = {
    setItem() { localStorageCalls += 1; },
    getItem() { localStorageCalls += 1; return null; }
  };
  global.indexedDB = {
    open() { dbCalls += 1; return { onsuccess: null, onerror: null }; }
  };

  adapter.startSession({ mode: 'practice', level: 2 });
  adapter.emit('round_started', { round_index: 1 });
  adapter.endSession({ rounds_completed: 1 });

  assert.equal(fetchCalls, 0);
  assert.equal(xhrCalls, 0);
  assert.equal(localStorageCalls, 0);
  assert.equal(dbCalls, 0);

  global.fetch = originalFetch;
  global.XMLHttpRequest = originalXhr;
  global.localStorage = originalLocalStorage;
  global.indexedDB = originalIndexedDB;
});

test('forbidden payload fields and free text are stripped while canonical events are accepted', () => {
  const result = adapter.emit('accuracy_summary', {
    child_name: 'Avery',
    raw_answer: '2 + 2 = 4',
    question_text: 'What is 2 + 2?',
    diagnostic_label: 'lagging',
    grade_verdict: 'below level',
    note_text: 'Needs review',
    accuracy_percent: 88,
    rounds: [1, 2],
    nested: {
      score_label: 'excellent',
      allowed_count: 4
    }
  });

  assert.equal(result.accepted, true);
  assert.deepEqual(result.event.payload, {
    accuracy_percent: 88,
    rounds: [1, 2],
    nested: {
      allowed_count: 4
    }
  });

  const unsupported = adapter.emit('custom_event_name', { count: 1 });
  assert.equal(unsupported.accepted, false);
  assert.equal(unsupported.reason, 'unsupported_event');
});
