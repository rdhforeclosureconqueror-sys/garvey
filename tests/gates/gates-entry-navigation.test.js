const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");

const { createGatesRouter } = require("../../server/gatesRoutes");

function createMockPool() {
  let tenantId = 1;
  let userId = 1;
  let parentId = 1;
  const state = { tenants: [{ id: tenantId++, slug: "owner-tenant", name: "Owner" }], users: [], memberships: [], sessions: [], parents: [] };
  const nowPlus = () => new Date(Date.now() + 86400000).toISOString();
  const api = {
    state,
    connect: async () => ({ query: async (sql, params = []) => api.query(sql, params), release() {} }),
    query: async (sql, params = []) => {
      const q = String(sql);
      if (q.startsWith("BEGIN") || q.startsWith("COMMIT") || q.startsWith("ROLLBACK")) return { rows: [] };
      if (q.includes("SELECT id, slug, name FROM tenants")) return { rows: state.tenants.filter((t) => t.slug === params[0]).slice(0, 1) };
      if (q.includes("INSERT INTO tenants")) { const t = { id: tenantId++, name: params[0], slug: params[1] }; state.tenants.push(t); return { rows: [t] }; }
      if (q.includes("INSERT INTO users")) { let u = state.users.find((x) => x.tenant_id === params[1] && x.email === params[0]); if (!u) { u = { id: userId++, email: params[0], tenant_id: params[1], password_hash: params[2] }; state.users.push(u); } return { rows: [{ id: u.id, email: u.email }] }; }
      if (q.includes("INSERT INTO gates_parent_profiles")) { let p = state.parents.find((x) => x.email === params[0]); if (!p) { p = { id: parentId++, email: params[0], display_name: params[1] }; state.parents.push(p); } return { rows: [p] }; }
      if (q.includes("INSERT INTO tenant_memberships")) { state.memberships.push({ tenant_id: params[0], user_id: params[1], role: params[2] }); return { rows: [] }; }
      if (q.includes("INSERT INTO auth_sessions")) { state.sessions.push({ user_id: params[0], tenant_id: params[1], role: params[2], token_hash: params[3], expires_at: nowPlus() }); return { rows: [] }; }
      if (q.includes("FROM auth_sessions s") && q.includes("gates_parent_profiles")) {
        const s = state.sessions.find((x) => x.token_hash === params[0] && x.role === params[2]);
        if (!s) return { rows: [] };
        const u = state.users.find((x) => x.id === s.user_id);
        const p = state.parents.find((x) => x.email === u.email);
        return { rows: [{ ...s, email: u.email, parent_profile_id: p?.id, display_name: p?.display_name }] };
      }
      if (q.includes("DELETE FROM auth_sessions")) return { rows: [] };
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
  await new Promise((r) => server.listen(0, r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

test("gates entry CTAs and session navigation contract", async () => {
  const { server, base } = await startServer();
  try {
    const gatesHtml = await (await fetch(`${base}/gates`)).text();
    assert.match(gatesHtml, /data-gates-cta="start"/);
    assert.match(gatesHtml, /data-gates-cta="signin"/);
    assert.match(gatesHtml, /data-gates-cta="gamehub"/);
    assert.match(gatesHtml, /href="\/gamehub\/index\.html"/);
    assert.equal(gatesHtml.includes('href="/gates"'), false);

    const signupShellHtml = await (await fetch(`${base}/gates/signup`)).text();
    assert.match(signupShellHtml, /data-gates-app/);

    const fs = require('node:fs');
    const path = require('node:path');
    const clientBundle = fs.readFileSync(path.join(process.cwd(), 'public', 'gates.js'), 'utf8');
    assert.match(clientBundle, /Parent account access/);
    assert.match(clientBundle, /Create Parent Account/);
    assert.match(clientBundle, /Parent Sign In/);
    assert.match(clientBundle, /getRegistryLaunchableGames/);
    assert.match(clientBundle, /renderGameHubPracticeSection/);
    assert.match(clientBundle, /child_profile_hint=/);
    assert.match(clientBundle, /These games are optional developmental practices\. They are not tests, grades, or diagnoses\./);
    assert.match(clientBundle, /const primaryHref = state\.session\?\.authenticated \? '\/gates\/children' : '\/gates\/signup';/);
    assert.equal(clientBundle.includes("if (p === '/gates/dashboard') return renderChildren();"), false);

    const anonSessionJson = await (await fetch(`${base}/api/gates/auth/session`)).json();
    assert.equal(anonSessionJson.authenticated, false);
    assert.equal(anonSessionJson.next_route, "/gates/signup");

    const signup = await fetch(`${base}/api/gates/auth/signup`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ parent_name: "Parent", email: "parent@example.com", password: "password1" }) });
    const signupJson = await signup.json();
    assert.equal(signupJson.next_route, "/gates/children");

    const authSessionJson = await (await fetch(`${base}/api/gates/auth/session`, { headers: { cookie: signup.headers.get("set-cookie") } })).json();
    assert.equal(authSessionJson.authenticated, true);
    assert.equal(authSessionJson.next_route, "/gates/children");
  } finally {
    await new Promise((r) => server.close(r));
  }
});
