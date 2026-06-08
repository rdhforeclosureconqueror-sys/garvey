const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const { loadSkillPackages } = require('../../assessment-mvp/loadSkillPackages');
const { selectAssessmentItems } = require('../../assessment-mvp/selectAssessmentItems');
const { APPROVED_LABELS, scoreResponses } = require('../../assessment-mvp/scoreResponses');

function record(overrides = {}) {
  return {
    item_identity: `PKG_A::adaptive_question_bank::${overrides.source_question_id || 'Q1'}`,
    source_package_id: 'PKG_A',
    source_question_id: overrides.source_question_id || 'Q1',
    question_type: 'short_response',
    answer: 'yes',
    ...overrides,
  };
}

function submit(item_identity, response) {
  return { item_identity, response };
}

function score(records, submissions) {
  return scoreResponses(records, submissions).responses;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('scoring uses internal records and never public payload answers', () => {
  const internal = record({ answer: 'internal answer' });
  const publicPayload = { item_identity: internal.item_identity, correct_answer: 'public answer' };
  const result = scoreResponses([internal], [{ item_identity: publicPayload.item_identity, response: publicPayload.correct_answer, payload: publicPayload }]);
  assert.equal(result.responses[0].status, 'incorrect');
  assert.equal(result.responses[0].scored, true);
});

test('unknown item identities return unknown_item', () => {
  const [result] = score([record()], [submit('PKG_A::adaptive_question_bank::missing', 'yes')]);
  assert.deepEqual(result, {
    item_identity: 'PKG_A::adaptive_question_bank::missing',
    source_package_id: null,
    source_question_id: null,
    status: 'unknown_item',
    scored: false,
    reason_code: 'unknown_item',
  });
});

test('unsupported types and missing deterministic answers return not_scorable', () => {
  const unsupported = record({ question_type: 'essay', source_question_id: 'Q2', item_identity: 'PKG_A::adaptive_question_bank::Q2' });
  const missingAnswer = record({ answer: '', source_question_id: 'Q3', item_identity: 'PKG_A::adaptive_question_bank::Q3' });
  const results = score([unsupported, missingAnswer], [submit(unsupported.item_identity, 'anything'), submit(missingAnswer.item_identity, 'anything')]);
  assert.equal(results[0].status, 'not_scorable');
  assert.equal(results[0].reason_code, 'unsupported_item_type');
  assert.equal(results[1].status, 'not_scorable');
  assert.equal(results[1].reason_code, 'missing_deterministic_answer');
});

test('omitted responses are distinct from incorrect responses', () => {
  const item = record();
  const results = score([item], [submit(item.item_identity, ''), submit(item.item_identity, 'no')]);
  assert.equal(results[0].status, 'omitted');
  assert.equal(results[0].scored, false);
  assert.equal(results[1].status, 'incorrect');
  assert.equal(results[1].scored, true);
});

test('multiple-choice correct and incorrect responses are deterministic', () => {
  const item = record({
    question_type: 'multiple_choice',
    answer: 'B',
    choices: [
      { id: 'A', value: 'Triangle' },
      { id: 'B', value: 'Square' },
      { id: 'C', value: 'Circle' },
    ],
  });
  const results = score([item], [
    submit(item.item_identity, 'B'),
    submit(item.item_identity, 'Square'),
    submit(item.item_identity, 'square'),
    submit(item.item_identity, 'A'),
  ]);
  assert.deepEqual(results.map((result) => result.status), ['correct', 'correct', 'incorrect', 'incorrect']);
});

test('multiple-choice requires one correct source option', () => {
  const item = record({
    question_type: 'multiple_choice',
    answer: 'B',
    choices: [{ id: 'A', value: 'A', correct: true }, { id: 'B', value: 'B', correct: true }],
  });
  const [result] = score([item], [submit(item.item_identity, 'B')]);
  assert.equal(result.status, 'not_scorable');
  assert.equal(result.reason_code, 'ambiguous_or_missing_correct_choice');
});

test('short-answer normalization is conservative without fuzzy or semantic matching', () => {
  const item = record({ answer: 'cat and dog', acceptable_answers: ['the cat and dog'] });
  const results = score([item], [
    submit(item.item_identity, '  Cat   and   dog! '),
    submit(item.item_identity, 'feline and canine'),
    submit(item.item_identity, 'cat dog'),
  ]);
  assert.deepEqual(results.map((result) => result.status), ['correct', 'incorrect', 'incorrect']);
});

test('case-sensitive constructs can remain case-sensitive', () => {
  const item = record({ answer: 'US', case_sensitive: true, punctuation_sensitive: true });
  const results = score([item], [submit(item.item_identity, 'US'), submit(item.item_identity, 'us')]);
  assert.deepEqual(results.map((result) => result.status), ['correct', 'incorrect']);
});

test('numeric strings, numeric values, comma-formatted numbers, and equivalent fractions compare exactly', () => {
  const integer = record({ question_type: 'integer_response', answer: 12, source_question_id: 'N1', item_identity: 'PKG_A::adaptive_question_bank::N1' });
  const comma = record({ question_type: 'number_response', answer: '1,200', source_question_id: 'N2', item_identity: 'PKG_A::adaptive_question_bank::N2' });
  const fraction = record({ question_type: 'fraction_response', answer: '1/2', source_question_id: 'N3', item_identity: 'PKG_A::adaptive_question_bank::N3' });
  const results = score([integer, comma, fraction], [
    submit(integer.item_identity, '12.0'),
    submit(comma.item_identity, 1200),
    submit(fraction.item_identity, '2/4'),
  ]);
  assert.deepEqual(results.map((result) => result.status), ['correct', 'correct', 'correct']);
  assert.equal(results.every((result) => !Object.prototype.hasOwnProperty.call(result, 'normalized_response')), true);
});

test('malformed fractions, ambiguous mixed numbers, units, and multiple values return not_scorable', () => {
  const item = record({ question_type: 'fraction_response', answer: '1/2' });
  const results = score([item], [
    submit(item.item_identity, '1/0'),
    submit(item.item_identity, '1 1/2'),
    submit(item.item_identity, '1/2 cup'),
    submit(item.item_identity, '1/2 2/3'),
  ]);
  assert.deepEqual(results.map((result) => result.status), ['not_scorable', 'not_scorable', 'not_scorable', 'not_scorable']);
  assert.deepEqual(results.map((result) => result.reason_code), [
    'malformed_fraction_response',
    'ambiguous_mixed_number',
    'units_unsupported',
    'multiple_numeric_values',
  ]);
});

test('correct and acceptable answers are absent from scoring results', () => {
  const item = record({ answer: 'secret', acceptable_answers: ['also secret'] });
  const [result] = score([item], [submit(item.item_identity, 'secret')]);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /secret|also secret|acceptable/i);
});

test('evidence thresholds implement required boundary examples', () => {
  function packageRun(packageId, statuses) {
    const records = statuses.map((status, index) => record({
      source_package_id: packageId,
      source_question_id: `Q${index}`,
      item_identity: `${packageId}::adaptive_question_bank::Q${index}`,
      answer: 'yes',
    }));
    const submissions = statuses.map((status, index) => submit(records[index].item_identity, status === 'correct' ? 'yes' : 'no'));
    return scoreResponses(records, submissions).skillEvidence[0];
  }

  assert.equal(packageRun('THREE_OF_THREE', ['correct', 'correct', 'correct']).provisional_label, 'Not Enough Evidence');
  assert.equal(packageRun('FOUR_OF_FIVE', ['correct', 'correct', 'correct', 'correct', 'incorrect']).provisional_label, 'Ready');
  assert.equal(packageRun('THREE_OF_FIVE', ['correct', 'correct', 'correct', 'incorrect', 'incorrect']).provisional_label, 'Developing');
  assert.equal(packageRun('TWO_OF_FIVE', ['correct', 'correct', 'incorrect', 'incorrect', 'incorrect']).provisional_label, 'Needs Support');
  assert.equal(packageRun('TWO_VALID', ['correct', 'incorrect']).provisional_label, 'Not Enough Evidence');
});

test('omitted and not_scorable responses do not reduce accuracy as incorrect answers', () => {
  const scoredItems = [0, 1, 2, 3].map((index) => record({
    source_question_id: `Q${index}`,
    item_identity: `PKG_A::adaptive_question_bank::Q${index}`,
    answer: 'yes',
  }));
  const omitted = record({ source_question_id: 'Q4', item_identity: 'PKG_A::adaptive_question_bank::Q4', answer: 'yes' });
  const notScorable = record({ source_question_id: 'Q5', item_identity: 'PKG_A::adaptive_question_bank::Q5', question_type: 'essay', answer: 'yes' });
  const result = scoreResponses([...scoredItems, omitted, notScorable], [
    ...scoredItems.map((item) => submit(item.item_identity, 'yes')),
    submit(omitted.item_identity, ''),
    submit(notScorable.item_identity, 'yes'),
  ]).skillEvidence[0];
  assert.equal(result.valid_scored_responses, 4);
  assert.equal(result.correct_responses, 4);
  assert.equal(result.omitted_responses, 1);
  assert.equal(result.not_scorable_responses, 1);
  assert.equal(result.accuracy, 1);
  assert.equal(result.provisional_label, 'Ready');
});

test('evidence is aggregated separately by package/skill and only approved labels are returned', () => {
  const records = [
    ...Array.from({ length: 4 }, (_, index) => record({ source_package_id: 'PKG_READY', source_question_id: `R${index}`, item_identity: `PKG_READY::bank::R${index}`, answer: 'yes' })),
    ...Array.from({ length: 3 }, (_, index) => record({ source_package_id: 'PKG_NEEDS', source_question_id: `N${index}`, item_identity: `PKG_NEEDS::bank::N${index}`, answer: 'yes' })),
  ];
  const submissions = [
    ...records.slice(0, 4).map((item) => submit(item.item_identity, 'yes')),
    submit(records[4].item_identity, 'yes'),
    submit(records[5].item_identity, 'no'),
    submit(records[6].item_identity, 'no'),
  ];
  const evidence = scoreResponses(records, submissions).skillEvidence;
  assert.deepEqual(evidence.map((skill) => skill.source_package_id), ['PKG_NEEDS', 'PKG_READY']);
  assert.deepEqual(evidence.map((skill) => skill.provisional_label), ['Needs Support', 'Ready']);
  for (const skill of evidence) assert.equal(APPROVED_LABELS.has(skill.provisional_label), true);
});

test('small real repository sample selected through selector scores from internal records', () => {
  const selected = selectAssessmentItems(loadSkillPackages({ grade: 1, subject: 'Math' }));
  const sampleRecords = selected.scoringRecords.slice(0, 4);
  assert.equal(sampleRecords.length, 4);
  const submissions = sampleRecords.map((item) => submit(item.item_identity, item.answer));
  const result = scoreResponses(sampleRecords, submissions);
  assert.equal(result.responses.every((item) => item.status === 'correct'), true);
  assert.equal(result.responses.every((item) => !JSON.stringify(item).includes(String(item.answer))), true);
});

test('source manifest and SkillPackage files remain byte-identical after scoring', () => {
  const sourceFiles = [
    'public/gamehub/skill-world/content/manifest.json',
    'public/gamehub/skill-world/content/G1M_OP_001.skill-package.v1.json',
  ];
  const before = Object.fromEntries(sourceFiles.map((file) => [file, read(file)]));
  const selected = selectAssessmentItems(loadSkillPackages({ grade: 1, subject: 'Math' }));
  scoreResponses(selected.scoringRecords.slice(0, 3), selected.scoringRecords.slice(0, 3).map((item) => submit(item.item_identity, item.answer)));
  for (const file of sourceFiles) assert.equal(read(file), before[file], `${file} changed`);
});
