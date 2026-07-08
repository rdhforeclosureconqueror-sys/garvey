'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const src = fs.readFileSync('public/archetype-engines/experience.js', 'utf8');
const audit = JSON.parse(fs.readFileSync('artifacts/leadership-audits/youth-scoring-audit.json', 'utf8'));

test('youth participant result view is selected for Garvey Leader Within youth and hides diagnostics', () => {
  assert.match(src, /function renderYouthLeadershipResult/);
  assert.match(src, /data-youth-result-view="participant"/);
  assert.match(src, /The Leader Within • Youth Result/);
  assert.match(src, /Return to Youth Development/);
  assert.match(src, /if \(isYouthResult && !isPocketPtYouthResult\)/);
  const youthRenderer = src.slice(src.indexOf('function renderYouthLeadershipResult'), src.indexOf('function renderResult'));
  for (const forbidden of ['Result ID:', 'Output Contract', 'rawScores', 'maxPossibleScores', 'Desired Gap', 'Identity-Behavior Gap', 'Consistency Score', 'overexpressed', 'underexpressed', 'Return to Rewards', 'Return to PocketPT']) {
    assert.doesNotMatch(youthRenderer, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
});

test('all five leadership archetypes have youth-facing copy and goal support', () => {
  for (const code of ['VD', 'SD', 'RI', 'IE', 'AC']) {
    assert.match(src, new RegExp(`${code}: \\{[\\s\\S]*affirmation:`));
    assert.match(src, new RegExp(`${code}: \\{[\\s\\S]*life:`));
    assert.match(src, new RegExp(`${code}: \\{[\\s\\S]*strengths:`));
    assert.match(src, new RegExp(`${code}: \\{[\\s\\S]*imbalance:`));
    assert.match(src, new RegExp(`${code}: \\{[\\s\\S]*pressure:`));
    assert.match(src, new RegExp(`${code}: \\{[\\s\\S]*weekly:`));
    assert.match(src, new RegExp(`${code}: \\{[\\s\\S]*goals:`));
  }
});

test('youth AI narration uses story script and excludes facilitator technical sections', () => {
  assert.match(src, /Listen to My Leadership Story/);
  assert.match(src, /section_key: "youth_leadership_story"/);
  assert.match(src, /buildYouthNarration/);
  const narrationBuilder = src.slice(src.indexOf('function buildYouthNarration'), src.indexOf('function renderYouthLeadershipResult'));
  for (const forbidden of ['Output Contract', 'JSON', 'raw scores', 'Weighted scores', 'Desired Gap', 'Identity-Behavior Gap', 'Confidence', 'Consistency']) {
    assert.doesNotMatch(narrationBuilder, new RegExp(forbidden, 'i'));
  }
});

test('leadership youth scoring audit is machine-verifiable and documents position bias', () => {
  assert.equal(audit.question_counts.adult, 25);
  assert.equal(audit.question_counts.youth, 25);
  assert.equal(audit.parity_pass, true);
  assert.deepEqual(audit.parity_differences, []);
  assert.equal(audit.option_position_distribution.VD['1'], 25);
  assert.equal(audit.option_position_distribution.SD['2'], 25);
  assert.equal(audit.option_position_distribution.RI['3'], 25);
  assert.equal(audit.option_position_distribution.AC['4'], 25);
  const allFirst = audit.simulations.find((x) => x.name === 'all_first');
  assert.equal(allFirst.primary, 'VD');
  assert.equal(allFirst.secondary, 'IE');
  assert.equal(allFirst.normalizedScores.VD, 100);
});
