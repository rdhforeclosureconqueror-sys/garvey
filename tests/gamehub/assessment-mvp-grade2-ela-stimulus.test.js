const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSkillPackages } = require('../../assessment-mvp/loadSkillPackages');
const { selectAssessmentItems, publicQuestionPayload, isAssessmentItemDeliverable } = require('../../assessment-mvp/selectAssessmentItems');
const { createAssessmentSession } = require('../../assessment-mvp/createAssessmentSession');

function grade2EnglishPackages() {
  return loadSkillPackages({ grade: 2, subject: 'English' });
}

test('Grade 2 ELA passage-dependent items include renderable passages in the public API contract', () => {
  const packages = grade2EnglishPackages();
  const passageQuestions = [];
  for (const pkg of packages.filter((pkg) => /^G2E_RC_/.test(pkg.skill_id))) {
    for (const question of pkg.adaptive_question_bank || []) passageQuestions.push({ pkg, question });
  }
  assert.ok(passageQuestions.length > 0);
  for (const { pkg, question } of passageQuestions) {
    const payload = publicQuestionPayload(question, pkg.skill_id);
    assert.equal(payload.stimulus.type, 'reading_passage', question.question_id);
    assert.ok(payload.stimulus.content.text.length > 40, question.question_id);
    assert.ok(payload.stimulus.presentation.label.includes('Read'), question.question_id);
  }
});

test('Grade 2 ELA selection excludes invalid answer choices and includes only deliverable items', () => {
  const selection = selectAssessmentItems(grade2EnglishPackages());
  assert.ok(selection.publicItems.length >= 30);
  assert.ok((selection.exclusionCounts.required_stimulus_not_renderable || 0) > 0);
  assert.ok((selection.exclusionCounts.duplicate_answer_choices || 0) > 0);
  for (const item of selection.publicItems) assert.equal(isAssessmentItemDeliverable(item), true, item.item_identity);
});

test('Grade 2 ELA baseline session returns passages, preserves scoring, and has enough selected items', () => {
  const session = createAssessmentSession({ grade: 2, subject: 'English', itemsPerPackage: 3 });
  assert.equal(session.public_items.length, 30);
  assert.equal(session.internal_scoring_records.length, session.public_items.length);
  const rc = session.public_items.find((item) => /^G2E_RC_/.test(item.source_package_id));
  assert.ok(rc, 'expected a reading comprehension item');
  assert.equal(rc.payload.stimulus.type, 'reading_passage');
  assert.ok(rc.payload.stimulus.content.text);
  const scoring = session.internal_scoring_records.find((record) => record.item_identity === rc.item_identity);
  assert.ok(scoring.answer);
});

test('learner UI renders stimulus before question prompt and preserves passage line breaks', () => {
  const appSource = fs.readFileSync(path.join(__dirname, '../../public/assessment-mvp/app.js'), 'utf8');
  assert.match(appSource, /renderStimulus\(item\) \+\n\s+'<p class="prompt">'/);
  assert.match(appSource, /split\(\/\\n\{2,\}\//);
  assert.match(appSource, /replace\(\/\\n\/g, '<br>'\)/);
});

test('pool sufficiency validation fails closed when invalid filtering leaves too few questions', () => {
  const packages = grade2EnglishPackages().slice(0, 1);
  const selection = { publicItems: [], scoringRecords: [], exclusions: [{ question_id: 'broken_q' }], exclusionCounts: { required_stimulus_not_renderable: 1 } };
  const { validatePoolSufficiency } = require('../../assessment-mvp/createAssessmentSession');
  assert.throws(() => validatePoolSufficiency(packages, selection.publicItems, 3, selection), /internal_assessment_configuration_error/);
});
