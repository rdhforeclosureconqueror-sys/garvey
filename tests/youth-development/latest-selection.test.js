const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

const { selectLatestYouthSubmission } = require('../../server/youthLatestSelection');
const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');

function row({ id, createdAt, childId = null, rawChildId = null, customerName = 'Child' }) {
  return {
    id,
    created_at: createdAt,
    child_id: childId,
    customer_name: customerName,
    raw_answers: {
      ownership: {
        child_profile: {
          child_id: rawChildId,
          child_name: customerName,
        },
      },
    },
  };
}

test('latest selection returns newest submission by created_at then id after insert', () => {
  const rows = [
    row({ id: 161, createdAt: '2026-04-21T10:00:00.000Z', childId: 'child-a', rawChildId: 'child-a' }),
    row({ id: 162, createdAt: '2026-04-21T10:01:00.000Z', childId: 'child-a', rawChildId: 'child-a' }),
    row({ id: 163, createdAt: '2026-04-21T10:02:00.000Z', childId: 'child-a', rawChildId: 'child-a' }),
  ];

  const selected = selectLatestYouthSubmission({ rows, requestedChildId: 'child-a' });
  assert.equal(selected.latestRow.id, 163);
  assert.deepEqual(selected.candidateSubmissionIds, [163, 162, 161]);
  assert.equal(selected.ordering, 'created_at DESC, submission_id DESC');
});

test('latest selection uses submission id fallback when created_at ties', () => {
  const rows = [
    row({ id: 200, createdAt: '2026-04-21T10:00:00.000Z', childId: 'child-a', rawChildId: 'child-a' }),
    row({ id: 201, createdAt: '2026-04-21T10:00:00.000Z', childId: 'child-a', rawChildId: 'child-a' }),
  ];

  const selected = selectLatestYouthSubmission({ rows, requestedChildId: 'child-a' });
  assert.equal(selected.latestRow.id, 201);
  assert.deepEqual(selected.candidateSubmissionIds, [201, 200]);
});

test('child-scoped selection includes newest record when persisted child_id differs from raw ownership child_id', () => {
  const rows = [
    row({ id: 301, createdAt: '2026-04-21T10:00:00.000Z', childId: 'child-a', rawChildId: 'child-a' }),
    row({ id: 302, createdAt: '2026-04-21T10:01:00.000Z', childId: 'child-a', rawChildId: 'child-b' }),
  ];

  const selected = selectLatestYouthSubmission({ rows, requestedChildId: 'child-a' });
  assert.equal(selected.latestRow.id, 302);
  assert.equal(selected.selectionPath, 'child_scope_match');
});

test('legacy unscoped fallback still resolves newest legacy record', () => {
  const rows = [
    {
      id: 401,
      created_at: '2026-04-21T10:00:00.000Z',
      child_id: null,
      customer_name: 'Legacy Child',
      raw_answers: {},
    },
    {
      id: 402,
      created_at: '2026-04-21T10:01:00.000Z',
      child_id: null,
      customer_name: 'Legacy Child',
      raw_answers: {},
    },
  ];

  const selected = selectLatestYouthSubmission({ rows, requestedChildId: 'child-any' });
  assert.equal(selected.latestRow.id, 402);
  assert.equal(selected.selectionPath, 'legacy_unscoped_fallback');
});

async function startServer(loadLatestYouthAssessment) {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter({ loadLatestYouthAssessment }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

test('latest endpoint returns explicit diagnostics for selection', async () => {
  const latestPayload = {
    ownership: { child_profile: { child_id: 'child-a' } },
    diagnostics: {
      latest_submission_id: 555,
      latest_created_at: '2026-04-21T11:00:00.000Z',
      candidate_submission_ids: [555, 554],
      selection_ordering: 'created_at DESC, submission_id DESC',
      selection_reason: 'Matched requested child scope against persisted/raw/legacy child identifiers.',
      selected_history_count: 2,
      latest_selection_path: 'child_scope_match',
    },
  };
  const { server, baseUrl } = await startServer(async () => latestPayload);
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/parent-dashboard/latest?tenant=tap&email=owner@example.com&child_id=child-a`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.latest_submission_id, 555);
    assert.equal(body.latest_created_at, '2026-04-21T11:00:00.000Z');
    assert.deepEqual(body.candidate_submission_ids, [555, 554]);
    assert.equal(body.selection_ordering, 'created_at DESC, submission_id DESC');
    assert.equal(typeof body.selection_reason, 'string');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
