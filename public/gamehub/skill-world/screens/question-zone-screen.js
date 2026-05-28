(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.SkillWorldQuestionZoneScreen=factory();}})(typeof self!=='undefined'?self:this,function(){
 return function renderQuestionZoneScreen(zone){return `<section><h2>${zone==='checkpoint'?'Checkpoint':'Question Zone'}</h2></section>`;};
});
