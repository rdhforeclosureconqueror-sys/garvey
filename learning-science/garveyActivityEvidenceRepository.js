"use strict";
// Not mounted. Existing garvey_learning_activity_events table is the only destination.
// All identities and caregiver consent must be server-resolved.
const { verifyLearningHistoryConsent, PURPOSE } = require("./verifyLearningHistoryConsent");
const { resolveStoredChildConsent } = require("./childConsentRepository");
const AREAS = Object.freeze({"rainbow-syllables":"phonics","rainbow-writing":"writing","rainbow-grammar":"grammar","word-power":"vocabulary","word-detective":"vocabulary","mission-planner":"executive_support"});
const TYPES = new Set(["task_started","rule_changed","answer_submitted","retry","hint_used","support_used","plan_revised","reflection_submitted","activity_completed"]);
const OUTCOMES = new Set(["correct","incorrect","unscored","not_applicable"]);
const TAGS = new Set(["sequencing","rule_switching","working_hold","selective_attention","self_reflection","persistence","language_explanation","symbolic_translation"]);
const SUPPORTS = new Set(["none","read_aloud","visual","example","hint","chunking"]);
const CODES = new Set(["SR","RS","PS","FB","CQ","CR","DE"]);
const REFLECTIONS = new Set(["planned_first","read_rule","tried_again","used_feedback","used_support","changed_strategy","want_more_practice","ready_to_continue"]);
const id = v => typeof v === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(v);
const positive = v => /^[1-9][0-9]*$/.test(String(v ?? "")) ? String(v) : null;
const allowed = (v,set) => Array.isArray(v) && v.length<=12 && v.every(x=>set.has(x));
function verifyIdentity(actor, ownedChild) {
  const parentId=positive(actor?.parentProfile?.id), childId=positive(ownedChild?.learnerId), userId=positive(actor?.authUserId);
  if(actor?.authenticated!==true || ownedChild?.ok!==true || !parentId || !childId || !userId ||
    positive(ownedChild?.row?.id)!==childId || positive(ownedChild?.row?.parent_id)!==parentId) throw new TypeError("verified canonical parent and child required");
  return {parentId,childId,userId};
}
function validateEvent(e) {
  if(!e || typeof e!=="object" || Array.isArray(e) || e.schema_version!=="1" || e.event_name!=="garvey_activity_event" ||
    !Object.prototype.hasOwnProperty.call(AREAS,e.activity_id) || !TYPES.has(e.event_type) || !id(e.task_id) ||
    (e.rule_id!=null&&!id(e.rule_id))) return null;
  if(typeof e.session_id!=="string" || !/^[a-zA-Z0-9_-]{8,120}$/.test(e.session_id) ||
    typeof e.event_key!=="string" || e.event_key.length>160 || !e.event_key.startsWith(e.session_id+":") ||
    !/^[1-9][0-9]{0,3}$/.test(e.event_key.slice(e.session_id.length+1))) return null;
  const a=e.academic, x=e.executive_practice,g=e.genius_exploration;
  if(!a || a.skill_area!==AREAS[e.activity_id] || (a.skill_id!=null&&!id(a.skill_id)) || !OUTCOMES.has(a.outcome) ||
    !x || !allowed(x.practice_tags,TAGS) || !allowed(x.support_used,SUPPORTS) ||
    (x.attempt_number!=null&&(!Number.isInteger(x.attempt_number)||x.attempt_number<1||x.attempt_number>999)) ||
    !g || g.evidence_level!=="opportunity_only" || !allowed(g.opportunity_codes,CODES) ||
    (e.reflection_choice!=null&&!REFLECTIONS.has(e.reflection_choice)) ||
    (e.event_type==="reflection_submitted"&&e.reflection_choice==null) ||
    typeof e.occurred_at!=="string" || !Number.isFinite(Date.parse(e.occurred_at)) ||
    !/(Z|[+-][0-9]{2}:[0-9]{2})$/.test(e.occurred_at)) return null;
  // Explicitly projected fields: no raw essays, names, free-text answers or self-reported scores.
  return {event_key:e.event_key,session_id:e.session_id,activity_id:e.activity_id,task_id:e.task_id,
    event_type:e.event_type,skill_id:a.skill_id||null,
    academic:{skill_area:a.skill_area,skill_id:a.skill_id||null,outcome:a.outcome},
    executive_practice:{attempt_number:x.attempt_number??null,practice_tags:[...new Set(x.practice_tags)],support_used:[...new Set(x.support_used)]},
    genius_exploration:{opportunity_codes:[...new Set(g.opportunity_codes)],evidence_level:"opportunity_only"},
    reflection_choice:e.reflection_choice??null,occurred_at:e.occurred_at};
}
function consentOk(row,parentId,childId) {
  if(!row)return false;
  const fmt=v=>v instanceof Date?v.toISOString():v;
  return verifyLearningHistoryConsent({...row,parent_profile_id:parentId,learner_id:childId,
    granted_at:fmt(row.granted_at),revoked_at:fmt(row.revoked_at),expires_at:fmt(row.expires_at)},
    {parentId,learnerId:childId});
}
async function saveActivityEvidence({pool,actor,ownedChild,event}={}) {
  if(!pool||typeof pool.connect!=="function")throw new TypeError("transactional pool required");
  const {parentId,childId,userId}=verifyIdentity(actor,ownedChild);
  const item=validateEvent(event);if(!item)return {ok:false,error:"invalid_activity_event"};
  const client=await pool.connect();let open=false;
  try{
    await client.query("BEGIN");open=true;
    const owner=await client.query("SELECT id FROM gates_child_profiles WHERE id=$1 AND parent_id=$2 FOR UPDATE",[childId,parentId]);
    if(owner.rowCount!==1){await client.query("ROLLBACK");open=false;return {ok:false,error:"forbidden"}}
    const consent=await client.query("SELECT purpose,version,status,granted_at,revoked_at,expires_at FROM garvey_child_learning_consent WHERE parent_profile_id=$1 AND learner_id=$2 AND purpose=$3 FOR UPDATE",[parentId,childId,PURPOSE]);
    if(!consentOk(consent.rows?.[0],parentId,childId)){await client.query("ROLLBACK");open=false;return {ok:false,error:"caregiver_consent_required"}}
    const observation={schema_version:"garvey_bridge_v1",event_type:item.event_type,task_id:item.task_id,
      academic:item.academic,executive_practice:item.executive_practice,
      genius_exploration:item.genius_exploration,reflection_choice:item.reflection_choice,occurred_at:item.occurred_at};
    const inserted=await client.query("INSERT INTO garvey_learning_activity_events (child_id,parent_profile_id,auth_user_id,event_key,event_type,session_id,activity_id,skill_id,duration_seconds,practice_tags,genius_dimension_codes,observation) VALUES ($1,$2,$3,$4,'learning_activity',$5,$6,$7,0,$8::jsonb,$9::jsonb,$10::jsonb) ON CONFLICT (child_id,event_key) DO NOTHING RETURNING event_key",
      [childId,parentId,userId,item.event_key,item.session_id,item.activity_id,item.skill_id,
       JSON.stringify(item.executive_practice.practice_tags),JSON.stringify(item.genius_exploration.opportunity_codes),JSON.stringify(observation)]);
    await client.query("COMMIT");open=false;
    return {ok:true,saved:inserted.rowCount===1,duplicate:inserted.rowCount!==1};
  }catch(err){if(open)await client.query("ROLLBACK");throw err}finally{client.release()}
}
async function readActivityEvidence({pool,actor,ownedChild,limit=40}={}) {
  if(!pool||typeof pool.query!=="function")throw new TypeError("pool required");
  const {parentId,childId}=verifyIdentity(actor,ownedChild);
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new TypeError("invalid limit");
  const consent=await resolveStoredChildConsent({pool,parentProfileId:parentId,learnerId:childId});
  if(!consentOk(consent,parentId,childId))return {ok:false,error:"caregiver_consent_required",events:[]};
  const result=await pool.query("SELECT event_key,session_id,activity_id,skill_id,practice_tags,genius_dimension_codes,observation,created_at FROM garvey_learning_activity_events WHERE child_id=$1 AND parent_profile_id=$2 AND event_type='learning_activity' AND observation->>'schema_version'='garvey_bridge_v1' ORDER BY created_at DESC,id DESC LIMIT $3",[childId,parentId,limit]);
  return {ok:true,events:(result.rows||[]).map(r=>({event_key:r.event_key,session_id:r.session_id,
    activity_id:r.activity_id,skill_id:r.skill_id,practice_tags:r.practice_tags,
    opportunity_codes:r.genius_dimension_codes,observed_event_type:r.observation?.event_type,
    academic:r.observation?.academic,executive_practice:r.observation?.executive_practice,
    reflection_choice:r.observation?.reflection_choice,occurred_at:r.observation?.occurred_at}))};
}
module.exports={validateEvent,verifyIdentity,saveActivityEvidence,readActivityEvidence,AREAS};
