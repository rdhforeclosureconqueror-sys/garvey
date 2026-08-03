const assert = require('assert');
const test = require('node:test');

const { createAssessmentSession } = require('../../assessment-mvp/createAssessmentSession');
const { createReassessmentSession } = require('../../assessment-mvp/createReassessmentSession');
const { loadSkillPackages, packageIdOf } = require('../../assessment-mvp/loadSkillPackages');
const { selectAssessmentItems } = require('../../assessment-mvp/selectAssessmentItems');
const { scoreResponses } = require('../../assessment-mvp/scoreResponses');
const { submitAssessmentResponses } = require('../../assessment-mvp/submitAssessmentResponses');
const app = require('../../public/assessment-mvp/app.js');

const EXPECTED = ['G5M_FR_001', 'G5M_FR_002', 'G5M_FR_003', 'G5M_GM_001', 'G5M_GM_002', 'G5M_MD_001', 'G5M_NBT_001', 'G5M_NBT_002', 'G5M_NBT_003', 'G5M_OA_001'];
const packages = loadSkillPackages({ grade: 5, subject: 'Math' });

function normalized(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

function questionsIn(pkg) {
  const found = [];
  const seen = new Set();
  function visit(value) {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    if (value.question_id && value.prompt) {
      if (!seen.has(value.question_id)) found.push(value);
      seen.add(value.question_id);
      return;
    }
    Object.values(value).forEach(visit);
  }
  visit({ checkpoint: pkg.checkpoint, adaptive_question_bank: pkg.adaptive_question_bank, review_bank: pkg.review_bank, level_banks: pkg.level_banks });
  return found;
}

test('authoritative Grade 5 Math inventory is exactly ten production packages', () => {
  assert.deepEqual(packages.map(packageIdOf), EXPECTED);
  assert.equal(packages.every((pkg) => Number(pkg.grade) === 5 && pkg.subject === 'Math'), true);
});

test('every Grade 5 Math source assessment item has consistent, unique answer metadata', () => {
  for (const pkg of packages) {
    const questions = questionsIn(pkg);
    assert.ok(questions.length >= 40, `${packageIdOf(pkg)} must retain its complete bank`);
    for (const question of questions) {
      assert.ok(String(question.prompt).trim(), `${question.question_id} needs a prompt`);
      const primary = question.correct_answer ?? question.answer;
      assert.notEqual(primary, undefined, `${question.question_id} needs a deterministic answer`);
      if (question.correct_answer != null && question.answer != null) assert.equal(normalized(question.correct_answer), normalized(question.answer), `${question.question_id} answer keys disagree`);
      const choices = question.choices || question.options;
      if (question.question_type === 'multiple_choice') {
        assert.ok(Array.isArray(choices) && choices.length >= 2, `${question.question_id} needs choices`);
      }
      const narration = question.question_audio?.text || question.read_aloud_text;
      assert.ok(String(narration || '').trim(), `${question.question_id} needs complete narration`);
    }
  }
});

test('production selection reaches every package and never crosses grade or subject boundaries', () => {
  const selection = selectAssessmentItems(packages);
  assert.ok(selection.publicItems.length > 100, 'audit must inspect the complete deliverable pool, not a sample');
  assert.deepEqual([...new Set(selection.publicItems.map((item) => item.source_package_id))].sort(), EXPECTED);
  assert.equal(selection.publicItems.every((item) => Number(item.grade) === 5 && item.subject === 'Math'), true);
  assert.equal(new Set(selection.publicItems.map((item) => item.item_identity)).size, selection.publicItems.length);
  assert.equal(new Set(selection.publicItems.map((item) => item.duplicate_key)).size, selection.publicItems.length);
  for (const item of selection.publicItems) {
    assert.doesNotMatch(JSON.stringify(item), /correct_answer|acceptable_answers|"answer"|rubric|solution|explanation|feedback/i);
    if (item.payload.stimulus) assert.ok(app.renderStimulus({ payload: item.payload }).trim(), `${item.item_identity} stimulus must render`);
  }
});

test('baseline covers all ten packages with three unique, answer-safe items each', () => {
  const session = createAssessmentSession({ grade: 5, subject: 'Math' });
  assert.equal(session.public_items.length, 30);
  assert.deepEqual(session.package_ids, EXPECTED);
  for (const packageId of EXPECTED) assert.equal(session.public_items.filter((item) => item.source_package_id === packageId).length, 3);
  assert.doesNotMatch(JSON.stringify(session.public_items), /correct_answer|acceptable_answers|"answer"|rubric|solution|explanation|feedback/i);
});

test('Grade 5 scoring reports exact zero, partial, skipped, near-perfect, and perfect totals', () => {
  const session = createAssessmentSession({ grade: 5, subject: 'Math' });
  const answers = Object.fromEntries(session.internal_scoring_records.map((record) => [record.item_identity, Array.isArray(record.answer) ? record.answer[0] : record.answer]));
  const wrong = Object.fromEntries(session.internal_scoring_records.map((record) => {
    const answer = Array.isArray(record.answer) ? record.answer[0] : record.answer;
    if (record.question_type === 'multiple_choice') return [record.item_identity, (record.choices || record.options).find((choice) => normalized(choice) !== normalized(answer))];
    if (/numeric|number|integer|decimal|fraction/.test(record.question_type)) return [record.item_identity, '999999'];
    return [record.item_identity, '__definitely_wrong__'];
  }));
  const zero = submitAssessmentResponses(session, wrong);
  assert.deepEqual(zero.score_summary, { raw_score: 0, maximum_score: 30, percentage: 0, answered_items: 30, skipped_items: 0 });
  const perfect = submitAssessmentResponses(session, answers);
  assert.deepEqual(perfect.score_summary, { raw_score: 30, maximum_score: 30, percentage: 100, answered_items: 30, skipped_items: 0 });
  const identities = Object.keys(answers);
  const partialAnswers = Object.fromEntries(identities.slice(0, 8).map((id) => [id, answers[id]]));
  const partial = submitAssessmentResponses(session, partialAnswers);
  assert.deepEqual(partial.score_summary, { raw_score: 8, maximum_score: 30, percentage: 27, answered_items: 8, skipped_items: 22 });
  const nearPerfect = { ...answers, [identities[0]]: '__wrong__' };
  assert.equal(submitAssessmentResponses(session, nearPerfect).score_summary.raw_score, 29);
});

test('retakes preserve prior exposure and never repeat an item or duplicate stimulus', () => {
  const baseline = createAssessmentSession({ grade: 5, subject: 'Math' });
  const completed = submitAssessmentResponses(baseline, {});
  const retake = createReassessmentSession(completed, { grade: 5, subject: 'Math', packageIds: EXPECTED, itemsPerPackage: 1, all_prior_exposed_item_ids: completed.exposure.item_ids, all_prior_exposed_duplicate_keys: completed.exposure.duplicate_keys });
  assert.equal(retake.public_items.length, 10);
  assert.equal(retake.public_items.some((item) => completed.exposure.item_ids.includes(item.item_identity)), false);
  assert.equal(retake.public_items.some((item) => completed.exposure.duplicate_keys.includes(item.duplicate_key)), false);
});

test('equivalent numeric and fraction answers are intentional while unrelated answers fail', () => {
  const records = [
    { item_identity: 'decimal', source_package_id: 'G5M_NBT_003', source_question_id: 'decimal', question_type: 'decimal_response', answer: ['0.5', '0.50'] },
    { item_identity: 'fraction', source_package_id: 'G5M_FR_001', source_question_id: 'fraction', question_type: 'fraction_response', answer: ['1/2', '2/4'] },
  ];
  assert.deepEqual(scoreResponses(records, [{ item_identity: 'decimal', response: '0.50' }, { item_identity: 'fraction', response: '3/6' }]).responses.map((item) => item.status), ['correct', 'correct']);
  assert.deepEqual(scoreResponses(records, [{ item_identity: 'decimal', response: '5' }, { item_identity: 'fraction', response: '2/3' }]).responses.map((item) => item.status), ['incorrect', 'incorrect']);
});


test('public result summary renders exact accessible 8/10 and 10/10 values without private scoring data', () => {
  for (const [raw, percentage] of [[8, 80], [10, 100]]) {
    app.state.result = app.publicResultOnly({ status: 'completed', skill_evidence: [], recommendations: [], score_summary: { raw_score: raw, maximum_score: 10, percentage, answered_items: 10, skipped_items: 0 } });
    const html = app.renderResults();
    assert.match(html, /aria-label="Assessment score"/);
    assert.match(html, new RegExp(`${raw}\/10[^<]*·[^<]*${percentage}%`));
    assert.match(html, /10 answered · 0 skipped/);
    assert.doesNotMatch(html, /correct_answer|acceptable_answers|internal_scoring|correct_option/i);
  }
});

test('ten-item Grade 5 form produces exact required score scenarios', () => {
  const session = createAssessmentSession({ grade: 5, subject: 'Math', itemsPerPackage: 1 });
  const records = session.internal_scoring_records;
  const correct = records.map((record) => ({ item_identity: record.item_identity, response: Array.isArray(record.answer) ? record.answer[0] : record.answer }));
  const wrongFor = (record) => {
    const answer = Array.isArray(record.answer) ? record.answer[0] : record.answer;
    if (record.question_type === 'multiple_choice') return (record.choices || record.options).find((choice) => normalized(choice) !== normalized(answer));
    if (/numeric|number|integer|decimal|fraction/.test(record.question_type)) return '999999';
    return '__wrong__';
  };
  for (const expectedCorrect of [0, 1, 8, 9, 10]) {
    const submissions = records.map((record, index) => ({ item_identity: record.item_identity, response: index < expectedCorrect ? correct[index].response : wrongFor(record) }));
    const summary = scoreResponses(records, submissions).scoreSummary;
    assert.deepEqual(summary, { raw_score: expectedCorrect, maximum_score: 10, percentage: expectedCorrect * 10, answered_items: 10, skipped_items: 0 });
  }
  const skipped = scoreResponses(records, correct.slice(0, 8)).scoreSummary;
  assert.deepEqual(skipped, { raw_score: 8, maximum_score: 10, percentage: 80, answered_items: 8, skipped_items: 2 });
  const malformed = scoreResponses(records, records.map((record) => ({ item_identity: record.item_identity, response: '1/0' }))).scoreSummary;
  assert.deepEqual(malformed, { raw_score: 0, maximum_score: 10, percentage: 0, answered_items: 7, skipped_items: 0 });
});
