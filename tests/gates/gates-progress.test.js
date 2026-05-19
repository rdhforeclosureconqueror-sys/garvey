const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { createGatesRouter } = require("../../server/gatesRoutes");

function createMockPool() {
  let tenantId = 1; let userId = 1; let parentId = 1; let childId = 1;
  const state = { tenants:[{id:tenantId++,slug:"the-gates",name:"The Gates"}], users:[], memberships:[], sessions:[], parents:[], children:[], progress:[], practiceLogs:[] };
  const nowPlus = () => new Date(Date.now() + 86400000).toISOString();
  const api = { state, connect: async()=>({query: async(sql,p=[])=>api.query(sql,p), release(){}}), query: async(sql, params=[])=>{
    const q=String(sql); if (q.startsWith("BEGIN")||q.startsWith("COMMIT")||q.startsWith("ROLLBACK")) return {rows:[]};
    if (q.includes("SELECT id, slug, name FROM tenants")) return {rows:state.tenants.filter(t=>t.slug===params[0]).slice(0,1)};
    if (q.includes("INSERT INTO users")) { let u=state.users.find(x=>x.tenant_id===params[1]&&x.email===params[0]); if(!u){u={id:userId++,email:params[0],tenant_id:params[1],password_hash:params[2],created_at:new Date().toISOString()};state.users.push(u);} else u.password_hash=params[2]; return {rows:[{id:u.id,email:u.email}]}; }
    if (q.includes("INSERT INTO gates_parent_profiles")) { let p=state.parents.find(x=>x.email.toLowerCase()===params[0].toLowerCase()); if(!p){p={id:parentId++,email:params[0],display_name:params[1]}; state.parents.push(p);} else p.display_name=params[1]; return {rows:[p]}; }
    if (q.includes("INSERT INTO tenant_memberships")) { state.memberships.push({tenant_id:params[0],user_id:params[1],role:params[2]}); return {rows:[]}; }
    if (q.includes("INSERT INTO auth_sessions")) { state.sessions.push({user_id:params[0],tenant_id:params[1],role:params[2],token_hash:params[3],expires_at:nowPlus()}); return {rows:[]}; }
    if (q.includes("FROM auth_sessions s") && q.includes("gates_parent_profiles")) { const s=state.sessions.find(x=>x.token_hash===params[0]&&x.role===params[2]); if(!s) return {rows:[]}; const u=state.users.find(x=>x.id===s.user_id); const p=state.parents.find(x=>x.email===u.email); return {rows:[{...s,email:u.email,parent_profile_id:p?.id,display_name:p?.display_name}]}; }
    if (q.includes("INSERT INTO gates_child_profiles")) { const c={id:childId++, parent_id:Number(params[0]), first_name:String(params[1]), created_at:new Date().toISOString()}; state.children.push(c); return {rows:[{id:c.id, first_name:c.first_name}]}; }
    if (q.includes("SELECT id, parent_id FROM gates_child_profiles WHERE id = $1")) { const c=state.children.find(x=>String(x.id)===String(params[0])); return {rows:c?[{id:c.id,parent_id:c.parent_id}]:[]}; }
    if (q.includes("SELECT progress_key, progress_value, updated_at FROM gates_progress")) { return {rows:state.progress.filter(r=>r.parent_id===params[0]&&String(r.child_id)===String(params[1]))}; }
    if (q.includes("SELECT id FROM gates_progress")) { const row=state.progress.find(r=>r.parent_id===params[0]&&String(r.child_id)===String(params[1])&&r.progress_key===params[2]); return {rows:row?[{id:row.id}]:[]}; }
    if (q.includes("INSERT INTO gates_progress")) { state.progress.push({id:state.progress.length+1,parent_id:params[0],child_id:String(params[1]),progress_key:params[2],progress_value:JSON.parse(params[3]),updated_at:new Date().toISOString()}); return {rows:[]}; }
    if (q.includes("UPDATE gates_progress SET")) { const row=state.progress.find(r=>r.id===params[1]); if(row){row.progress_value=JSON.parse(params[0]); row.updated_at=new Date().toISOString();} return {rows:[]}; }
    if (q.includes("INSERT INTO gates_practice_logs")) { state.practiceLogs.push({id:state.practiceLogs.length+1,parent_id:params[0],child_id:String(params[1]),gate_key:params[2],payload:JSON.parse(params[3])}); return {rows:[]}; }
    if (q.includes("WHERE LOWER(COALESCE(u.email")) { const tenant=state.tenants.find(t=>t.slug===params[2]); const u=state.users.find(x=>x.email===params[0]); if(!tenant||!u) return {rows:[]}; const m=state.memberships.find(x=>x.user_id===u.id&&x.tenant_id===tenant.id&&x.role===params[1]); if(!m) return {rows:[]}; const p=state.parents.find(x=>x.email===u.email); return {rows:[{user_id:u.id,email:u.email,password_hash:u.password_hash,tenant_id:tenant.id,parent_profile_id:p.id,display_name:p.display_name}]}; }
    return {rows:[]};
  }}; return api;
}

async function startServer() { const pool=createMockPool(); const app=express(); app.use(express.json()); app.use((req,res,next)=>{ if(req.path==='/api/owner/session') return res.json({authenticated:false}); next(); }); app.use(createGatesRouter({pool})); app.get('/api/owner/session',(req,res)=>res.json({authenticated:false})); const server=http.createServer(app); await new Promise(r=>server.listen(0,r)); return {pool,server,baseUrl:`http://127.0.0.1:${server.address().port}`}; }

test("gates progress tracking and practice logs", async () => {
  const { server, baseUrl, pool } = await startServer();
  try {
    const signupA = await fetch(`${baseUrl}/api/gates/auth/signup`, { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ parent_name:"A", email:"a@x.com", password:"secure-pass"}) });
    const cookieA = signupA.headers.get("set-cookie");
    const signupB = await fetch(`${baseUrl}/api/gates/auth/signup`, { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ parent_name:"B", email:"b@x.com", password:"secure-pass"}) });
    const cookieB = signupB.headers.get("set-cookie");
    const create = await fetch(`${baseUrl}/api/gates/children`, { method:"POST", headers:{"content-type":"application/json", cookie:cookieA}, body:JSON.stringify({ child_name:"Luna", child_age_band:"4-6", child_grade_band:"Pre-K", metadata:{ interests:["art"] } }) });
    const childId = (await create.json()).child_profile.child_id;

    const unauth = await fetch(`${baseUrl}/api/gates/children/${childId}/progress`);
    assert.equal(unauth.status, 401);

    const crossParentGet = await fetch(`${baseUrl}/api/gates/children/${childId}/progress`, { headers:{ cookie:cookieB } });
    assert.equal(crossParentGet.status, 403);

    const loadOwn = await fetch(`${baseUrl}/api/gates/children/${childId}/progress`, { headers:{ cookie:cookieA } });
    assert.equal(loadOwn.status, 200);
    const loadOwnJson = await loadOwn.json();
    assert.equal(loadOwnJson.ok, true);
    assert.equal(loadOwnJson.progress.length, 10);

    const badGate = await fetch(`${baseUrl}/api/gates/children/${childId}/progress`, { method:"POST", headers:{"content-type":"application/json", cookie:cookieA}, body:JSON.stringify({ gate_number:11, status:"practicing", progress_percent:60 }) });
    assert.equal(badGate.status, 400);
    const badStatus = await fetch(`${baseUrl}/api/gates/children/${childId}/progress`, { method:"POST", headers:{"content-type":"application/json", cookie:cookieA}, body:JSON.stringify({ gate_number:1, status:"bad", progress_percent:60 }) });
    assert.equal(badStatus.status, 400);
    const badPercent = await fetch(`${baseUrl}/api/gates/children/${childId}/progress`, { method:"POST", headers:{"content-type":"application/json", cookie:cookieA}, body:JSON.stringify({ gate_number:1, status:"practicing", progress_percent:101 }) });
    assert.equal(badPercent.status, 400);

    const updateOwn = await fetch(`${baseUrl}/api/gates/children/${childId}/progress`, { method:"POST", headers:{"content-type":"application/json", cookie:cookieA}, body:JSON.stringify({ gate_number:1, status:"practicing", progress_percent:60, parent_note:"Completed attention ritual three times this week.", observed_response:"Settled faster after the second day.", payload:{ source:"parent_check_in" } }) });
    assert.equal(updateOwn.status, 200);

    const persisted = await fetch(`${baseUrl}/api/gates/children/${childId}/progress`, { headers:{ cookie:cookieA } });
    const persistedJson = await persisted.json();
    const firstGate = persistedJson.progress.find((g) => g.gate_number === 1);
    assert.equal(firstGate.status, "practicing");
    assert.equal(firstGate.progress_percent, 60);
    assert.equal(firstGate.evidence.source, "parent_check_in");
    assert.equal(pool.state.practiceLogs.length, 1);

    const crossParentPost = await fetch(`${baseUrl}/api/gates/children/${childId}/progress`, { method:"POST", headers:{"content-type":"application/json", cookie:cookieB}, body:JSON.stringify({ gate_number:1, status:"emerging", progress_percent:30 }) });
    assert.equal(crossParentPost.status, 403);

    const ownerSession = await fetch(`${baseUrl}/api/owner/session`);
    assert.equal((await ownerSession.json()).authenticated, false);
  } finally { await new Promise((resolve)=>server.close(resolve)); }
});
