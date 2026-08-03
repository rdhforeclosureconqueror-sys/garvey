'use strict';
const q=require('./postgresQueries');const {fail}=require('../persistenceTypes');
class PostgresEventRepository{
 constructor(db){this.db=db;}
 async listSessionEvents(id,client=this.db){return (await client.query(q.events,[id])).rows;}
 async append(events,client=this.db){try{for(const e of events)await client.query(`INSERT INTO gates_v2_experience_events(event_id,session_id,sequence,event_type,idempotency_key,event_json,occurred_at,received_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[e.event_id,e.session_id,e.sequence,e.event_type,e.idempotency_key,e.event_json,e.occurred_at,e.received_at]);return events;}catch(e){if(e.code==='23505'){if(String(e.constraint||'').includes('sequence'))fail('EVENT_SEQUENCE_CONFLICT');fail('IDEMPOTENCY_CONFLICT');}throw e;}}
}
module.exports=PostgresEventRepository;
