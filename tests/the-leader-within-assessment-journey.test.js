'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const svc = require('../server/leaderWithinService');
const bank = require('../archetype-engines/engines/leadership/question-banks/leadership.youth.bank1.js');
const routes = fs.readFileSync('server/leaderWithinRoutes.js','utf8');
const service = fs.readFileSync('server/leaderWithinService.js','utf8');
const db = fs.readFileSync('server/leaderWithinDb.js','utf8');

test('Leader Within archetype experience renders all five positive youth archetypes with safe visual fallbacks', () => {
  const cards = svc.archetypeCards();
  assert.equal(cards.length, 5);
  for (const [identity, official] of [['The Compass','Vision & Direction'], ['The Builder','Self-Discipline'], ['The Bridge','Relationships & Influence'], ['The Spark','Ideas & Expression'], ['The Pathfinder','Action & Courage']]) {
    const card = cards.find(c => c.identity === identity);
    assert.ok(card, identity);
    assert.equal(card.official, official);
    assert.ok(card.symbol);
    assert.ok(card.alt.includes(identity));
    assert.ok(card.strengths.length >= 4);
    assert.ok(card.growth);
    assert.ok(card.practice);
    assert.match(routes, new RegExp(identity));
  }
  assert.match(routes, /Discover the Ways Leadership Can Show Up/);
  assert.match(routes, /No archetype is better than another/);
  assert.match(routes, /safe_symbol_card|archetype-symbol/);
});

test('canonical assessment routes preserve existing youth bank and scoring function', () => {
  assert.equal(bank[0].bank_id, 'AUTHORED_BANK_1');
  assert.deepEqual(bank.slice(0, 5).map(q => q.question_id), ['LEAD_B1_Q01','LEAD_B1_Q02','LEAD_B1_Q03','LEAD_B1_Q04','LEAD_B1_Q05']);
  assert.ok(bank.every(q => q.audience === 'youth' && q.content_variant === 'youth'));
  assert.match(service, /scoreEngineAssessment\("leadership",answers,/);
  assert.match(service, /bankId:"AUTHORED_BANK_1"/);
  assert.match(routes, /\/the-leader-within\/assessment/);
  assert.match(routes, /\/api\/the-leader-within\/assessment\/progress/);
  assert.match(routes, /\/api\/the-leader-within\/assessment\/complete/);
  assert.match(routes, /\/the-leader-within\/assessment\/results/);
  assert.doesNotMatch(routes, /href="\/archetype\.html"/);
});

test('canonical assessment state resolver exposes normalized states and storage tables', async () => {
  for (const state of ['not_available','not_started','in_progress','results_available','retake_approved']) assert.match(service, new RegExp(state));
  assert.match(service, /resolveYouthLeadershipAssessmentState/);
  assert.match(service, /percent:Math\.round\(answered\/total\*100\)/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS leader_within_assessment_attempts/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS leader_within_assessment_retake_approvals/);
  const state = await svc.resolveYouthLeadershipAssessmentState({ query: async () => ({ rows: [] }) }, {});
  assert.equal(state.state, 'not_available');
  assert.equal(state.progress.total, bank.length);
});

test('audio availability is safe: Week One has no fabricated assets and disabled state is rendered', () => {
  const curriculum = require('../public/the-leader-within/programs/leader-within-program-data.js');
  assert.ok(curriculum.weeks[0].stories.every(story => !story.listen_url && !story.audio_url));
  assert.match(service, /safeStoryAudioUrl/);
  assert.ok(service.includes('the-leader-within\\/audio') || service.includes('/the-leader-within/audio')); 
  assert.match(routes, /Audio coming soon/);
  assert.match(routes, /aria-disabled="true" disabled/);
  assert.doesNotMatch(routes, /<a[^>]+href=""[^>]*>[^<]*Listen/i);
});

test('result profile and suggested practice hide raw scoring internals', () => {
  assert.match(routes, /Your Leadership Profile/);
  assert.match(routes, /Primary archetype/);
  assert.match(routes, /Secondary strength/);
  assert.match(routes, /Suggested leadership practice/);
  assert.match(routes, /Accept this practice into Today’s Leadership Mission/);
  assert.match(service, /acceptSuggestedPractice/);
  const resultRoute = routes.slice(routes.indexOf("/the-leader-within/assessment/results"));
  assert.doesNotMatch(resultRoute, /normalizedScores|rawScores|scoring weights|dimension score arrays/i);
});
