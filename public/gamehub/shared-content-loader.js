(function (global) {
  function isObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
  const schemas = {
    wordBankItem: ['id','word','definition'],
    questionBankItem: ['id','prompt','answer'],
    lessonPool: ['id','title','wordBankPath'],
    difficultyConfig: ['id','label'],
    modePreset: ['id','label']
  };
  function validateRequired(item, fields){ return isObject(item) && fields.every((f)=> item[f] !== undefined && item[f] !== null && item[f] !== ''); }
  function validateWordBank(payload){ return Array.isArray(payload?.items) && payload.items.every((it)=>validateRequired(it, schemas.wordBankItem)); }

  function validateQuestionBank(payload){ return Array.isArray(payload?.items) && payload.items.every((it)=>validateRequired(it, schemas.questionBankItem)); }
  async function loadQuestionBank(path, fallback, fetchImpl){
    const json = await loadJson(path, fetchImpl);
    if (!validateQuestionBank(json)) return fallback;
    return json;
  }
  function fromQuestionBankToAdaptiveItems(questionBank){
    return (questionBank?.items || []).map((it)=>({
      id: it.id,
      subject: it.subject || 'Mixed',
      grade: Number.isFinite(Number(it.grade)) ? Number(it.grade) : 7,
      domain: it.domain || 'General',
      skill: it.skill || 'General comprehension',
      prerequisite_skill: it.prerequisite_skill || '',
      difficulty: Number.isFinite(Number(it.difficulty)) ? Number(it.difficulty) : 2,
      prompt: it.prompt,
      choices: Array.isArray(it.choices) ? it.choices : [String(it.answer)],
      correct_answer: it.answer,
      correct_explanation: it.explanation || '',
      tags: Array.isArray(it.tags) ? it.tags : []
    }));
  }
  async function loadJson(path, fetchImpl){
    const fetcher = fetchImpl || global.fetch;
    if (!fetcher) return null;
    try { const res = await fetcher(path); if (!res.ok) return null; return await res.json(); } catch { return null; }
  }
  async function loadWordBank(path, fallback, fetchImpl){
    const json = await loadJson(path, fetchImpl);
    if (!validateWordBank(json)) return fallback;
    return json;
  }
  function fromWordBankToSpellingLesson(wordBank, grade){
    const items = (wordBank?.items || []).filter((it)=> grade ? it.grade === grade : true);
    return items.map((it)=>({grade: it.grade || grade || 1, word: it.word, def: it.definition, example: it.example || it.sentence || ''}));
  }
  function fromWordBankToSightWordsDeck(wordBank){
    return (wordBank?.items || []).map((it)=> it.word);
  }
  function fromWordBankToGame6Set(wordBank){
    return (wordBank?.items || []).filter((it)=> it.synonym || it.antonym || it.definition).map((it)=>({
      word: it.word,
      def: it.definition,
      syn: it.synonym || it.syn || it.definition,
      ant: it.antonym || it.ant || it.definition,
      sentence: it.sentence || it.template || it.example || ''
    }));
  }
  global.GamehubSharedContent = {
    schemas,
    validateRequired,
    validateWordBank,
    validateQuestionBank,
    loadJson,
    loadWordBank,
    loadQuestionBank,
    fromWordBankToSpellingLesson,
    fromWordBankToSightWordsDeck,
    fromWordBankToGame6Set,
    fromQuestionBankToAdaptiveItems
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined') {
  module.exports = globalThis.GamehubSharedContent;
}
