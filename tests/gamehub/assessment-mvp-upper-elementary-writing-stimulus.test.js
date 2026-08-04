'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadSkillPackages, packageIdOf } = require('../../assessment-mvp/loadSkillPackages');
const { selectAssessmentItems, publicUpperElementaryWritingStimulusFor } = require('../../assessment-mvp/selectAssessmentItems');
const { createAssessmentSession } = require('../../assessment-mvp/createAssessmentSession');
const { createReassessmentSession } = require('../../assessment-mvp/createReassessmentSession');
const app = require('../../public/assessment-mvp/app.js');

const EXPECTED_G5 = ['G5E_FL_001','G5E_LANG_001','G5E_RC_001','G5E_RC_002','G5E_RC_003','G5E_RF_001','G5E_VOC_001','G5E_WR_001','G5E_WR_002','G5E_WR_003'];
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

test('shared upper-elementary writing adapter is scoped to Grades 3-6 writing packages', () => {
  const question = { prompt: 'Write one transition about a school play.', visual_model: 'event_cards', validation_checks: ['transitions present'] };
  for (const grade of [3, 4, 5, 6]) {
    const stimulus = publicUpperElementaryWritingStimulusFor(question, `G${grade}E_WR_001`);
    assert.equal(stimulus.type, 'ela_text_stimulus');
    assert.equal(stimulus.presentation.renderer, 'event_cards');
  }
  for (const packageId of ['G1E_WR_001', 'G2E_WR_001', 'G5E_RC_001', 'G5M_WR_001']) {
    assert.equal(publicUpperElementaryWritingStimulusFor(question, packageId), null, packageId);
  }
});

test('all Grades 3-6 eligible writing stimuli are renderable and do not disclose private answers', () => {
  for (const grade of [3, 4, 5, 6]) {
    const packages = loadSkillPackages({ grade, subject: 'English' }).filter((pkg) => /_WR_/.test(packageIdOf(pkg)));
    const selection = selectAssessmentItems(packages);
    const records = new Map(selection.scoringRecords.map((record) => [record.item_identity, record]));
    for (const item of selection.publicItems.filter((candidate) => candidate.payload.stimulus)) {
      const stimulus = item.payload.stimulus;
      assert.equal(stimulus.type, 'ela_text_stimulus', item.item_identity);
      assert.ok(app.renderStimulus({ payload: item.payload }).trim(), item.item_identity);
      const privateAnswers = Array.isArray(records.get(item.item_identity).answer) ? records.get(item.item_identity).answer : [records.get(item.item_identity).answer];
      for (const answer of privateAnswers) {
        assert.notEqual(normalize(stimulus.content.text), normalize(answer), `${item.item_identity} leaked its answer`);
      }
      assert.doesNotMatch(JSON.stringify(item), /"(?:answer|correct_answer|acceptable_answers|scoring|solution|explanation|feedback)"\s*:/i, item.item_identity);
    }
  }
});

test('Grade 5 baseline and one-per-package retake both represent every requested package exactly once as intended', () => {
  const baseline = createAssessmentSession({ grade: 5, subject: 'English' });
  const completed = { ...baseline, status: 'completed' };
  const retake = createReassessmentSession(completed, {
    grade: 5,
    subject: 'English',
    packageIds: EXPECTED_G5,
    itemsPerPackage: 1,
    all_prior_exposed_item_ids: baseline.exposed_item_ids,
    all_prior_exposed_duplicate_keys: baseline.exposed_duplicate_keys,
  });
  assert.equal(retake.public_items.length, 10);
  assert.deepEqual(retake.package_ids, EXPECTED_G5);
  assert.deepEqual(retake.selection_summary.package_summaries, EXPECTED_G5.map((package_id) => ({ package_id, selected_count: 1, requested_count: 1 })));
  assert.equal(retake.public_items.some((item) => baseline.exposed_item_ids.includes(item.item_identity)), false);
  assert.equal(retake.public_items.some((item) => baseline.exposed_duplicate_keys.includes(item.duplicate_key)), false);
});

test('shared fix preserves complete baseline package coverage in other upper-elementary grades', () => {
  for (const grade of [3, 4, 6]) {
    const packages = loadSkillPackages({ grade, subject: 'English' });
    const session = createAssessmentSession({ grade, subject: 'English' });
    assert.equal(session.public_items.length, packages.length * 3, `Grade ${grade} baseline size`);
    assert.deepEqual(session.package_ids, packages.map(packageIdOf), `Grade ${grade} package boundary`);
    for (const pkg of packages) {
      const packageId = packageIdOf(pkg);
      assert.equal(session.public_items.filter((item) => item.source_package_id === packageId).length, 3, `${packageId} baseline coverage`);
    }
  }
});
