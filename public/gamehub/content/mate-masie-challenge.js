/* Original learning activity inspired by Mate Masie; not a traditional Akan story. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MateMasieChallenge = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const CLUE = 'At the South Bridge, Mara wears a blue scarf and carries a woven basket.';
  const QUESTION = 'Which two details help you recognize Mara?';
  const OPTIONS = Object.freeze([
    { id:'blue-basket', label:'A blue scarf and a woven basket' },
    { id:'red-drum', label:'A red drum and a golden bell' },
    { id:'green-hat', label:'A green hat and a wooden staff' }
  ]);
  function checkAnswer(id) {
    return id === 'blue-basket'
      ? { correct:true, feedback:'You listened for meaning and remembered both clues.' }
      : { correct:false, feedback:'That is one possibility. Listen again for what Mara wears and carries.' };
  }
  return Object.freeze({ CLUE, QUESTION, OPTIONS, checkAnswer });
});
