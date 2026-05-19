const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const path = require("path");
const http = require("http");

const { createGatesRouter } = require("../../server/gatesRoutes");
const { GATES_CATALOG } = require("../../gates/gatesCatalog");

async function startServer() {
  const app = express();
  app.use(express.static(path.join(__dirname, "..", "..", "public")));
  app.use(createGatesRouter());
  app.get("/health", (req, res) => res.json({ status: "ok" }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

test("gates route shell mounts safely", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const gatesHealth = await fetch(`${baseUrl}/api/gates/health`);
    assert.equal(gatesHealth.status, 200);
    assert.equal((await gatesHealth.json()).ok, true);

    const gatesPage = await fetch(`${baseUrl}/gates`);
    assert.equal(gatesPage.status, 200);
    const gatesHtml = await gatesPage.text();
    assert.match(gatesHtml, /The Gates/);
    for (const gateName of GATES_CATALOG) assert.match(gatesHtml, new RegExp(gateName));
    assert.match(gatesHtml, /Non-diagnostic disclaimer/i);

    const coreHealth = await fetch(`${baseUrl}/health`);
    assert.equal(coreHealth.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
