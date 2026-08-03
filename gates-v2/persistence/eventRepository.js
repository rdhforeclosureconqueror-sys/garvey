'use strict';
const { clone }=require('./serialization'); const { fail }=require('./persistenceTypes');
class EventRepository {
 constructor(store){this.store=store;}
 listSessionEvents(sessionId){return clone(this.store.events.filter(x=>x.session_id===sessionId).sort((a,b)=>a.sequence-b.sequence));}
 findIdempotency(sessionId,key){return clone(this.store.idempotency.get(`${sessionId}:${key}`)||null);}
 append(events){for(const event of events){if(this.store.events.some(x=>x.session_id===event.session_id&&x.sequence===event.sequence))fail('EVENT_SEQUENCE_CONFLICT');if(this.store.events.some(x=>x.session_id===event.session_id&&x.idempotency_key===event.idempotency_key))fail('IDEMPOTENCY_CONFLICT');this.store.events.push(clone(event));}return clone(events);}
}
module.exports=EventRepository;
