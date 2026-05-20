"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const express = require("express");
const http = require("http");
const { GATES_HABIT_BANK } = require("../../gates/gatesHabitBank");
const { createGatesRouter } = require("../../server/gatesRoutes");

const banned = ["diagnostic", "disorder", "punishment", "compliance", "grade", "lazy", "bad kid"];

test("all 10 Gates have habit markers, integration signals, and self-correction signals", () => {
  assert.equal(GATES_HABIT_BANK.length, 10);
  for (const gate of GATES_HABIT_BANK) {
    assert.ok(gate.habit_markers?.length > 0);
    assert.ok(gate.integration_signals?.length > 0);
    assert.ok(gate.self_correction_signals?.length > 0);
  }
});

test("habit bank wording avoids diagnostic/punitive framing", () => {
  const corpus = JSON.stringify(GATES_HABIT_BANK).toLowerCase();
  for (const word of banned) assert.equal(corpus.includes(word), false);
});

function pool() {
  return {
    query: async (sql, params = []) => {
      const q = String(sql);
      if (q.includes("FROM auth_sessions s") && q.includes("gates_parent_profiles")) return { rows: [{ user_id: 1, email: "parent@test.com", parent_profile_id: 1, display_name: "Parent", expires_at: new Date(Date.now() + 86400000).toISOString() }] };
      if (q.includes("SELECT id, parent_id FROM gates_child_profiles WHERE id = $1")) return { rows: [{ id: params[0], parent_id: 1 }] };
      if (q.includes("SELECT payload FROM gates_assessments")) return { rows: [{ payload: { current_growth_gate: "attention", gates_profile: { growth_gate: { gate_key: "attention" }, gate_map: [] } } }] };
      return { rows: [] };
    },
    connect: async function () { return { query: this.query, release() {} }; },
  };
}

async function start() {
  const app = express();
  app.use(express.json());
  app.use(createGatesRouter({ pool: pool() }));
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

test("API returns habit bank and child-specific habit bank prioritizes growth Gate", async () => {
  const { server, base } = await start();
  try {
    const cookie = "gates_parent_session=token";
    const hb = await fetch(`${base}/api/gates/habit-bank`, { headers: { cookie } });
    assert.equal(hb.status, 200);
    const hbJson = await hb.json();
    assert.equal(hbJson.habit_bank.length, 10);

    const childHb = await fetch(`${base}/api/gates/children/5/habit-bank`, { headers: { cookie } });
    assert.equal(childHb.status, 200);
    const childJson = await childHb.json();
    assert.equal(childJson.recommended_habits[0].gate_key, "attention");
  } finally { await new Promise((r) => server.close(r)); }
});

test("UI renders Growth Signals to Watch For and check-in shell", () => {
  const js = fs.readFileSync("public/gates.js", "utf8");
  assert.ok(js.includes("Growth Signals to Watch For"));
  assert.ok(js.includes("noticed today"));
  assert.ok(js.includes("practiced with support"));
  assert.ok(js.includes("child did independently"));
  assert.ok(js.includes("parent modeled this"));
});
