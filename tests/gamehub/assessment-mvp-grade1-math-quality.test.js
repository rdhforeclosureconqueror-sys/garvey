const assert = require('assert');
const test = require('node:test');

const {
  publicStimulusFor,
  publicQuestionPayload,
  validateStimulusRenderability,
  visualBehaviorFor,
  VISUAL_BEHAVIOR,
  REQUIRED_STIMULUS_NOT_RENDERABLE,
} = require('../../assessment-mvp/selectAssessmentItems');
const { createAssessmentSession } = require('../../assessment-mvp/createAssessmentSession');
const { createReassessmentSession } = require('../../assessment-mvp/createReassessmentSession');
const { loadSkillPackages, packageIdOf } = require('../../assessment-mvp/loadSkillPackages');
const { PROVISIONAL_EVIDENCE_POLICY } = require('../../assessment-mvp/evidencePolicy');
const { scoreResponses } = require('../../assessment-mvp/scoreResponses');
const { recommendSkillPackages } = require('../../assessment-mvp/recommendSkillPackages');
const app = require('../../public/assessment-mvp/app.js');

function record(index, pkg = 'PKG') {
  return {
    item_identity: `${pkg}::bank::Q${index}`,
    source_package_id: pkg,
    source_question_id: `Q${index}`,
    answer: 'yes',
    question_type: 'short_response',
  };
}

function evidence(label, extra = {}) {
  return {
    source_package_id: extra.package_id || `PKG_${label.replace(/\W/g, '_')}`,
    skill_id: extra.package_id || `PKG_${label.replace(/\W/g, '_')}`,
    provisional_label: label,
    valid_scored_responses: label === 'Not Enough Evidence' ? 2 : 3,
    correct_responses: label === 'Needs Support' ? 1 : 2,
    accuracy: label === 'Not Enough Evidence' ? null : 2 / 3,
    ...extra,
  };
}

function pkg(id) {
  return { skill_id: id, grade: 1, subject: 'Math', skill: `Title ${id}`, domain: 'Math' };
}

test('Grade 1 Math photographed items map to child-facing visual behavior', () => {
  const count = {
    question_id: 'G1M_NS_002_LVL1_Q01',
    prompt: 'Count forward by 1: 3, 4, 5, __',
    question_type: 'multiple_choice',
    visual_model: 'number_line',
    support_type: 'number_line',
    correct_answer: '6',
    choices: ['6', '5', '7'],
    min: 3,
    max: 6,
  };
  const countStimulus = publicStimulusFor(count, 'G1M_NS_002');
  assert.equal(countStimulus.type, 'number_sequence');
  assert.deepEqual(countStimulus.content.terms, ['3', '4', '5', '__']);
  assert.doesNotMatch(JSON.stringify(publicQuestionPayload(count, 'G1M_NS_002')), /"min"|"max"|"model"/);

  const shape = { question_id: 'G1M_GM_001_LVL1_Q08', prompt: 'What shape is shown?', question_type: 'multiple_choice', visual_model: 'shape_identification', support_type: 'shape_identification', correct_answer: 'triangle', choices: ['triangle', 'circle'], shape: 'triangle' };
  const shapeStimulus = publicStimulusFor(shape, 'G1M_GM_001');
  assert.equal(shapeStimulus.type, 'shape');
  assert.equal(shapeStimulus.content.shape, 'triangle');
  assert.equal(shapeStimulus.accessibility_text, 'A shape to identify');

  const sort = { question_id: 'G1M_DP_001_LVL1_Q02', prompt: 'Which group matches this sorting rule: sort by color? Choose the blue shapes.', question_type: 'multiple_choice', visual_model: 'sorting_visual', support_type: 'sorting_visual', correct_answer: 'blue shapes', choices: ['blue shapes', 'blue items', 'circles'], items: ['blue circle', 'blue square', 'red square', 'green triangle'] };
  const sortStimulus = publicStimulusFor(sort, 'G1M_DP_001');
  assert.equal(sortStimulus.type, 'colored_shape_collection');
  assert.deepEqual(sortStimulus.content.items, [
    { color: 'blue', shape: 'circle' },
    { color: 'blue', shape: 'square' },
    { color: 'red', shape: 'square' },
    { color: 'green', shape: 'triangle' },
  ]);

  const clock = { question_id: 'G1M_MD_TIME_001_AQ1', prompt: 'What time is shown on the clock?', question_type: 'multiple_choice', visual_model: 'analog_clock', support_type: 'analog_clock', correct_answer: '5:00', choices: ['5:00', '12:05', '6:00'], hour: 5, minute: 0 };
  const clockStimulus = publicStimulusFor(clock, 'G1M_MD_TIME_001');
  assert.equal(clockStimulus.type, 'analog_clock');
  assert.deepEqual(clockStimulus.content, { hour: 5, minute: 0 });
  assert.doesNotMatch(JSON.stringify(publicQuestionPayload(clock, 'G1M_MD_TIME_001')), /correct_answer|answer|explanation|feedback/i);

  const add = { question_id: 'G1M_OP_001_AQ8', prompt: 'Add: 5 + 5 = __', question_type: 'short_response', visual_model: 'addition_model', support_type: 'addition_model', correct_answer: '10', a: 5, b: 5 };
  assert.equal(publicStimulusFor(add, 'G1M_OP_001'), null);
  assert.equal(visualBehaviorFor(add, 'G1M_OP_001'), VISUAL_BEHAVIOR.PROMPT_SUFFICIENT_WITHOUT_VISUAL);
  assert.doesNotMatch(JSON.stringify(publicQuestionPayload(add, 'G1M_OP_001')), /"a"|"b"|"model"/);

  const compare = { question_id: 'G1M_NS_003_AQ8', prompt: 'Which group has more: 14 stars or 16 stars?', question_type: 'multiple_choice', visual_model: 'comparison', support_type: 'comparison', correct_answer: '16', choices: ['14', '16'], left: 14, right: 16 };
  assert.equal(publicStimulusFor(compare, 'G1M_NS_003'), null);
  assert.doesNotMatch(JSON.stringify(publicQuestionPayload(compare, 'G1M_NS_003')), /"left"|"right"|"model"/);
});

test('unknown required visual models fail closed while prompt-sufficient items may omit visuals', () => {
  const unknown = { question_id: 'U1', prompt: 'What picture is shown?', question_type: 'multiple_choice', visual_model: 'mystery_picture', correct_answer: 'cat', choices: ['cat', 'dog'] };
  assert.deepEqual(validateStimulusRenderability(unknown, 'PKG'), [REQUIRED_STIMULUS_NOT_RENDERABLE]);
  assert.equal(visualBehaviorFor(unknown, 'PKG'), VISUAL_BEHAVIOR.REQUIRED_VISUAL_NOT_SUPPORTED);

  const sufficient = { question_id: 'A1', prompt: 'Add: 2 + 6 = __', question_type: 'short_response', visual_model: 'addition_model', support_type: 'addition_model', correct_answer: '8', a: 2, b: 6 };
  assert.deepEqual(validateStimulusRenderability(sufficient, 'G1M_OP_001'), []);
  assert.equal(publicStimulusFor(sufficient, 'G1M_OP_001'), null);
});

test('learner renderers show math visuals without generic metadata chips or triangle artifacts', () => {
  const countHtml = app.renderStimulus({ payload: { prompt: 'Count forward by 1: 3, 4, 5, __', stimulus: { type: 'number_sequence', content: { terms: ['3', '4', '5', '__'] } } } });
  assert.match(countHtml, /number-sequence-row/);
  assert.doesNotMatch(countHtml, /min|max|stimulus-chip|Model/);

  const shapeHtml = app.renderStimulus({ payload: { prompt: 'What shape is shown?', stimulus: { type: 'shape', content: { shape: 'triangle', color: 'blue' } } } });
  assert.match(shapeHtml, /shape-triangle/);
  assert.match(shapeHtml, /A shape to identify/);
  const css = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'public/assessment-mvp/styles.css'), 'utf8');
  assert.match(css, /clip-path:\s*polygon\(50% 4%, 96% 96%, 4% 96%\)/);

  const sortHtml = app.renderStimulus({ payload: { prompt: 'Choose the blue shapes.', stimulus: { type: 'colored_shape_collection', content: { items: [{ color: 'blue', shape: 'circle' }, { color: 'blue', shape: 'square' }, { color: 'red', shape: 'square' }, { color: 'green', shape: 'triangle' }] } } } });
  assert.match(sortHtml, /colored-shape-row/);
  assert.match(sortHtml, /shape-color-blue/);
  assert.doesNotMatch(sortHtml, /blue circle, blue square, red square, green triangle/);

  const clockHtml = app.renderStimulus({ payload: { prompt: 'What time is shown on the clock?', stimulus: { type: 'analog_clock', content: { hour: 5, minute: 0 }, accessibility_text: 'Analog clock showing 5:00' } } });
  assert.match(clockHtml, /analog-clock-face/);
  assert.match(clockHtml, /hour-hand/);
  assert.match(clockHtml, /minute-hand/);
  assert.doesNotMatch(clockHtml, /MODEL|stimulus-chip|correct_answer/);
});

test('provisional evidence policy is shared by selector and scorer', () => {
  const session = createAssessmentSession({ grade: 1, subject: 'Math' });
  assert.equal(session.selection_summary.minimum_valid_responses, PROVISIONAL_EVIDENCE_POLICY.minimumValidResponses);
  assert.equal(session.evidence_policy.minimum_valid_responses, PROVISIONAL_EVIDENCE_POLICY.minimumValidResponses);
  const records = [0, 1, 2].map((index) => record(index, 'PKG_POLICY'));
  const ready = scoreResponses(records, records.map((item) => ({ item_identity: item.item_identity, response: 'yes' }))).skillEvidence[0];
  assert.equal(ready.provisional_label, 'Ready');
  assert.equal(ready.minimum_valid_responses, PROVISIONAL_EVIDENCE_POLICY.minimumValidResponses);
  const notEnough = scoreResponses(records.slice(0, 2), records.slice(0, 2).map((item) => ({ item_identity: item.item_identity, response: 'yes' }))).skillEvidence[0];
  assert.equal(notEnough.provisional_label, 'Not Enough Evidence');
});

test('result UI uses skill titles, compacts Not Enough Evidence, and caps recommendations', () => {
  app.state.result = app.publicResultOnly({
    session_id: 'R1',
    skill_evidence: [
      { source_package_id: 'G1M_OP_003', skill_id: 'G1M_OP_003', skill: 'Fact Fluency and Number Bonds Within 10', provisional_label: 'Developing', valid_scored_responses: 3, correct_responses: 2 },
      { source_package_id: 'G1M_NS_002', skill_id: 'G1M_NS_002', skill: 'Count Forward and Backward Within 120', provisional_label: 'Not Enough Evidence', valid_scored_responses: 1, correct_responses: 1 },
      { source_package_id: 'G1M_DP_001', skill_id: 'G1M_DP_001', skill: 'Sorting Categories and Pattern Recognition', provisional_label: 'Not Enough Evidence', valid_scored_responses: 0, correct_responses: 0 },
    ],
    recommendations: [
      { package_id: 'A', skill: 'A title' },
      { package_id: 'B', skill: 'B title' },
      { package_id: 'C', skill: 'C title' },
      { package_id: 'D', skill: 'D title' },
    ],
  });
  const html = app.renderResults();
  assert.match(html, /Fact Fluency and Number Bonds Within 10/);
  assert.match(html, /2 of 3/);
  assert.match(html, /Skills needing more evidence/);
  assert.doesNotMatch(html, /<h3>G1M_/);
  assert.equal((html.match(/recommendation-card/g) || []).length, 3);
});

test('Not Enough Evidence recommendations do not outrank stronger instructional evidence', () => {
  const packages = ['PKG_NEEDS', 'PKG_DEV', 'PKG_MORE'].map(pkg);
  const result = recommendSkillPackages({
    grade: 1,
    subject: 'Math',
    packages,
    evidence: [
      evidence('Not Enough Evidence', { package_id: 'PKG_MORE' }),
      evidence('Needs Support', { package_id: 'PKG_NEEDS' }),
      evidence('Developing', { package_id: 'PKG_DEV' }),
    ],
  });
  assert.deepEqual(result.recommendations.map((item) => item.package_id), ['PKG_NEEDS', 'PKG_DEV']);
});

test('Grade 1 Math public payloads expose no scoring answers and production package files remain content sources', () => {
  const session = createAssessmentSession({ grade: 1, subject: 'Math' });
  assert.equal(session.public_items.length, 33);
  const serializedPublic = JSON.stringify(session.public_items);
  assert.doesNotMatch(serializedPublic, /correct_answer|acceptable_answers|answer|rubric|explanation/i);
  assert.equal(session.public_items.some((item) => item.source_package_id === 'G1M_NS_002'), true);
  assert.equal(session.public_items.some((item) => item.source_package_id === 'G1M_DP_001'), true);
  assert.equal(session.public_items.some((item) => item.source_package_id === 'G1M_MD_TIME_001'), true);
});


test('all intended Grade 1 Math packages are represented with three baseline items', () => {
  const session = createAssessmentSession({ grade: 1, subject: 'Math' });
  const packages = loadSkillPackages({ grade: 1, subject: 'Math' });
  const expectedIds = packages.map(packageIdOf).sort();
  const counts = new Map();
  for (const item of session.public_items) counts.set(item.source_package_id, (counts.get(item.source_package_id) || 0) + 1);
  assert.deepEqual([...counts.keys()].sort(), expectedIds);
  for (const id of expectedIds) assert.equal(counts.get(id), 3, `${id} should have three baseline items`);
  assert.equal(session.public_items.length, expectedIds.length * 3);
});

test('formerly omitted Grade 1 Math time package has three baseline and three reassessment items', () => {
  const baseline = createAssessmentSession({ grade: 1, subject: 'Math' });
  const timeItems = baseline.public_items.filter((item) => item.source_package_id === 'G1M_MD_TIME_001');
  assert.equal(timeItems.length, 3);
  assert.equal(timeItems.every((item) => item.payload.stimulus && item.payload.stimulus.type === 'analog_clock'), true);
  const reassessment = createReassessmentSession({ status: 'completed' }, {
    grade: 1,
    subject: 'Math',
    packageIds: ['G1M_MD_TIME_001'],
    all_prior_exposed_item_ids: timeItems.map((item) => item.item_identity),
    all_prior_exposed_duplicate_keys: timeItems.map((item) => item.duplicate_key),
  });
  assert.equal(reassessment.public_items.length, 3);
  assert.equal(reassessment.insufficient_evidence.length, 0);
  assert.equal(new Set(reassessment.public_items.map((item) => item.item_identity)).size, 3);
  for (const item of reassessment.public_items) assert.equal(item.payload.stimulus.type, 'analog_clock');
});

test('new Grade 1 Math live session can produce provisional result states and no overall mastery claim', () => {
  const session = createAssessmentSession({ grade: 1, subject: 'Math' });
  const byPackage = new Map();
  for (const item of session.public_items) {
    if (!byPackage.has(item.source_package_id)) byPackage.set(item.source_package_id, []);
    byPackage.get(item.source_package_id).push(item);
  }
  const packages = [...byPackage.keys()].slice(0, 4);
  const records = [];
  const responses = [];
  for (const [packageIndex, packageId] of packages.entries()) {
    for (const [itemIndex, item] of byPackage.get(packageId).entries()) {
      const original = session.internal_scoring_records.find((record) => record.item_identity === item.item_identity);
      records.push({ ...original, question_type: item.question_type, choices: item.payload.choices });
      const correct = original.answer;
      const wrongChoice = (item.payload.choices || []).find((choice) => String(choice) !== String(correct)) || '__wrong__';
      const shouldAnswer = packageIndex < 3 || itemIndex < 2;
      if (!shouldAnswer) continue;
      responses.push({ item_identity: item.item_identity, response: packageIndex === 0 || (packageIndex === 1 && itemIndex < 2) ? correct : wrongChoice });
    }
  }
  const result = scoreResponses(records, responses);
  const labels = Object.fromEntries(result.skillEvidence.map((item) => [item.source_package_id, item.provisional_label]));
  assert.equal(labels[packages[0]], 'Ready');
  assert.equal(labels[packages[1]], 'Developing');
  assert.equal(labels[packages[2]], 'Needs Support');
  assert.equal(labels[packages[3]], 'Not Enough Evidence');
  app.state.result = app.publicResultOnly({ session_id: 'live', status: 'completed', skill_evidence: result.skillEvidence.map((item) => ({ ...item, skill: `Title ${item.source_package_id}` })), recommendations: [] });
  const html = app.renderResults();
  assert.match(html, /Title G1M_/);
  assert.match(html, /2 of 3/);
  assert.match(html, /Skills needing more evidence/);
  assert.doesNotMatch(html, /overall grade mastery|grade mastery|mastered Grade 1/i);
});
