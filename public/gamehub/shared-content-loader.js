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
    return items.map((it)=>({grade: it.grade || grade || 1, word: it.word, def: it.definition, example: it.example || ''}));
  }
  function fromWordBankToSightWordsDeck(wordBank){
    return (wordBank?.items || []).map((it)=> it.word);
  }
  global.GamehubSharedContent = {
    schemas,
    validateRequired,
    validateWordBank,
    loadJson,
    loadWordBank,
    fromWordBankToSpellingLesson,
    fromWordBankToSightWordsDeck
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined') {
  module.exports = globalThis.GamehubSharedContent;
}
