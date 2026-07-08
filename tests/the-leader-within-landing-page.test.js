const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.join(process.cwd(), 'public', 'the-leader-within.html');
const html = fs.readFileSync(pagePath, 'utf8');
const assessmentUrl = '/archetype-engines/leadership/assessment?audience_type=youth&amp;assessment_variant=youth&amp;content_variant=youth&amp;source_application=garvey&amp;program_context=leader_within&amp;first_party_program=true';

test('The Leader Within landing page exists with title and direct assessment CTA', () => {
  assert.ok(fs.existsSync(pagePath));
  assert.match(html, /<title>The Leader Within/);
  assert.match(html, new RegExp(assessmentUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  for (const token of ['audience_type=youth', 'assessment_variant=youth', 'content_variant=youth', 'source_application=garvey', 'program_context=leader_within', 'first_party_program=true']) {
    assert.match(html, new RegExp(token));
  }
});

test('landing page contains canonical archetype names and excludes deprecated names', () => {
  for (const name of ['Vision Drive', 'Structure Drive', 'Relational Intelligence', 'Influence Expression', 'Adaptive Control']) assert.match(html, new RegExp(name));
  for (const bad of ['Structure Directive', 'Relational Insight', 'Adaptive Command']) assert.doesNotMatch(html, new RegExp(bad));
});

test('landing page includes required story, practice, fitness, PocketPT, program, and partnership content', () => {
  for (const copy of [
    'not a permanent label',
    'Every Strength Needs Balance',
    'Choose How You Want to Grow',
    'At school:',
    'In sports or clubs:',
    'At home or with friends:',
    'Fitness Helps Turn Leadership Into Practice',
    'How PocketPT Extends the Journey',
    'Available now',
    'Planned or later integration',
    '8-Week Summer Program',
    '12-Week Semester Program',
    '32-Week School-Year Program',
    'Bring The Leader Within to Your Youth Program',
    'Return to Youth Development'
  ]) assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('discovery cards route to landing page before assessment', () => {
  const menu = require('../public/js/assessment-menu.js');
  const leader = menu.createAssessmentOptions({ origin: 'https://example.com' }).find((x) => x.key === 'leader_within');
  assert.equal(leader.href, '/the-leader-within.html');
  for (const file of ['public/youth-development.html', 'public/archetype-engines/index.html']) {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    assert.match(source, /data-testid="leader-within-card-cta" href="\/the-leader-within\.html"/);
  }
});
