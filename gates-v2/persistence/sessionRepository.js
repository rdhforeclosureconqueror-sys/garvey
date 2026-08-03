'use strict';
const registry=require('../domain/gateRegistry'); const {clone,deserializeSessionState}=require('./serialization'); const {fail}=require('./persistenceTypes');
const STATUSES=new Set(['active','paused','completed','abandoned']);
class SessionRepository {
 constructor(store,releases){this.store=store;this.releases=releases;}
 createSession(input){for(const k of ['session_id','parent_profile_id','child_id','gate_id','experience_id','release_id','experience_version','age_band','locale','state_json','created_at'])if(input[k]===undefined||input[k]===null||input[k]==='')fail(k.includes('parent')?'SESSION_OWNERSHIP_MISMATCH':k==='child_id'?'CHILD_OWNERSHIP_MISMATCH':'INVALID_SESSION',`Missing ${k}`);if(!registry.getById(input.gate_id))fail('INVALID_GATE_ID');this.releases.getForNewSession(input.release_id);const state=deserializeSessionState(input.state_json);const status=input.status||state.status;if(!STATUSES.has(status))fail('INVALID_SESSION_STATUS');if(this.store.sessions.has(input.session_id))fail('SESSION_ALREADY_EXISTS');const row={revision:state.revision,status,feature_variant_json:{},narration_variant_id:null,started_at:input.created_at,updated_at:input.created_at,completed_at:null,abandoned_at:null,...clone(input),state_json:clone(state)};this.store.sessions.set(row.session_id,row);return clone(row);}
 getSessionById(id){const r=this.store.sessions.get(id);if(!r)fail('SESSION_NOT_FOUND');return {...clone(r),state_json:deserializeSessionState(r.state_json)};}
 getOwnedSession({session_id,parent_profile_id,child_id}){const r=this.getSessionById(session_id);if(r.parent_profile_id!==parent_profile_id)fail('SESSION_OWNERSHIP_MISMATCH');if(r.child_id!==child_id)fail('CHILD_OWNERSHIP_MISMATCH');return r;}
 listChildSessions({parent_profile_id,child_id}){return [...this.store.sessions.values()].filter(x=>x.parent_profile_id===parent_profile_id&&x.child_id===child_id).map(clone);}
 resumeSession(ctx){const r=this.getOwnedSession(ctx);this.releases.getPinned(r.release_id);return r;}
 markSessionPaused(ctx){return this._status(ctx,'paused');} markSessionAbandoned(ctx){return this._status(ctx,'abandoned');}
 _status(ctx,status){const r=this.getOwnedSession(ctx);if(r.revision!==ctx.expected_revision)fail('SESSION_REVISION_CONFLICT');r.status=status;r.state_json.status=status;r.revision++;r.state_json.revision=r.revision;r.updated_at=ctx.at;if(status==='abandoned')r.abandoned_at=ctx.at;this.store.sessions.set(r.session_id,r);return clone(r);}
}
module.exports=SessionRepository;
