const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const { sessionFromRows } = require(path.join(root, 'server/assessmentMvpStore.js'));

test('an invalid saved assessment has no deliverable public questions', () => {
  const session = sessionFromRows({
    session_id: 'amvp_old', session_version: 'v', assessment_role: 'baseline',
    grade: 4, subject: 'Math', status: 'in_progress', current_question_position: 0, selection_config: {},
  }, [{
    display_order: 0, item_identity: 'old', duplicate_key: 'old',
    public_payload: { payload: { prompt: 'Which is taller, A or B?', question_type: 'multiple_choice', choices: ['A', 'B'] } },
  }]);
  assert.deepEqual(session.public_items, []);
});
