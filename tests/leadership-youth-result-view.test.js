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

test('youth result polish removes internal language and PocketPT roadmap text', () => {
  const youthRenderer = src.slice(src.indexOf('function renderYouthLeadershipResult'), src.indexOf('function renderResult'));
  const narrationBuilder = src.slice(src.indexOf('function buildYouthNarration'), src.indexOf('function bindYouthGoalControls'));
  for (const forbidden of ['VD card', 'IE card', 'SD card', 'RI card', 'AC card', 'MY OWN GOAL']) {
    assert.doesNotMatch(youthRenderer, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(narrationBuilder, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const forbidden of ['PocketPT later', 'safe tracking hook', 'Goal saving can connect']) {
    assert.doesNotMatch(youthRenderer, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    assert.doesNotMatch(narrationBuilder, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
  assert.match(youthRenderer, /Primary leadership style:/);
  assert.match(youthRenderer, /Supporting leadership style:/);
});

test('youth 7-day goal experience is selectable, youth-facing, and session-only', () => {
  const youthRenderer = src.slice(src.indexOf('function renderYouthLeadershipResult'), src.indexOf('function renderResult'));
  const goalControls = src.slice(src.indexOf('function bindYouthGoalControls'), src.indexOf('function renderYouthLeadershipResult'));
  assert.match(youthRenderer, /Your Next 7-Day Goal/);
  assert.match(youthRenderer, /Choose one goal you want to practice during the next seven days\./);
  assert.match(youthRenderer, /Write My Own Goal/);
  assert.match(youthRenderer, /What is one leadership goal you want to practice\?/);
  assert.match(youthRenderer, /Choose This Goal/);
  assert.match(youthRenderer, /Your selected goal will stay visible during this session\./);
  assert.doesNotMatch(youthRenderer, /permanently saved|saved permanently|durable/i);
  assert.match(goalControls, /addEventListener\("click"/);
  assert.match(goalControls, /aria-checked/);
  assert.match(goalControls, /Selected for this session:/);
});

test('Vision Drive goal suggestions are deduplicated and use requested language', () => {
  const copyStart = src.indexOf('const LEADERSHIP_YOUTH_COPY');
  const vdBlock = src.slice(src.indexOf('  VD: {', copyStart), src.indexOf('  SD: {', copyStart));
  for (const goal of ['Listen before leading', 'Complete one plan', 'Turn one idea into three steps', 'Ask for help', 'Help the group choose one direction']) {
    assert.match(vdBlock, new RegExp(goal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(vdBlock, /Listen before speaking/);
  const goals = [...vdBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((x) => ['Listen before leading', 'Complete one plan', 'Turn one idea into three steps', 'Ask for help', 'Help the group choose one direction'].includes(x));
  assert.equal(new Set(goals).size, goals.length);
});

test('supporting style copy is composable, specific, and grammatically natural', () => {
  assert.match(src, /function buildYouthSupportingCopy/);
  assert.match(src, /can help you \$\{add\}/);
  assert.match(src, /This combination becomes strongest when you also \$\{balance\}/);
  assert.match(src, /give your vision a voice/);
  assert.match(src, /explain your ideas with energy, encourage others, and help people believe a goal is possible/);
  assert.doesNotMatch(src, /may help you add \$\{secondaryCopy\.strengths/);
});

test('youth closing message and archetype-specific closing affirmations are present and narrated', () => {
  const narrationBuilder = src.slice(src.indexOf('function buildYouthNarration'), src.indexOf('function bindYouthGoalControls'));
  assert.match(src, /Keep Growing Into Your Leadership/);
  assert.match(src, /You do not have to become a perfect leader/);
  for (const code of ['VD', 'SD', 'RI', 'IE', 'AC']) {
    const blockEnd = code === 'AC' ? src.indexOf('\n  }\n});', src.indexOf('  AC: {')) : src.indexOf(`\n  ${['VD','SD','RI','IE','AC'][['VD','SD','RI','IE','AC'].indexOf(code)+1]}: {`);
    const block = src.slice(src.indexOf(`  ${code}: {`), blockEnd);
    assert.match(block, /closingAffirmation:/);
  }
  assert.match(narrationBuilder, /closingCopy/);
  assert.doesNotMatch(narrationBuilder, /PocketPT|VD card|raw metadata|diagnostics/i);
});

test('leadership card visual alt text is meaningful without visible internal card codes', () => {
  assert.match(src, /leadership style illustration/);
  assert.match(src, /altText: `\$\{primaryName\} leadership style illustration`/);
  assert.doesNotMatch(src, /\$\{esc\(archetype\?\.name \|\| archetype\?\.code \|\| "Archetype"\)\} card/);
});
