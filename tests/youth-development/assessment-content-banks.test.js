const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');
const { createYouthDevelopmentTdeRouter } = require('../../server/youthDevelopmentTdeRoutes');
const { generateDevelopmentCheckin } = require('../../youth-development/tde/developmentCheckinService');

async function startServer() {
  const prev = process.env.TDE_EXTENSION_MODE;
  process.env.TDE_EXTENSION_MODE = 'on';

  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter());
  app.use('/api/youth-development/tde', createYouthDevelopmentTdeRouter({
    repository: {
      persistDevelopmentCheckin: async (record) => ({ ok: true, record }),
      listDevelopmentCheckins: async () => [],
    },
  }));

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();

  return {
    server,
    baseUrl: `http://127.0.0.1:${addr.port}`,
    restore: () => {
      if (prev === undefined) delete process.env.TDE_EXTENSION_MODE;
      else process.env.TDE_EXTENSION_MODE = prev;
    },
  };
}

test('content audit reports all assessment banks complete and contracted', async () => {
  const { server, baseUrl, restore } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/tde/content/audit`);
    assert.equal(response.status, 200);
    const payload = await response.json();

    assert.equal(payload.ok, true);
    assert.equal(payload.partial_or_missing.length, 0);
    assert.equal(payload.present_in_logic_not_authored.length, 0);
    assert.ok(payload.complete.includes('parent_baseline_intake'));
    assert.ok(payload.complete.includes('weekly_development_checkins'));
    assert.ok(payload.complete.includes('milestone_reassessments'));
    assert.ok(payload.complete.includes('parent_reflection_prompts'));
    assert.ok(payload.complete.includes('child_facing_developmental_prompts'));
    assert.ok(payload.complete.includes('assessment_report_support_blocks'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    restore();
  }
});

test('content inventory and milestone availability are non-empty', async () => {
  const { server, baseUrl, restore } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/tde/content/inventory?week=12&age_band=11-13`);
    assert.equal(response.status, 200);
    const payload = await response.json();

    assert.equal(payload.ok, true);
    assert.ok(payload.inventory_counts.parent_baseline_intake >= 25);
    assert.ok(payload.inventory_counts.weekly_development_checkins >= 8);
    assert.ok(payload.milestone_items.length >= 1);
    assert.equal(payload.wiring.parent_intake_questions_endpoint, '/api/youth-development/questions');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    restore();
  }
});

test('weekly checkin run uses authored prompt content and no empty walkthrough', async () => {
  const { server, baseUrl, restore } = await startServer();
  try {
    const authored = generateDevelopmentCheckin({ child_id: 'child-a', program_week: 8, age_band: '11-13' });
    const response = await fetch(`${baseUrl}/api/youth-development/tde/checkin/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        child_id: 'child-a',
        program_week: 8,
        age_band: '11-13',
        responses: {
          child: [
            { prompt_id: authored.prompts.performance_prompt.prompt_id, response_text: 'I planned steps', value: 3 },
            { prompt_id: authored.prompts.reflection_prompt.prompt_id, response_text: 'I fixed one mistake', value: 3 },
          ],
          transfer: authored.prompts.optional_transfer_prompt
            ? { prompt_id: authored.prompts.optional_transfer_prompt.prompt_id, response_text: 'I reused it in homework', value: 3 }
            : null,
          parent: { prompt_id: authored.prompts.parent_observation_prompt.prompt_id, response_text: 'I saw persistence', value: 3 },
        },
      }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(typeof payload.checkin.prompts.performance_prompt.prompt_text, 'string');
    assert.match(payload.checkin.prompts.performance_prompt.prompt_id, /^cp_/);

    const questions = await fetch(`${baseUrl}/api/youth-development/questions`).then((r) => r.json());
    assert.equal(questions.question_count, 25);
    assert.equal(questions.flow.unanswered_count, 25);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    restore();
  }
});
