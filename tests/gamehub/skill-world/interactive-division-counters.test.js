const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const registry = require(path.join(root,'public/gamehub/skill-world/renderers/visual-model-registry.js'));
const renderer = require(path.join(root,'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const html = fs.readFileSync(path.join(root,'public/gamehub/skill-world/index.html'),'utf8');
const dir = path.join(root,'public/gamehub/skill-world/content');

test('all grade 3 division questions show real counters and conceal answers',()=>{
 let count=0;
 for(const file of fs.readdirSync(dir).filter(f=>f.startsWith('G3M_')&&f.endsWith('.skill-package.v1.json'))){
  const pkg=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
  function walk(value){
   if(!value||typeof value!=='object')return;
   if(Array.isArray(value))return value.forEach(walk);
   if(value.visual_model==='division_model'){
    count++;
    const output=registry.render(value,{mode:'question'});
    const total=Number(value.total||value.dividend||value.object_count)||12;
    const groups=Number(value.groups||value.divisor)||3;
    assert.match(output,/data-answer-visibility="question"/);
    assert.equal((output.match(/class="division-counter"/g)||[]).length,Math.min(total,120),file);
    assert.equal((output.match(/data-division-group="/g)||[]).length,Math.min(groups,12),file);
    assert.match(output,/draggable="true"/);
    assert.match(output,/division-reset/);
    assert.match(output,new RegExp(total+' ÷ '+groups+' = \\?'));
    const solution=registry.render(value,{mode:'solution'});
    assert.match(solution,/data-answer-visibility="solution"/);
    assert.doesNotMatch(solution,/division-counter-bank/);
   }
   Object.values(value).forEach(walk);
  }
  walk(pkg);
 }
 assert.ok(count>0,'expected grade 3 division questions');
});
test('both mission and drill render through shared visual registry',()=>{
 assert.match(renderer.renderQuestionCard.toString(),/VisualRegistry.render/);
 assert.match(html,/app.addEventListener\('dragstart'/);
 assert.match(html,/app.addEventListener\('drop'/);
 assert.match(html,/moveDivisionCounter/);
 assert.match(html,/divisionProgress/);
});
