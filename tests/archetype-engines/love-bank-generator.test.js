const test = require('node:test');
const assert = require('node:assert/strict');

const { generateLoveBank, validateBank } = require('../../archetype-engines/generator/love');
const { validateOptionDiversity } = require('../../archetype-engines/generator/love/generateCandidates');
const { validateSayItOutLoud } = require('../../archetype-engines/generator/love/validators');

const ARCHETYPES = ['RS', 'AL', 'EC', 'AV', 'ES'];

test('generated bank satisfies core structural validation', () => {
  const bank = generateLoveBank({ seed: 'BANK_A' });
  assert.equal(bank.questions.length, 25);
  assert.equal(bank.audit.valid, true, bank.audit.failures.join('\n'));
  assert.deepEqual(bank.audit.classCounts, { ID: 5, BH: 6, SC: 6, ST: 6, DS: 2 });

  for (const q of bank.questions) {
    assert.equal(q.options.length, 4);
    const primaries = q.options.map((o) => o.primary_archetype);
    assert.equal(new Set(primaries).size, 4);
  }

  for (const a of ARCHETYPES) {
    assert.equal(bank.audit.primaryCounts[a], 20);
  }
});

test('seed reproducibility yields identical bank', () => {
  const b1 = generateLoveBank({ seed: 'REPRO_1' });
  const b2 = generateLoveBank({ seed: 'REPRO_1' });
  assert.deepEqual(b1.questions, b2.questions);
});

test('every archetype can win with dominant answer simulation', () => {
  const bank = generateLoveBank({ seed: 'SIM_1' });

  const classWeight = { ID: 1, BH: 1, SC: 1.25, ST: 1.5, DS: 1 };
  for (const target of ARCHETYPES) {
    const totals = Object.fromEntries(ARCHETYPES.map((a) => [a, 0]));
    for (const q of bank.questions) {
      let best = q.options[0];
      let bestScore = -Infinity;
      for (const opt of q.options) {
        let s = 0;
        if (opt.primary_archetype === target) s += 2 * classWeight[q.question_class];
        if (opt.secondary_archetype === target) s += 1 * classWeight[q.question_class];
        if (s > bestScore) {
          best = opt;
          bestScore = s;
        }
      }
      totals[best.primary_archetype] += 2 * classWeight[q.question_class];
      totals[best.secondary_archetype] += 1 * classWeight[q.question_class];
    }
    const winner = Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
    assert.equal(winner, target);
  }
});

test('export schema remains compatible with canonical Love question shape', () => {
  const bank = generateLoveBank({ seed: 'SCHEMA_1' });
  for (const q of bank.questions) {
    assert.equal(typeof q.question_id, 'string');
    assert.equal(q.engine, 'love');
    assert.equal(q.is_scored, true);
    assert.equal(q.is_active, true);
    for (const opt of q.options) {
      assert.match(opt.option_id, /^[A-D]$/);
      assert.ok(ARCHETYPES.includes(opt.primary_archetype));
      assert.ok(ARCHETYPES.includes(opt.secondary_archetype));
      assert.notEqual(opt.primary_archetype, opt.secondary_archetype);
    }
  }

  const audit = validateBank(bank.bankId, bank.questions);
  assert.equal(audit.valid, true, audit.failures.join('\n'));
});

test('each generated question passes option diversity constraints', () => {
  const bank = generateLoveBank({ seed: 'DIVERSITY_1' });

  for (const q of bank.questions) {
    const normalizedOptions = q.options.map((opt) => ({
      ...opt,
      primary: opt.primary_archetype,
    }));
    const diversityFailures = validateOptionDiversity(normalizedOptions);
    assert.deepEqual(diversityFailures, [], `${q.question_id} failed diversity checks: ${diversityFailures.join(', ')}`);
  }
});

test('generated options pass say-it-out-loud quality gate and avoid stitched phrasing', () => {
  const bank = generateLoveBank({ seed: 'SAY_OUT_LOUD_1' });
  const blockedFragments = [
    'I respond by verify',
    'if articulation creates trust',
    'if space keeps you regulated',
    'I am intentionally building seek',
  ];

  for (const q of bank.questions) {
    for (const opt of q.options) {
      assert.equal(validateSayItOutLoud(opt.text), true, `${q.question_id}/${opt.option_id} failed say-it-out-loud`);
      for (const fragment of blockedFragments) {
        assert.equal(opt.text.includes(fragment), false, `${q.question_id}/${opt.option_id} contained blocked fragment: ${fragment}`);
      }
    }
  }
});
