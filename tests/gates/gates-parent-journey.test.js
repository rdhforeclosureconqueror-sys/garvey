const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");

const { createGatesRouter } = require("../../server/gatesRoutes");
const { QUESTIONS } = require("../../gates/gatesAssessmentQuestions");

function createMockPool() {
  let tenantId = 1;
  let userId = 1;
  let parentId = 1;
  let childId = 1;
  let assessmentId = 1;

  const state = {
    tenants: [{ id: tenantId++, slug: "the-gates", name: "The Gates" }],
    users: [], memberships: [], sessions: [], parents: [], children: [], assessments: [], progress: [], practiceLogs: [],
  };

  const nowPlus = () => new Date(Date.now() + 86400000).toISOString();
  const api = {
    state,
    connect: async () => ({ query: async (sql, p = []) => api.query(sql, p), release() {} }),
    query: async (sql, params = []) => {
      const q = String(sql);
      if (q.startsWith("BEGIN") || q.startsWith("COMMIT") || q.startsWith("ROLLBACK")) return { rows: [] };
      if (q.includes("SELECT id, slug, name FROM tenants")) return { rows: state.tenants.filter((t) => t.slug === params[0]).slice(0, 1) };
      if (q.includes("INSERT INTO users")) {
        let u = state.users.find((x) => x.tenant_id === params[1] && x.email === params[0]);
        if (!u) {
          u = { id: userId++, email: params[0], tenant_id: params[1], password_hash: params[2], created_at: new Date().toISOString() };
          state.users.push(u);
        }
        return { rows: [{ id: u.id, email: u.email }] };
      }
      if (q.includes("INSERT INTO gates_parent_profiles")) {
        let p = state.parents.find((x) => x.email.toLowerCase() === String(params[0]).toLowerCase());
        if (!p) {
          p = { id: parentId++, email: params[0], display_name: params[1] };
          state.parents.push(p);
        }
        return { rows: [p] };
      }
      if (q.includes("INSERT INTO tenant_memberships")) { state.memberships.push({ tenant_id: params[0], user_id: params[1], role: params[2] }); return { rows: [] }; }
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
        const m = state.memberships.find((x) => x.user_id === u.id && x.tenant_id === tenant.id && x.role === params[1]);
        if (!m) return { rows: [] };
        const p = state.parents.find((x) => x.email === u.email);
        return { rows: [{ user_id: u.id, email: u.email, password_hash: u.password_hash, tenant_id: tenant.id, parent_profile_id: p.id, display_name: p.display_name }] };
      }
      if (q.includes("INSERT INTO gates_child_profiles")) { const c = { id: childId++, parent_id: Number(params[0]), first_name: String(params[1]), created_at: new Date().toISOString() }; state.children.push(c); return { rows: [{ id: c.id, first_name: c.first_name }] }; }
      if (q.includes("SELECT id, first_name FROM gates_child_profiles")) { const rows = state.children.filter((c) => c.parent_id === params[0]).map((c) => ({ id: c.id, first_name: c.first_name })); return { rows }; }
      if (q.includes("SELECT id, parent_id FROM gates_child_profiles WHERE id = $1")) { const c = state.children.find((x) => String(x.id) === String(params[0])); return { rows: c ? [{ id: c.id, parent_id: c.parent_id }] : [] }; }
      if (q.includes("SELECT id, parent_id, first_name FROM gates_child_profiles")) { const c = state.children.find((x) => String(x.id) === String(params[0])); return { rows: c ? [{ id: c.id, parent_id: c.parent_id, first_name: c.first_name }] : [] }; }
      if (q.includes("INSERT INTO gates_assessments")) { state.assessments.push({ id: assessmentId++, parent_id: params[0], child_id: String(params[1]), payload: JSON.parse(params[3]), created_at: new Date().toISOString() }); return { rows: [] }; }
      if (q.includes("SELECT id, payload, created_at FROM gates_assessments")) {
        const rows = state.assessments.filter((a) => a.parent_id === params[0] && String(a.child_id) === String(params[1]));
        rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return { rows: rows.slice(0, 1) };
      }
      if (q.includes("SELECT id FROM gates_progress")) { const r = state.progress.find((x) => x.parent_id === params[0] && String(x.child_id) === String(params[1]) && x.progress_key === params[2]); return { rows: r ? [{ id: r.id }] : [] }; }
      if (q.includes("INSERT INTO gates_progress")) { state.progress.push({ id: state.progress.length + 1, parent_id: params[0], child_id: String(params[1]), progress_key: params[2], progress_value: JSON.parse(params[3]), updated_at: new Date().toISOString() }); return { rows: [] }; }
      if (q.includes("UPDATE gates_progress SET")) { const r = state.progress.find((x) => x.id === params[1]); if (r) { r.progress_value = JSON.parse(params[0]); r.updated_at = new Date().toISOString(); } return { rows: [] }; }
      if (q.includes("SELECT progress_key, progress_value, updated_at FROM gates_progress")) { return { rows: state.progress.filter((r) => r.parent_id === params[0] && String(r.child_id) === String(params[1])) }; }
      if (q.includes("INSERT INTO gates_practice_logs")) { state.practiceLogs.push({ id: state.practiceLogs.length + 1, parent_id: params[0], child_id: String(params[1]), gate_key: params[2], payload: JSON.parse(params[3]) }); return { rows: [] }; }
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
  return { pool, server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

test("gates parent pilot journey end-to-end persistence", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const signup = await fetch(`${baseUrl}/api/gates/auth/signup`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ parent_name: "Parent One", email: "parent1@example.com", password: "secure-password" }) });
    assert.equal(signup.status, 201);

    const signin = await fetch(`${baseUrl}/api/gates/auth/signin`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "parent1@example.com", password: "secure-password" }) });
    assert.equal(signin.status, 200);
    const sessionCookie = signin.headers.get("set-cookie");

    const session = await fetch(`${baseUrl}/api/gates/auth/session`, { headers: { cookie: sessionCookie } });
    assert.equal((await session.json()).authenticated, true);

    const childCreate = await fetch(`${baseUrl}/api/gates/children`, { method: "POST", headers: { "content-type": "application/json", cookie: sessionCookie }, body: JSON.stringify({ child_name: "Luna Ray", child_age_band: "4-6", child_grade_band: "Pre-K", metadata: { interests: ["music"] } }) });
    assert.equal(childCreate.status, 201);
    const childId = (await childCreate.json()).child_profile.child_id;

    const questions = await fetch(`${baseUrl}/api/gates/assessment/questions`, { headers: { cookie: sessionCookie } });
    assert.equal(questions.status, 200);
    const questionsJson = await questions.json();
    assert.equal(Array.isArray(questionsJson.questions), true);

    const answers = QUESTIONS.map((q) => ({ question_id: q.question_id, value: "often" }));
    const submit = await fetch(`${baseUrl}/api/gates/assessment/submit`, { method: "POST", headers: { "content-type": "application/json", cookie: sessionCookie }, body: JSON.stringify({ child_id: childId, assessment_version: "gates_parent_observation_v1", answers }) });
    assert.equal(submit.status, 201);
    const submitJson = await submit.json();
    assert.ok(submitJson.gates_profile);

    const recommendations = await fetch(`${baseUrl}/api/gates/children/${childId}/recommendations`, { headers: { cookie: sessionCookie } });
    assert.equal(recommendations.status, 200);
    const recJson = await recommendations.json();
    assert.equal(Array.isArray(recJson.recommendations), true);

    const progressUpdate = await fetch(`${baseUrl}/api/gates/children/${childId}/progress`, { method: "POST", headers: { "content-type": "application/json", cookie: sessionCookie }, body: JSON.stringify({ gate_number: 1, status: "practicing", progress_percent: 55, parent_note: "Steady routine.", observed_response: "Improved transitions." }) });
    assert.equal(progressUpdate.status, 200);

    const signout = await fetch(`${baseUrl}/api/gates/auth/signout`, { method: "POST", headers: { cookie: sessionCookie } });
    assert.equal(signout.status, 200);

    const signinAgain = await fetch(`${baseUrl}/api/gates/auth/signin`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "parent1@example.com", password: "secure-password" }) });
    assert.equal(signinAgain.status, 200);
    const cookieAgain = signinAgain.headers.get("set-cookie");

    const childList = await fetch(`${baseUrl}/api/gates/children`, { headers: { cookie: cookieAgain } });
    const childListJson = await childList.json();
    assert.equal(childListJson.children.length, 1);

    const profile = await fetch(`${baseUrl}/api/gates/children/${childId}/profile`, { headers: { cookie: cookieAgain } });
    const profileJson = await profile.json();
    assert.ok(profileJson.latest_gates_profile);

    const progress = await fetch(`${baseUrl}/api/gates/children/${childId}/progress`, { headers: { cookie: cookieAgain } });
    const progressJson = await progress.json();
    assert.ok(progressJson.progress.some((row) => row.gate_number === 1 && row.status === "practicing" && row.progress_percent === 55));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
