"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createBridge}=require("../public/garvey-learning/garvey-activity-bridge");
const {validateEvent,saveActivityEvidence,readActivityEvidence}=require("../learning-science/garveyActivityEvidenceRepository");
const {createGarveyActivityEvidenceController}=require("../learning-science/garveyActivityEvidenceController");
const actor={authenticated:true,authUserId:9,parentProfile:{id:11}};
const ownedChild={ok:true,learnerId:"22",row:{id:22,parent_id:11}};
const consent={purpose:"child_learning_history",version:"child-learning-history-v1",status:"granted",granted_at:"2026-11-01T00:00:00.000Z",revoked_at:null,expires_at:null};
const event=createBridge({activityId:"rainbow-grammar"}).record("answer_submitted",{taskId:"punctuation_check",skillId:"ending_punctuation",attemptNumber:1,outcome:"incorrect",practiceTags:["selective_attention"],geniusDimensionCodes:["SR","FB"]});
function mockPool({consentRow=consent,ownerCount=1,insertCount=1}={}){
  const calls=[];const client={query:async(sql,params=[])=>{
    calls.push({sql,params});
    if(sql.startsWith("SELECT id FROM gates_child_profiles"))return {rowCount:ownerCount,rows:ownerCount?[{id:22}]:[]};
    if(sql.startsWith("SELECT purpose,version,status"))return {rowCount:consentRow?1:0,rows:consentRow?[consentRow]:[]};
    if(sql.startsWith("INSERT INTO garvey_learning_activity_events"))return {rowCount:insertCount,rows:insertCount?[{event_key:event.event_key}]:[]};
    return {rowCount:0,rows:[]};
  },release() {calls.push({sql:"RELEASE"})}};
  return {calls,connect:async()=>client,query:async(sql,params=[])=>{calls.push({sql,params});return {rows:sql.includes("garvey_child_learning_consent")?[{...consent,parent_profile_id:11,learner_id:22}]:[]}}};
}
test("bridge output validated and projected; unknown fields never persisted",()=>{
  assert.ok(validateEvent(event));
  assert.equal(validateEvent({...event,event_name:"another"}),null);
  assert.equal(validateEvent({...event,academic:{...event.academic,skill_area:"mathematics"}}),null);
  assert.equal(validateEvent({...event,genius_exploration:{opportunity_codes:["IQ"],evidence_level:"opportunity_only"}}),null);
  const clean=validateEvent({...event,rawEssay:"child private essay",child_id:"not owned",score:100});
  assert.ok(clean);
  assert.doesNotMatch(JSON.stringify(clean),/private essay|child_id|score/);
});
test("write uses canonical ownership lock, consent lock, original table and dedup",async()=>{
  const pool=mockPool();
  const result=await saveActivityEvidence({pool,actor,ownedChild,event});
  assert.deepEqual(result,{ok:true,saved:true,duplicate:false});
  const queries=pool.calls.map(x=>x.sql).join(" ");
  assert.match(queries,/gates_child_profiles WHERE id=\$1 AND parent_id=\$2 FOR UPDATE/);
  assert.match(queries,/garvey_child_learning_consent/);
  assert.match(queries,/ON CONFLICT \(child_id,event_key\) DO NOTHING/);
  assert.ok(pool.calls.find(x=>x.sql.startsWith("INSERT INTO garvey_learning_activity_events")).params[1]=== "11");
  assert.ok(pool.calls.find(x=>x.sql.startsWith("INSERT INTO garvey_learning_activity_events")).params[0]=== "22");
  assert.match(queries,/COMMIT/);
});
test("replayed event idempotent; revoked consent and foreign child never written",async()=>{
  const duplicate=await saveActivityEvidence({pool:mockPool({insertCount:0}),actor,ownedChild,event});
  assert.equal(duplicate.duplicate,true);
  const revokedPool=mockPool({consentRow:{...consent,status:"revoked",revoked_at:"2026-11-15T00:00:00.000Z"}});
  const denied=await saveActivityEvidence({pool:revokedPool,actor,ownedChild,event});
  assert.equal(denied.error,"caregiver_consent_required");
  assert.equal(revokedPool.calls.some(x=>x.sql.startsWith("INSERT INTO")),false);
  const foreignPool=mockPool({ownerCount:0});
  assert.equal((await saveActivityEvidence({pool:foreignPool,actor,ownedChild,event})).error,"forbidden");
  assert.equal(foreignPool.calls.some(x=>x.sql.startsWith("INSERT INTO")),false);
  await assert.rejects(saveActivityEvidence({pool:mockPool(),actor,ownedChild:{...ownedChild,row:{id:22,parent_id:99}},event}),/ownership/);
});
test("controller defaults disabled and fails closed without verified auth, child, origin or CSRF",async()=>{
  const config={pool:mockPool(),resolveParentSession:async()=>actor,resolveOwnedChild:async()=>ownedChild,verifyCsrf:async()=>true,expectedOrigin:"https://garvey.example"};
  const req={params:{childId:"22"},headers:{origin:"https://garvey.example","content-type":"application/json"},body:{event}};
  const off=createGarveyActivityEvidenceController(config);
  assert.equal((await off.write(req)).status,404);
  const live=createGarveyActivityEvidenceController({...config,enabled:true});
  assert.equal((await live.write({...req,headers:{...req.headers,origin:"https://evil.example"}})).status,403);
  assert.equal((await live.write({...req,headers:{...req.headers,"content-type":"text/plain"}})).status,415);
  assert.equal((await createGarveyActivityEvidenceController({...config,enabled:true,verifyCsrf:async()=>false}).write(req)).body.error,"csrf_required");
  assert.equal((await createGarveyActivityEvidenceController({...config,enabled:true,resolveParentSession:async()=>({authenticated:false})}).write(req)).status,401);
  assert.equal((await createGarveyActivityEvidenceController({...config,enabled:true,resolveOwnedChild:async()=>({...ownedChild,row:{id:22,parent_id:44}})}).write(req)).status,403);
  assert.throws(()=>createGarveyActivityEvidenceController({...config,expectedOrigin:"http://garvey.example"}),/origin/);
});
test("readback is scoped to parent and child, never reads other child profiles",async()=>{
  const calls=[];const pool={query:async(sql,params)=>{
    calls.push({sql,params});
    if(sql.includes("garvey_child_learning_consent"))return {rows:[{...consent,parent_profile_id:11,learner_id:22}]};
    return {rows:[{event_key:"k",session_id:"s",activity_id:"rainbow-grammar",skill_id:"capital_letters",practice_tags:["selective_attention"],genius_dimension_codes:["SR"],observation:{academic:{outcome:"correct"},event_type:"answer_submitted",occurred_at:"2026-11-17T18:00:00Z"}}]};
  }};
  const result=await readActivityEvidence({pool,actor,ownedChild});
  assert.equal(result.ok,true);
  assert.equal(result.events.length,1);
  const query=calls.find(c=>c.sql.includes("FROM garvey_learning_activity_events"));
  assert.deepEqual(query.params,["22","11",40]);
  assert.match(query.sql,/child_id=\$1 AND parent_profile_id=\$2/);
  const denied=await readActivityEvidence({pool:{query:async()=>({rows:[]})},actor,ownedChild});
  assert.equal(denied.error,"caregiver_consent_required");
});
