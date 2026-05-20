const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");

const { createGatesRouter } = require("../../server/gatesRoutes");

function createMockPool() {
  let tenantId = 1;
  let userId = 1;
  let parentId = 1;
  const state = {
    tenants: [{ id: tenantId++, slug: "owner-tenant", name: "Owner" }],
    users: [], memberships: [], sessions: [], parents: [],
  };
  const nowPlus = () => new Date(Date.now() + 86400000).toISOString();
  const api = {
    state,
    connect: async () => ({ query: async (sql, params=[]) => api.query(sql, params), release(){} }),
    query: async (sql, params = []) => {
      const q = String(sql);
      if (q.startsWith("BEGIN") || q.startsWith("COMMIT") || q.startsWith("ROLLBACK")) return { rows: [] };
      if (q.includes("SELECT id, slug, name FROM tenants")) return { rows: state.tenants.filter(t=>t.slug===params[0]).slice(0,1) };
      if (q.includes("INSERT INTO tenants")) { const t={id:tenantId++,name:params[0],slug:params[1]}; state.tenants.push(t); return {rows:[t]}; }
      if (q.includes("INSERT INTO users")) {
        let u = state.users.find((x)=>x.tenant_id===params[1]&&x.email===params[0]);
        if (!u) { u={id:userId++,email:params[0],tenant_id:params[1],password_hash:params[2],created_at:new Date().toISOString()}; state.users.push(u); }
        else { u.password_hash=params[2]; }
        return { rows:[{id:u.id,email:u.email}]};
      }
      if (q.includes("INSERT INTO gates_parent_profiles")) {
        let p = state.parents.find((x)=>x.email.toLowerCase()===params[0].toLowerCase());
        if (!p) { p={id:parentId++,email:params[0],display_name:params[1]}; state.parents.push(p); }
        else { p.display_name=params[1]; }
        return { rows:[p]};
      }
      if (q.includes("INSERT INTO tenant_memberships")) { state.memberships.push({tenant_id:params[0],user_id:params[1],role:params[2]}); return {rows:[]}; }
      if (q.includes("INSERT INTO auth_sessions")) { state.sessions.push({user_id:params[0],tenant_id:params[1],role:params[2],token_hash:params[3],expires_at:nowPlus()}); return {rows:[]}; }
      if (q.includes("WHERE LOWER(COALESCE(u.email")) {
        const email=params[0], role=params[1], slug=params[2];
        const tenant=state.tenants.find(t=>t.slug===slug); if(!tenant) return {rows:[]};
        const rows=state.users.filter(u=>u.email===email).flatMap(u=>state.memberships.filter(m=>m.user_id===u.id&&m.role===role&&m.tenant_id===tenant.id).map(()=>({user_id:u.id,email:u.email,password_hash:u.password_hash,tenant_id:tenant.id,parent_profile_id:(state.parents.find(p=>p.email===u.email)||{}).id,display_name:(state.parents.find(p=>p.email===u.email)||{}).display_name})));
        return {rows};
      }
      if (q.includes("FROM auth_sessions s") && q.includes("gates_parent_profiles")) {
        const session=state.sessions.find(s=>s.token_hash===params[0]&&s.role===params[2]); if(!session) return {rows:[]};
        const tenant=state.tenants.find(t=>t.id===session.tenant_id&&t.slug===params[1]); if(!tenant) return {rows:[]};
        const user=state.users.find(u=>u.id===session.user_id); const parent=state.parents.find(p=>p.email===user.email);
        return {rows:[{...session,email:user.email,parent_profile_id:parent?.id,display_name:parent?.display_name}]};
      }
      if (q.includes("DELETE FROM auth_sessions")) { state.sessions = state.sessions.filter(s=>s.token_hash!==params[0]); return {rows:[]}; }
      return { rows: [] };
    },
  };
  return api;
}
let pool;

async function startServer() {
  pool = createMockPool();
  const app = express();
  app.use(express.json());
  app.use((req,res,next)=>{ if(req.path==='/api/owner/session') return res.json({authenticated:false}); next(); });
  app.use(createGatesRouter({ pool }));
  app.post('/api/owner/signin',(req,res)=>res.json({success:true}));
  app.get('/api/owner/session',(req,res)=>res.json({authenticated:false}));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

test("gates parent auth session foundation", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const signupRes = await fetch(`${baseUrl}/api/gates/auth/signup`, { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ parent_name:"Maya Johnson", email:"maya@example.com", password:"secure-password"})});
    assert.equal(signupRes.status, 201);
    const signupJson = await signupRes.json();
    assert.equal(signupJson.authenticated, true);
    assert.equal(signupJson.role, "parent");
    assert.equal(signupJson.next_route, "/gates/children");
    assert.equal(pool.state.users.some(u=>u.email==="maya@example.com"), true);
    assert.equal(pool.state.parents.some(p=>p.email==="maya@example.com"), true);
    assert.equal(pool.state.memberships.some(m=>m.role==="parent"), true);
    const gatesCookie = signupRes.headers.get("set-cookie");
    assert.match(gatesCookie, /gates_parent_session=/);

    const badSignin = await fetch(`${baseUrl}/api/gates/auth/signin`, { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ email:"maya@example.com", password:"wrong-password"})});
    assert.equal(badSignin.status, 401);

    const signinRes = await fetch(`${baseUrl}/api/gates/auth/signin`, { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ email:"maya@example.com", password:"secure-password"})});
    assert.equal(signinRes.status, 200);
    const signinJson = await signinRes.json();
    assert.equal(signinJson.authenticated, true);
    assert.equal(signinJson.next_route, "/gates/children");

    const sessionRes = await fetch(`${baseUrl}/api/gates/auth/session`, { headers: { cookie: signinRes.headers.get("set-cookie") } });
    const sessionJson = await sessionRes.json();
    assert.equal(sessionJson.authenticated, true);
    assert.equal(sessionJson.role, "parent");

    const ownerCookie = "garvey_owner_session=owner-token";
    const noConflictRes = await fetch(`${baseUrl}/api/gates/auth/session`, { headers: { cookie: `${ownerCookie}; ${signinRes.headers.get("set-cookie")}` } });
    assert.equal((await noConflictRes.json()).authenticated, true);

    const signoutRes = await fetch(`${baseUrl}/api/gates/auth/signout`, { method:"POST", headers: { cookie: signinRes.headers.get("set-cookie") } });
    assert.equal(signoutRes.status, 200);
    assert.match(signoutRes.headers.get("set-cookie"), /gates_parent_session=.*Max-Age=0/);

    const afterSignout = await fetch(`${baseUrl}/api/gates/auth/session`, { headers: { cookie: signinRes.headers.get("set-cookie") } });
    assert.equal((await afterSignout.json()).authenticated, false);

    const ownerSessionRes = await fetch(`${baseUrl}/api/owner/session`, { headers: { cookie: ownerCookie } });
    assert.equal((await ownerSessionRes.json()).authenticated, false);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
