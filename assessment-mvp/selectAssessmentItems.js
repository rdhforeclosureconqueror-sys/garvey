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

function publicQuestionPayload(question) {
  const payload = {};
  for (const [key, value] of Object.entries(question)) {
    if (PROTECTED_FIELD_RE.test(key)) continue;
    if (key === 'hints') continue;
    payload[key] = value;
  }
  return payload;
}

function visualIdentity(question) {
  const visualFields = {};
  for (const key of [
    'visual_model', 'support_type', 'image_id', 'image', 'diagram_id', 'diagram', 'asset_id', 'model_id',
    'a', 'b', 'whole', 'part', 'parts', 'shape', 'shapes', 'fraction', 'numerator', 'denominator',
    'number_line', 'clock', 'coins', 'data', 'table', 'array', 'sentence', 'word', 'target_word', 'phoneme',
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
      for (const question of pkg[bank] || []) {
        collected.push({ question, sourceBank: bank, sourcePointer: bank });
      }
    }
  }
  return collected;
}

function increment(map, reason) {
  map[reason] = (map[reason] || 0) + 1;
}

function excludesForQuestion({ question, packageId, sourceBank, packageQuestionIds, selectedIdentities, selectedDuplicateKeys, baselineIdentitySet, baselineDuplicateKeySet }) {
  const reasons = [];
  if (!question.question_id) reasons.push('missing question ID');
  if (!question.question_type) reasons.push('missing question type');
  if (question.question_type && !SUPPORTED_TYPES.has(question.question_type)) reasons.push('unsupported question type');
  if (!hasDeterministicAnswer(question)) reasons.push('missing deterministic answer');
  if (question.question_id && packageQuestionIds.has(question.question_id)) reasons.push('duplicate source question ID');

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
        payload: publicQuestionPayload(question),
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
};
