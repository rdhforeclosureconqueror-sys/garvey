const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { createVoiceProviderAdapter, chunkText } = require("../../youth-development/tde/voiceProviderAdapter");
const { createVoiceService } = require("../../youth-development/tde/voiceService");
const { createYouthDevelopmentTdeRouter } = require("../../server/youthDevelopmentTdeRoutes");
const { createYouthDevelopmentRouter } = require("../../server/youthDevelopmentRoutes");
const { generateDevelopmentCheckin } = require("../../youth-development/tde/developmentCheckinService");

function buildSnapshot(childId) {
  const checkin = generateDevelopmentCheckin({ child_id: childId, program_week: 5, age_band: "8-10" });
  return {
    enrollment: {
      child_id: childId,
      current_week: 5,
      active_domain_interests: ["logic_building", "creative_projects"],
      current_trait_targets: ["SR", "PS"],
      current_environment_targets: ["home_routine", "mentorship_access"],
    },
    progress_records: [
      { week_number: 4, completion_status: "complete", checkpoint_record: null },
      { week_number: 5, completion_status: "complete", checkpoint_record: null },
    ],
    observer_consents: [{ consent_status: "granted" }],
    environment_hooks: [{}, {}],
    intervention_sessions: [],
    commitment_plan: null,
    development_checkins: [{
      ...checkin,
      completed_at: "2026-04-12T10:00:00.000Z",
      prompts: {
        ...checkin.prompts,
        performance_prompt: {
          ...checkin.prompts.performance_prompt,
          voice_text: "Read this short reflection prompt.",
          prompt_text: "This is a much longer performance prompt that should not be used by voice metadata.",
        },
      },
      evidence_map: [
        { evidence_id: "e1", trace_ref: "t1", source_actor: "child", signal_type: "strategy_use_presence", value: 3, prompt_id: checkin.prompts.performance_prompt.prompt_id },
        { evidence_id: "e2", trace_ref: "t2", source_actor: "parent", signal_type: "context_consistency", value: 3, prompt_id: checkin.prompts.parent_observation_prompt.prompt_id },
      ],
    }],
  };
}

function mountVoiceApp(repository, voiceService) {
  const app = express();
  app.use(express.json());
  app.use("/api/youth-development/tde", createYouthDevelopmentTdeRouter({ repository, voiceService }));
  app.use(createYouthDevelopmentRouter());
  const server = app.listen(0);
  const port = server.address().port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function mountGatewayApp({ delayMs = 0, fail = false } = {}) {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    return res.status(200).json({ ok: true, status: "healthy" });
  });

  app.post("/speak", async (req, res) => {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (fail) return res.status(503).type("application/json").send(JSON.stringify({ error: "gateway_unavailable" }));
    return res.status(200).type("audio/mpeg").send(Buffer.from(`audio:${String(req.body?.text || "")}`));
  });

  const server = app.listen(0);
  const port = server.address().port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("phase14 adapter uses external gateway mode and chunking still enforces short chunks", async () => {
  const gateway = mountGatewayApp();
  const adapter = createVoiceProviderAdapter({ gateway_mode: "external_gateway", gateway_base_url: gateway.baseUrl, gateway_timeout_ms: 1000 });

  try {
    assert.equal(adapter.isAvailable(), true);
    const health = await adapter.getConnectivity();
    assert.equal(health.status, "connected");

    const chunks = chunkText("One. Two. Three. Four.", { max_chars: 14, max_sentences_per_chunk: 2 });
    assert.equal(chunks.length >= 2, true);
    assert.equal(chunks.every((entry) => entry.length <= 14), true);
  } finally {
    await gateway.close();
  }
});

test("phase14 child check-in playback returns normalized playable output from gateway", async () => {
  const childId = "child-phase14-a";
  const repository = { getProgramSnapshot: async () => buildSnapshot(childId) };
  const gateway = mountGatewayApp();
  const voiceService = createVoiceService({
    adapter: createVoiceProviderAdapter({
      gateway_mode: "external_gateway",
      gateway_base_url: gateway.baseUrl,
      gateway_timeout_ms: 500,
    }),
  });

  try {
    const payload = await voiceService.getChildCheckinPlayback(childId, repository);
    assert.equal(payload.ok, true);
    assert.equal(payload.one_prompt_at_a_time, true);
    assert.equal(payload.voice_enabled, true);

    const performance = payload.prompts.find((entry) => entry.prompt_key === "performance_prompt");
    assert.ok(performance);
    assert.equal(performance.uses_voice_text_only, true);
    assert.equal(performance.age_band, "8-10");
    assert.equal(performance.chunks[0].status, "ready");
    assert.equal(performance.chunks[0].provider_name, "openai-via-upstream-speak");
    assert.equal(performance.chunks[0].audio_url.startsWith("data:audio/mpeg;base64,"), true);
    assert.equal(performance.chunks[0].playable_text.includes("Read this short reflection prompt."), true);
  } finally {
    await gateway.close();
  }
});

test("phase14 parent section playback returns section-level references without full-report mode", async () => {
  const childId = "child-phase14-b";
  const repository = { getProgramSnapshot: async () => buildSnapshot(childId) };
  const gateway = mountGatewayApp();
  const voiceService = createVoiceService({
    adapter: createVoiceProviderAdapter({
      gateway_mode: "external_gateway",
      gateway_base_url: gateway.baseUrl,
      gateway_timeout_ms: 500,
    }),
  });

  try {
    const payload = await voiceService.getParentSectionPlayback(childId, repository);
    assert.equal(payload.ok, true);
    assert.equal(payload.full_report_playback_allowed, false);
    assert.equal(payload.sections.length, 6);
    assert.deepEqual(payload.sections.map((entry) => entry.section_key), ["summary", "strengths", "growth", "still_building", "environment", "next_steps"]);
    assert.equal(payload.sections.every((entry) => entry.chunks[0].status === "ready"), true);
    assert.equal(payload.sections.every((entry) => typeof entry.chunks[0].audio_url === "string"), true);
    assert.equal(payload.sections.every((entry) => entry.chunk_count === 1), true);
  } finally {
    await gateway.close();
  }
});

test("phase14 timeout/failure falls back to playable_text and never blocks core experience", async () => {
  process.env.TDE_EXTENSION_MODE = "on";
  const childId = "child-phase14-fallback";
  const repository = { getProgramSnapshot: async () => buildSnapshot(childId) };
  const gateway = mountGatewayApp({ fail: true });
  const voiceService = createVoiceService({
    adapter: createVoiceProviderAdapter({
      gateway_mode: "external_gateway",
      gateway_base_url: gateway.baseUrl,
      gateway_timeout_ms: 50,
    }),
  });
  const app = mountVoiceApp(repository, voiceService);

  try {
    const configRes = await fetch(`${app.baseUrl}/api/youth-development/tde/voice/config`);
    assert.equal(configRes.status, 200);
    const config = await configRes.json();
    assert.equal(config.provider_config.mode, "external_gateway");
    assert.ok(config.connectivity.status);

    const checkinRes = await fetch(`${app.baseUrl}/api/youth-development/tde/voice/checkin/${childId}`);
    assert.equal(checkinRes.status, 200);
    const checkin = await checkinRes.json();
    assert.equal(checkin.prompts.length >= 2, true);
    assert.equal(["fallback", "invalid_request", "provider_unavailable"].includes(checkin.prompts[0].chunks[0].status), true);
    assert.equal(typeof checkin.prompts[0].chunks[0].playable_text, "string");

    const sectionsRes = await fetch(`${app.baseUrl}/api/youth-development/tde/voice/sections/${childId}`);
    assert.equal(sectionsRes.status, 200);
    const sections = await sectionsRes.json();
    assert.equal(sections.sections.length, 6);
    assert.equal(["fallback", "invalid_request", "provider_unavailable"].includes(sections.sections[0].chunks[0].status), true);

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
