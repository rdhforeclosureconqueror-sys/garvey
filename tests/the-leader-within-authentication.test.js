'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const svc = require('../server/leaderWithinService');

function makePool(){
 const state={queries:[],cohort:{id:10,tenant_id:1,tenant_slug:'tenant-a',location_id:'loc',assigned_facilitator_user_id:9},participants:[],credentials:[],enrollments:[],sessions:[],audit:[]};
 let pid=100,cid=200,eid=300;
 return {state, async query(sql,params=[]){ state.queries.push({sql,params});
  if(sql.includes('FROM leader_within_cohorts c JOIN tenants')) return {rows:[state.cohort]};
  if(sql.includes('FROM leader_within_cohort_facilitators')) return {rows:[{ok:1}]};
  if(sql.includes('INSERT INTO leader_within_participants')) { const p={id:pid++,tenant_id:params[0],location_id:params[1],first_name:params[2],last_name:params[3],preferred_name:params[4],status:'active',consent_status:params[6]}; state.participants.push(p); return {rows:[p]}; }
  if(sql.includes('SELECT 1 FROM leader_within_participant_credentials')) return {rows:[]};
  if(sql.includes('SELECT id FROM leader_within_programs')) return {rows:[{id:5}]};
  if(sql.includes('INSERT INTO leader_within_participant_credentials')) { const c={id:cid++,participant_id:params[0],leader_id:params[1],secret_hash:params[2],temporary:true,must_change:true,status:'active',failed_attempts:0,credential_version:1}; state.credentials.push(c); return {rows:[c]}; }
  if(sql.includes('INSERT INTO leader_within_program_enrollments')) { const e={id:eid++,leader_within_participant_id:params[0],program_id:params[1],cohort_id:params[2],tenant_id:params[3],status:'active'}; state.enrollments.push(e); return {rows:[e]}; }
  if(sql.includes('INSERT INTO leader_within_session_progress')) return {rows:[]};
  if(sql.includes('INSERT INTO leader_within_audit_events')) { state.audit.push({event_type:params[4],metadata:params[5]}); return {rows:[]}; }
  if(sql.includes('FROM leader_within_participant_credentials pc')) { const c=state.credentials.find(x=>x.leader_id.toLowerCase()===String(params[0]).toLowerCase()); if(!c) return {rows:[]}; const p=state.participants.find(x=>x.id===c.participant_id); const e=state.enrollments.find(x=>x.leader_within_participant_id===p.id); return {rows:[{...c,tenant_id:p.tenant_id,participant_status:p.status,enrollment_id:e.id,enrollment_status:e.status}]}; }
  if(sql.includes("UPDATE leader_within_participant_credentials SET secret_hash")) { const c=state.credentials.find(x=>x.id===params[1]); c.secret_hash=params[0]; c.temporary=false; c.must_change=false; c.credential_version++; return {rows:[]}; }
  if(sql.includes('UPDATE leader_within_participant_credentials SET failed_attempts=0,last_login_at')) { state.credentials.find(x=>x.id===params[0]).failed_attempts=0; return {rows:[]}; }
  if(sql.includes('UPDATE leader_within_participant_credentials SET failed_attempts')) { const c=state.credentials[0]; c.failed_attempts=params[0]; if(params[0]>=5) c.locked_until=new Date(Date.now()+60000).toISOString(); return {rows:[]}; }
  if(sql.includes('INSERT INTO leader_within_participant_sessions')) { state.sessions.push({participant_id:params[0],enrollment_id:params[1],token_hash:params[2],credential_version:params[3]}); return {rows:[]}; }
  if(sql.includes('FROM leader_within_participant_credentials WHERE lower')) { const c=state.credentials.find(x=>x.leader_id.toLowerCase()===String(params[0]).toLowerCase()); return {rows:c?[c]:[]}; }
  if(sql.includes('UPDATE leader_within_participant_sessions SET revoked_at')) { state.sessions.forEach(s=>{ if(s.participant_id===params[0]) s.revoked_at=true;}); return {rows:[]}; }
  throw new Error('unexpected SQL '+sql);
 }};
}
const actor={authActor:{userId:9,email:'fac@example.com',role:'facilitator',tenantSlug:'tenant-a'}};

test('facilitator creates participant with Leader ID, hashed one-time temporary PIN, enrollment, session, and safe audit', async()=>{
 const pool=makePool(); const out=await svc.addParticipant(pool,{...actor,params:{cohortId:10},body:{first_name:'Ari',last_name:'Stone',preferred_name:'Ari',consent_status:'approved',start_date:'2026-07-10'}});
 assert.match(out.credential_setup_card.leader_id,/^TLW-[2-9A-HJ-NP-Z]{5}$/);
 assert.match(out.credential_setup_card.temporary_pin,/^\d{6}$/);
 assert.notEqual(pool.state.credentials[0].secret_hash,out.credential_setup_card.temporary_pin);
 assert.match(pool.state.credentials[0].secret_hash,/^scrypt\$/);
 assert.equal(pool.state.enrollments[0].leader_within_participant_id,out.participant.id);
 assert.equal(pool.state.audit[0].event_type,'participant_created');
 assert.doesNotMatch(JSON.stringify(pool.state.audit), new RegExp(out.credential_setup_card.temporary_pin));
 assert.doesNotMatch(out.credential_setup_card.leader_id,/ARI|STONE/);
});

test('youth temporary sign-in requires first login change and new credential replaces temporary credential', async()=>{
 const pool=makePool(); const made=await svc.addParticipant(pool,{...actor,params:{cohortId:10},body:{first_name:'Ari',last_name:'Stone',preferred_name:'Ari',consent_status:'approved'}});
 const sign=await svc.signInYouth(pool,{body:{leader_id:made.credential_setup_card.leader_id.toLowerCase(),pin:made.credential_setup_card.temporary_pin}});
 assert.equal(sign.route,'/the-leader-within/first-login'); assert.equal(sign.cookie,'tlw_youth_session'); assert.equal(sign.cookie_options.httpOnly,true); assert.equal(sign.cookie_options.sameSite,'lax');
 const reset=await svc.firstLogin(pool,{body:{leader_id:made.credential_setup_card.leader_id,temporary_secret:made.credential_setup_card.temporary_pin,new_secret:'987654',confirm_secret:'987654'}});
 assert.equal(reset.route,'/the-leader-within/my-program');
 await assert.rejects(()=>svc.signInYouth(pool,{body:{leader_id:made.credential_setup_card.leader_id,pin:made.credential_setup_card.temporary_pin}}),/We could not sign you in/);
 const sign2=await svc.signInYouth(pool,{body:{leader_id:made.credential_setup_card.leader_id,pin:'987654'}}); assert.equal(sign2.route,'/the-leader-within/my-program');
});

test('invalid attempts use generic errors and lock account', async()=>{
 const pool=makePool(); const made=await svc.addParticipant(pool,{...actor,params:{cohortId:10},body:{first_name:'Ari',last_name:'Stone',preferred_name:'Ari',consent_status:'approved'}});
 for(let i=0;i<5;i++) await assert.rejects(()=>svc.signInYouth(pool,{body:{leader_id:made.credential_setup_card.leader_id,pin:'000000'}}),/We could not sign you in/);
 assert.ok(pool.state.credentials[0].locked_until);
 await assert.rejects(()=>svc.signInYouth(pool,{body:{leader_id:made.credential_setup_card.leader_id,pin:made.credential_setup_card.temporary_pin}}),/We could not sign you in/);
});
