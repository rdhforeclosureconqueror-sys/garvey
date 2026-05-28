(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.SkillWorldVisualRegistry=factory();}})(typeof self!=='undefined'?self:this,function(){
 const renderers={
  pattern_completion:(q)=>`<div><strong>Pattern:</strong> ${(q.sequence||[]).join(' , ')} , ?</div>`,
  sorting_visual:(q)=>`<div><strong>Sort:</strong> ${(q.items||[]).join(', ')}</div>`,
  number_bond:(q)=>`<div>Number bond: ${q.whole} = ${q.part_a} + ${q.part_b}</div>`,
  comparison:(q)=>`<div>Compare: ${q.left} ${q.operator||'?'} ${q.right}</div>`,
  visual_objects:(q)=>`<div>Objects: ${(q.objects||[]).join(' ')}</div>`,
  number_line:(q)=>`<div>Number line: ${q.min||0} ... ${q.max||10}</div>`,
  base_ten_blocks:(q)=>`<div>Base ten blocks: ${q.value||0}</div>`,
  addition_model:(q)=>`<div>Addition model: ${q.a}+${q.b}</div>`,
  subtraction_model:(q)=>`<div>Subtraction model: ${q.a}-${q.b}</div>`,
  shape_identification:(q)=>`<div>Find shape: ${q.shape||''}</div>`,
  measurement_comparison:(q)=>`<div>Measure compare: ${q.left} vs ${q.right}</div>`
 };
 return {render(question){const k=question.visual_model||question.question_type; return renderers[k]?renderers[k](question):'';}};
});
