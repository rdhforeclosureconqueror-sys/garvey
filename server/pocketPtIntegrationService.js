"use strict";

const crypto = require("crypto");

const PROVIDER = "POCKET_PT";
const CONTRACT = "leader_within_pocketpt_bridge_v1";
const VERSION = 1;
const EVENT_STATUSES = new Set(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "SAFETY_HOLD", "TEMPORARILY_UNAVAILABLE", "CANCELLED"]);
const EVENT_TYPES = new Set(["fitness_assignment.not_started", "fitness_assignment.in_progress", "fitness_assignment.completed", "fitness_assignment.safety_hold", "fitness_assignment.temporarily_unavailable", "fitness_assignment.cancelled"]);
const ASSIGNMENT_STATUS = Object.fromEntries([...EVENT_STATUSES].map(status => [status, status]));
const EVENT_FIELDS = new Set(["contract", "contract_version", "event_id", "event_type", "provider", "source_application", "assignment_ref", "status", "completed_at"]);
const YOUTH_STATUSES = new Set(["NOT_CONNECTED","CONNECTED_NO_PROFILE","PROFILE_READY","PROGRAM_READY","NOT_ASSIGNED","NOT_STARTED","IN_PROGRESS","COMPLETED","SAFETY_HOLD","TEMPORARILY_UNAVAILABLE","COACH_REVIEW","CANCELLED"]);
const STATUS_COPY = Object.freeze({NOT_CONNECTED:"Pocket PT is not connected yet.",CONNECTED_NO_PROFILE:"Your fitness profile is still being prepared.",PROFILE_READY:"Your fitness program is being prepared.",PROGRAM_READY:"Your next movement mission is being prepared.",NOT_ASSIGNED:"Your next movement mission is being prepared.",NOT_STARTED:"Your Pocket PT movement mission is ready.",IN_PROGRESS:"Your Pocket PT movement mission is in progress.",COMPLETED:"Movement Mission Complete",SAFETY_HOLD:"Check with your coach or supervising adult before continuing this movement mission.",TEMPORARILY_UNAVAILABLE:"Pocket PT is temporarily unavailable. Your progress is safe. Try again later.",COACH_REVIEW:"Your movement mission needs coach review before continuing.",CANCELLED:"This movement mission is no longer active."});
const FACILITATOR_STATUS_COPY = Object.freeze({NOT_CONNECTED:"Not connected",CONNECTED_NO_PROFILE:"Fitness profile not ready",PROFILE_READY:"Fitness program being prepared",PROGRAM_READY:"Ready for assignment",NOT_ASSIGNED:"Not assigned",NOT_STARTED:"Not started",IN_PROGRESS:"In progress",COMPLETED:"Completed",SAFETY_HOLD:"Safety hold",TEMPORARILY_UNAVAILABLE:"Temporarily unavailable",COACH_REVIEW:"Coach review",CANCELLED:"Cancelled"});

function integrationError(status, code, message) { const error=new Error(message); error.status=status; error.code=code; error.stage="pocketpt_integration"; return error; }
function base64url(value) { return Buffer.from(value).toString("base64url"); }
function secret(name) { const value=String(process.env[name]||""); if(!value) throw integrationError(503,"pocketpt_integration_unavailable","Pocket PT integration is not configured."); return value; }
function signLaunchToken(payload, key=secret("POCKETPT_LAUNCH_SIGNING_SECRET")) {
  const header=base64url(JSON.stringify({alg:"HS256",typ:"JWT",kid:process.env.POCKETPT_SIGNING_KEY_ID||"garvey-v1"}));
  const body=base64url(JSON.stringify(payload));
  const signature=crypto.createHmac("sha256",key).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}
function opaqueRef(prefix) { return `${prefix}-${crypto.randomBytes(18).toString("base64url")}`; }
function canonicalEventBody(body) { return JSON.stringify(body); }
function expectedEventSignature(body, timestamp, key=secret("POCKETPT_EVENT_SIGNING_SECRET")) { return crypto.createHmac("sha256",key).update(`${timestamp}.${canonicalEventBody(body)}`).digest("hex"); }
function safeEqual(a,b) { const x=Buffer.from(String(a||"")), y=Buffer.from(String(b||"")); return x.length===y.length && crypto.timingSafeEqual(x,y); }

function validateEvent(body) {
  if(!body || typeof body!=="object" || Array.isArray(body)) throw integrationError(400,"pocketpt_event_invalid","The Pocket PT event is invalid.");
  if(body.contract!==CONTRACT || Number(body.contract_version)!==VERSION) throw integrationError(400,"pocketpt_event_version_unsupported","The Pocket PT event version is unsupported.");
  if(Object.keys(body).some(field=>!EVENT_FIELDS.has(field))) throw integrationError(400,"pocketpt_event_invalid","The Pocket PT event contains unsupported data.");
  if(!/^ppt_evt_[A-Za-z0-9_-]{6,}$/.test(String(body.event_id||"")) || body.provider!==PROVIDER || !/^LWFA-[A-Za-z0-9_-]{8,}$/.test(String(body.assignment_ref||""))) throw integrationError(400,"pocketpt_event_invalid","The Pocket PT event is invalid.");
  if(body.source_application!=="pocketpt" || !EVENT_TYPES.has(body.event_type)) throw integrationError(400,"pocketpt_event_invalid","The Pocket PT event type is invalid.");
  if(!EVENT_STATUSES.has(body.status)) throw integrationError(400,"pocketpt_status_invalid","The Pocket PT status is invalid.");
  const expectedType=`fitness_assignment.${body.status.toLowerCase()}`;
  if(body.event_type!==expectedType) throw integrationError(400,"pocketpt_event_invalid","The Pocket PT event type and status do not match.");
  if(body.status==="COMPLETED" && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(String(body.completed_at||"")) || Number.isNaN(Date.parse(body.completed_at)))) throw integrationError(400,"pocketpt_event_invalid","A UTC RFC 3339 completion time is required.");
  if(body.status!=="COMPLETED" && body.completed_at!==undefined) throw integrationError(400,"pocketpt_event_invalid","Only completion events may include completed_at.");
  return body;
}

function buildLaunchClaims({assignmentRef, subjectRef, week, session, now=Math.floor(Date.now()/1000), jti=crypto.randomUUID(), returnUrl=String(process.env.POCKETPT_RETURN_URL||"/the-leader-within/my-program")}) {
  return {contract:CONTRACT,contract_version:VERSION,iss:"GARVEY",aud:"POCKET_PT",assignment_ref:assignmentRef,subject_ref:subjectRef,provider:PROVIDER,source_application:"leader_within",requirement_type:"POCKET_PT_SESSION",leader_within_context:{week:Number(week),session:String(session).toUpperCase()},return_url:returnUrl,iat:now,exp:now+300,jti};
}

function boundedStatus(raw) { const status=String(raw||"").toUpperCase(); if(status==="CREATED") return "NOT_STARTED"; if(status==="LAUNCHED") return "IN_PROGRESS"; return YOUTH_STATUSES.has(status)?status:"TEMPORARILY_UNAVAILABLE"; }
async function resolveLeaderWithinPocketPtMovementState(pool,{enrollmentId,weekNumber,sessionCode,localMovement,completed=false}={}) {
  let assignment; try { assignment=(await pool.query(`SELECT status,completed_at FROM leader_within_external_fitness_assignments WHERE enrollment_id=$1 AND week_number=$2 AND session_code=$3 AND provider='POCKET_PT' ORDER BY id DESC LIMIT 1`,[enrollmentId,Number(weekNumber),String(sessionCode||"A").toUpperCase()])).rows[0]; } catch(error) { if(!String(error?.message||"").includes("unexpected SQL")) throw error; }
  const configured=String(process.env.LEADER_WITHIN_MOVEMENT_SOURCE||"LOCAL").toUpperCase()==="POCKETPT";
  if(!assignment&&!configured) return {movement_source:"LOCAL",required:true,provider:null,status:completed?"COMPLETED":"NOT_STARTED",status_text:completed?"Movement Mission Complete":"Ready",launch_available:false,display_name:String(localMovement||"Movement mission"),completed_at:null};
  let status=boundedStatus(assignment?.status||"NOT_STARTED");
  if(String(process.env.POCKETPT_ENABLED||"false").toLowerCase()!=="true" && status!=="COMPLETED" && status!=="SAFETY_HOLD") status="TEMPORARILY_UNAVAILABLE";
  return {movement_source:"POCKETPT",required:true,provider:"Pocket PT",status,status_text:STATUS_COPY[status],launch_available:["NOT_STARTED","IN_PROGRESS"].includes(status),display_name:"Complete today's Pocket PT movement mission.",completed_at:assignment?.completed_at||null};
}

async function resolveFacilitatorPocketPtMovementState(pool, options={}) {
  const state=await resolveLeaderWithinPocketPtMovementState(pool,options);
  const pocketPt=state.movement_source==="POCKETPT";
  const verified=pocketPt&&state.status==="COMPLETED";
  return {movement_source:state.movement_source,required:state.required===true,provider:pocketPt?"Pocket PT":null,status:state.status,status_text:pocketPt?FACILITATOR_STATUS_COPY[state.status]||FACILITATOR_STATUS_COPY.TEMPORARILY_UNAVAILABLE:(state.status==="COMPLETED"?"Complete":"Not complete"),verified,completed_at:verified?state.completed_at:null,source_label:pocketPt?(verified?"Verified Pocket PT session":"Pocket PT"):"Leader Within",mission:pocketPt?null:String(options.localMovement||"Movement mission"),follow_up_recommended:state.status==="SAFETY_HOLD"};
}

async function launch(pool, req) {
  const actor=req.leaderWithinYouthActor;
  if(!actor?.authenticated || !actor.participant_id || !actor.active_enrollment_id) throw integrationError(401,"session_missing","A valid youth session is required.");
  if(String(process.env.POCKETPT_ENABLED||"false").toLowerCase()!=="true") throw integrationError(503,"pocketpt_integration_unavailable","Pocket PT integration is not available.");
  const row=(await pool.query(`SELECT e.id enrollment_id,e.leader_within_participant_id participant_id,e.cohort_id,e.program_id,e.status enrollment_status,c.status cohort_status,COALESCE(c.current_week,e.current_week,1) week_number,COALESCE(c.current_session,e.current_session,'A') session_code FROM leader_within_program_enrollments e JOIN leader_within_cohorts c ON c.id=e.cohort_id WHERE e.id=$1 AND e.leader_within_participant_id=$2 LIMIT 1`,[actor.active_enrollment_id,actor.participant_id])).rows[0];
  if(!row || row.enrollment_status!=="active" || row.cohort_status!=="active") throw integrationError(403,"pocketpt_completion_not_allowed","The Leader Within enrollment is not eligible.");
  const subject=(await pool.query(`INSERT INTO leader_within_integration_subjects (subject_ref,participant_id) VALUES ($1,$2) ON CONFLICT (participant_id,source_application) DO UPDATE SET participant_id=EXCLUDED.participant_id RETURNING subject_ref`,[opaqueRef("LWIS"),row.participant_id])).rows[0];
  const missionKey=`week-${row.week_number}-movement`;
  const assignment=(await pool.query(`INSERT INTO leader_within_external_fitness_assignments (assignment_ref,participant_id,enrollment_id,cohort_id,pathway_id,week_number,session_code,mission_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (enrollment_id,week_number,session_code,mission_key,provider) DO UPDATE SET updated_at=NOW() RETURNING *`,[opaqueRef("LWFA"),row.participant_id,row.enrollment_id,row.cohort_id,row.program_id,row.week_number,String(row.session_code).toUpperCase(),missionKey])).rows[0];
  if(!["CREATED","NOT_STARTED","IN_PROGRESS","LAUNCHED"].includes(String(assignment.status))) { const code=assignment.status==="SAFETY_HOLD"?"pocketpt_safety_hold":"pocketpt_launch_unavailable"; throw integrationError(409,code,assignment.status==="SAFETY_HOLD"?STATUS_COPY.SAFETY_HOLD:"This Pocket PT movement mission cannot be opened right now."); }
  const payload=buildLaunchClaims({assignmentRef:assignment.assignment_ref,subjectRef:subject.subject_ref,week:row.week_number,session:row.session_code});
  const {jti}=payload;
  await pool.query(`UPDATE leader_within_external_fitness_assignments SET status=CASE WHEN status IN ('CREATED','NOT_STARTED') THEN 'IN_PROGRESS' ELSE status END,launched_at=COALESCE(launched_at,NOW()),started_at=COALESCE(started_at,NOW()),updated_at=NOW() WHERE id=$1`,[assignment.id]);
  await pool.query(`INSERT INTO leader_within_audit_events (tenant_id,participant_id,cohort_id,event_type,metadata) SELECT tenant_id,$1,$2,'pocketpt_launch_issued',$3::jsonb FROM leader_within_program_enrollments WHERE id=$4`,[row.participant_id,row.cohort_id,JSON.stringify({assignment_ref:assignment.assignment_ref,jti}),row.enrollment_id]);
  const base=String(process.env.POCKETPT_BASE_URL||"").replace(/\/$/,"");
  if(!/^https:\/\//.test(base) && process.env.NODE_ENV==="production") throw integrationError(503,"pocketpt_integration_unavailable","Pocket PT integration is not configured securely.");
  const token=signLaunchToken(payload);
  return {ok:true,movement:{status:assignment.status==="COMPLETED"?"COMPLETED":"IN_PROGRESS",provider:"POCKETPT"},launch_url:`${base}/integrations/garvey/launch?context=${encodeURIComponent(token)}`};
}

function authenticateEvent(req) {
  if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.["content-type"]||""))) throw integrationError(415,"pocketpt_event_invalid","Pocket PT events require application/json.");
  const timestamp=String(req.headers?.["x-pocketpt-timestamp"]||"");
  const signature=String(req.headers?.["x-pocketpt-signature"]||"").replace(/^sha256=/,"");
  const issuer=String(req.headers?.["x-pocketpt-issuer"]||"");
  const audience=String(req.headers?.["x-pocketpt-audience"]||"");
  if(!timestamp || !signature) throw integrationError(401,"pocketpt_auth_failed","Pocket PT authentication is required.");
  if(issuer!=="POCKET_PT") throw integrationError(401,"pocketpt_auth_failed","Pocket PT issuer is invalid.");
  if(audience!=="GARVEY") throw integrationError(401,"pocketpt_auth_failed","Pocket PT audience is invalid.");
  const occurred=Date.parse(timestamp); if(Number.isNaN(occurred)||Math.abs(Date.now()-occurred)>5*60*1000) throw integrationError(401,"pocketpt_event_replayed","The Pocket PT event timestamp is outside the allowed window.");
  if(!safeEqual(signature,expectedEventSignature(req.body,timestamp))) throw integrationError(401,"pocketpt_signature_invalid","The Pocket PT signature is invalid.");
}

async function receiveEvent(pool, req) {
  authenticateEvent(req); const event=validateEvent(req.body); let client=pool, tx=false;
  try {
    if(pool.connect){client=await pool.connect(); await client.query("BEGIN"); tx=true;}
    const inserted=(await client.query(`INSERT INTO leader_within_integration_events (event_id,event_type,provider,assignment_ref,status,integration_version,occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (provider,event_id) DO NOTHING RETURNING id`,[event.event_id,event.event_type,PROVIDER,event.assignment_ref,event.status,VERSION,event.completed_at||null])).rows[0];
    if(!inserted){if(tx)await client.query("COMMIT"); return {ok:true,accepted:true,idempotent:true,event_id:event.event_id};}
    const assignment=(await client.query(`SELECT a.*,e.status enrollment_status,c.status cohort_status FROM leader_within_external_fitness_assignments a JOIN leader_within_program_enrollments e ON e.id=a.enrollment_id JOIN leader_within_cohorts c ON c.id=a.cohort_id WHERE a.assignment_ref=$1 FOR UPDATE`,[event.assignment_ref])).rows[0];
    if(!assignment) throw integrationError(404,"pocketpt_assignment_not_found","The Pocket PT assignment was not found.");
    if(assignment.provider!==PROVIDER) throw integrationError(409,"pocketpt_assignment_provider_mismatch","The assignment provider does not match.");
    if(assignment.enrollment_status!=="active" || assignment.cohort_status!=="active") throw integrationError(409,"pocketpt_completion_not_allowed","The assignment is not eligible for updates.");
    const completedAt=event.status==="COMPLETED"?event.completed_at:null;
    await client.query(`UPDATE leader_within_external_fitness_assignments SET status=CASE WHEN status='COMPLETED' THEN status ELSE $1 END,started_at=CASE WHEN $1='IN_PROGRESS' THEN COALESCE(started_at,NOW()) ELSE started_at END,completed_at=CASE WHEN $1='COMPLETED' THEN COALESCE(completed_at,$2::timestamptz) ELSE completed_at END,completion_source=CASE WHEN $1='COMPLETED' THEN 'POCKET_PT' ELSE completion_source END,last_provider_sync_at=NOW(),provider_event_id=$3,updated_at=NOW() WHERE id=$4`,[ASSIGNMENT_STATUS[event.status],completedAt,event.event_id,assignment.id]);
    if(event.status==="COMPLETED") await client.query(`INSERT INTO leader_within_pocketpt_activity_summaries (enrollment_id,week_number,session_code,assignment_status,completion_status,completed_at) SELECT $1,$2,$3,'verified_pocketpt','completed',$4::timestamptz WHERE NOT EXISTS (SELECT 1 FROM leader_within_pocketpt_activity_summaries WHERE enrollment_id=$1 AND week_number=$2 AND session_code=$3 AND completion_status='completed')`,[assignment.enrollment_id,assignment.week_number,assignment.session_code,completedAt]);
    await client.query(`UPDATE leader_within_integration_events SET processed_at=NOW(),processing_result='APPLIED' WHERE id=$1`,[inserted.id]);
    await client.query(`INSERT INTO leader_within_audit_events (participant_id,cohort_id,event_type,metadata) VALUES ($1,$2,$3,$4::jsonb)`,[assignment.participant_id,assignment.cohort_id,event.status==="COMPLETED"?"pocketpt_completion_applied":"pocketpt_status_received",JSON.stringify({assignment_ref:event.assignment_ref,event_id:event.event_id,status:event.status})]);
    if(tx)await client.query("COMMIT"); return {ok:true,accepted:true,idempotent:false,event_id:event.event_id,status:event.status};
  } catch(error) { if(tx)await client.query("ROLLBACK").catch(()=>{}); throw error; } finally { if(client!==pool&&client.release)client.release(); }
}

module.exports={CONTRACT,VERSION,PROVIDER,EVENT_STATUSES,EVENT_FIELDS,YOUTH_STATUSES,STATUS_COPY,FACILITATOR_STATUS_COPY,boundedStatus,resolveLeaderWithinPocketPtMovementState,resolveFacilitatorPocketPtMovementState,buildLaunchClaims,canonicalEventBody,validateEvent,signLaunchToken,expectedEventSignature,authenticateEvent,launch,receiveEvent};
