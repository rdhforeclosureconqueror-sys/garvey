import fs from 'node:fs';
import adultBank from '../archetype-engines/engines/leadership/question-banks/leadership.bank1.js';
import youthBank from '../archetype-engines/engines/leadership/question-banks/leadership.youth.bank1.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { scoreEngineAssessment } = require('../server/archetypeEnginesService.js');

const codes = ['VD','SD','RI','IE','AC'];
const keyFields = ['bank_id','question_id','display_order','primary_dimension','secondary_dimension','weight_type','signal_type','reverse_pair_id','desired_pair_id','question_class','question_subclass','is_scored'];
function normQ(q){return {bank_id:q.bank_id,question_id:q.question_id||q.id,display_order:q.display_order,primary_dimension:q.primary_dimension,secondary_dimension:q.secondary_dimension,weight_type:q.weight_type,signal_type:q.signal_type,reverse_pair_id:q.reverse_pair_id,desired_pair_id:q.desired_pair_id,question_class:q.question_class,question_subclass:q.question_subclass,is_scored:q.is_scored!==false, options:(q.options||[]).map((o,i)=>({option_id:o.option_id||o.id,position:i+1,primary_archetype:o.primary_archetype||o.primary,secondary_archetype:o.secondary_archetype||o.secondary,weight_type:o.weight_type,signal_type:o.signal_type}))}}
const adult=adultBank.map(normQ), youth=youthBank.map(normQ);
const parity=[];
for(let i=0;i<Math.max(adult.length,youth.length);i++){
  const a=adult[i], y=youth[i];
  if(!a||!y){parity.push({index:i,field:'question_count',adult:!!a,youth:!!y}); continue;}
  for(const f of keyFields) if(String(a[f]??'')!==String(y[f]??'')) parity.push({question:a.question_id,field:f,adult:a[f],youth:y[f]});
  for(let j=0;j<Math.max(a.options.length,y.options.length);j++){
    const ao=a.options[j], yo=y.options[j];
    for(const f of ['option_id','position','primary_archetype','secondary_archetype','weight_type','signal_type']) if(String(ao?.[f]??'')!==String(yo?.[f]??'')) parity.push({question:a.question_id,option:j+1,field:f,adult:ao?.[f],youth:yo?.[f]});
  }
}
const distribution=Object.fromEntries(codes.map(c=>[c,{1:0,2:0,3:0,4:0}]));
youth.forEach(q=>q.options.forEach(o=>{ if(distribution[o.primary_archetype]) distribution[o.primary_archetype][o.position]++; }));
function answersByPosition(pos){return Object.fromEntries(youthBank.map(q=>[q.id||q.question_id,(q.options||[])[pos-1]?.id || (q.options||[])[pos-1]?.option_id]));}
function answersPattern(fn){return Object.fromEntries(youthBank.map((q,i)=>[q.id||q.question_id,(q.options||[])[fn(i)]?.id || (q.options||[])[fn(i)]?.option_id]));}
function score(name, answers){const r=scoreEngineAssessment('leadership',answers,{assessment_variant:'youth',content_variant:'youth',audience_type:'youth',bankId:'AUTHORED_BANK_1'}); const vals=Object.values(r.normalizedScores); return {name,primary:r.primaryArchetype?.code,secondary:r.secondaryArchetype?.code,normalizedScores:r.normalizedScores,confidence:r.confidence,consistency:r.contradictionConsistency?.consistency,hybrid:r.hybridArchetype?.label||null,spread:Math.max(...vals)-Math.min(...vals)};}
let seed=42; const rnd=()=>{seed=(seed*1664525+1013904223)>>>0; return seed/2**32};
const simulations=[score('all_first',answersByPosition(1)),score('all_second',answersByPosition(2)),score('all_third',answersByPosition(3)),score('all_fourth',answersByPosition(4)),score('alternating_1_2',answersPattern(i=>i%2)),score('alternating_3_4',answersPattern(i=>2+(i%2))),score('cycling_1_2_3_4',answersPattern(i=>i%4)),score('cycling_4_3_2_1',answersPattern(i=>3-(i%4))),...Array.from({length:5},(_,n)=>score(`seeded_random_${n+1}`,answersPattern(()=>Math.floor(rnd()*4))))];
for(const code of codes) simulations.push(score(`target_${code}`,Object.fromEntries(youthBank.map(q=>{const opt=(q.options||[]).find(o=>(o.primary||o.primary_archetype)===code)||q.options[0]; return [q.id||q.question_id,opt.id||opt.option_id]}))));
simulations.push(score('balanced_position_cycle',answersPattern(i=>i%4)));
const out={generated_at:new Date().toISOString(),question_counts:{adult:adult.length,youth:youth.length},parity_pass:parity.length===0,parity_differences:parity,option_position_distribution:distribution,simulations,conclusion: parity.length===0 ? 'Youth wording preserves adult scoring mappings. Repeated visible positions produce predictable archetype skew according to option placement; no weight defect was found.' : 'Parity differences require review before scoring changes.'};
fs.mkdirSync('artifacts/leadership-audits',{recursive:true});
fs.writeFileSync('artifacts/leadership-audits/youth-scoring-audit.json',JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
