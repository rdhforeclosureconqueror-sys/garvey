'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const gate=require('../../public/gamehub/content/adinkra-gate1.js');
test('seven distinct daily Adinkra lessons remain in rite-of-passage gate',()=>{assert.equal(gate.validate(),true);assert.deepEqual(gate.lessons.map(x=>x.day),[1,2,3,4,5,6,7]);assert.equal(gate.getDay(1).symbol_name,'Mate Masie');assert.equal(gate.getDay(7).symbol_name,'Sankofa');assert.equal(gate.getDay(0),null);assert.ok(gate.lessons.every(x=>x.gate_id==='gate_attention'));assert.ok(gate.lessons.every(x=>x.review_status==='draft_unapproved'));});
