/* Shared browser adapter for the Ten Gates Adinkra lesson release.
 * Read-only and non-scoring. Compatible with browser and Node tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TenGatesAdinkra = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LESSON_URL = '/gamehub/content/gate-attention.pilot.json';
  const REQUIRED = ['day', 'weekday', 'symbol_id', 'symbol_name', 'traditional_theme', 'skill', 'challenge_id'];
  function validateRelease(release) {
    if (!release || release.schema_version !== 'ten-gates-adinkra-day.v1' ||
        release.gate_id !== 'gate_attention' || !Array.isArray(release.lessons) ||
        release.lessons.length !== 7) throw new Error('Invalid Gate 1 Adinkra release');
    const days = new Set();
    const challenges = new Set();
    for (const lesson of release.lessons) {
      if (!Number.isInteger(lesson.day) || lesson.day < 1 || lesson.day > 7 ||
          days.has(lesson.day) || REQUIRED.some(key => typeof lesson[key] !== 'string' && key !== 'day') ||
          REQUIRED.some(key => key !== 'day' && !lesson[key].trim()) ||
          challenges.has(lesson.challenge_id)) throw new Error('Invalid or duplicate Adinkra lesson');
      days.add(lesson.day);
      challenges.add(lesson.challenge_id);
    }
    return true;
  }
  async function loadGateOne(fetcher) {
    const request = fetcher || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (!request) throw new Error('Fetch is unavailable');
    const response = await request(LESSON_URL, { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Adinkra release unavailable');
    const release = await response.json();
    validateRelease(release);
    return release;
  }
  function lessonForDay(release, day) {
    validateRelease(release);
    return release.lessons.find(item => item.day === day) || null;
  }
  function keeperIntroduction(lesson) {
    if (!lesson || !lesson.symbol_name || !lesson.skill) throw new Error('Invalid lesson');
    return 'Today we explore ' + lesson.symbol_name + '. ' +
      'Our practice: ' + lesson.skill + '. What will you notice as you try?';
  }
  return Object.freeze({ LESSON_URL, validateRelease, loadGateOne, lessonForDay, keeperIntroduction });
});
