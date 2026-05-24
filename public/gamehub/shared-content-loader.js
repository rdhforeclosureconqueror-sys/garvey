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

  function validateDifficultyConfig(payload){ return Array.isArray(payload?.difficulties) && payload.difficulties.every((it)=>validateRequired(it, schemas.difficultyConfig)); }
  function validateModePresets(payload){ return Array.isArray(payload?.presets) && payload.presets.every((it)=>validateRequired(it, schemas.modePreset)); }
  async function loadDifficultyConfig(path, fallback, fetchImpl){
    const json = await loadJson(path, fetchImpl);
    if (!validateDifficultyConfig(json)) return fallback;
    return json;
  }
  async function loadModePresets(path, fallback, fetchImpl){
    const json = await loadJson(path, fetchImpl);
    if (!validateModePresets(json)) return fallback;
    return json;
  }

  async function loadWordBank(path, fallback, fetchImpl){
    const json = await loadJson(path, fetchImpl);
    if (!validateWordBank(json)) return fallback;
    return json;
  }
  function fromWordBankToSpellingLesson(wordBank, grade){
    const requestedGrade = Number.isFinite(Number(grade)) ? Number(grade) : null;
    const items = (wordBank?.items || []).filter((it)=> {
      if (requestedGrade === null) return true;
      return Number(it.grade) === requestedGrade;
    });
    return items.map((it)=>({grade: Number.isFinite(Number(it.grade)) ? Number(it.grade) : (requestedGrade || 1), word: it.word, def: it.definition, example: it.example || it.sentence || ''}));
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
    validateDifficultyConfig,
    validateModePresets,
    loadJson,
    loadWordBank,
    loadQuestionBank,
    loadDifficultyConfig,
    loadModePresets,
    fromWordBankToSpellingLesson,
    fromWordBankToSightWordsDeck,
    fromWordBankToGame6Set,
    fromQuestionBankToAdaptiveItems
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined') {
  module.exports = globalThis.GamehubSharedContent;
}
