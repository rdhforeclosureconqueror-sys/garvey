'use strict';
const q=require('./postgresQueries');const {fail}=require('../persistenceTypes');
class PostgresIdempotencyRepository{
 constructor(db){this.db=db;}
 async find(session,key,client=this.db){return (await client.query(q.idempotency,[session,key])).rows[0]||null;}
 async store(record,client=this.db){try{return (await client.query(`INSERT INTO gates_v2_idempotency_records(session_id,idempotency_key,request_hash,response_json,resulting_revision) VALUES($1,$2,$3,$4,$5) RETURNING *`,[record.session_id,record.idempotency_key,record.request_hash,record.response_json,record.resulting_revision])).rows[0];}catch(e){if(e.code==='23505')fail('IDEMPOTENCY_CONFLICT');throw e;}}
}
module.exports=PostgresIdempotencyRepository;
