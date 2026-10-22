(() => {
  'use strict';
  const days = [
    ['DAY ONE · SUNDAY','Mate Masie','Listening, understanding and wisdom.','Listen carefully, remember two details, and respond thoughtfully.','Additional symbol illustration reference needed.'],
    ['DAY TWO · MONDAY','Akoben','A call to action and readiness.','Notice when your attention is needed, and respond with intention.','Source PDF: entry 16, page 3.'],
    ['DAY THREE · TUESDAY','Hwehwemudua','Examination, knowledge and careful judgment.','Check the evidence before reaching a conclusion.','Source PDF: entry 38, page 7.'],
    ['DAY FOUR · WEDNESDAY','Nyansapo','Wisdom and ingenuity.','Choose what matters and practice patience in your response.','Additional symbol illustration reference needed.'],
    ['DAY FIVE · THURSDAY','Ani Bere A Enso Gya','Patience, self-containment and self-control.','Pause before reacting, then decide how to respond.','Source PDF: entry 22, page 4.'],
    ['DAY SIX · FRIDAY','Sesa Wo Suban','Character change and growth.','Notice a habit you want to improve and practice returning.','Additional symbol illustration reference needed.'],
    ['DAY SEVEN · SATURDAY','Sankofa','Learn from the past to build the future.','Remember a lesson and put it into practice today.','Source PDF: entries 2–3, page 1 (two symbol variants).']
  ];
  function bind() {
    const buttons = document.querySelectorAll('[data-gate-day]');
    const number = document.getElementById('portal-day-number');
    if (!buttons.length || !number || number.dataset.bound === 'yes') return false;
    number.dataset.bound = 'yes';
    const fields = ['portal-day-number','portal-day-name','portal-day-meaning','portal-day-practice','portal-day-source'];
    function select(index) {
      const item = days[index];
      if (!item) return;
      fields.forEach((id,i) => {
        const el = document.getElementById(id);
        if (el) el.textContent = i === 3 ? 'Practice: '+item[i] : i === 4 ? item[i]+' Artwork requires review before public display.' : item[i];
      });
      const orbit = document.querySelector('.portal-day-orbit span');
      if (orbit) orbit.textContent = String(index+1).padStart(2,'0');
      buttons.forEach(btn => {
        const selected = Number(btn.dataset.gateDay) === index;
        btn.classList.toggle('is-selected',selected);
        btn.setAttribute('aria-pressed',String(selected));
      });
    }
    buttons.forEach(btn => btn.addEventListener('click',()=>select(Number(btn.dataset.gateDay))));
    select(0);
    return true;
  }
  if (!bind()) {
    const observer = new MutationObserver(() => { if (bind()) observer.disconnect(); });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }
})();
