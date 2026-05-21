const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");

const { createGatesRouter } = require("../../server/gatesRoutes");

function createMockPool() {
  let tenantId = 1;
  let userId = 1;
  let parentId = 1;
  let childId = 1;

  const state = {
    tenants: [{ id: tenantId++, slug: "the-gates", name: "The Gates" }],
    users: [], memberships: [], sessions: [], parents: [], children: [],
  };

  const nowPlus = () => new Date(Date.now() + 86400000).toISOString();
  const api = {
    connect: async () => ({ query: async (sql, p = []) => api.query(sql, p), release() {} }),
    query: async (sql, params = []) => {
      const q = String(sql);
      if (q.startsWith("BEGIN") || q.startsWith("COMMIT") || q.startsWith("ROLLBACK")) return { rows: [] };
      if (q.includes("SELECT id, slug, name FROM tenants")) return { rows: state.tenants.filter((t) => t.slug === params[0]).slice(0, 1) };
      if (q.includes("INSERT INTO users")) {
        let u = state.users.find((x) => x.tenant_id === params[1] && x.email === params[0]);
        if (!u) { u = { id: userId++, email: params[0], tenant_id: params[1], password_hash: params[2] }; state.users.push(u); }
        return { rows: [{ id: u.id, email: u.email }] };
      }
      if (q.includes("INSERT INTO gates_parent_profiles")) {
        let p = state.parents.find((x) => x.email.toLowerCase() === String(params[0]).toLowerCase());
        if (!p) { p = { id: parentId++, email: params[0], display_name: params[1] }; state.parents.push(p); }
        return { rows: [p] };
      }
      if (q.includes("INSERT INTO tenant_memberships")) return { rows: [] };
      if (q.includes("INSERT INTO auth_sessions")) { state.sessions.push({ user_id: params[0], tenant_id: params[1], role: params[2], token_hash: params[3], expires_at: nowPlus() }); return { rows: [] }; }
      if (q.includes("DELETE FROM auth_sessions")) { state.sessions = state.sessions.filter((s) => s.token_hash !== params[0]); return { rows: [] }; }
      if (q.includes("FROM auth_sessions s") && q.includes("gates_parent_profiles")) {
        const s = state.sessions.find((x) => x.token_hash === params[0] && x.role === params[2]);
        if (!s) return { rows: [] };
        const tenant = state.tenants.find((t) => t.id === s.tenant_id && t.slug === params[1]);
        if (!tenant) return { rows: [] };
        const u = state.users.find((x) => x.id === s.user_id);
        const p = state.parents.find((x) => x.email === u.email);
        return { rows: [{ ...s, email: u.email, parent_profile_id: p?.id, display_name: p?.display_name }] };
      }
      if (q.includes("WHERE LOWER(COALESCE(u.email")) {
        const tenant = state.tenants.find((t) => t.slug === params[2]);
        const u = state.users.find((x) => x.email === params[0]);
        if (!tenant || !u) return { rows: [] };
        return { rows: [{ user_id: u.id, email: u.email, password_hash: u.password_hash, tenant_id: tenant.id, parent_profile_id: 1, display_name: "Parent" }] };
      }
      if (q.includes("INSERT INTO gates_child_profiles")) { const c = { id: childId++, parent_id: Number(params[0]), first_name: String(params[1]) }; state.children.push(c); return { rows: [{ id: c.id, first_name: c.first_name }] }; }
      if (q.includes("SELECT id, parent_id, first_name FROM gates_child_profiles")) { const c = state.children.find((x) => String(x.id) === String(params[0])); return { rows: c ? [c] : [] }; }
      return { rows: [] };
    },
  };

  return api;
}

async function startServer() {
  const pool = createMockPool();
  const app = express();
  app.use(express.json());
  app.use(createGatesRouter({ pool }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function signupAndCookie(baseUrl, email) {
  await fetch(`${baseUrl}/api/gates/auth/signup`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ parent_name: "Parent", email, password: "secure-password" }) });
  const signin = await fetch(`${baseUrl}/api/gates/auth/signin`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: "secure-password" }) });
  return signin.headers.get("set-cookie");
}

test("gates child reflection prototype route shell and safeguards", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const shell = await fetch(`${baseUrl}/gates/child/1/reflection/2`);
    assert.equal(shell.status, 200);

    const unauth = await fetch(`${baseUrl}/api/gates/children/1/reflection/2/prototype`);
    assert.equal(unauth.status, 401);

    const cookie1 = await signupAndCookie(baseUrl, "parent1@example.com");
    const childCreate = await fetch(`${baseUrl}/api/gates/children`, { method: "POST", headers: { "content-type": "application/json", cookie: cookie1 }, body: JSON.stringify({ child_name: "Sky", child_age_band: "7-9", child_grade_band: "2-3", metadata: { source: "test" } }) });
    const childId = (await childCreate.json()).child_profile.child_id;

    const reflection = await fetch(`${baseUrl}/api/gates/children/${childId}/reflection/2/prototype`, { headers: { cookie: cookie1 } });
    assert.equal(reflection.status, 200);
    const reflectionJson = await reflection.json();
    assert.equal(reflectionJson.world_name, "Valley of Weather");
    assert.deepEqual(reflectionJson.symbols, ["storm", "fog", "rain", "wind", "sunshine"]);
    const reflectionBlob = JSON.stringify(reflectionJson).toLowerCase();
    assert.equal(reflectionBlob.includes("score"), false);
    assert.equal(reflectionBlob.includes("correct"), false);
    assert.equal(reflectionBlob.includes("incorrect"), false);

    const invalidGate = await fetch(`${baseUrl}/api/gates/children/${childId}/reflection/11/prototype`, { headers: { cookie: cookie1 } });
    assert.equal(invalidGate.status, 404);

    const missingGatePrototype = await fetch(`${baseUrl}/api/gates/children/${childId}/reflection/1/prototype`, { headers: { cookie: cookie1 } });
    assert.equal(missingGatePrototype.status, 404);

    const cookie2 = await signupAndCookie(baseUrl, "parent2@example.com");
    const forbidden = await fetch(`${baseUrl}/api/gates/children/${childId}/reflection/2/prototype`, { headers: { cookie: cookie2 } });
    assert.equal(forbidden.status, 403);

    const missingChild = await fetch(`${baseUrl}/api/gates/children/999/reflection/2/prototype`, { headers: { cookie: cookie1 } });
    assert.equal(missingChild.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
