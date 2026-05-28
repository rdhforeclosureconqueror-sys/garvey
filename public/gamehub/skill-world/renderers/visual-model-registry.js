(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.SkillWorldVisualRegistry=factory();}})(typeof self!=='undefined'?self:this,function(){
 const safe=(v,f='—')=>v===undefined||v===null||v===''?f:String(v);
 const renderers={
  pattern_completion:(q)=>`<div><strong>Pattern</strong>: ${(q.sequence||[]).join(' → ')||'No pattern data'}</div>`,
  sorting_visual:(q)=>`<div><strong>Sort these</strong>: ${(q.items||[]).join(', ')||'No items provided'}</div>`,
  number_bond:(q)=>`<div>${safe(q.whole)} = ${safe(q.part_a)} + ${safe(q.part_b)}</div>`,
  comparison:(q)=>`<div>Compare ${safe(q.left)} and ${safe(q.right)}</div>`,
  visual_objects:(q)=>`<div>Objects: ${(q.objects||[]).join(' ')||safe(q.object_count,'No object data')}</div>`,
  number_line:(q)=>`<div>Number line from ${safe(q.min,0)} to ${safe(q.max,10)}</div>`,
  base_ten_blocks:(q)=>`<div>Build ${safe(q.value,0)} with ${safe(q.tens,0)} tens and ${safe(q.ones,0)} ones.</div>`,
  place_value_chart:(q)=>`<div>Place-value chart — Tens: ${safe(q.tens,'?')} | Ones: ${safe(q.ones,'?')}</div>`,
  addition_model:(q)=>`<div>Add ${safe(q.a,0)} + ${safe(q.b,0)}</div>`,
  subtraction_model:(q)=>`<div>Subtract ${safe(q.a,0)} - ${safe(q.b,0)}</div>`,
  shape_identification:(q)=>`<div>Shape focus: ${safe(q.shape,'unknown shape')}</div>`,
  measurement_comparison:(q)=>`<div>Which is longer: ${safe(q.left)} or ${safe(q.right)}?</div>`
 };
 return {render(question){if(!question){return '<div></div>';} const k=question.visual_model||question.question_type; return renderers[k]?renderers[k](question):'<div></div>';}};
});
