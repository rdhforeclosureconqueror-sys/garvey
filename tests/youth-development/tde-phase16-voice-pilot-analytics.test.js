const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { createVoiceService } = require("../../youth-development/tde/voiceService");
const { createVoiceProviderAdapter } = require("../../youth-development/tde/voiceProviderAdapter");
const { createVoiceAnalyticsService } = require("../../youth-development/tde/voiceAnalyticsService");
const { createVoicePilotService } = require("../../youth-development/tde/voicePilotService");
const { registerVoiceReadableContentBlock, registerVoiceReadableContentBlocks } = require("../../youth-development/tde/voiceContentRegistry");
const { buildRolloutBridge } = require("../../youth-development/tde/readinessRolloutService");
const { createYouthDevelopmentTdeRouter } = require("../../server/youthDevelopmentTdeRoutes");
const { createYouthDevelopmentRouter } = require("../../server/youthDevelopmentRoutes");
const { createYouthDevelopmentIntakeRouter } = require("../../server/youthDevelopmentIntakeRoutes");
const { generateDevelopmentCheckin } = require("../../youth-development/tde/developmentCheckinService");

function buildSnapshot(childId) {
  const checkin = generateDevelopmentCheckin({ child_id: childId, program_week: 10, age_band: "11-13" });
  return {
    enrollment: { child_id: childId, current_week: 10, current_trait_targets: ["SR"], current_environment_targets: ["home_routine"] },
    progress_records: [{ week_number: 10, completion_status: "complete", checkpoint_record: null }],
    observer_consents: [{ consent_status: "granted" }],
    environment_hooks: [{}],
    intervention_sessions: [],
    commitment_plan: null,
    development_checkins: [{ ...checkin, completed_at: "2026-04-18T10:00:00.000Z" }],
  };
}

function mountGatewayApp({ unavailable = false, malformed = false } = {}) {
  const app = express();
  app.use(express.json());
  app.get("/internal/voice/health", (_req, res) => {
    if (unavailable) return res.status(503).json({ status: "down" });
    return res.status(200).json({ ok: true, status: "healthy" });
  });
  app.post("/internal/voice/checkin-prompt", (req, res) => {
    if (unavailable) return res.status(503).json({ error: "gateway_down" });
    if (malformed) return res.status(200).json({ status: "ready", provider: "openai-via-gateway", playable_text: req.body.voice_text });
    return res.status(200).json({ status: "ready", provider: "openai-via-gateway", audio_url: `https://audio.example/${req.body.voice_chunk_id}`, playable_text: req.body.voice_text, replay_token: `replay_${req.body.voice_chunk_id}` });
  });
  app.post("/internal/voice/report-section", (req, res) => {
    if (unavailable) return res.status(503).json({ error: "gateway_down" });
    return res.status(200).json({ status: "ready", provider: "openai-via-gateway", asset_ref: `asset://${req.body.voice_chunk_id}`, playable_text: req.body.voice_text, replay_token: `replay_${req.body.voice_chunk_id}` });
  });
  const server = app.listen(0);
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function mountApp(repository, voiceService) {
  const app = express();
  app.use(express.json());
  app.use("/api/youth-development/tde", createYouthDevelopmentTdeRouter({ repository, voiceService }));
  app.use("/api/youth-development/intake", createYouthDevelopmentIntakeRouter());
  app.use(createYouthDevelopmentRouter());
  const server = app.listen(0);
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("phase16 analytics records voice events and remains non-blocking", async () => {
  const childId = "child-phase16-analytics";
  const repository = { getProgramSnapshot: async () => buildSnapshot(childId) };
  const gateway = mountGatewayApp({ malformed: true });
  const analytics = createVoiceAnalyticsService();
  const voiceService = createVoiceService({
    adapter: createVoiceProviderAdapter({ gateway_base_url: gateway.baseUrl, gateway_timeout_ms: 400 }),
    analytics,
  });

  try {
    await voiceService.getChildCheckinPlayback(childId, repository);
    await voiceService.getParentSectionPlayback(childId, repository);
    const summary = voiceService.getVoiceAnalyticsSummary({ child_id: childId });
    assert.equal(summary.ok, true);
    assert.ok(summary.totals.child_checkin_playback_requested >= 1);
    assert.ok(summary.totals.parent_section_playback_requested >= 1);
    assert.ok(summary.totals.fallback_used >= 1);
    assert.ok(summary.totals.malformed_gateway_downgrade_used >= 1);
  } finally {
    await gateway.close();
  }
});

test("phase16 pilot visibility decision supports enabled/hidden/fallback/preview", () => {
  const pilot = createVoicePilotService();
  assert.equal(pilot.evaluateVisibility({ rollout_mode: "enabled", gateway_status: "connected", age_band: "11-13", voice_ready_content_present: true }).playback_mode, "enabled");
  assert.equal(pilot.evaluateVisibility({ rollout_mode: "hidden", gateway_status: "connected", age_band: "11-13", voice_ready_content_present: true }).voice_shown, false);
  assert.equal(pilot.evaluateVisibility({ rollout_mode: "fallback_only", gateway_status: "connected", age_band: "11-13", voice_ready_content_present: true }).playback_mode, "fallback_only");
  assert.equal(pilot.evaluateVisibility({ rollout_mode: "preview_only", preview_mode: true, gateway_status: "connected", age_band: "11-13", voice_ready_content_present: true }).playback_mode, "preview_only");
});

test("phase16 rollout bridge carries voice rollout integration without making voice required", () => {
  const ready = { readiness_status: "ready", reasons: [] };
  const bridge = buildRolloutBridge(ready, { voice_rollout_mode: "fallback_only" });
  assert.equal(bridge.voice_rollout.mode, "fallback_only");
  assert.equal(bridge.voice_rollout.voice_required, false);
});

test("phase16 fallback-only mode returns visibility as fallback_only when gateway unavailable", async () => {
  const childId = "child-phase16-fallback";
  const repository = { getProgramSnapshot: async () => buildSnapshot(childId) };
  const gateway = mountGatewayApp({ unavailable: true });
  const voiceService = createVoiceService({ adapter: createVoiceProviderAdapter({ gateway_base_url: gateway.baseUrl, gateway_timeout_ms: 400 }) });
  process.env.TDE_VOICE_ROLLOUT_MODE = "fallback_only";

  try {
    const payload = await voiceService.getChildCheckinPlayback(childId, repository);
    assert.equal(payload.voice_visibility.playback_mode, "fallback_only");
    assert.equal(payload.voice_state.checkin_prompt_ready_for_playback, false);
  } finally {
    delete process.env.TDE_VOICE_ROLLOUT_MODE;
    await gateway.close();
  }
});

test("phase16 registration hook provides reusable readable-content schema", () => {
  const block = registerVoiceReadableContentBlock({ section_key: "summary", text_content: "Hello", voice_ready: true, voice_text: "Hello" }, { child_id: "child-a", scope: "parent_report_section" });
  assert.equal(block.registration_status, "registered");
  assert.equal(typeof block.voice_chunk_id, "string");

  const batch = registerVoiceReadableContentBlocks([{ section_key: "growth", text_content: "Grow", voice_ready: true, voice_text: "Grow" }], { child_id: "child-a" });
  assert.equal(batch.voice_ready_content_present, true);
  assert.equal(batch.voice_ready_content_count, 1);
});

test("phase16 additive routes include analytics/pilot/eligibility and live youth v1 remains non-regressed", async () => {
  process.env.TDE_EXTENSION_MODE = "on";
  const childId = "child-phase16-routes";
  const repository = { getProgramSnapshot: async () => buildSnapshot(childId) };
  const gateway = mountGatewayApp();
  const voiceService = createVoiceService({ adapter: createVoiceProviderAdapter({ gateway_base_url: gateway.baseUrl, gateway_timeout_ms: 400 }) });
  const app = mountApp(repository, voiceService);

  try {
    const analyticsRes = await fetch(`${app.baseUrl}/api/youth-development/tde/voice/analytics/summary`);
    assert.equal(analyticsRes.status, 200);

    const pilotRes = await fetch(`${app.baseUrl}/api/youth-development/tde/voice/pilot-status/${childId}`);
    assert.equal(pilotRes.status, 200);

    const eligibilityRes = await fetch(`${app.baseUrl}/api/youth-development/tde/voice/eligibility/${childId}`);
    assert.equal(eligibilityRes.status, 200);

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
    await gateway.close();
  }
});
