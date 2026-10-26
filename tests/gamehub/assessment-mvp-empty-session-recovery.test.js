const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const { AssessmentMvpPostgresStore } = require(path.join(root, 'server/assessmentMvpStore.js'));
const { SESSION_VERSION } = require(path.join(root, 'assessment-mvp/createAssessmentSession.js'));

test('an empty filtered session is expired and replaced with a deliverable baseline', async () => {
  const old = { id: 11, session_id: 'amvp_old', learner_id: 301, parent_profile_id: 201, auth_user_id: 101, assessment_role: 'baseline', grade: 4, subject: 'Math', status: 'in_progress', session_version: SESSION_VERSION, selection_config: {}, current_question_position: 0, lock_version: 0 };
  const items = []; let expired = false;
  const client = {
    async query(sql, params = []) {
      if (/BEGIN|COMMIT|ROLLBACK/.test(sql)) return { rows: [], rowCount: 0 };
      if (/FROM assessment_sessions/.test(sql) && /status = 'in_progress'/.test(sql)) return { rows: [old], rowCount: 1 };
      if (/FROM assessment_session_items/.test(sql) && params[0] === 11) return { rows: [{ display_order: 0, item_identity: 'old', duplicate_key: 'old', public_payload: { payload: { prompt: 'Which is taller, A or B?', question_type: 'multiple_choice' } } }], rowCount: 1 };
      if (/UPDATE assessment_sessions/.test(sql)) { expired = true; return { rows: [], rowCount: 1 }; }
      if (/FROM assessment_item_exposures/.test(sql)) return { rows: [], rowCount: 0 };
      if (/INSERT INTO assessment_sessions/.test(sql)) return { rows: [{ id: 12, session_id: params[0], learner_id: params[1], parent_profile_id: params[2], auth_user_id: params[3], assessment_role: 'baseline', grade: params[5], subject: params[6], status: 'in_progress', session_version: params[7], selection_config: JSON.parse(params[8]), current_question_position: 0 }], rowCount: 1 };
      if (/INSERT INTO assessment_session_items/.test(sql)) { items.push({ display_order: params[8], item_identity: params[1], duplicate_key: params[7], public_payload: JSON.parse(params[11]) }); return { rows: [], rowCount: 1 }; }
      if (/INSERT INTO assessment_item_exposures/.test(sql)) return { rows: [], rowCount: 1 };
      if (/FROM assessment_session_items/.test(sql) && params[0] === 12) return { rows: items, rowCount: items.length };
      throw new Error('Unexpected query');
    }, release() {},
  };
  const store = new AssessmentMvpPostgresStore({ pool: { connect: async () => client }, createSessionId: () => 'amvp_new' });
  const session = await store.createOrResumeAssessmentSession({ actor: { authUserId: 101, parentProfile: { id: 201 } }, ownedChild: { learnerId: '301', childProfile: { child_id: '301', child_grade_band: 'Grade 4', metadata: { grade: 4 } } }, grade: 4, subject: 'Math', itemsPerPackage: 3 });
  assert.equal(expired, true);
  assert.equal(session.resumed, false);
  assert.equal(session.public_items.length, 30);
});
