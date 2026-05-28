(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.SkillWorldGuidedDemoScreen=factory();}})(typeof self!=='undefined'?self:this,function(){
 return function renderGuidedDemoScreen(skillPackage){return `<section><h2>Guided Demo</h2><p>${skillPackage.hint_ladder?.[0]||'Use a hint when needed.'}</p></section>`;};
});
