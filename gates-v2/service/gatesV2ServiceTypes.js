'use strict';
const REQUIRED_CONTEXT=Object.freeze(['parent_profile_id','child_id','ownership_verified','feature_flags']);
function validateContext(context){return Boolean(context&&REQUIRED_CONTEXT.every(k=>context[k]!==undefined)&&context.ownership_verified===true);}
module.exports={REQUIRED_CONTEXT,validateContext};
