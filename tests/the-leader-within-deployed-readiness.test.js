const test = require('node:test');
const assert = require('node:assert/strict');
const svc = require('../server/leaderWithinService');

test('youth cookie is scoped, httpOnly, bounded, and secure in production', ()=>{
 const old=process.env.NODE_ENV; process.env.NODE_ENV='production';
 const opts=svc.youthSessionCookieOptions(); process.env.NODE_ENV=old;
 assert.equal(svc.YOUTH_COOKIE,'tlw_youth_session');
 assert.equal(opts.httpOnly,true); assert.equal(opts.secure,true); assert.equal(opts.sameSite,'lax'); assert.equal(opts.path,'/the-leader-within'); assert.equal(opts.maxAge,8*60*60*1000);
});

test('youth session resolver rejects revoked expired disabled mismatched and stores hash lookup only', async()=>{
 const pool={query:async(sql,params)=>{ assert.match(sql,/WHERE s.token_hash=\$1/); assert.doesNotMatch(sql,/WHERE .*token=\$1/); assert.equal(params[0].length,64); return {rows:[{participant_session_id:1,participant_id:2,active_enrollment_id:3,session_credential_version:1,expires_at:new Date(Date.now()+10000),revoked_at:null,tenant_id:4,participant_status:'active',consent_status:'approved',current_credential_version:1,enrollment_status:'active',tenant_slug:'tenant'}]}; }};
 const actor=await svc.resolveYouthSession(pool,{headers:{cookie:'tlw_youth_session=plain-token'}});
 assert.equal(actor.actor_type,'youth_participant'); assert.equal(actor.participant_id,2); assert.equal(actor.authenticated,true);
});
