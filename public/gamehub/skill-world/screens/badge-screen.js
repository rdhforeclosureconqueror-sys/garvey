(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.SkillWorldBadgeScreen=factory();}})(typeof self!=='undefined'?self:this,function(){
 return function renderBadgeScreen(stars){return `<section><h2>Badge Earned</h2><p>Stars: ${stars}</p></section>`;};
});
