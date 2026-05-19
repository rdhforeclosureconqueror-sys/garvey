const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");

const { createGatesRouter } = require("../../server/gatesRoutes");

function createMockPool() {
  let tenantId = 1; let userId = 1; let parentId = 1;
  const state = { tenants:[{ id: tenantId++, slug:"the-gates", name:"The Gates" }], users:[], memberships:[], sessions:[], parents:[] };
  const nowPlus = () => new Date(Date.now() + 86400000).toISOString();
  const api = { state, connect: async()=>({ query: async (sql, p=[]) => api.query(sql, p), release(){} }), query: async (sql, params=[]) => {
    const q = String(sql);
    if (q.startsWith("BEGIN") || q.startsWith("COMMIT") || q.startsWith("ROLLBACK")) return { rows: [] };
    if (q.includes("SELECT id, slug, name FROM tenants")) return { rows: state.tenants.filter(t=>t.slug===params[0]).slice(0,1) };
    if (q.includes("INSERT INTO users")) { let u=state.users.find(x=>x.tenant_id===params[1]&&x.email===params[0]); if(!u){u={id:userId++,email:params[0],tenant_id:params[1],password_hash:params[2]}; state.users.push(u);} else u.password_hash=params[2]; return {rows:[{id:u.id,email:u.email}]}; }
    if (q.includes("INSERT INTO gates_parent_profiles")) { let p=state.parents.find(x=>x.email.toLowerCase()===params[0].toLowerCase()); if(!p){p={id:parentId++,email:params[0],display_name:params[1]}; state.parents.push(p);} else p.display_name=params[1]; return {rows:[p]}; }
    if (q.includes("INSERT INTO tenant_memberships")) { state.memberships.push({tenant_id:params[0],user_id:params[1],role:params[2]}); return {rows:[]}; }
    if (q.includes("INSERT INTO auth_sessions")) { state.sessions.push({user_id:params[0],tenant_id:params[1],role:params[2],token_hash:params[3],expires_at:nowPlus()}); return {rows:[]}; }
    if (q.includes("FROM auth_sessions s") && q.includes("gates_parent_profiles")) {
      const s = state.sessions.find(x=>x.token_hash===params[0] && x.role===params[2]); if(!s) return {rows:[]};
      const u = state.users.find(x=>x.id===s.user_id); const p = state.parents.find(x=>x.email===u.email);
      return { rows: [{...s, email:u.email, parent_profile_id:p?.id, display_name:p?.display_name }] };
    }
    if (q.includes("WHERE LOWER(COALESCE(u.email")) {
      const email=params[0], role=params[1], slug=params[2]; const tenant=state.tenants.find(t=>t.slug===slug); if(!tenant) return {rows:[]};
      const rows=state.users.filter(u=>u.email===email).flatMap(u=>state.memberships.filter(m=>m.user_id===u.id&&m.role===role&&m.tenant_id===tenant.id).map(()=>({user_id:u.id,email:u.email,password_hash:u.password_hash,tenant_id:tenant.id,parent_profile_id:(state.parents.find(p=>p.email===u.email)||{}).id,display_name:(state.parents.find(p=>p.email===u.email)||{}).display_name})));
      return {rows};
    }
    if (q.includes("DELETE FROM auth_sessions")) { state.sessions = state.sessions.filter(s=>s.token_hash!==params[0]); return {rows:[]}; }
    return { rows: [] };
  }};
  return api;
}

async function startServer() {
  const pool = createMockPool();
  const app = express();
  app.use(express.json());
  app.use((req,res,next)=>{ if(req.path==='/api/owner/session') return res.json({authenticated:false}); next(); });
  app.use(createGatesRouter({ pool }));
  app.get('/api/owner/session',(req,res)=>res.json({authenticated:false}));
  const server = http.createServer(app);
  await new Promise((resolve)=>server.listen(0, resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

test("gates assessment questions loading", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const unauth = await fetch(`${baseUrl}/api/gates/assessment/questions`);
    assert.equal(unauth.status, 401);

    const signupRes = await fetch(`${baseUrl}/api/gates/auth/signup`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ parent_name:"Parent A", email:"parent@example.com", password:"secure-password" }) });
    assert.equal(signupRes.status, 201);

    const authRes = await fetch(`${baseUrl}/api/gates/assessment/questions`, { headers:{ cookie: signupRes.headers.get("set-cookie") } });
    assert.equal(authRes.status, 200);
    const payload = await authRes.json();

    assert.equal(payload.ok, true);
    assert.equal(payload.assessment_version, "gates_parent_observation_v1");
    assert.equal(payload.gates.length, 10);
    assert.ok(Array.isArray(payload.questions));
    assert.ok(payload.questions.length >= 20);
    assert.ok(typeof payload.non_diagnostic_disclaimer === "string" && payload.non_diagnostic_disclaimer.length > 0);

    const instructions = String(payload.instructions || "").toLowerCase();
    assert.equal(instructions.includes("diagnostic"), false);
    assert.equal(instructions.includes("clinical"), false);

    const gateNumbers = new Set(payload.gates.map((gate) => gate.gate_number));
    const questionIds = new Set();
    const perGateCount = new Map();

    for (const question of payload.questions) {
      assert.equal(questionIds.has(question.question_id), false);
      questionIds.add(question.question_id);
      assert.equal(gateNumbers.has(question.gate_number), true);
      perGateCount.set(question.gate_number, (perGateCount.get(question.gate_number) || 0) + 1);
    }

    for (const gate of payload.gates) {
      assert.ok((perGateCount.get(gate.gate_number) || 0) >= 2);
    }

    const ownerSession = await fetch(`${baseUrl}/api/owner/session`);
    assert.equal((await ownerSession.json()).authenticated, false);
  } finally {
    await new Promise((resolve)=>server.close(resolve));
  }
});
