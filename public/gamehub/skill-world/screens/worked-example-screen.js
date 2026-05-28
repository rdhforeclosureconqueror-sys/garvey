(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.SkillWorldWorkedExampleScreen=factory();}})(typeof self!=='undefined'?self:this,function(){
 return function renderWorkedExampleScreen(skillPackage){const first=skillPackage.worked_examples?.[0]; return `<section><h2>Worked Example</h2><p>${first?.text||'Watch how this works.'}</p></section>`;};
});
