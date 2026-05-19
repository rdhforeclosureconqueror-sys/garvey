const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");

const { createGatesRouter } = require("../../server/gatesRoutes");

function createMockPool() {
  let tenantId = 1; let userId = 1; let parentId = 1; let childId = 1;
  const state = { tenants:[{id:tenantId++,slug:"the-gates",name:"The Gates"}], users:[], memberships:[], sessions:[], parents:[], children:[] };
  const nowPlus = () => new Date(Date.now() + 86400000).toISOString();
  const api = { state, connect: async()=>({query: async(sql,p=[])=>api.query(sql,p), release(){}}), query: async(sql, params=[])=>{
    const q=String(sql);
    if (q.startsWith("BEGIN")||q.startsWith("COMMIT")||q.startsWith("ROLLBACK")) return {rows:[]};
    if (q.includes("SELECT id, slug, name FROM tenants")) return {rows:state.tenants.filter(t=>t.slug===params[0]).slice(0,1)};
    if (q.includes("INSERT INTO users")) { let u=state.users.find(x=>x.tenant_id===params[1]&&x.email===params[0]); if(!u){u={id:userId++,email:params[0],tenant_id:params[1],password_hash:params[2],created_at:new Date().toISOString()};state.users.push(u);} else u.password_hash=params[2]; return {rows:[{id:u.id,email:u.email}]}; }
    if (q.includes("INSERT INTO gates_parent_profiles")) { let p=state.parents.find(x=>x.email.toLowerCase()===params[0].toLowerCase()); if(!p){p={id:parentId++,email:params[0],display_name:params[1]}; state.parents.push(p);} else p.display_name=params[1]; return {rows:[p]}; }
    if (q.includes("INSERT INTO tenant_memberships")) { state.memberships.push({tenant_id:params[0],user_id:params[1],role:params[2]}); return {rows:[]}; }
    if (q.includes("INSERT INTO auth_sessions")) { state.sessions.push({user_id:params[0],tenant_id:params[1],role:params[2],token_hash:params[3],expires_at:nowPlus()}); return {rows:[]}; }
    if (q.includes("FROM auth_sessions s") && q.includes("gates_parent_profiles")) { const s=state.sessions.find(x=>x.token_hash===params[0]&&x.role===params[2]); if(!s) return {rows:[]}; const u=state.users.find(x=>x.id===s.user_id); const p=state.parents.find(x=>x.email===u.email); return {rows:[{...s,email:u.email,parent_profile_id:p?.id,display_name:p?.display_name}]}; }
    if (q.includes("INSERT INTO gates_child_profiles")) { const c={id:childId++, parent_id:Number(params[0]), first_name:String(params[1]), created_at:new Date().toISOString()}; state.children.push(c); return {rows:[{id:c.id, first_name:c.first_name}]}; }
    if (q.includes("SELECT id, first_name FROM gates_child_profiles WHERE parent_id = $1")) return {rows:state.children.filter(c=>c.parent_id===Number(params[0])).map(c=>({id:c.id,first_name:c.first_name}))};
    if (q.includes("SELECT id, parent_id, first_name FROM gates_child_profiles WHERE id = $1")) { const c=state.children.find(x=>String(x.id)===String(params[0])); return {rows:c?[{id:c.id,parent_id:c.parent_id,first_name:c.first_name}]:[]}; }
    if (q.includes("DELETE FROM auth_sessions")) { state.sessions = state.sessions.filter(s=>s.token_hash!==params[0]); return {rows:[]}; }
    if (q.includes("WHERE LOWER(COALESCE(u.email")) {
      const email=params[0], role=params[1], slug=params[2]; const tenant=state.tenants.find(t=>t.slug===slug); if(!tenant) return {rows:[]};
      const rows=state.users.filter(u=>u.email===email).flatMap(u=>state.memberships.filter(m=>m.user_id===u.id&&m.role===role&&m.tenant_id===tenant.id).map(()=>({user_id:u.id,email:u.email,password_hash:u.password_hash,tenant_id:tenant.id,parent_profile_id:(state.parents.find(p=>p.email===u.email)||{}).id,display_name:(state.parents.find(p=>p.email===u.email)||{}).display_name})));
      return {rows};
    }
    return {rows:[]};
  }};
  return api;
}

async function startServer() {
  const pool = createMockPool();
  const app = express(); app.use(express.json());
  app.use((req,res,next)=>{ if(req.path==='/api/owner/session') return res.json({authenticated:false}); next(); });
  app.use(createGatesRouter({ pool }));
  app.get('/api/owner/session',(req,res)=>res.json({authenticated:false}));
  const server=http.createServer(app); await new Promise((resolve)=>server.listen(0, resolve));
  return { pool, server, baseUrl:`http://127.0.0.1:${server.address().port}` };
}

test("gates child ownership enforcement", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const signupA = await fetch(`${baseUrl}/api/gates/auth/signup`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ parent_name:"Parent A", email:"a@example.com", password:"secure-pass" }) });
    const cookieA = signupA.headers.get("set-cookie");
    const signupB = await fetch(`${baseUrl}/api/gates/auth/signup`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ parent_name:"Parent B", email:"b@example.com", password:"secure-pass" }) });
    const cookieB = signupB.headers.get("set-cookie");

    const malformed = await fetch(`${baseUrl}/api/gates/children`, { method:"POST", headers:{"content-type":"application/json",cookie:cookieA}, body:JSON.stringify({ child_name:"Luna" }) });
    assert.equal(malformed.status, 400);

    const create = await fetch(`${baseUrl}/api/gates/children`, { method:"POST", headers:{"content-type":"application/json",cookie:cookieA}, body:JSON.stringify({ child_name:"Luna", child_age_band:"4-6", child_grade_band:"Pre-K", metadata:{ interests:["drawing"], notes:"Sensitive" } }) });
    assert.equal(create.status, 201);
    const createdJson = await create.json();
    assert.equal(createdJson.ok, true);
    assert.equal(createdJson.child_profile.child_name, "Luna");

    const list = await fetch(`${baseUrl}/api/gates/children`, { headers:{cookie:cookieA} });
    assert.equal(list.status, 200);
    const listJson = await list.json();
    assert.equal(listJson.children.length, 1);

    const ownProfile = await fetch(`${baseUrl}/api/gates/children/${createdJson.child_profile.child_id}/profile`, { headers:{cookie:cookieA} });
    assert.equal(ownProfile.status, 200);

    const denied = await fetch(`${baseUrl}/api/gates/children/${createdJson.child_profile.child_id}/profile`, { headers:{cookie:cookieB} });
    assert.equal(denied.status, 403);

    const unauthList = await fetch(`${baseUrl}/api/gates/children`);
    assert.equal(unauthList.status, 401);

    const ownerSession = await fetch(`${baseUrl}/api/owner/session`);
    assert.equal((await ownerSession.json()).authenticated, false);
  } finally { await new Promise((resolve)=>server.close(resolve)); }
});
