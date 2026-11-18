"use strict";
// Server-only pre-mount gate. No new Express route until actual session and
// session-bound CSRF providers are connected and tested end to end.
const { saveActivityEvidence,readActivityEvidence } = require("./garveyActivityEvidenceRepository");
function createGarveyActivityEvidenceController({pool,resolveParentSession,resolveOwnedChild,verifyCsrf,expectedOrigin,enabled=false,save=saveActivityEvidence,read=readActivityEvidence}={}) {
  for(const [name,fn] of Object.entries({resolveParentSession,resolveOwnedChild,verifyCsrf,save,read}))
    if(typeof fn!=="function")throw new TypeError(name+" required");
  let origin;
  try{
    const u=new URL(expectedOrigin);
    if(u.protocol!=="https:" || u.origin!==expectedOrigin || u.pathname!=="/" || u.search || u.hash || u.username || u.password)throw new Error();
    origin=u.origin;
  }catch(_){throw new TypeError("canonical HTTPS origin required")}
  async function prepare(req,mutation) {
    if(enabled!==true)return {status:404,body:{ok:false,error:"not_found"}};
    const childId=req?.params?.childId;
    if(!/^[1-9][0-9]*$/.test(String(childId??"")))return {status:400,body:{ok:false,error:"invalid_child"}};
    const actor=await resolveParentSession(req,{pool});
    if(actor?.authenticated!==true || !actor.parentProfile || !/^[1-9][0-9]*$/.test(String(actor.parentProfile.id??"")))
      return {status:401,body:{ok:false,error:"unauthenticated"}};
    const ownedChild=await resolveOwnedChild({pool,parentProfileId:actor.parentProfile.id,childId});
    if(ownedChild?.ok!==true || String(ownedChild.learnerId)!==String(childId) ||
      String(ownedChild.row?.id)!==String(childId) ||
      String(ownedChild.row?.parent_id)!==String(actor.parentProfile.id))
      return {status:403,body:{ok:false,error:"forbidden"}};
    if(mutation){
      if(req.headers?.origin!==origin)return {status:403,body:{ok:false,error:"invalid_origin"}};
      if(!/^application\/json(?:;|$)/i.test(String(req.headers?.["content-type"]||"")))
        return {status:415,body:{ok:false,error:"unsupported_media_type"}};
      if(await verifyCsrf(req,actor)!==true)return {status:403,body:{ok:false,error:"csrf_required"}};
    }
    return {actor,ownedChild};
  }
  async function write(req){
    const gate=await prepare(req,true);if(gate.status)return gate;
    if(!req.body||typeof req.body!=="object"||Array.isArray(req.body)||!req.body.event)
      return {status:400,body:{ok:false,error:"activity_event_required"}};
    const result=await save({pool,actor:gate.actor,ownedChild:gate.ownedChild,event:req.body.event});
    return {status:result.ok?200:(result.error==="caregiver_consent_required"?403:400),body:result};
  }
  async function list(req){
    const gate=await prepare(req,false);if(gate.status)return gate;
    const result=await read({pool,actor:gate.actor,ownedChild:gate.ownedChild});
    return {status:result.ok?200:403,body:result};
  }
  return {write,list};
}
module.exports={createGarveyActivityEvidenceController};
