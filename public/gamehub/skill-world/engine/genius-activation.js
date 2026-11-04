(function(){
  "use strict";

  const LABELS = Object.freeze({
    SR: "Focus & Self-Control",
    CQ: "Curiosity & Love of Learning",
    CR: "Creativity & Idea Thinking",
    RS: "Thinking & Problem Solving",
    PS: "Effort & Resilience",
    FB: "Learning From Feedback",
    DE: "Interests & Passion Areas",
  });

  const MOVES = Object.freeze({
    CQ: "What do you notice or wonder?",
    CR: "Can you show it another way?",
    PS: "If it gets hard, what is your next move?",
    DE: "Where could this skill help with something you care about?",
  });

  const TYPE_BY_SKILL = Object.freeze({
    G5M_NBT_001:["SR","RS","FB","PS","CQ"],G5M_NBT_002:["SR","RS","FB","PS","CQ"],G5M_NBT_003:["SR","RS","FB","PS","CQ"],
    G5M_OA_001:["SR","RS","CQ","CR"],G5M_FR_001:["SR","RS","FB","CQ","CR"],G5M_FR_002:["SR","RS","FB","CQ","CR"],G5M_FR_003:["SR","RS","FB","CQ","CR"],
    G5M_MD_001:["SR","RS","FB","CR","DE"],G5M_GM_001:["SR","RS","FB","CR","DE"],G5M_GM_002:["SR","RS","FB","CR","DE"],
    G5E_RF_001:["SR","FB","PS","CQ"],G5E_FL_001:["SR","FB","PS","CQ"],G5E_VOC_001:["SR","RS","CQ","CR"],
    G5E_RC_001:["SR","RS","CQ","CR"],G5E_RC_002:["SR","RS","CQ","CR"],G5E_RC_003:["SR","RS","CQ","CR"],
    G5E_WR_001:["SR","RS","CR","FB","CQ","DE","PS"],G5E_WR_002:["SR","RS","CR","FB","CQ","DE","PS"],G5E_WR_003:["SR","RS","CR","FB","CQ","DE","PS"],
    G5E_LANG_001:["SR","RS","FB","CR","PS"]
  });

  function escapeHtml(value){
    return String(value||"").replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }

  function planFor(skillId){
    const codes=TYPE_BY_SKILL[String(skillId||"").toUpperCase()];
    if(!codes)return null;
    const split=codes.findIndex((code)=>["CQ","CR","PS","DE"].includes(code));
    const primary=codes.slice(0, split===-1?codes.length:split);
    const invitations=codes.slice(primary.length);
    return {primary, invitations};
  }

  function render(skillId, state){
    const plan=planFor(skillId);
    if(!plan)return "";
    const saved=state&&state.geniusEvidence&&state.geniusEvidence[skillId] ? state.geniusEvidence[skillId] : null;
    const selected=saved&&saved.genius_code;
    const chips=plan.primary.map((code)=>'<li>'+escapeHtml(LABELS[code])+'</li>').join("");
    const choices=plan.invitations.map((code)=>{
      const active=selected===code ? " is-selected" : "";
      return '<button type="button" class="genius-choice'+active+'" data-genius-choice="'+code+'" aria-pressed="'+String(selected===code)+'"><strong>'+escapeHtml(LABELS[code])+'</strong><span>'+escapeHtml(MOVES[code]||"Try a learning move that fits this lesson.")+'</span></button>';
    }).join("");
    const savedCopy=selected ? '<p class="genius-saved" role="status">You chose: <strong>'+escapeHtml(LABELS[selected])+'</strong>. Keep an eye out for it while you learn.</p>' : "";
    return '<section class="genius-activation-card" aria-label="Genius practice for this lesson"><div class="genius-eyebrow">YOUR GARVEY PRACTICE</div><h2>Today, this lesson can activate:</h2><ul class="genius-primary-list">'+chips+'</ul>'+(choices?'<p class="genius-invite-title">Choose one optional learning move:</p><div class="genius-choice-grid">'+choices+'</div>':'')+savedCopy+'<p class="genius-boundary">This is a chance to practice—not a label for who you are.</p></section>';
  }

  function recordChoice(state, skillId, code){
    state.geniusEvidence=state.geniusEvidence||{};
    state.geniusEvidence[skillId]={genius_code:code,selected_at:new Date().toISOString(),source:"child_optional_activation_move"};
  }

  window.GarveyGeniusActivation=Object.freeze({render,recordChoice,planFor});
})();