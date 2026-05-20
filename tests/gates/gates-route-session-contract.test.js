const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');
const fs = require('node:fs');
const path = require('node:path');

const { createGatesRouter } = require('../../server/gatesRoutes');

function createMockPool() {
  let tenantId = 1; let userId = 1; let parentId = 1; let childId = 1; let assessmentId = 1;
  const state = { tenants:[{id:tenantId++,slug:'owner-tenant',name:'Owner'}], users:[], memberships:[], sessions:[], parents:[], children:[], assessments:[] };
  const nowPlus = () => new Date(Date.now() + 86400000).toISOString();
  const api = { state, connect: async()=>({query: async(sql, params=[]) => api.query(sql, params), release(){}}), query: async(sql, params=[]) => {
    const q = String(sql);
    if (q.startsWith('BEGIN')||q.startsWith('COMMIT')||q.startsWith('ROLLBACK')) return {rows:[]};
    if (q.includes('SELECT id, slug, name FROM tenants')) return { rows: state.tenants.filter(t=>t.slug===params[0]).slice(0,1) };
    if (q.includes('INSERT INTO tenants')) { const t={id:tenantId++, name:params[0], slug:params[1]}; state.tenants.push(t); return {rows:[t]}; }
    if (q.includes('INSERT INTO users')) { let u=state.users.find(x=>x.tenant_id===params[1]&&x.email===params[0]); if(!u){u={id:userId++,email:params[0],tenant_id:params[1],password_hash:params[2],created_at:new Date().toISOString()}; state.users.push(u);} else u.password_hash=params[2]; return {rows:[{id:u.id,email:u.email}]}; }
    if (q.includes('INSERT INTO gates_parent_profiles')) { let p=state.parents.find(x=>x.email===params[0]); if(!p){p={id:parentId++,email:params[0],display_name:params[1]}; state.parents.push(p);} return {rows:[p]}; }
    if (q.includes('INSERT INTO tenant_memberships')) { state.memberships.push({tenant_id:params[0],user_id:params[1],role:params[2]}); return {rows:[]}; }
    if (q.includes('INSERT INTO auth_sessions')) { state.sessions.push({user_id:params[0],tenant_id:params[1],role:params[2],token_hash:params[3],expires_at:nowPlus()}); return {rows:[]}; }
    if (q.includes('WHERE LOWER(COALESCE(u.email')) { const [email, role, slug] = params; const tenant=state.tenants.find(t=>t.slug===slug); if(!tenant) return {rows:[]}; return {rows: state.users.filter(u=>u.email===email).map(u=>({user_id:u.id,email:u.email,password_hash:u.password_hash,tenant_id:tenant.id,parent_profile_id:(state.parents.find(p=>p.email===u.email)||{}).id,display_name:(state.parents.find(p=>p.email===u.email)||{}).display_name}))}; }
    if (q.includes('FROM auth_sessions s') && q.includes('gates_parent_profiles')) { const s=state.sessions.find(x=>x.token_hash===params[0]&&x.role===params[2]); if(!s) return {rows:[]}; const u=state.users.find(x=>x.id===s.user_id); const p=state.parents.find(x=>x.email===u.email); return {rows:[{...s,email:u.email,parent_profile_id:p?.id,display_name:p?.display_name}]}; }
    if (q.includes('SELECT c.id, c.first_name FROM gates_child_profiles')) return { rows: state.children.filter(c=>c.parent_id===params[0]).map(c=>({id:c.id,first_name:c.first_name})) };
    if (q.includes('INSERT INTO gates_child_profiles')) { const c={id:childId++,parent_id:params[0],first_name:params[1]}; state.children.push(c); return {rows:[{id:c.id,first_name:c.first_name}]}; }
    if (q.includes('SELECT id, created_at FROM gates_assessments')) { const list=state.assessments.filter(a=>a.parent_id===params[0]&&a.child_id===Number(params[1])).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)); return {rows:list[0]?[{id:list[0].id,created_at:list[0].created_at}]:[]}; }
    if (q.includes('SELECT id, parent_id, first_name FROM gates_child_profiles')) { const c=state.children.find(x=>x.id===Number(params[0])); return {rows:c?[{id:c.id,parent_id:c.parent_id,first_name:c.first_name}]:[]}; }
    if (q.includes('SELECT id, payload, created_at FROM gates_assessments')) { const list=state.assessments.filter(a=>a.parent_id===params[0]&&a.child_id===Number(params[1])).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)); return {rows:list[0]?[{id:list[0].id,payload:list[0].payload,created_at:list[0].created_at}]:[]}; }
    if (q.includes('DELETE FROM auth_sessions')) return {rows:[]};
    return {rows:[]};
  }};
  state.assessments.push({ id: assessmentId++, parent_id: 1, child_id: 1, created_at: new Date().toISOString(), payload: { gates_profile: {}, gate_map: [] } });
  return api;
}

async function startServer() { const pool = createMockPool(); const app = express(); app.use(express.json()); app.use(createGatesRouter({ pool })); const server = http.createServer(app); await new Promise((r)=>server.listen(0,r)); return { server, base: `http://127.0.0.1:${server.address().port}`, pool }; }

async function signup(base) { const r = await fetch(`${base}/api/gates/auth/signup`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({parent_name:'P',email:'p@example.com',password:'password1'}) }); return { res:r, json:await r.json(), cookie:r.headers.get('set-cookie') }; }

test('gates route/session contract normalization', async () => {
  const { server, base, pool } = await startServer();
  try {
    const mounted = ['/gates','/gates/signup','/gates/dashboard','/gates/children','/gates/assessment','/gates/results/abc','/gates/child/1/gates','/gates/child/1/gates/1'];
    for (const route of mounted) assert.equal((await fetch(`${base}${route}`)).status, 200);

    const signupRes = await signup(base);
    assert.equal(signupRes.json.next_route, '/gates/children');
    const signin = await fetch(`${base}/api/gates/auth/signin`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({email:'p@example.com',password:'password1'})});
    const signinJson = await signin.json();
    assert.equal(signinJson.next_route, '/gates/children');

    const sessionAuth = await fetch(`${base}/api/gates/auth/session`, { headers:{cookie: signin.headers.get('set-cookie')} });
    const sessionAuthJson = await sessionAuth.json();
    assert.equal(sessionAuthJson.next_route, '/gates/children');
    const sessionAnon = await fetch(`${base}/api/gates/auth/session`);
    assert.equal((await sessionAnon.json()).next_route, '/gates/signup');

    const protectedRes = await fetch(`${base}/gates/children`);
    assert.equal(protectedRes.status, 200);
    const protectedHtml = await protectedRes.text();
    assert.match(protectedHtml, /gates\.js/);

    const directResultsAuthed = await fetch(`${base}/gates/results/abc`, { headers:{ cookie: signupRes.cookie } });
    assert.equal(directResultsAuthed.status, 200);
    const directResultsAnon = await fetch(`${base}/gates/results/abc`);
    assert.equal(directResultsAnon.status, 200);

    pool.state.children.push({ id:1, parent_id:1, first_name:'Kid One' });
    const profileHasLatest = await fetch(`${base}/api/gates/children/1/profile`, { headers:{cookie: signupRes.cookie} });
    const profileHasLatestJson = await profileHasLatest.json();
    assert.equal(Boolean(profileHasLatestJson.latest_assessment?.assessment_id), true);

    pool.state.children.push({ id:2, parent_id:1, first_name:'Kid Two' });
    const profileNoLatest = await fetch(`${base}/api/gates/children/2/profile`, { headers:{cookie: signupRes.cookie} });
    assert.equal((await profileNoLatest.json()).latest_assessment, null);

    const routesSource = fs.readFileSync(path.join(process.cwd(), 'server', 'gatesRoutes.js'), 'utf8');
    const dashboardRef = routesSource.includes('/gates/dashboard');
    assert.equal(dashboardRef, true);
  } finally { await new Promise((r)=>server.close(r)); }
});
