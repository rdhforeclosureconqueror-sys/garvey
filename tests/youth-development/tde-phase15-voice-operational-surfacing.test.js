const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { createVoiceProviderAdapter } = require("../../youth-development/tde/voiceProviderAdapter");
const { createVoiceService } = require("../../youth-development/tde/voiceService");
const { createYouthDevelopmentTdeRouter } = require("../../server/youthDevelopmentTdeRoutes");
const { createYouthDevelopmentIntakeRouter } = require("../../server/youthDevelopmentIntakeRoutes");
const { createYouthDevelopmentRouter } = require("../../server/youthDevelopmentRoutes");
const { generateDevelopmentCheckin } = require("../../youth-development/tde/developmentCheckinService");

function buildSnapshot(childId) {
  const checkin = generateDevelopmentCheckin({ child_id: childId, program_week: 8, age_band: "8-10" });
  return {
    enrollment: {
      child_id: childId,
      current_week: 8,
      active_domain_interests: ["logic_building", "creative_projects"],
      current_trait_targets: ["SR", "PS"],
      current_environment_targets: ["home_routine", "mentorship_access"],
    },
    progress_records: [{ week_number: 8, completion_status: "complete", checkpoint_record: null }],
    observer_consents: [{ consent_status: "granted" }],
    environment_hooks: [{}, {}],
    intervention_sessions: [],
    commitment_plan: null,
    development_checkins: [{
      ...checkin,
      completed_at: "2026-04-18T12:00:00.000Z",
      prompts: {
        ...checkin.prompts,
        performance_prompt: {
          ...checkin.prompts.performance_prompt,
          voice_text: "Try one strategy, then explain why it worked.",
        },
      },
    }],
  };
}

function mountApp(repository, voiceService) {
  const app = express();
  app.use(express.json());
  app.use("/api/youth-development/tde", createYouthDevelopmentTdeRouter({ repository, voiceService }));
  app.use("/api/youth-development/intake", createYouthDevelopmentIntakeRouter());
  app.use(createYouthDevelopmentRouter());
  const server = app.listen(0);
  const port = server.address().port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function mountGatewayApp({ malformed = false, unavailable = false } = {}) {
  const app = express();
  app.use(express.json());

  app.get("/internal/voice/health", (_req, res) => res.status(200).json({ ok: true, status: "healthy" }));

  app.post("/internal/voice/checkin-prompt", (req, res) => {
    if (unavailable) return res.status(503).json({ error: "gateway_down" });
    if (malformed) {
      return res.status(200).json({
        status: "ready",
        provider: "openai-via-gateway",
        playable_text: req.body.voice_text,
      });
    }

    return res.status(200).json({
      status: "ready",
      provider: "openai-via-gateway",
      playable_text: req.body.voice_text,
      audio_url: `https://audio.example/checkin/${req.body.voice_chunk_id}`,
      replay_token: `replay_${req.body.voice_chunk_id}`,
      chunk_index: req.body.chunk_index,
      expires_at: "2026-05-01T00:00:00.000Z",
    });
  });

  app.post("/internal/voice/report-section", (req, res) => {
    if (unavailable) return res.status(503).json({ error: "gateway_down" });

    return res.status(200).json({
      status: "ready",
      provider: "openai-via-gateway",
      playable_text: req.body.voice_text,
      asset_ref: `asset://voice/${req.body.voice_chunk_id}`,
      replay_token: `replay_${req.body.voice_chunk_id}`,
      chunk_index: req.body.chunk_index,
      expires_at: "2026-05-01T00:00:00.000Z",
    });
  });

  const server = app.listen(0);
  const port = server.address().port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("phase15 child voice model surfaces playable/fallback/provider state and age-band support", async () => {
  const childId = "child-phase15-child";
  const repository = { getProgramSnapshot: async () => buildSnapshot(childId) };
  const gateway = mountGatewayApp();
  const voiceService = createVoiceService({
    adapter: createVoiceProviderAdapter({ gateway_base_url: gateway.baseUrl, gateway_timeout_ms: 500 }),
  });

  try {
    const payload = await voiceService.getChildCheckinPlayback(childId, repository);
    assert.equal(payload.ok, true);
    assert.equal(payload.voice_state.checkin_prompt_ready_for_playback, true);
    const prompt = payload.prompts[0];
    assert.equal(typeof prompt.prompt_id, "string");
    assert.equal(prompt.playable_status, "ready");
    assert.equal(prompt.fallback_status, "none");
    assert.equal(prompt.replay_available, true);
    assert.equal(prompt.provider_status, "available");
    assert.equal(Array.isArray(prompt.chunk_metadata), true);
    assert.equal(typeof prompt.playable_text_fallback, "string");
    assert.equal(prompt.age_band_voice_supported, true);
  } finally {
    await gateway.close();
  }
});

test("phase15 parent voice section model surfaces required sections and audio metadata", async () => {
  const childId = "child-phase15-parent";
  const repository = { getProgramSnapshot: async () => buildSnapshot(childId) };
  const gateway = mountGatewayApp();
  const voiceService = createVoiceService({
    adapter: createVoiceProviderAdapter({ gateway_base_url: gateway.baseUrl, gateway_timeout_ms: 500 }),
  });

  try {
    const payload = await voiceService.getParentSectionPlayback(childId, repository);
    assert.equal(payload.ok, true);
    assert.deepEqual(payload.sections.map((entry) => entry.section_key), ["summary", "strengths", "growth", "still_building", "environment", "next_steps"]);
    assert.equal(payload.voice_state.parent_section_ready_for_playback, true);
    assert.equal(payload.sections.every((entry) => entry.playable_status === "ready"), true);
    assert.equal(payload.sections.every((entry) => entry.provider_status === "available"), true);
    assert.equal(payload.sections.every((entry) => Array.isArray(entry.audio_reference_metadata) && entry.audio_reference_metadata.length >= 1), true);
    assert.equal(payload.sections.every((entry) => typeof entry.playable_text_fallback === "string"), true);
  } finally {
    await gateway.close();
  }
});

test("phase15 malformed success payload downgrades safely to fallback without breaking response", async () => {
  const childId = "child-phase15-malformed";
  const repository = { getProgramSnapshot: async () => buildSnapshot(childId) };
  const gateway = mountGatewayApp({ malformed: true });
  const voiceService = createVoiceService({
    adapter: createVoiceProviderAdapter({ gateway_base_url: gateway.baseUrl, gateway_timeout_ms: 500 }),
  });

  try {
    const payload = await voiceService.getChildCheckinPlayback(childId, repository);
    assert.equal(payload.ok, true);
    const chunk = payload.prompts[0].chunks[0];
    assert.equal(chunk.playable, false);
    assert.equal(chunk.provider_status, "fallback_active");
    assert.equal(chunk.fallback_reason, "malformed_gateway_success_missing_playable_asset");
    assert.equal(typeof chunk.playable_text, "string");
  } finally {
    await gateway.close();
  }
});

test("phase15 voice status endpoint surfaces availability/fallback/readiness without mandatory voice", async () => {
  process.env.TDE_EXTENSION_MODE = "on";
  const childId = "child-phase15-status";
  const repository = { getProgramSnapshot: async () => buildSnapshot(childId) };
  const gateway = mountGatewayApp({ unavailable: true });
  const voiceService = createVoiceService({
    adapter: createVoiceProviderAdapter({ gateway_base_url: gateway.baseUrl, gateway_timeout_ms: 500 }),
  });
  const app = mountApp(repository, voiceService);

  try {
    const configRes = await fetch(`${app.baseUrl}/api/youth-development/tde/voice/config`);
    const config = await configRes.json();
    assert.equal(configRes.status, 200);
    assert.ok(["voice_available", "voice_fallback_active", "voice_temporarily_unavailable"].includes(config.voice_availability_status));

    const statusRes = await fetch(`${app.baseUrl}/api/youth-development/tde/voice/status/${childId}`);
    const status = await statusRes.json();
    assert.equal(statusRes.status, 200);
    assert.equal(typeof status.voice_status.checkin_prompt_ready_for_playback, "boolean");
    assert.equal(typeof status.voice_status.parent_section_ready_for_playback, "boolean");
    assert.equal(typeof status.voice_status.voice_fallback_active, "boolean");
    assert.equal(typeof status.voice_status.voice_available, "boolean");

    const assessRes = await fetch(`${app.baseUrl}/api/youth-development/assess`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: [] }),
    });
    assert.equal(assessRes.status, 200);
    const assess = await assessRes.json();
    assert.equal(assess.ok, true);
  } finally {
    delete process.env.TDE_EXTENSION_MODE;
    await app.close();
    await gateway.close();
  }
});

test("phase15 additive route safety and live youth v1 routes remain unchanged", async () => {
  process.env.TDE_EXTENSION_MODE = "on";
  const childId = "child-phase15-live-v1";
  const repository = { getProgramSnapshot: async () => buildSnapshot(childId) };
  const gateway = mountGatewayApp();
  const voiceService = createVoiceService({
    adapter: createVoiceProviderAdapter({ gateway_base_url: gateway.baseUrl, gateway_timeout_ms: 500 }),
  });
  const app = mountApp(repository, voiceService);

  try {
    const voiceStatusRes = await fetch(`${app.baseUrl}/api/youth-development/tde/voice/status/${childId}`);
    assert.equal(voiceStatusRes.status, 200);

    const intakeRes = await fetch(`${app.baseUrl}/api/youth-development/intake/contracts/trait-mapping`);
    assert.equal(intakeRes.status, 200);
    const intake = await intakeRes.json();
    assert.equal(intake.contract_type, "trait_mapping");

    const assessRes = await fetch(`${app.baseUrl}/api/youth-development/assess`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: [] }),
    });
    assert.equal(assessRes.status, 200);
    const assess = await assessRes.json();
    assert.equal(assess.ok, true);
  } finally {
    delete process.env.TDE_EXTENSION_MODE;
    await app.close();
    await gateway.close();
  }
});
