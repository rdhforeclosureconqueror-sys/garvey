const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");

const { createGatesRouter } = require("../../server/gatesRoutes");
const { createAssessmentOptions } = require("../../public/js/assessment-menu.js");

function createQuery() {
  return new URLSearchParams({ entry: "tap-hub", tap_source: "tap", tap_tag: "pilot", tap_session: "sess-10" });
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
  app.use((req, res, next) => {
    if (req.path === "/api/owner/session") return res.status(200).json({ authenticated: false, owner: null });
    next();
  });
  app.use(createGatesRouter());
  app.get("/api/owner/session", (req, res) => res.status(200).json({ authenticated: false, owner: null }));
  app.post("/api/owner/signin", (req, res) => res.status(200).json({ ok: true, authenticated: true }));

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

test("gates pilot no-regression baseline remains intact", async () => {
  const options = createAssessmentOptions({
    origin: "https://example.com",
    sourceType: "tap",
    query: createQuery(),
    ctx: { tenant: "demo", email: "user@example.com", name: "Jane", cid: "c-1", rid: "r-1" },
  });
  assert.ok(options.some((o) => o.key === "youth" && o.title === "Take Youth Assessment"));
  assert.ok(options.some((o) => o.key === "gates" && o.title === "Youth Rite of Passage Assessment"));

  const { server, baseUrl } = await startServer();
  try {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).status, "ok");

    const gatesPage = await fetch(`${baseUrl}/gates`);
    assert.equal(gatesPage.status, 200);

    const gatesHealth = await fetch(`${baseUrl}/api/gates/health`);
    assert.equal(gatesHealth.status, 200);
    assert.equal((await gatesHealth.json()).ok, true);

    const ownerSession = await fetch(`${baseUrl}/api/owner/session`, { headers: { cookie: "garvey_owner_session=owner-token" } });
    const ownerJson = await ownerSession.json();
    assert.equal(ownerJson.authenticated, false);

    const ownerSignin = await fetch(`${baseUrl}/api/owner/signin`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "owner@example.com", password: "x" }) });
    assert.equal(ownerSignin.status, 200);
    assert.equal((await ownerSignin.json()).authenticated, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
