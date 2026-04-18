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

test("phase13 provider abstraction supports unavailable and provider-backed flows", async () => {
  const disabledAdapter = createVoiceProviderAdapter({ provider: "none" });
  const disabledSynth = await disabledAdapter.synthesize({ text: "Hello", playback_id: "p1", chunk_index: 0, section_key: "summary", voice_profile: {} });
  assert.equal(disabledSynth.ok, false);
  assert.equal(disabledSynth.error, "voice_provider_unavailable");

  const enabledAdapter = createVoiceProviderAdapter({ provider: "mock" });
  const enabledSynth = await enabledAdapter.synthesize({ text: "Hello", playback_id: "p1", chunk_index: 0, section_key: "summary", voice_profile: { age_band: "8-10" } });
  assert.equal(enabledSynth.ok, true);
  assert.equal(typeof enabledSynth.audio_ref, "string");
  assert.ok(enabledSynth.audio_ref.startsWith("voice://mock/"));
});

test("phase13 chunking enforces short, sentence-bounded chunks", () => {
  const chunks = chunkText("One. Two. Three. Four.", { max_chars: 14, max_sentences_per_chunk: 2 });
  assert.equal(chunks.length >= 2, true);
  assert.equal(chunks.every((entry) => entry.length <= 14), true);
  assert.equal(chunks[0].includes("One."), true);
});

test("phase13 child prompt playback metadata uses voice_text and one-prompt-at-a-time semantics", async () => {
  const childId = "child-phase13-a";
  const repository = { getProgramSnapshot: async () => buildSnapshot(childId) };
  const voiceService = createVoiceService({ adapter: createVoiceProviderAdapter({ provider: "none" }) });

  const payload = await voiceService.getChildCheckinPlayback(childId, repository);
  assert.equal(payload.ok, true);
  assert.equal(payload.one_prompt_at_a_time, true);
  assert.equal(payload.voice_enabled, false);
  assert.equal(payload.prompts.length >= 2, true);

  const performance = payload.prompts.find((entry) => entry.prompt_key === "performance_prompt");
  assert.ok(performance);
  assert.equal(performance.uses_voice_text_only, true);
  assert.equal(performance.age_band, "8-10");
  assert.equal(performance.chunks[0].text.includes("Read this short reflection prompt."), true);
  assert.equal(performance.chunks[0].text.includes("much longer performance"), false);
});

test("phase13 parent section playback generates independent section metadata", async () => {
  const childId = "child-phase13-b";
  const repository = { getProgramSnapshot: async () => buildSnapshot(childId) };
  const voiceService = createVoiceService({ adapter: createVoiceProviderAdapter({ provider: "mock" }) });

  const payload = await voiceService.getParentSectionPlayback(childId, repository);
  assert.equal(payload.ok, true);
  assert.equal(payload.full_report_playback_allowed, false);
  assert.equal(payload.sections.length, 6);
  assert.deepEqual(payload.sections.map((entry) => entry.section_key), ["summary", "strengths", "growth", "still_building", "environment", "next_steps"]);
  assert.equal(payload.sections.every((entry) => entry.replay_supported === true), true);
  assert.equal(payload.sections.every((entry) => entry.readable_without_voice === true), true);
  assert.equal(payload.sections.every((entry) => entry.chunk_count >= 1), true);
});

test("phase13 routes remain additive, feature-gated, and non-blocking when voice unavailable", async () => {
  process.env.TDE_EXTENSION_MODE = "on";
  const childId = "child-phase13-route";
  const repository = { getProgramSnapshot: async () => buildSnapshot(childId) };
  const voiceService = createVoiceService({ adapter: createVoiceProviderAdapter({ provider: "none" }) });
  const app = mountVoiceApp(repository, voiceService);

  try {
    const configRes = await fetch(`${app.baseUrl}/api/youth-development/tde/voice/config`);
    assert.equal(configRes.status, 200);
    const config = await configRes.json();
    assert.equal(config.voice_enabled, false);

    const checkinRes = await fetch(`${app.baseUrl}/api/youth-development/tde/voice/checkin/${childId}`);
    assert.equal(checkinRes.status, 200);
    const checkin = await checkinRes.json();
    assert.equal(checkin.voice_enabled, false);
    assert.equal(checkin.prompts.length >= 2, true);

    const sectionsRes = await fetch(`${app.baseUrl}/api/youth-development/tde/voice/sections/${childId}`);
    assert.equal(sectionsRes.status, 200);
    const sections = await sectionsRes.json();
    assert.equal(sections.sections.length, 6);

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
  }
});
