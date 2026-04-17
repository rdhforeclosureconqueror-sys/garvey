'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const leadershipArchetypes = require('../../archetype-engines/content/leadershipArchetypes');
const loyaltyArchetypes = require('../../archetype-engines/content/loyaltyArchetypes');
const loveArchetypes = require('../../archetype-engines/content/loveArchetypes');

const LEADERSHIP_IMAGE_BY_CODE = Object.freeze({
  AC: '/archetype-card/Leadership/Strategic_Adapter.png',
  IE: '/archetype-card/Leadership/People_Catalyst.png',
  RI: '/archetype-card/Leadership/Quiet_Operator.png',
  SD: '/archetype-card/Leadership/System_commander.png',
  VD: '/archetype-card/Leadership/Vision_Architect.png',
});

function loadRenderResult() {
  const sourcePath = path.join(process.cwd(), 'public', 'archetype-engines', 'experience.js');
  const source = fs.readFileSync(sourcePath, 'utf8').replace(/\nboot\(\);\s*$/, '\n');
  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    window: {
      location: {
        pathname: '/archetype-engines/leadership/result/test-id',
        search: '',
        origin: 'http://localhost',
      },
      localStorage: { getItem: () => null, setItem: () => {} },
      sessionStorage: { getItem: () => null, setItem: () => {} },
    },
    document: {
      querySelectorAll: () => [],
      getElementById: () => ({ innerHTML: '', textContent: '' }),
      querySelector: () => null,
    },
    fetch: async () => ({ ok: true, json: async () => ({}) }),
  };

  vm.runInNewContext(`${source}\nmodule.exports = { renderResult };`, sandbox, { filename: sourcePath });
  return sandbox.module.exports.renderResult;
}

function renderHtml({ engine, archetypes, payload, resultId = 'RID-123' }) {
  const renderResult = loadRenderResult();
  const app = {
    innerHTML: '',
    querySelectorAll: () => [],
  };
  renderResult(app, engine, archetypes, resultId, payload, new URLSearchParams('tenant=demo'));
  return app.innerHTML;
}

function scoreMap(codes) {
  return Object.fromEntries(codes.map((code, index) => [code, 100 - (index * 5)]));
}

function baseLeadershipPayload(overrides = {}) {
  return {
    normalizedScores: scoreMap(leadershipArchetypes.map((a) => a.code)),
    primaryArchetype: { code: 'VD' },
    secondaryArchetype: { code: 'SD' },
    balanceStates: {
      overall: 'balanced',
      dimensions: { VD: 'balanced', SD: 'unbalanced' },
    },
    stressProfile: { VD: 67.2, SD: 41.8 },
    desiredCurrentGap: { VD: 0.8, SD: -1.2 },
    identityBehaviorGap: { VD: 0.5, SD: -0.4 },
    contradictionConsistency: { consistency: 88.5 },
    confidence: 92.1,
    primaryInsight: 'Primary leadership signal is vision-forward and direction-setting.',
    secondaryInsight: 'Secondary leadership signal introduces structure and implementation rhythm.',
    balanceInsight: 'Leadership is currently balanced with selective pressure pockets.',
    stressInsight: 'Under pressure, your style narrows toward urgency and speed.',
    identityGapInsight: 'Identity and behavior are mostly aligned with one pressure drift area.',
    consistencyInsight: 'Your leadership signal is coherent across contexts.',
    ...overrides,
  };
}

test('leadership result rendering covers primary archetype and deep-dive sections with rendered output assertions', () => {
  const html = renderHtml({
    engine: 'leadership',
    archetypes: leadershipArchetypes,
    payload: baseLeadershipPayload(),
  });

  assert.match(html, /<span class="loyalty-accordion-title">Your Leadership Pattern<\/span>/);
  assert.match(html, /id="leadership-pattern-panel"/);
  assert.match(html, /Balanced vs Unbalanced Leadership/);
  assert.match(html, /Pressure Response/);
  assert.match(html, /Identity vs Behavior Gap/);
  assert.match(html, /Team Experience/);
  assert.match(html, /Leadership Blind Spots/);
  assert.match(html, /Weekly Balancing Habits/);
  assert.match(html, /30\/90 Day Growth Path/);

  assert.match(html, /You lead by setting direction and translating uncertainty into clear purpose\./);
  assert.ok(!html.includes('<h2>Your Pattern</h2>'));
  assert.ok(!html.includes('<h2>Your Current State</h2>'));
  assert.ok(!html.includes('<h2>Self Alignment</h2>'));
});

test('leadership rendering supports realistic payload permutations (primary/hybrid/balance/pressure/identity-gap)', () => {
  const leadershipCases = [
    {
      code: 'VD',
      expectedPattern: 'You lead by setting direction and translating uncertainty into clear purpose.',
      balance: 'balanced',
    },
    {
      code: 'SD',
      expectedPattern: 'You lead by creating structure, cadence, and repeatable standards the team can rely on.',
      balance: 'unbalanced',
    },
    {
      code: 'AC',
      expectedPattern: 'You lead by recalibrating quickly and helping teams stay composed through change.',
      balance: 'unbalanced',
    },
  ];

  for (const scenario of leadershipCases) {
    const html = renderHtml({
      engine: 'leadership',
      archetypes: leadershipArchetypes,
      payload: baseLeadershipPayload({
        primaryArchetype: { code: scenario.code },
        secondaryArchetype: { code: 'RI' },
        hybridArchetype: { codes: [scenario.code, 'RI'], gap: 1.7 },
        balanceStates: {
          overall: scenario.balance,
          dimensions: { [scenario.code]: scenario.balance, RI: 'balanced' },
        },
        stressInsight: `Pressure shift present for ${scenario.code}.`,
        identityGapInsight: `Identity-behavior gap present for ${scenario.code}.`,
      }),
    });

    assert.ok(html.includes(`Hybrid (1.7 gap):`));
    assert.ok(html.includes(`Current Balance State</b>${scenario.balance}`));
    assert.ok(html.includes(`Stress Insight</b>Pressure shift present for ${scenario.code}.`));
    assert.ok(html.includes(`Identity Gap Insight</b>Identity-behavior gap present for ${scenario.code}.`));
    assert.ok(html.includes(scenario.expectedPattern));
  }
});


test('leadership result rendering uses deterministic leadership code-to-image mapping in live card insertion points', () => {
  for (const archetype of leadershipArchetypes) {
    const code = archetype.code;
    const expectedSrc = LEADERSHIP_IMAGE_BY_CODE[code];
    assert.ok(expectedSrc, `Missing expected leadership image mapping for code ${code}`);

    const html = renderHtml({
      engine: 'leadership',
      archetypes: leadershipArchetypes,
      payload: baseLeadershipPayload({
        primaryArchetype: { code },
        secondaryArchetype: { code: code === 'VD' ? 'SD' : 'VD' },
      }),
    });

    assert.ok(
      html.includes(`<img class="card-visual" src="${expectedSrc}"`),
      `Expected leadership render path to include mapped image for code ${code}`,
    );
  }
});

test('loyalty rendering remains unchanged under the same rendered-output verification approach', () => {
  const loyaltyPayload = {
    normalizedScores: scoreMap(loyaltyArchetypes.map((a) => a.code)),
    primaryArchetype: { code: 'TD' },
    secondaryArchetype: { code: 'SA' },
    balanceStates: { overall: 'balanced', dimensions: { TD: 'balanced', SA: 'balanced' } },
    stressProfile: { TD: 55, SA: 42 },
    desiredCurrentGap: { TD: 1.1 },
    identityBehaviorGap: { TD: -0.3 },
    contradictionConsistency: { consistency: 90 },
    confidence: 93,
    loyaltyPattern: 'You stay when trust is proven and disruptions are repairable.',
    loyaltyState: 'steady but evaluative',
    balanceInsight: 'Loyalty remains stable when trust and value stay aligned.',
    stressInsight: 'Under stress, trust tests accelerate churn decisions.',
    communication_profile: {
      plain_language_summary: 'Loyalty is relationship-centered and trust-sensitive for you.',
      what_keeps_them_engaged: 'Consistent follow-through and honest repair.',
      what_pushes_them_away: 'Repeated inconsistency without acknowledgement.',
      retention_hook: 'Transparent updates and reliable action.',
      churn_trigger: 'Broken promises with delayed accountability.',
    },
    loyaltyLoop: {
      plain_language_translation: 'Stability grows until trust rupture appears.',
      break_point: 'Unrepaired breach plus easier alternatives.',
    },
    relationshipInterpretation: {
      relationshipSummary: 'You stay when emotional and behavioral reliability are both present.',
      romanticPartnerPattern: 'Trust plus responsiveness keeps closeness stable.',
      friendshipPattern: 'Reliability and reciprocity define long-term loyalty.',
      familyPattern: 'Consistency and emotional safety keep ties resilient.',
    },
    loveAssessmentCta: {
      sectionTitle: 'Want a deeper relationship breakdown?',
      intro: 'This shows how you form loyalty.',
      bridge: 'But relationships go deeper than loyalty alone.',
      bullets: ['How you connect under stress', 'What builds deeper emotional safety'],
      buttonLabel: 'Take Love Assessment',
    },
  };

  const html = renderHtml({ engine: 'loyalty', archetypes: loyaltyArchetypes, payload: loyaltyPayload });

  assert.match(html, /How You Become Loyal/);
  assert.match(html, /Your Loyalty Pattern/);
  assert.match(html, /Why You Stay vs Leave/);
  assert.match(html, /Your Loyalty in Relationships/);
  assert.match(html, /What Loyalty Really Is/);
  assert.match(html, /Want a deeper relationship breakdown\?/);
  assert.match(html, /Take Love Assessment/);

  assert.ok(!html.includes('Your Leadership Pattern'));
  assert.ok(!html.includes('<h2>Your Pattern</h2>'));
});

test('generic non-loyalty/non-leadership fallback sections still render correctly', () => {
  const lovePayload = {
    normalizedScores: scoreMap(loveArchetypes.map((a) => a.code)),
    primaryArchetype: { code: 'RS' },
    secondaryArchetype: { code: 'AL' },
    balanceStates: { overall: 'balanced', dimensions: { RS: 'balanced', AL: 'unbalanced' } },
    stressProfile: { RS: 51.2, AL: 43.8 },
    desiredCurrentGap: { RS: 1.2, AL: -0.7 },
    identityBehaviorGap: { RS: 0.4, AL: -0.5 },
    contradictionConsistency: { consistency: 84.3 },
    confidence: 89.1,
    primaryInsight: 'Primary connection style centers emotional reassurance.',
    secondaryInsight: 'Secondary style protects autonomy under load.',
    balanceInsight: 'Current relationship state is mostly balanced with one tension zone.',
    stressInsight: 'Stress narrows tolerance for ambiguity in connection.',
    identityGapInsight: 'Small identity/behavior drift appears during conflict.',
    consistencyInsight: 'Answer consistency indicates a clear signal.',
  };

  const html = renderHtml({ engine: 'love', archetypes: loveArchetypes, payload: lovePayload });

  assert.match(html, /<h2>Your Pattern<\/h2>/);
  assert.match(html, /<h2>Your Current State<\/h2>/);
  assert.match(html, /<h2>Self Alignment<\/h2>/);

  assert.ok(!html.includes('Your Leadership Pattern'));
  assert.ok(!html.includes('Your Loyalty Pattern'));
});
