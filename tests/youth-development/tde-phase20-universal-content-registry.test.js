const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { createYouthDevelopmentTdeRouter } = require("../../server/youthDevelopmentTdeRoutes");
const { createYouthDevelopmentIntakeRouter } = require("../../server/youthDevelopmentIntakeRoutes");
const { createYouthDevelopmentRouter } = require("../../server/youthDevelopmentRoutes");
const { registerReadablePlayableContentBlocks } = require("../../youth-development/tde/contentRegistryService");

function buildSnapshot(childId = "child-phase20") {
  return {
    enrollment: {
      child_id: childId,
      current_week: 9,
      active_domain_interests: ["logic_building", "creative_projects"],
      current_trait_targets: ["SR", "PS"],
      current_environment_targets: ["home_routine", "mentorship_access"],
    },
    progress_records: [
      { week_number: 8, completion_status: "complete", checkpoint_record: { checkpoint_id: "cp8", checkpoint_type: "weekly" }, trait_signal_summary: { SR: 0.5, PS: 0.55, DE: 0.52 } },
      { week_number: 9, completion_status: "complete", checkpoint_record: null, trait_signal_summary: { SR: 0.58, PS: 0.62, DE: 0.6 } },
    ],
    observer_consents: [{ consent_status: "granted" }],
    environment_hooks: [{ event_id: "env-1", trait_code: "SR", normalized_value: 0.7, trace_ref: "trace-env-1", timestamp: "2026-04-18T00:00:00.000Z" }],
    intervention_sessions: [{
      session_id: "s-1",
      duration_minutes: 24,
      full_session_completed: true,
      challenge_level: "moderate",
      parent_coaching_style: "supportive",
      intervention_signal_evidence: [{ evidence_id: "is-1", trait_code: "SR", normalized_value: 0.65, trace_ref: "trace-is-1" }],
    }],
    commitment_plan: { committed_days_per_week: 3, preferred_days: ["Mon", "Wed", "Fri"] },
    development_checkins: [{
      checkin_id: "c-1",
      age_band: "8-10",
      completed_at: "2026-04-18T01:00:00.000Z",
      summary: { transfer_attempt_quality: 2.5 },
      evidence_map: [{ evidence_id: "dc-1", trait_code: "SR", value: 3, value_max: 4, source_actor: "child", trace_ref: "trace-dc-1" }],
      prompts: {
        performance_prompt: { prompt_text: "Try one strategy and name it.", voice_text: "Try one strategy and name it.", voice_ready: true },
        reflection_prompt: { prompt_text: "What helped you keep going?", voice_text: "What helped you keep going?", voice_ready: true },
        optional_transfer_prompt: { prompt_text: "Use this in one new place.", voice_text: "Use this in one new place.", voice_ready: true },
      },
    }],
  };
}

function mountApp(repository) {
  const app = express();
  app.use(express.json());
  app.use("/api/youth-development/tde", createYouthDevelopmentTdeRouter({ repository }));
  app.use("/api/youth-development/intake", createYouthDevelopmentIntakeRouter());
  app.use(createYouthDevelopmentRouter());
  const server = app.listen(0);
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("phase20 content block contract validation and deterministic registration", () => {
  const baseBlocks = [{
    section_key: "summary",
    text_content: "Weekly development summary with clear next steps.",
    voice_ready: true,
    source_module: "parent_summary_service",
  }];

  const first = registerReadablePlayableContentBlocks(baseBlocks, { child_id: "child-phase20-a", scope: "test_scope" });
  const second = registerReadablePlayableContentBlocks(baseBlocks, { child_id: "child-phase20-a", scope: "test_scope" });

  assert.deepEqual(first, second);
  assert.equal(first.blocks[0].registration_status, "registered");
  assert.equal(typeof first.blocks[0].content_block_id, "string");
  assert.equal(typeof first.blocks[0].voice_chunk_id, "string");
});

test("phase20 chunk and section rule enforcement surfaces missing contracts", () => {
  const payload = registerReadablePlayableContentBlocks([
    {
      section_key: "Invalid Section",
      text_content: "",
      voice_text: "",
      source_module: "insight_service",
    },
  ], { child_id: "child-phase20-b", scope: "rules_scope" });

  assert.equal(payload.registration_completeness, "incomplete");
  assert.equal(payload.contract_missing_block_count, 1);
  assert.equal(payload.blocks[0].registration_status, "contract_missing");
  assert.equal(payload.blocks[0].missing_contracts.includes("section_key_pattern_invalid"), true);
  assert.equal(payload.blocks[0].missing_contracts.includes("text_content_required"), true);
});

test("phase20 additive registry/readability endpoints and live youth v1 route safety", async () => {
  process.env.TDE_EXTENSION_MODE = "on";
  const childId = "child-phase20-route";
  const repository = {
    getProgramSnapshot: async () => buildSnapshot(childId),
    getCommitmentPlan: async () => buildSnapshot(childId).commitment_plan,
    listInterventionSessions: async () => buildSnapshot(childId).intervention_sessions,
  };
  const app = mountApp(repository);

  try {
    const contractRes = await fetch(`${app.baseUrl}/api/youth-development/tde/contracts/content-block`);
    assert.equal(contractRes.status, 200);

    const registryRes = await fetch(`${app.baseUrl}/api/youth-development/tde/content-registry/${childId}`);
    assert.equal(registryRes.status, 200);
    const registry = await registryRes.json();
    assert.equal(Array.isArray(registry.blocks), true);
    assert.equal(registry.blocks.length > 0, true);
    assert.equal(typeof registry.voice_ready_content_count, "number");

    const readabilityRes = await fetch(`${app.baseUrl}/api/youth-development/tde/readability-status/${childId}`);
    assert.equal(readabilityRes.status, 200);
    const readability = await readabilityRes.json();
    assert.equal(typeof readability.readability_status.registered_blocks, "number");

    const recommendRes = await fetch(`${app.baseUrl}/api/youth-development/tde/recommendations/${childId}`);
    assert.equal(recommendRes.status, 200);
    const recommend = await recommendRes.json();
    assert.equal(recommend.content_registration.ok, true);

    const intakeRes = await fetch(`${app.baseUrl}/api/youth-development/intake/contracts/trait-mapping`);
    assert.equal(intakeRes.status, 200);

    const assessRes = await fetch(`${app.baseUrl}/api/youth-development/assess`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: [] }),
    });
    assert.equal(assessRes.status, 200);
  } finally {
    delete process.env.TDE_EXTENSION_MODE;
    await app.close();
  }
});
