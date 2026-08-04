'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { loadSkillPackages, packageIdOf } = require('../../assessment-mvp/loadSkillPackages');
const { selectAssessmentItems } = require('../../assessment-mvp/selectAssessmentItems');
const { createAssessmentSession } = require('../../assessment-mvp/createAssessmentSession');
const { createReassessmentSession } = require('../../assessment-mvp/createReassessmentSession');
const { submitAssessmentResponses } = require('../../assessment-mvp/submitAssessmentResponses');
const { scoreResponses } = require('../../assessment-mvp/scoreResponses');
const { recommendSkillPackages } = require('../../assessment-mvp/recommendSkillPackages');
const app = require('../../public/assessment-mvp/app.js');
const EXPECTED = ['G5E_FL_001','G5E_LANG_001','G5E_RC_001','G5E_RC_002','G5E_RC_003','G5E_RF_001','G5E_VOC_001','G5E_WR_001','G5E_WR_002','G5E_WR_003'];
const packages = loadSkillPackages({ grade: 5, subject: 'English' });
const norm = (v) => String(v ?? '').trim().toLowerCase().replace(/[’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ');

test('authoritative boundary is exactly ten completed Grade 5 English packages and next dependency is Grade 6', () => {
  assert.deepEqual(packages.map(packageIdOf), EXPECTED);
  const reviews = new Set(fs.readdirSync(path.resolve(__dirname, '../../docs/curriculum-reviews')));
  for (const id of EXPECTED) assert.ok(reviews.has(`${id}-review.md`) || id === 'G5E_LANG_001', id);
  assert.equal(packages.every((pkg) => pkg.metadata.production_status === 'publication_certified'), true);
  assert.equal(packages.find((pkg) => pkg.skill_id === 'G5E_LANG_001').next_skill_id, 'G6E_LANG_001');
});

test('complete eligible pool covers every package and domain without learner answer leakage', () => {
  const selected = selectAssessmentItems(packages);
  assert.equal(selected.publicItems.length, 290);
  assert.equal(selected.scoringRecords.length, 290);
  assert.deepEqual([...new Set(selected.publicItems.map((i) => i.source_package_id))].sort(), EXPECTED);
  assert.deepEqual([...new Set(selected.publicItems.map((i) => i.domain))].sort(), ['Fluency','Language','Reading Comprehension','Reading Foundations / Word Analysis','Reading Informational Text','Reading Literature','Vocabulary / Language','Writing / Composition']);
  assert.equal(new Set(selected.publicItems.map((i) => i.item_identity)).size, 290);
  for (const item of selected.publicItems) {
    assert.equal(item.grade, 5); assert.equal(item.subject, 'English');
    assert.doesNotMatch(JSON.stringify(item), /"(?:correct_answer|acceptable_answers|answer|rubric|solution|explanation|feedback)"\s*:/i, item.item_identity);
    assert.ok(String(item.payload.prompt).trim(), item.item_identity);
  }
});

test('inventory exactly mirrors production public items and private scoring records', () => {
  const inventory = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../docs/curriculum-reviews/G5E-assessment-inventory.json')));
  const selected = selectAssessmentItems(packages);
  assert.equal(inventory.schema_version, 'g5e-assessment-inventory.v1');
  assert.deepEqual(inventory.package_ids, EXPECTED);
  assert.equal(inventory.items.length, selected.publicItems.length);
  assert.deepEqual(inventory.items.map((i) => i.item_identity), selected.publicItems.map((i) => i.item_identity));
  assert.equal(inventory.items.every((i) => i.eligibility && i.public_answer_safety_status === 'answer_safe'), true);
});

test('baseline selection balances three items per package and keeps scoring private', () => {
  const session = createAssessmentSession({ grade: 5, subject: 'English' });
  assert.equal(session.public_items.length, 30);
  assert.deepEqual(session.package_ids, EXPECTED);
  for (const id of EXPECTED) assert.equal(session.public_items.filter((i) => i.source_package_id === id).length, 3, id);
  assert.doesNotMatch(JSON.stringify(session.public_items), /"(?:correct_answer|acceptable_answers|answer|rubric|solution|explanation|feedback)"\s*:/i);
  assert.equal(session.internal_scoring_records.length, 30);
});

test('multiple-choice and text-entry scoring accept only intentional normalized answers', () => {
  const session = createAssessmentSession({ grade: 5, subject: 'English' });
  for (const record of session.internal_scoring_records) {
    const answer = Array.isArray(record.answer) ? record.answer[0] : record.answer;
    assert.equal(scoreResponses([record], [{ item_identity: record.item_identity, response: answer }]).responses[0].status, 'correct', record.item_identity);
    assert.equal(scoreResponses([record], [{ item_identity: record.item_identity, response: `  ${answer}  ` }]).responses[0].status, 'correct', record.item_identity);
    assert.equal(scoreResponses([record], [{ item_identity: record.item_identity, response: '__wrong__' }]).responses[0].status, 'incorrect', record.item_identity);
    if (record.question_type === 'multiple_choice') {
      assert.equal(new Set(record.choices.map(norm)).size, record.choices.length, record.item_identity);
      assert.equal(record.choices.filter((c) => norm(c) === norm(answer)).length, 1, record.item_identity);
    }
  }
});

test('zero, partial, omitted, and perfect submissions produce stable summaries', () => {
  const session = createAssessmentSession({ grade: 5, subject: 'English' });
  const answers = Object.fromEntries(session.internal_scoring_records.map((r) => [r.item_identity, Array.isArray(r.answer) ? r.answer[0] : r.answer]));
  const ids = Object.keys(answers);
  assert.deepEqual(submitAssessmentResponses(session, {}).score_summary, { raw_score: 0, maximum_score: 30, percentage: 0, answered_items: 0, skipped_items: 30 });
  assert.deepEqual(submitAssessmentResponses(session, Object.fromEntries(ids.slice(0, 8).map((id) => [id, answers[id]]))).score_summary, { raw_score: 8, maximum_score: 30, percentage: 27, answered_items: 8, skipped_items: 22 });
  assert.deepEqual(submitAssessmentResponses(session, answers).score_summary, { raw_score: 30, maximum_score: 30, percentage: 100, answered_items: 30, skipped_items: 0 });
});

test('retakes are independent, avoid prior exposure, and recommendations use completed evidence', () => {
  const first = createAssessmentSession({ grade: 5, subject: 'English' });
  const completed = submitAssessmentResponses(first, {});
  const retake = createReassessmentSession(completed, { grade: 5, subject: 'English', packageIds: EXPECTED, itemsPerPackage: 1, all_prior_exposed_item_ids: completed.exposure.item_ids, all_prior_exposed_duplicate_keys: completed.exposure.duplicate_keys });
  assert.equal(retake.public_items.length, 10);
  assert.deepEqual(retake.package_ids, EXPECTED);
  assert.deepEqual(retake.selection_summary.package_summaries, EXPECTED.map((package_id) => ({ package_id, selected_count: 1, requested_count: 1 })));
  assert.equal(retake.public_items.some((i) => completed.exposure.item_ids.includes(i.item_identity)), false);
  assert.equal(retake.public_items.some((i) => completed.exposure.duplicate_keys.includes(i.duplicate_key)), false);
  assert.ok(completed.recommendations.length > 0);
  assert.doesNotThrow(() => recommendSkillPackages({ grade: 5, subject: 'English', evidence: completed.skill_evidence, packages }));
});

test('accessible result summary agrees with persisted public score and remains answer-safe', () => {
  app.state.result = app.publicResultOnly({ status: 'completed', skill_evidence: [], recommendations: [], score_summary: { raw_score: 8, maximum_score: 10, percentage: 80, answered_items: 8, skipped_items: 2 } });
  const html = app.renderResults();
  assert.match(html, /aria-label="Assessment score"/);
  assert.match(html, /8\/10[^<]*·[^<]*80%/);
  assert.match(html, /8 answered · 2 skipped/);
  assert.doesNotMatch(html, /correct_answer|acceptable_answers|internal_scoring|correct_option/i);
});
