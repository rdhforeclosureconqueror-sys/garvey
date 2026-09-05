const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAdaptiveLearnerContext, canonicalDatabaseChildId } = require('../../server/adaptiveLearnerContext');

test('Youth Development learner context with canonical ID normalizes without program concatenation', async () => {
  const learner = await normalizeAdaptiveLearnerContext({ child_id: '101', program_context: 'youth_development', source_registry: 'youth_development', display_name: 'Princess Nia', ownership_verified: true });
  assert.equal(learner.child_id, '101');
  assert.equal(learner.program_context, 'youth_development');
  assert.equal(learner.source_registry, 'youth_development');
  assert.equal(learner.display_name, 'Princess Nia');
  assert.equal(learner.ownership_verified, false);
  assert.equal(learner.parent_profile_id, null);
  assert.equal(learner.auth_user_id, null);
  assert.doesNotMatch(learner.child_id, /youth_development/);
});

test('caller-supplied ownership fields cannot self-verify a learner', async () => {
  const learner = await normalizeAdaptiveLearnerContext({
    child_id: '101',
    ownership_verified: true,
    ownership: { ok: true, parent_profile_id: 'spoofed-parent', auth_user_id: 'spoofed-user' },
    parent_profile_id: 'spoofed-parent',
    auth_user_id: 'spoofed-user',
  });
  assert.equal(learner.ownership_verified, false);
  assert.equal(learner.parent_profile_id, null);
  assert.equal(learner.auth_user_id, null);
});

test('only the owned-child resolver can establish ownership authority', async () => {
  const learner = await normalizeAdaptiveLearnerContext({ child_id: '101', ownership_verified: true }, {
    resolveOwnedChild: async ({ childId }) => ({ ok: true, parent_profile_id: 'parent-7', auth_user_id: 'user-9', row: { id: childId } }),
  });
  assert.equal(learner.ownership_verified, true);
  assert.equal(learner.parent_profile_id, 'parent-7');
  assert.equal(learner.auth_user_id, 'user-9');
});

test('failed ownership resolution fails closed', async () => {
  await assert.rejects(
    () => normalizeAdaptiveLearnerContext({ child_id: '101', ownership_verified: true }, { resolveOwnedChild: async () => ({ ok: false, error: 'child_not_owned' }) }),
    (error) => error && error.code === 'child_not_owned'
  );
});

test('numeric database IDs are accepted as string or integer', async () => {
  assert.deepEqual(canonicalDatabaseChildId('101'), { ok: true, child_id: '101', raw: '101' });
  assert.deepEqual(canonicalDatabaseChildId(101), { ok: true, child_id: '101', raw: '101' });
});

test('malformed composite Youth Development IDs are rejected before assessment APIs', async () => {
  assert.equal(canonicalDatabaseChildId('youth_development:101').error, 'malformed_child_id');
  await assert.rejects(() => normalizeAdaptiveLearnerContext({ child_id: 'youth_development:101', display_name: 'Princess Nia' }), /We could not verify Princess Nia/);
});
