const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs");

const { createYouthDevelopmentTdeRouter } = require("../../server/youthDevelopmentTdeRoutes");
const { createYouthDevelopmentIntakeRouter } = require("../../server/youthDevelopmentIntakeRoutes");
const { createYouthDevelopmentRouter } = require("../../server/youthDevelopmentRoutes");

function mountApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/youth-development/tde", createYouthDevelopmentTdeRouter());
  app.use("/api/youth-development/intake", createYouthDevelopmentIntakeRouter());
  app.use(createYouthDevelopmentRouter());
  const server = app.listen(0);
  const port = server.address().port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  return { response, payload: await response.json() };
}

test("phase25 normalized additive display contracts are present across operator payload endpoints", async () => {
  process.env.TDE_EXTENSION_MODE = "on";
  const app = mountApp();
  try {
    const endpoints = [
      "/api/youth-development/tde/recommendations/child-phase25",
      "/api/youth-development/tde/insights/child-phase25",
      "/api/youth-development/tde/checkin-summary/child-phase25",
      "/api/youth-development/tde/recommendations/child-phase25/explanation",
      "/api/youth-development/tde/voice/checkin/child-phase25",
      "/api/youth-development/tde/voice/sections/child-phase25",
      "/api/youth-development/tde/voice/status/child-phase25",
      "/api/youth-development/tde/voice/eligibility/child-phase25",
    ];

    for (const endpoint of endpoints) {
      const { response, payload } = await fetchJson(`${app.baseUrl}${endpoint}`);
      assert.equal(response.status, 200, endpoint);
      assert.ok("display_title" in payload, `${endpoint} missing display_title`);
      assert.ok("display_label" in payload, `${endpoint} missing display_label`);
      assert.ok("display_status" in payload, `${endpoint} missing display_status`);
      assert.ok("display_summary" in payload, `${endpoint} missing display_summary`);
      assert.ok(Array.isArray(payload.display_items), `${endpoint} missing display_items[]`);
    }
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});

test("phase25 normalized fields are additive and legacy/raw payload paths remain available", async () => {
  process.env.TDE_EXTENSION_MODE = "on";
  const app = mountApp();
  try {
    const rec = await fetchJson(`${app.baseUrl}/api/youth-development/tde/recommendations/child-phase25`);
    assert.equal(rec.response.status, 200);
    assert.ok(Array.isArray(rec.payload.recommendations));
    assert.ok("recommendation_engine" in rec.payload);

    const insights = await fetchJson(`${app.baseUrl}/api/youth-development/tde/insights/child-phase25`);
    assert.equal(insights.response.status, 200);
    assert.ok(Array.isArray(insights.payload.pillar_insights));
    assert.ok(Array.isArray(insights.payload.insights));
    assert.ok("cross_source_insight_summary" in insights.payload);

    const explanation = await fetchJson(`${app.baseUrl}/api/youth-development/tde/recommendations/child-phase25/explanation`);
    assert.equal(explanation.response.status, 200);
    assert.ok(Array.isArray(explanation.payload.recommendation_deltas));
    assert.ok(Array.isArray(explanation.payload.explanations));
    assert.ok("modifiers_applied" in explanation.payload);
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});

test("phase25 operator dashboard rendering now reads normalized display contracts", () => {
  const source = fs.readFileSync("dashboardnew/app.js", "utf8");
  assert.match(source, /display_items/);
  assert.match(source, /display_title/);
  assert.match(source, /display_status/);
  assert.match(source, /content_registry_status/);
  assert.match(source, /readability_status/);
  assert.match(source, /voice_readiness_status/);
});

test("phase25 does not regress live youth v1 routes", async () => {
  const app = mountApp();
  try {
    const intake = await fetchJson(`${app.baseUrl}/api/youth-development/intake/contracts/trait-mapping`);
    assert.equal(intake.response.status, 200);
    assert.equal(intake.payload.ok, true);

    const assessResponse = await fetch(`${app.baseUrl}/api/youth-development/assess`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: [] }),
    });
    const assess = await assessResponse.json();
    assert.equal(assessResponse.status, 200);
    assert.equal(assess.ok, true);
  } finally {
    await app.close();
  }
});

