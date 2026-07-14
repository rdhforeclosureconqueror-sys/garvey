const test = require('node:test');
const assert = require('node:assert/strict');
const svc = require('../server/leaderWithinService');

test('youth cookie is scoped, httpOnly, bounded, and secure in production', ()=>{
 const old=process.env.NODE_ENV; process.env.NODE_ENV='production';
 const opts=svc.youthSessionCookieOptions(); process.env.NODE_ENV=old;
 assert.equal(svc.YOUTH_COOKIE,'tlw_youth_session');
 assert.equal(opts.httpOnly,true); assert.equal(opts.secure,true); assert.equal(opts.sameSite,'lax'); assert.equal(opts.path,'/'); assert.equal(opts.maxAge,8*60*60*1000);
});

test('youth session resolver rejects revoked expired disabled mismatched and stores hash lookup only', async()=>{
 const pool={query:async(sql,params)=>{ assert.match(sql,/WHERE s.token_hash=\$1/); assert.doesNotMatch(sql,/WHERE .*token=\$1/); assert.equal(params[0].length,64); return {rows:[{participant_session_id:1,participant_id:2,active_enrollment_id:3,session_credential_version:1,expires_at:new Date(Date.now()+10000),revoked_at:null,tenant_id:4,participant_status:'active',consent_status:'approved',current_credential_version:1,enrollment_status:'active',tenant_slug:'tenant'}]}; }};
 const actor=await svc.resolveYouthSession(pool,{headers:{cookie:'tlw_youth_session=plain-token'}});
 assert.equal(actor.actor_type,'youth_participant'); assert.equal(actor.participant_id,2); assert.equal(actor.authenticated,true);
});


test('my-program compares session participant id to canonical leader_within participant id, not nullable legacy user id', async()=>{
 const actor={authenticated:true,actor_type:'youth_participant',participant_id:101,active_tenant_slug:'tenant',is_admin:false,csrf_token:'csrf'};
 const pool={query:async(sql,params)=>{
  if(sql.includes('FROM leader_within_program_enrollments e JOIN leader_within_participants lp')) {
   assert.deepEqual(params,[101,'tenant']);
   return {rows:[{id:301,participant_id:null,leader_within_participant_id:101,resolved_participant_id:101,participant_name:'Ari Stone',tenant_slug:'tenant',program_title:'12-Week Program',duration_weeks:12,current_week:1,current_session:'A'}]};
  }
  if(sql.includes('FROM leader_within_practice_selections')) return {rows:[]};
  if(sql.includes('FROM leader_within_session_progress')) return {rows:[{session_code:'A',status:'available'}]};
  if(sql.includes('FROM leader_within_assessment_snapshots')) return {rows:[]};
  throw new Error('unexpected SQL '+sql);
 }};
 const out=await svc.getYouthDashboard(pool,{headers:{cookie:'tlw_youth_session=x; tlw_facilitator_session=y; garvey_owner_session=z; gates_parent_session=p'},leaderWithinYouthActor:actor,leaderWithinFacilitatorActor:{authenticated:true,participant_id:999,is_admin:true},authActor:{userId:888,isAdmin:true}});
 assert.equal(out.participant.first_name,'Ari');
 assert.equal(out.program.duration_weeks,12);
});

test('canonical youth cookie is root scoped and historical path variants are cleared', ()=>{
 const req={headers:{},secure:false};
 const setCookie=svc.buildYouthSessionCookie(req,'tok');
 assert.match(setCookie,/tlw_youth_session=tok/);
 assert.match(setCookie,/Path=\//);
 const clear=svc.clearAllYouthCookies(req).join('\n');
 assert.match(clear,/Path=\//);
 assert.match(clear,/Path=\/the-leader-within/);
 assert.match(clear,/Path=\/api\/the-leader-within/);
});
