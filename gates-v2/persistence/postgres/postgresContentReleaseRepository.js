'use strict';
const q=require('./postgresQueries');const {fail}=require('../persistenceTypes');
class PostgresContentReleaseRepository{
 constructor(db){this.db=db;}
 async createRelease(input,client=this.db){try{return (await client.query(`INSERT INTO gates_v2_content_releases(release_id,release_version,status,manifest_json,manifest_hash,approval_bundle_json,created_at) VALUES($1,$2,'draft',$3,$4,$5,$6) RETURNING *`,[input.release_id,input.release_version,input.manifest_json,input.manifest_hash,input.approval_bundle_json||{},input.created_at])).rows[0];}catch(e){if(e.code==='23505')fail('CONTENT_RELEASE_CONFLICT');throw e;}}
 async getById(id,client=this.db){const row=(await client.query(q.pinnedRelease,[id])).rows[0];if(!row)fail('CONTENT_RELEASE_NOT_FOUND');return row;}
 async getForNewSession(id,client=this.db){const row=await this.getById(id,client);if(row.status==='retired')fail('CONTENT_RELEASE_RETIRED');if(row.status==='safety_withdrawn'||row.safety_withdrawn_at)fail('CONTENT_RELEASE_SAFETY_WITHDRAWN');if(row.status!=='published')fail('CONTENT_RELEASE_NOT_PUBLISHED');return row;}
 async getPinned(id,client=this.db){const row=await this.getById(id,client);if(row.status==='safety_withdrawn'||row.safety_withdrawn_at)fail('CONTENT_RELEASE_SAFETY_WITHDRAWN');return row;}
 async selectOfferedRelease(client=this.db){const row=(await client.query(q.offeredReleases)).rows[0];if(!row)fail('CONTENT_RELEASE_NOT_FOUND');return row;}
 async setStatus(id,status,at,reason=null,client=this.db){const row=(await client.query(`UPDATE gates_v2_content_releases SET status=$2,published_at=CASE WHEN $2='published' THEN $3 ELSE published_at END,retired_at=CASE WHEN $2='retired' THEN $3 ELSE retired_at END,safety_withdrawn_at=CASE WHEN $2='safety_withdrawn' THEN $3 ELSE safety_withdrawn_at END,safety_withdrawal_reason=CASE WHEN $2='safety_withdrawn' THEN $4 ELSE safety_withdrawal_reason END WHERE release_id=$1 RETURNING *`,[id,status,at,reason])).rows[0];if(!row)fail('CONTENT_RELEASE_NOT_FOUND');return row;}
}
module.exports=PostgresContentReleaseRepository;
