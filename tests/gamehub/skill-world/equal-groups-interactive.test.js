const test=require('node:test');const assert=require('node:assert/strict');const registry=require('../../../public/gamehub/skill-world/renderers/visual-model-registry.js');
test('equal groups in question mode uses draggable counters, not prefilled answers',()=>{
 const q={type:'equal_groups',groups:4,items_per_group:3,total:12};
 const result=registry.render(q,{mode:'question'});
 assert.match(result,/data-skill-model="equal_groups"/);
 assert.match(result,/data-answer-visibility="question"/);
 assert.equal((result.match(/class="division-counter"/g)||[]).length,12);
 assert.equal((result.match(/data-division-group="/g)||[]).length,4);
 assert.doesNotMatch(result,/3 objects|groups × 3 = 12|12 ÷ 4 = 3/);
 assert.match(result,/division-reset/);
});
test('equal groups teaching mode may show grouped counters',()=>{
 const q={type:'equal_groups',groups:3,items_per_group:6,total:18};
 const result=registry.render(q,{mode:'solution'});
 assert.match(result,/data-answer-visibility="solution"/);
 assert.equal((result.match(/class="division-counter"/g)||[]).length,18);
 assert.doesNotMatch(result,/data-counter-bank/);
});
