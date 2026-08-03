'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),reduce=require('../../gates-v2/engine/reducer');const {experience,startInput}=require('./reducer-engine-helpers');
test('events have stable ordering, identity, and revision',()=>{const x=experience(),r=reduce({experience:x,session:startInput(),action:{type:'START_EXPERIENCE'}});assert.equal(new Set(r.events.map(JSON.stringify)).size,r.events.length);for(const event of r.events){assert.equal(event.session_id,'session-1');assert.equal(event.revision,1);assert.equal(event.experience_id,x.experience_id)}});
