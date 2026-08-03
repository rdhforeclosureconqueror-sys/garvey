'use strict';
const {deserializeSessionState,clone}=require('../serialization');
function sessionRow(row){if(!row)return null;return {...row,parent_profile_id:String(row.parent_profile_id),child_id:String(row.child_id),state_json:deserializeSessionState(row.state_json)};}
const json=value=>JSON.stringify(value);
module.exports={sessionRow,json,clone};
