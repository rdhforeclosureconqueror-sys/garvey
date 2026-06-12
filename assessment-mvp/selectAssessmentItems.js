const crypto = require('crypto');
const { packageIdOf } = require('./loadSkillPackages');

const SUPPORTED_TYPES = new Set([
  'multiple_choice',
  'numeric',
  'number_response',
  'integer_response',
  'decimal_response',
  'fraction_response',
  'short_response',
  'short_answer',
]);

const PROTECTED_FIELD_RE = /(^|_)(answer|answers|correct|rubric|score|scoring|solution|explanation|feedback)(_|$)/i;
const DELIVERY_METADATA_KEYS = new Set(['delivery_metadata', 'public_metadata', 'presentation_metadata']);
const REQUIRED_STIMULUS_NOT_RENDERABLE = 'required_stimulus_not_renderable';
const DUPLICATE_ANSWER_CHOICES = 'duplicate_answer_choices';
const INVALID_SINGLE_CHOICE_CONFIGURATION = 'invalid_single_choice_configuration';
const CORRECT_ANSWER_NOT_IN_CHOICES = 'correct_answer_not_in_choices';
const BANK_ORDER = ['adaptive_question_bank', 'review_bank', 'level_banks'];

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashValue(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex').slice(0, 16);
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeChoiceDisplay(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function identityFor(packageId, sourceBank, questionId) {
  return `${packageId}::${sourceBank}::${questionId}`;
}

function getAnswer(question) {
  if (Object.prototype.hasOwnProperty.call(question, 'correct_answer')) return question.correct_answer;
  if (Object.prototype.hasOwnProperty.call(question, 'answer')) return question.answer;
  if (Object.prototype.hasOwnProperty.call(question, 'acceptable_answers')) return question.acceptable_answers;
  if (Object.prototype.hasOwnProperty.call(question, 'accepted_answers')) return question.accepted_answers;
  if (Object.prototype.hasOwnProperty.call(question, 'answers')) return question.answers;
  return undefined;
}

function hasDeterministicAnswer(question) {
  const answer = getAnswer(question);
  if (answer === undefined || answer === null) return false;
  if (typeof answer === 'string') return answer.trim().length > 0;
  if (Array.isArray(answer)) return answer.length > 0;
  return true;
}

function hasAnswerRevealingDeliveryMetadata(question) {
  return Object.keys(question || {}).some((key) => {
    if (!DELIVERY_METADATA_KEYS.has(key)) return false;
    return containsProtectedField(question[key]);
  });
}

function containsProtectedField(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsProtectedField);
  return Object.entries(value).some(([key, child]) => PROTECTED_FIELD_RE.test(key) || containsProtectedField(child));
}

function sanitizePublicValue(value) {
  if (Array.isArray(value)) return value.map(sanitizePublicValue).filter((entry) => entry !== undefined);
  if (!value || typeof value !== 'object') return value;
  const output = {};
  for (const [key, child] of Object.entries(value)) {
    if (PROTECTED_FIELD_RE.test(key)) continue;
    const sanitized = sanitizePublicValue(child);
    if (sanitized !== undefined) output[key] = sanitized;
  }
  return output;
}

const GENERIC_RENDERABLE_MODELS = new Set([
  'addition_model', 'subtraction_model', 'number_line', 'number_line_0_120', 'comparison',
  'array_model', 'division_model', 'equal_groups', 'multiplication_model', 'repeated_addition',
  'skip_counting', 'fact_family_model', 'multiplication_chart', 'pattern_completion', 'sorting_visual',
]);
const PUBLIC_STIMULUS_FIELD_ALLOWLIST = new Set([
  'a', 'b', 'left', 'right', 'min', 'max', 'sequence', 'items', 'rows', 'columns', 'total', 'groups',
  'dividend', 'divisor', 'factor', 'factor_a', 'factor_b', 'step', 'count', 'mode',
]);

const GRADE_1_ENGLISH_VISUAL_RESTORATION_PACKAGE_IDS = new Set(['G1E_FL_001', 'G1E_PH_001', 'G1E_PH_002', 'G1E_RC_001', 'G1E_RC_002', 'G1E_RF_001', 'G1E_RF_002', 'G1E_SW_001', 'G1E_WR_001']);
const GRADE_1_ENGLISH_BATCH_1_PACKAGE_IDS = new Set(['G1E_FL_001', 'G1E_PH_001', 'G1E_PH_002']);
const GRADE_1_ENGLISH_STIMULUS_RENDERERS = new Set([
  'sentence_card',
  'picture_choice',
  'phonics_tiles',
  'sound_boxes',
  'word_builder',
  'word_family_sort',
  'rhyme_match',
  'short_passage',
  'story_sequence',
  'letter_card',
  'word_sound_map',
  'sound_match',
  'word_card',
  'sentence_highlight',
  'phrase_builder',
  'writing_checklist',
  'sentence_builder',
  'punctuation_marker',
]);

function compactTextValue(value) {
  const output = String(value ?? '').trim().replace(/\s+/g, ' ');
  return output || null;
}

function safeTextArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(compactTextValue).filter(Boolean);
}


function soundPositionLabel(value) {
  const label = compactTextValue(value);
  return label || 'target';
}

function wordsFromSlashPair(value) {
  return safeTextArray(String(value ?? '').split('/'));
}

function sentenceStemFromPrompt(prompt) {
  const text = compactTextValue(prompt);
  if (!text) return null;
  const colon = text.indexOf(':');
  return compactTextValue(colon >= 0 ? text.slice(colon + 1) : text);
}

function sentenceBlankFromPrompt(prompt) {
  const text = compactTextValue(prompt);
  if (!text) return null;
  const match = text.match(/completes:\s*(.+)$/i);
  return compactTextValue(match ? match[1] : text);
}

function publicGrade1EnglishStimulusFor(question, packageId) {
  if (!GRADE_1_ENGLISH_VISUAL_RESTORATION_PACKAGE_IDS.has(packageId)) return null;
  const renderer = compactTextValue(question.visual_model || question.support_type);
  if (!GRADE_1_ENGLISH_STIMULUS_RENDERERS.has(renderer)) return null;

  if (renderer === 'sentence_card' || (renderer === 'picture_choice' && GRADE_1_ENGLISH_BATCH_1_PACKAGE_IDS.has(packageId))) {
    const sentence = compactTextValue(question.sentence || question.picture || question.speakable_text);
    if (!sentence) return null;
    return {
      type: 'sentence',
      content: { text: sentence },
      accessibility_text: `Sentence: ${sentence}`,
      presentation: { renderer: renderer === 'picture_choice' ? 'picture_choice_sentence_adapter' : 'sentence_card' },
    };
  }

  if (GRADE_1_ENGLISH_BATCH_1_PACKAGE_IDS.has(packageId) && (renderer === 'phonics_tiles' || renderer === 'sound_boxes' || renderer === 'word_builder')) {
    const tiles = safeTextArray(question.tiles || question.graphemes || question.word_parts);
    if (tiles.length) {
      return {
        type: 'letter_tiles',
        content: { tiles },
        accessibility_text: `Letter tiles: ${tiles.join(', ')}`,
        presentation: { renderer, label: 'Blend the sounds in order.' },
      };
    }
    const word = compactTextValue(question.word || question.speakable_text);
    if (word) {
      return {
        type: 'word',
        content: { text: word },
        accessibility_text: `Word: ${word}`,
        presentation: { renderer: 'word_card' },
      };
    }
  }

  if (GRADE_1_ENGLISH_BATCH_1_PACKAGE_IDS.has(packageId) && (renderer === 'word_family_sort' || renderer === 'rhyme_match')) {
    const word = compactTextValue(question.word || question.speakable_text || (Array.isArray(question.words) ? question.words[0] : ''));
    if (!word) return null;
    return {
      type: 'word',
      content: { text: word },
      accessibility_text: `Word: ${word}`,
      presentation: { renderer: renderer === 'word_family_sort' ? 'word_family_sort_word_adapter' : 'rhyme_match_word_adapter' },
    };
  }

  if (renderer === 'short_passage') {
    const passage = compactTextValue(question.passage || question.text || question.story);
    if (!passage) return null;
    return {
      type: 'reading_passage',
      content: { text: passage },
      accessibility_text: `Reading passage: ${passage}`,
      presentation: { renderer: 'short_passage', label: 'Read the passage, then answer the question.' },
    };
  }

  if (renderer === 'story_sequence') {
    const events = safeTextArray(question.events || question.sequence);
    if (events.length < 2) return null;
    return {
      type: 'sequencing',
      content: { events },
      accessibility_text: `Story events in order: ${events.join(' Then ')}`,
      presentation: { renderer: 'story_sequence', label: 'Read the events in order: beginning, middle, end.' },
    };
  }

  if (renderer === 'letter_card') {
    const letter = compactTextValue(question.letter || question.target_letter || question.speakable_text);
    if (!letter) return null;
    const content = { text: letter };
    const pairedForm = compactTextValue(question.paired_form || question.letter_pair || question.pair);
    const label = compactTextValue(question.letter_label || question.case_label || question.label);
    if (pairedForm) content.paired_form = pairedForm;
    if (label) content.label = label;
    return {
      type: 'letter_card',
      content,
      accessibility_text: `Letter card: ${letter}${label ? `, ${label}` : ''}`,
      presentation: { renderer: 'letter_card', label: 'Look closely at the letter card.' },
    };
  }

  if (renderer === 'picture_choice' && packageId === 'G1E_RF_002') {
    const picture = compactTextValue(question.picture || question.word || question.speakable_text);
    if (!picture) return null;
    return {
      type: 'picture_choice',
      content: { label: picture, alt_text: `Picture of ${picture}` },
      accessibility_text: `Picture: ${picture}`,
      presentation: { renderer: 'picture_choice', label: 'Use the picture word to answer.' },
    };
  }

  if (renderer === 'word_sound_map' && packageId === 'G1E_RF_002') {
    const word = compactTextValue(question.word || question.speakable_text);
    if (!word) return null;
    const position = soundPositionLabel(question.sound_position);
    return {
      type: 'phonics_tiles',
      content: { word, focus: position },
      accessibility_text: `Word sound map for ${word}; listen for the ${position} sound.`,
      presentation: { renderer: 'word_sound_map', label: `Listen for the ${position} sound.` },
    };
  }

  if (renderer === 'sound_match' && packageId === 'G1E_RF_002') {
    const words = wordsFromSlashPair(question.word || question.speakable_text);
    if (words.length < 2) return null;
    const position = soundPositionLabel(question.sound_position);
    return {
      type: 'sound_match',
      content: { words, focus: position },
      accessibility_text: `Compare ${words.join(' and ')} for ${position} sounds.`,
      presentation: { renderer: 'sound_match', label: `Compare the ${position} sounds.` },
    };
  }

  if (renderer === 'word_card' && packageId === 'G1E_SW_001') {
    const word = compactTextValue(question.word || question.speakable_text);
    if (!word) return null;
    return {
      type: 'word',
      content: { text: word },
      accessibility_text: `Word card: ${word}`,
      presentation: { renderer: 'word_card', label: 'Read the word card.' },
    };
  }

  if (renderer === 'phrase_builder' && packageId === 'G1E_SW_001') {
    const phrase = compactTextValue(question.phrase || question.speakable_text);
    if (!phrase) return null;
    return {
      type: 'word',
      content: { text: phrase },
      accessibility_text: `Phrase card: ${phrase}`,
      presentation: { renderer: 'phrase_builder', label: 'Read the phrase smoothly.' },
    };
  }

  if (renderer === 'sentence_highlight' && packageId === 'G1E_SW_001') {
    const sentence = sentenceBlankFromPrompt(question.prompt);
    if (!sentence || !sentence.includes('___')) return null;
    return {
      type: 'highlighted_text',
      content: { text: sentence, marker: '___' },
      accessibility_text: `Sentence with a blank: ${sentence}`,
      presentation: { renderer: 'sentence_highlight', label: 'Choose the word that belongs in the blank.' },
    };
  }

  if (renderer === 'writing_checklist' && packageId === 'G1E_WR_001') {
    const sentence = sentenceStemFromPrompt(question.prompt);
    const checks = safeTextArray(question.validation_checks);
    if (!sentence) return null;
    return {
      type: 'sentence_builder',
      content: { text: sentence, checks },
      accessibility_text: `Sentence to revise: ${sentence}`,
      presentation: { renderer: 'writing_checklist', label: 'Revise the sentence using the checklist.' },
    };
  }

  if (renderer === 'sentence_builder' && packageId === 'G1E_WR_001') {
    const sentence = sentenceStemFromPrompt(question.prompt);
    const checks = safeTextArray(question.validation_checks);
    if (!sentence) return null;
    return {
      type: 'sentence_builder',
      content: { text: sentence, checks },
      accessibility_text: `Sentence to build: ${sentence}`,
      presentation: { renderer: 'sentence_builder', label: 'Type the corrected complete sentence.' },
    };
  }

  if (renderer === 'punctuation_marker' && packageId === 'G1E_WR_001') {
    const sentence = sentenceStemFromPrompt(question.prompt);
    if (!sentence) return null;
    return {
      type: 'punctuation_marker',
      content: { text: sentence, marker: '▢' },
      accessibility_text: `Sentence needing an end mark: ${sentence}`,
      presentation: { renderer: 'punctuation_marker', label: 'Choose the end mark that completes the sentence.' },
    };
  }

  return null;
}

function publicStimulusFor(question, packageId) {
  if (question.visual_model === 'shape_identification' || question.support_type === 'shape_identification') {
    const shape = normalizeChoiceDisplay(question.shape);
    if (['circle', 'square', 'triangle', 'rectangle', 'hexagon'].includes(shape)) {
      return { type: 'shape', shape };
    }
  }
  const model = question.visual_model || question.support_type;
  if (GENERIC_RENDERABLE_MODELS.has(model)) {
    const fields = {};
    for (const key of PUBLIC_STIMULUS_FIELD_ALLOWLIST) {
      if (Object.prototype.hasOwnProperty.call(question, key)) fields[key] = sanitizePublicValue(question[key]);
    }
    if (Object.keys(fields).length) return { type: 'model', model, fields };
  }
  return publicGrade1EnglishStimulusFor(question, packageId);
}

function publicQuestionPayload(question, packageId) {
  const options = Array.isArray(question.options) ? question.options : question.choices;
  const payload = {
    prompt: question.prompt,
    question_type: question.question_type,
  };
  if (Array.isArray(options)) payload.choices = sanitizePublicValue(options);
  const stimulus = publicStimulusFor(question, packageId);
  if (stimulus) payload.stimulus = stimulus;
  return payload;
}

function visualIdentity(question) {
  const visualFields = {};
  for (const key of [
    'visual_model', 'support_type', 'image_id', 'image', 'diagram_id', 'diagram', 'asset_id', 'model_id',
    'a', 'b', 'whole', 'part', 'parts', 'shape', 'shapes', 'fraction', 'numerator', 'denominator',
    'number_line', 'clock', 'coins', 'data', 'table', 'array', 'sentence', 'phrase', 'word', 'target_word', 'phoneme', 'sound_position', 'tiles', 'graphemes', 'word_parts', 'family', 'picture', 'passage', 'text', 'story', 'events', 'sequence', 'letter', 'target_letter', 'paired_form', 'letter_label', 'validation_checks',
  ]) {
    if (Object.prototype.hasOwnProperty.call(question, key)) visualFields[key] = question[key];
  }
  return Object.keys(visualFields).length ? hashValue(visualFields) : 'no-stimulus';
}

function duplicateKeyFor(question) {
  const hasVisual = Boolean(question.visual_model || question.support_type || question.image_id || question.diagram_id || question.asset_id);
  const stimulus = hasVisual ? visualIdentity(question) : hashValue({ prompt: normalize(question.prompt), choices: question.choices || null });
  return `${normalize(question.prompt)}::${stimulus}`;
}

function collectQuestions(pkg) {
  const collected = [];
  for (const bank of BANK_ORDER) {
    if (bank === 'level_banks') {
      for (const level of pkg.level_banks || []) {
        for (const question of level.questions || []) {
          collected.push({ question, sourceBank: bank, sourcePointer: `${bank}.${level.level_id || 'unknown'}` });
        }
      }
    } else {
      for (const question of Array.isArray(pkg[bank]) ? pkg[bank] : []) {
        collected.push({ question, sourceBank: bank, sourcePointer: bank });
      }
    }
  }
  return collected;
}

function increment(map, reason) {
  map[reason] = (map[reason] || 0) + 1;
}

function choiceId(choice, index) {
  if (choice && typeof choice === 'object') {
    for (const key of ['id', 'choice_id', 'key', 'value_id']) {
      if (Object.prototype.hasOwnProperty.call(choice, key)) return choice[key];
    }
  }
  return `choice-${index}`;
}

function choiceDisplay(choice) {
  if (choice && typeof choice === 'object') {
    for (const key of ['value', 'label', 'text', 'display', 'answer']) {
      if (Object.prototype.hasOwnProperty.call(choice, key)) return choice[key];
    }
    return undefined;
  }
  return choice;
}

function isCorrectChoice(choice) {
  return Boolean(choice && typeof choice === 'object' && (choice.correct === true || choice.is_correct === true || choice.isCorrect === true));
}

function answerValues(question) {
  const answer = getAnswer(question);
  const values = Array.isArray(answer) ? answer : [answer];
  return values.filter((value) => value !== undefined && value !== null && String(value).trim().length > 0);
}

function validateAnswerChoices(question) {
  const reasons = [];
  if (question.question_type !== 'multiple_choice') return reasons;
  const choices = Array.isArray(question.choices) ? question.choices : question.options;
  if (!Array.isArray(choices) || choices.length === 0) return [INVALID_SINGLE_CHOICE_CONFIGURATION];

  const seenIds = new Set();
  const seenDisplays = new Set();
  const displays = [];
  let empty = false;
  let duplicate = false;
  choices.forEach((choice, index) => {
    const id = normalizeChoiceDisplay(choiceId(choice, index));
    const display = normalizeChoiceDisplay(choiceDisplay(choice));
    if (!display) empty = true;
    if (seenIds.has(id) || seenDisplays.has(display)) duplicate = true;
    seenIds.add(id);
    seenDisplays.add(display);
    displays.push(display);
  });
  if (empty || seenDisplays.size < 2) reasons.push(INVALID_SINGLE_CHOICE_CONFIGURATION);
  if (duplicate) reasons.push(DUPLICATE_ANSWER_CHOICES);

  const flaggedCorrect = choices.filter(isCorrectChoice);
  if (flaggedCorrect.length > 1) reasons.push(INVALID_SINGLE_CHOICE_CONFIGURATION);
  if (flaggedCorrect.length === 1) {
    const display = normalizeChoiceDisplay(choiceDisplay(flaggedCorrect[0]));
    if (!display) reasons.push(CORRECT_ANSWER_NOT_IN_CHOICES);
    return [...new Set(reasons)];
  }

  const answers = answerValues(question).map(normalizeChoiceDisplay);
  if (answers.length === 0) return [...new Set(reasons)];
  const represented = answers.some((answer) => seenDisplays.has(answer) || seenIds.has(answer));
  if (!represented) reasons.push(CORRECT_ANSWER_NOT_IN_CHOICES);
  return [...new Set(reasons)];
}

const VISUAL_METADATA_KEYS = [
  'visual_model', 'support_type', 'image_id', 'image', 'diagram_id', 'diagram', 'asset_id', 'model_id',
  'stimulus', 'renderer', 'renderer_model', 'visual', 'manipulative', 'drag_drop_layout', 'layout',
  'shape', 'shapes', 'number_line', 'clock', 'coins', 'data', 'table', 'graph', 'diagram', 'array',
  'object_count', 'objects', 'comparison', 'measurement', 'a', 'b', 'whole', 'part', 'parts',
];
const VISUAL_PROMPT_RE = /\b(shown|picture|clock|objects?|a\s+or\s+b|graph|table|diagram|image|longer|taller|heavier|shorter|compare|model)\b/i;
const RENDERABLE_STIMULUS_TYPES = new Set(['shape', 'model', 'sentence', 'word', 'letter_tiles', 'reading_passage', 'sequencing', 'letter_card', 'picture_choice', 'phonics_tiles', 'sound_match', 'highlighted_text', 'sentence_builder', 'punctuation_marker']);

function hasVisualMetadata(question) {
  return VISUAL_METADATA_KEYS.some((key) => Object.prototype.hasOwnProperty.call(question, key));
}

function requiresStimulus(question) {
  return hasVisualMetadata(question) || VISUAL_PROMPT_RE.test(String(question.prompt || ''));
}

function isPublicStimulusRenderable(stimulus) {
  return Boolean(stimulus && RENDERABLE_STIMULUS_TYPES.has(stimulus.type));
}

function isAssessmentItemDeliverable(publicItem) {
  const payload = publicItem && publicItem.payload;
  if (!payload || typeof payload !== 'object') return false;
  if (!String(payload.prompt || '').trim()) return false;
  if (payload.stimulus) return isPublicStimulusRenderable(payload.stimulus);
  return !VISUAL_PROMPT_RE.test(String(payload.prompt || ''));
}

function validateStimulusRenderability(question, packageId) {
  if (!requiresStimulus(question)) return [];
  const stimulus = publicStimulusFor(question, packageId);
  if (!isPublicStimulusRenderable(stimulus)) return [REQUIRED_STIMULUS_NOT_RENDERABLE];
  return [];
}

function excludesForQuestion({ question, packageId, sourceBank, packageQuestionIds, selectedIdentities, selectedDuplicateKeys, baselineIdentitySet, baselineDuplicateKeySet }) {
  const reasons = [];
  if (!question.question_id) reasons.push('missing question ID');
  if (!question.question_type) reasons.push('missing question type');
  if (question.question_type && !SUPPORTED_TYPES.has(question.question_type)) reasons.push('unsupported question type');
  if (!hasDeterministicAnswer(question)) reasons.push('missing deterministic answer');
  if (question.question_id && packageQuestionIds.has(question.question_id)) reasons.push('duplicate source question ID');
  reasons.push(...validateAnswerChoices(question));
  reasons.push(...validateStimulusRenderability(question, packageId));

  const identity = question.question_id ? identityFor(packageId, sourceBank, question.question_id) : null;
  const duplicateKey = duplicateKeyFor(question);
  if (identity && selectedIdentities.has(identity)) reasons.push('duplicate item identity');
  if ((identity && baselineIdentitySet.has(identity)) || baselineDuplicateKeySet.has(duplicateKey)) reasons.push('baseline/reassessment repeated item');
  if (selectedDuplicateKeys.has(duplicateKey)) reasons.push('duplicate prompt/stimulus combination');
  if (hasAnswerRevealingDeliveryMetadata(question)) reasons.push('answer-revealing delivery metadata');
  return { reasons, identity, duplicateKey };
}

function selectAssessmentItems(packages, options = {}) {
  const baselineItems = options.baselineItems || [];
  const baselineIdentitySet = new Set(baselineItems.map((item) => item.item_identity || item.identity).filter(Boolean));
  const baselineDuplicateKeySet = new Set(baselineItems.map((item) => item.duplicate_key).filter(Boolean));
  const selectedIdentities = new Set();
  const selectedDuplicateKeys = new Set();
  const exclusions = [];
  const exclusionCounts = {};
  const publicItems = [];
  const scoringRecords = [];

  const sortedPackages = [...packages].sort((a, b) => packageIdOf(a).localeCompare(packageIdOf(b)));
  for (const pkg of sortedPackages) {
    const packageId = packageIdOf(pkg);
    const packageQuestionIds = new Set();
    for (const { question, sourceBank, sourcePointer } of collectQuestions(pkg)) {
      const { reasons, identity, duplicateKey } = excludesForQuestion({
        question,
        packageId,
        sourceBank,
        packageQuestionIds,
        selectedIdentities,
        selectedDuplicateKeys,
        baselineIdentitySet,
        baselineDuplicateKeySet,
      });
      if (question.question_id) packageQuestionIds.add(question.question_id);
      if (reasons.length) {
        for (const reason of reasons) increment(exclusionCounts, reason);
        exclusions.push({ package_id: packageId, source_bank: sourceBank, question_id: question.question_id || null, reasons });
        continue;
      }

      selectedIdentities.add(identity);
      selectedDuplicateKeys.add(duplicateKey);
      const stableId = `mvp_${hashValue(identity)}`;
      publicItems.push({
        assessment_item_id: stableId,
        item_identity: identity,
        duplicate_key: duplicateKey,
        source_package_id: packageId,
        source_question_id: question.question_id,
        source_bank: sourceBank,
        source_pointer: sourcePointer,
        grade: pkg.grade,
        subject: pkg.subject,
        domain: pkg.domain || 'unknown',
        question_type: question.question_type,
        visual_identity: visualIdentity(question),
        payload: publicQuestionPayload(question, packageId),
      });
      scoringRecords.push({
        assessment_item_id: stableId,
        item_identity: identity,
        source_package_id: packageId,
        source_question_id: question.question_id,
        answer: getAnswer(question),
      });
    }
  }

  publicItems.sort((a, b) => a.item_identity.localeCompare(b.item_identity));
  scoringRecords.sort((a, b) => a.item_identity.localeCompare(b.item_identity));
  exclusions.sort((a, b) => `${a.package_id}:${a.source_bank}:${a.question_id || ''}`.localeCompare(`${b.package_id}:${b.source_bank}:${b.question_id || ''}`));

  return {
    publicItems,
    scoringRecords,
    exclusions,
    exclusionCounts,
  };
}

module.exports = {
  BANK_ORDER,
  SUPPORTED_TYPES,
  selectAssessmentItems,
  stableStringify,
  identityFor,
  duplicateKeyFor,
  containsProtectedField,
  publicQuestionPayload,
  publicStimulusFor,
  GRADE_1_ENGLISH_VISUAL_RESTORATION_PACKAGE_IDS,
  requiresStimulus,
  isAssessmentItemDeliverable,
  validateAnswerChoices,
  validateStimulusRenderability,
  REQUIRED_STIMULUS_NOT_RENDERABLE,
  DUPLICATE_ANSWER_CHOICES,
  INVALID_SINGLE_CHOICE_CONFIGURATION,
  CORRECT_ANSWER_NOT_IN_CHOICES,
};
