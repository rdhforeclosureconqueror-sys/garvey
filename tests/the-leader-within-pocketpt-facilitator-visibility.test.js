'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {resolveFacilitatorPocketPtMovementState,FACILITATOR_STATUS_COPY}=require('../server/pocketPtIntegrationService');

function poolFor(assignment){return {query:async(sql)=>{if(sql.includes('leader_within_external_fitness_assignments'))return {rows:assignment?[assignment]:[]};throw new Error(`unexpected SQL: ${sql}`);}};}
async function withEnabled(fn){const before=process.env.POCKETPT_ENABLED;process.env.POCKETPT_ENABLED='true';try{return await fn();}finally{if(before===undefined)delete process.env.POCKETPT_ENABLED;else process.env.POCKETPT_ENABLED=before;}}

test('facilitator resolver maps the complete bounded Pocket PT status vocabulary safely',async()=>withEnabled(async()=>{
  for(const [status,label] of Object.entries(FACILITATOR_STATUS_COPY)){
    const state=await resolveFacilitatorPocketPtMovementState(poolFor({status,completed_at:null}),{enrollmentId:1,weekNumber:2,sessionCode:'A'});
    assert.equal(state.movement_source,'POCKETPT'); assert.equal(state.provider,'Pocket PT'); assert.equal(state.status,status); assert.equal(state.status_text,label);
    assert.equal(state.verified,status==='COMPLETED');
  }
  const unknown=await resolveFacilitatorPocketPtMovementState(poolFor({status:'PRIVATE_INTERNAL_STATE'}),{enrollmentId:1,weekNumber:2,sessionCode:'A'});
  assert.equal(unknown.status,'TEMPORARILY_UNAVAILABLE'); assert.equal(unknown.verified,false);
}));

test('facilitator projection distinguishes verified completion and preserves its trusted timestamp',async()=>withEnabled(async()=>{
  const completedAt='2026-08-17T23:15:00.000Z';
  const state=await resolveFacilitatorPocketPtMovementState(poolFor({status:'COMPLETED',completed_at:completedAt}),{enrollmentId:1,weekNumber:2,sessionCode:'A'});
  assert.deepEqual(Object.keys(state).sort(),['completed_at','follow_up_recommended','mission','movement_source','provider','required','source_label','status','status_text','verified'].sort());
  assert.equal(state.source_label,'Verified Pocket PT session'); assert.equal(state.completed_at,completedAt); assert.equal(state.verified,true);
}));

test('LOCAL facilitator movement stays labeled Leader Within and is never provider verified',async()=>{
  const state=await resolveFacilitatorPocketPtMovementState(poolFor(null),{enrollmentId:1,weekNumber:2,sessionCode:'A',localMovement:'Stretch',completed:true});
  assert.equal(state.movement_source,'LOCAL'); assert.equal(state.provider,null); assert.equal(state.mission,'Stretch'); assert.equal(state.status_text,'Complete'); assert.equal(state.source_label,'Leader Within'); assert.equal(state.verified,false);
});

test('complete facilitator projection contains no private Pocket PT fitness, event, or credential data',async()=>withEnabled(async()=>{
  const state=await resolveFacilitatorPocketPtMovementState(poolFor({status:'SAFETY_HOLD',completed_at:null,readiness:{pain:true},private_note:'secret',raw_event_body:'secret'}),{enrollmentId:1,weekNumber:2,sessionCode:'A'});
  const rendered=JSON.stringify({participant:{preferred_name:'A',leader_id:'LW-1'},movement:state,mission:{percent_complete:80}}).toLowerCase();
  for(const prohibited of ['readiness','energy','sleep','soreness','pain','pain_location','safety_reason','exercise','sets','reps','weight','raw_event','jwt','hmac','integration_secret','private_note']) assert.equal(rendered.includes(prohibited),false,prohibited);
  assert.equal(state.status,'SAFETY_HOLD'); assert.equal(state.follow_up_recommended,true); assert.equal(state.verified,false);
}));

test('cohort cards and participant detail render bounded movement without mutation controls',()=>{
  const routes=fs.readFileSync('server/leaderWithinRoutes.js','utf8');
  assert.match(routes,/facilitatorMovementInline\(p\.movement\)/); assert.match(routes,/progress-cards/); assert.match(routes,/<strong>Movement<\/strong><br>/);
  assert.match(routes,/facilitatorMovementSection\(pr\.movement\)/); assert.match(fs.readFileSync('server/pocketPtIntegrationService.js','utf8'),/Verified Pocket PT session/); assert.match(routes,/normal coaching\/safeguarding process/);
  assert.doesNotMatch(routes,/Mark Pocket PT Complete|Override Safety Hold|Reset Pocket PT/);
});

test('facilitator service uses canonical five-step state and server-side cohort authorization',()=>{
  const service=fs.readFileSync('server/leaderWithinService.js','utf8');
  const resolver=service.slice(service.indexOf('async function resolveFacilitatorParticipantCurriculumState'),service.indexOf('async function facilitatorCohortDetail'));
  assert.match(resolver,/assertFacilitatorForCohortAsync\(pool,trusted,row\)/);
  assert.match(resolver,/resolveParticipantCurriculumState\(pool,\{enrollmentId:row\.enrollment_id,cohortId,now\}\)/);
  assert.match(resolver,/resolveFacilitatorPocketPtMovementState/);
  assert.doesNotMatch(resolver,/req\.body/);
  assert.doesNotMatch(service,/pocketpt_summary/);
});
