"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const pocket=require("../server/pocketPtIntegrationService");
const routes=fs.readFileSync(require.resolve("../server/leaderWithinRoutes"),"utf8");
const service=fs.readFileSync(require.resolve("../server/leaderWithinService"),"utf8");

function projection(row,enabled="true"){
 const oldEnabled=process.env.POCKETPT_ENABLED, oldSource=process.env.LEADER_WITHIN_MOVEMENT_SOURCE;
 process.env.POCKETPT_ENABLED=enabled; process.env.LEADER_WITHIN_MOVEMENT_SOURCE="POCKETPT";
 return pocket.resolveLeaderWithinPocketPtMovementState({query:async()=>({rows:row?[row]:[]})},{enrollmentId:1,weekNumber:1,sessionCode:"A",localMovement:"Stretch"}).finally(()=>{if(oldEnabled===undefined)delete process.env.POCKETPT_ENABLED;else process.env.POCKETPT_ENABLED=oldEnabled;if(oldSource===undefined)delete process.env.LEADER_WITHIN_MOVEMENT_SOURCE;else process.env.LEADER_WITHIN_MOVEMENT_SOURCE=oldSource;});
}

test("bounded youth movement projection maps provider states without private detail",async()=>{
 for(const [raw,status,launch] of [["CREATED","NOT_STARTED",true],["IN_PROGRESS","IN_PROGRESS",true],["COMPLETED","COMPLETED",false],["SAFETY_HOLD","SAFETY_HOLD",false]]){
  const out=await projection({status:raw,completed_at:raw==="COMPLETED"?"2026-08-17T01:00:00Z":null}); assert.equal(out.status,status);assert.equal(out.launch_available,launch);assert.deepEqual(Object.keys(out).sort(),["completed_at","display_name","launch_available","movement_source","provider","required","status","status_text"].sort());
 }
 assert.doesNotMatch(JSON.stringify(await projection({status:"SAFETY_HOLD",pain:"secret",readiness:"secret"})),/pain|readiness|secret/i);
});

test("local projection preserves local movement and outage fails safely",async()=>{
 const old=process.env.LEADER_WITHIN_MOVEMENT_SOURCE; process.env.LEADER_WITHIN_MOVEMENT_SOURCE="LOCAL"; const local=await pocket.resolveLeaderWithinPocketPtMovementState({query:async()=>({rows:[]})},{enrollmentId:1,weekNumber:1,sessionCode:"A",localMovement:"Stretch"}); if(old===undefined)delete process.env.LEADER_WITHIN_MOVEMENT_SOURCE;else process.env.LEADER_WITHIN_MOVEMENT_SOURCE=old;
 assert.equal(local.movement_source,"LOCAL");assert.equal(local.display_name,"Stretch");
 const outage=await projection({status:"CREATED"},"false");assert.equal(outage.status,"TEMPORARILY_UNAVAILABLE");assert.equal(outage.launch_available,false);
});

test("youth UI has source-specific, mobile-safe, accessible actions and no Pocket PT bypass",()=>{
 assert.match(routes,/data-movement-source="LOCAL"[\s\S]*Mark Movement Complete/);
 assert.match(routes,/data-movement-source="POCKETPT"[\s\S]*aria-label="Movement status"/);
 assert.match(routes,/Open Pocket PT/); assert.match(routes,/Opening Pocket PT…/); assert.match(routes,/min-height:44px/);
 assert.doesNotMatch(routes.match(/data-movement-source="POCKETPT"[^`]+/)?.[0]||"",/Mark Movement Complete/);
 assert.match(service,/pocketpt_completion_not_allowed/);
});

test("launch browser contract is CSRF protected, minimal, idempotent, and never completes MOVE",()=>{
 assert.match(routes,/r\.use\(requireCsrf\)[\s\S]*\/my-program\/movement\/launch/);
 assert.match(routes,/"x-csrf-token":csrf[\s\S]*credentials:'include'/);
 const src=fs.readFileSync(require.resolve("../server/pocketPtIntegrationService"),"utf8");
 assert.match(src,/ON CONFLICT \(enrollment_id,week_number,session_code,mission_key,provider\)/);
 assert.match(src,/return \{ok:true,movement:\{status:/); assert.doesNotMatch(src.match(/return \{ok:true,movement:\{status:[^\n]+/)?.[0]||"",/assignment_ref|participant_id|enrollment_id|secret/);
 assert.match(src,/status IN \('CREATED','NOT_STARTED'\) THEN 'IN_PROGRESS'/); assert.doesNotMatch(src.match(/async function launch[\s\S]*?function authenticateEvent/)?.[0]||"",/activity_summaries|completion_status/);
});
