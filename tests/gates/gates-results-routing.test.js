const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');
const { createGatesRouter } = require('../../server/gatesRoutes');
const { QUESTIONS } = require('../../gates/gatesAssessmentQuestions');

function mkPool(){let ids={t:1,u:1,p:1,c:1,a:1}; const st={tenants:[{id:1,slug:'the-gates'}],users:[],memberships:[],sessions:[],parents:[],children:[],assessments:[],progress:[]};
 const qp=async(q,params=[])=>{q=String(q); if(/BEGIN|COMMIT|ROLLBACK/.test(q))return{rows:[]};
 if(q.includes('SELECT id, slug, name FROM tenants')) return {rows:[st.tenants[0]]};
 if(q.includes('INSERT INTO users')){let u=st.users.find(x=>x.email===params[0]); if(!u){u={id:ids.u++,email:params[0],tenant_id:1,password_hash:params[2]};st.users.push(u);} return{rows:[{id:u.id,email:u.email}]};}
 if(q.includes('INSERT INTO gates_parent_profiles')){let p=st.parents.find(x=>x.email===params[0]); if(!p){p={id:ids.p++,email:params[0],display_name:params[1]};st.parents.push(p);} return{rows:[p]};}
 if(q.includes('INSERT INTO tenant_memberships')){st.memberships.push({tenant_id:1,user_id:params[1],role:params[2]}); return{rows:[]};}
 if(q.includes('INSERT INTO auth_sessions')){st.sessions.push({user_id:params[0],tenant_id:1,role:params[2],token_hash:params[3],expires_at:new Date(Date.now()+86400000).toISOString()}); return{rows:[]};}
 if(q.includes('FROM auth_sessions s')){const s=st.sessions.find(x=>x.token_hash===params[0]&&x.role===params[2]); if(!s)return{rows:[]}; const u=st.users.find(x=>x.id===s.user_id); const p=st.parents.find(x=>x.email===u.email); return{rows:[{...s,email:u.email,parent_profile_id:p.id,display_name:p.display_name}]};}
 if(q.includes('WHERE LOWER(COALESCE(u.email')){const u=st.users.find(x=>x.email===params[0]); if(!u)return{rows:[]}; const p=st.parents.find(x=>x.email===u.email); return{rows:[{user_id:u.id,email:u.email,password_hash:u.password_hash,tenant_id:1,parent_profile_id:p.id,display_name:p.display_name}]};}
 if(q.includes('INSERT INTO gates_child_profiles')){const c={id:ids.c++,parent_id:Number(params[0]),first_name:String(params[1]),created_at:new Date().toISOString()}; st.children.push(c); return{rows:[{id:c.id,first_name:c.first_name}]};}
 if(q.includes('FROM gates_child_profiles c')){const rows=st.children.filter(c=>c.parent_id===params[0]).map(c=>{const latest=st.assessments.filter(a=>a.parent_id===params[0]&&String(a.child_id)===String(c.id)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]; return {id:c.id,first_name:c.first_name,latest_assessment_id:latest?.id||null,latest_assessment_created_at:latest?.created_at||null};}); return {rows};}
 if(q.includes('SELECT id, parent_id FROM gates_child_profiles WHERE id = $1')){const c=st.children.find(x=>String(x.id)===String(params[0])); return{rows:c?[{id:c.id,parent_id:c.parent_id}]:[]};}
 if(q.includes('SELECT id, parent_id, first_name FROM gates_child_profiles')){const c=st.children.find(x=>String(x.id)===String(params[0])); return{rows:c?[{id:c.id,parent_id:c.parent_id,first_name:c.first_name}]:[]};}
 if(q.includes('INSERT INTO gates_assessments')){st.assessments.push({id:`ga${ids.a++}`,parent_id:params[0],child_id:String(params[1]),payload:JSON.parse(params[3]),created_at:new Date().toISOString()}); return{rows:[]};}
 if(q.includes('SELECT id, payload, created_at FROM gates_assessments WHERE parent_id')){const rows=st.assessments.filter(a=>a.parent_id===params[0]&&String(a.child_id)===String(params[1])).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)); return{rows:rows.slice(0,1)};}
 if(q.includes('FROM gates_assessments') && q.includes('payload->>')){const a=st.assessments.find(x=>String(x.id)===String(params[0]) || String(x.payload?.assessment_id)===String(params[0])); return{rows:a?[a]:[]};}
 if(q.includes('SELECT id FROM gates_progress')) return {rows:[]}; if(q.includes('INSERT INTO gates_progress')||q.includes('UPDATE gates_progress')||q.includes('INSERT INTO gates_practice_recommendations')||q.includes('UPDATE gates_practice_recommendations')) return {rows:[]};
 if(q.includes('DELETE FROM auth_sessions')) return {rows:[]};
 return {rows:[]};};
 return {query:qp,connect:async()=>({query:qp,release(){}})};}

async function start(){const app=express(); app.use(express.json()); app.use(createGatesRouter({pool:mkPool()})); const server=http.createServer(app); await new Promise(r=>server.listen(0,r)); return {server,base:`http://127.0.0.1:${server.address().port}`};}

async function auth(base,email){await fetch(`${base}/api/gates/auth/signup`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({parent_name:'P',email,password:'secure-pass'})}); const si=await fetch(`${base}/api/gates/auth/signin`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password:'secure-pass'})}); return si.headers.get('set-cookie');}

test('gates results routing/session behavior', async()=>{const {server,base}=await start(); try{
 const cookieA=await auth(base,'a@example.com'); const cookieB=await auth(base,'b@example.com');
 const cc=await fetch(`${base}/api/gates/children`,{method:'POST',headers:{'content-type':'application/json',cookie:cookieA},body:JSON.stringify({child_name:'Luna',child_age_band:'4-6',child_grade_band:'K',metadata:{x:1}})}); const childId=(await cc.json()).child_profile.child_id;
 const answers=QUESTIONS.map(q=>({question_id:q.question_id,value:'often'}));
 const sub=await fetch(`${base}/api/gates/assessment/submit`,{method:'POST',headers:{'content-type':'application/json',cookie:cookieA},body:JSON.stringify({child_id:childId,assessment_version:'gates_parent_observation_v1',answers})});
 assert.equal(sub.status,201); const sj=await sub.json(); assert.match(sj.next_route,/^\/gates\/results\//);
 const own=await fetch(`${base}/api/gates/assessment/${sj.assessment_id}`,{headers:{cookie:cookieA}}); assert.equal(own.status,200);
 const cross=await fetch(`${base}/api/gates/assessment/${sj.assessment_id}`,{headers:{cookie:cookieB}}); assert.equal(cross.status,403);
 const unauth=await fetch(`${base}/api/gates/assessment/${sj.assessment_id}`); assert.equal(unauth.status,401);
 const children=await fetch(`${base}/api/gates/children`,{headers:{cookie:cookieA}}); const childrenJson=await children.json(); assert.equal(Boolean(childrenJson.children[0].latest_assessment?.assessment_id),true);
 const newChild=await fetch(`${base}/api/gates/children`,{method:'POST',headers:{'content-type':'application/json',cookie:cookieA},body:JSON.stringify({child_name:'Nova',child_age_band:'7-9',child_grade_band:'2',metadata:{x:1}})}); const newChildId=(await newChild.json()).child_profile.child_id;
 const list2=await fetch(`${base}/api/gates/children`,{headers:{cookie:cookieA}}); const list2j=await list2.json();
 const hasRouteToResults=list2j.children.find(c=>String(c.child_id)===String(childId)).latest_assessment?.assessment_id; assert.ok(hasRouteToResults);
 const noAssessment=list2j.children.find(c=>String(c.child_id)===String(newChildId)).latest_assessment; assert.equal(noAssessment,null);
 const session=await fetch(`${base}/api/gates/auth/session`,{headers:{cookie:cookieA}}); assert.equal((await session.json()).authenticated,true);
 } finally {await new Promise(r=>server.close(r));}});
