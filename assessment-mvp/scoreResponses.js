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

const NUMERIC_TYPES = new Set(['numeric', 'number_response', 'integer_response', 'decimal_response', 'fraction_response']);
const SHORT_TYPES = new Set(['short_response', 'short_answer']);
const APPROVED_LABELS = new Set(['Ready', 'Developing', 'Needs Support', 'Not Enough Evidence']);

function firstPresent(record, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  }
  return undefined;
}

function answerData(record) {
  return firstPresent(record, ['answer', 'correct_answer', 'acceptable_answers', 'accepted_answers', 'answers']);
}

function itemType(record) {
  return firstPresent(record, ['question_type', 'item_type', 'type']);
}

function isOmitted(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function hasDeterministicAnswer(record) {
  const answer = answerData(record);
  if (answer === undefined || answer === null) return false;
  if (typeof answer === 'string') return answer.trim().length > 0;
  if (Array.isArray(answer)) return answer.length > 0;
  return true;
}

function answerList(record) {
  const primary = answerData(record);
  const values = Array.isArray(primary) ? [...primary] : [primary];
  for (const key of ['acceptable_answers', 'accepted_answers']) {
    if (Object.prototype.hasOwnProperty.call(record, key) && record[key] !== primary) {
      values.push(...(Array.isArray(record[key]) ? record[key] : [record[key]]));
    }
  }
  return values.filter((value) => value !== undefined && value !== null && String(value).trim().length > 0);
}

function normalizeShort(value, record = {}) {
  let normalized = String(value).trim().replace(/\s+/g, ' ');
  if (!record.punctuation_sensitive) normalized = normalized.replace(/^[\s.,!?;:'"“”‘’()\[\]{}]+|[\s.,!?;:'"“”‘’()\[\]{}]+$/g, '');
  if (!record.case_sensitive) normalized = normalized.toLowerCase();
  return normalized;
}

function normalizeDisplay(value) {
  return String(value).trim();
}

function choiceId(choice) {
  if (!choice || typeof choice !== 'object') return undefined;
  return firstPresent(choice, ['id', 'choice_id', 'key', 'value_id']);
}

function choiceValue(choice) {
  if (choice && typeof choice === 'object') return firstPresent(choice, ['value', 'label', 'text', 'display', 'answer']);
  return choice;
}

function truthyCorrect(choice) {
  return Boolean(choice && typeof choice === 'object' && (choice.correct === true || choice.is_correct === true || choice.isCorrect === true));
}

function correctMultipleChoiceOptions(record) {
  const choices = firstPresent(record, ['choices', 'options']);
  const answer = answerData(record);
  if (!Array.isArray(choices) || choices.length === 0) {
    return hasDeterministicAnswer(record) ? [{ id: undefined, value: answer }] : [];
  }

  const flagged = choices.filter(truthyCorrect).map((choice) => ({ id: choiceId(choice), value: choiceValue(choice) }));
  if (flagged.length > 0) return flagged;

  const answerValues = new Set(answerList(record).map((value) => normalizeDisplay(value)));
  return choices
    .map((choice) => ({ id: choiceId(choice), value: choiceValue(choice) }))
    .filter((choice) => answerValues.has(normalizeDisplay(choice.id)) || answerValues.has(normalizeDisplay(choice.value)));
}

function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

function rational(numerator, denominator = 1n) {
  if (denominator === 0n) return null;
  let n = numerator;
  let d = denominator;
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const divisor = gcd(n, d);
  return { n: n / divisor, d: d / divisor };
}

function parseNumeric(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { ok: false, reason: 'malformed_numeric_response' };
    return parseNumeric(String(value));
  }
  if (typeof value !== 'string') return { ok: false, reason: 'malformed_numeric_response' };
  const text = value.trim();
  if (!text) return { ok: false, reason: 'malformed_numeric_response' };
  if (/[a-zA-Z]/.test(text)) return { ok: false, reason: 'units_unsupported' };
  if (/^[-+]?\d[\d,]*(?:\.\d+)?\s+\d+\s*\/\s*\d+$/.test(text)) return { ok: false, reason: 'ambiguous_mixed_number' };
  if (/[-+]?\d[\d,]*(?:\.\d+)?\s+[-+]?\d[\d,]*(?:\.\d+)?/.test(text)) return { ok: false, reason: 'multiple_numeric_values' };
  if (/^[-+]?\d[\d,]*(?:\.\d+)?\s+\/\s*[-+]?\d[\d,]*(?:\.\d+)?$/.test(text)) return { ok: false, reason: 'malformed_fraction_response' };

  const fractionMatch = text.match(/^([-+]?\d[\d,]*)\s*\/\s*([-+]?\d[\d,]*)$/);
  if (fractionMatch) {
    const numeratorText = fractionMatch[1].replace(/,/g, '');
    const denominatorText = fractionMatch[2].replace(/,/g, '');
    const parsed = rational(BigInt(numeratorText), BigInt(denominatorText));
    if (!parsed) return { ok: false, reason: 'malformed_fraction_response' };
    return { ok: true, value: parsed, normalized: `${parsed.n}/${parsed.d}` };
  }

  if (!/^[-+]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text)) return { ok: false, reason: 'malformed_numeric_response' };
  if (/^[-+]?\d+,\d{1,2}(?:,|$)/.test(text)) return { ok: false, reason: 'malformed_numeric_response' };
  const normalizedText = text.replace(/,/g, '');
  const sign = normalizedText.startsWith('-') ? -1n : 1n;
  const unsigned = normalizedText.replace(/^[-+]/, '');
  const [whole, decimal = ''] = unsigned.split('.');
  const numerator = BigInt(`${whole}${decimal}` || '0') * sign;
  const denominator = 10n ** BigInt(decimal.length);
  const parsed = rational(numerator, denominator);
  return { ok: true, value: parsed, normalized: parsed.d === 1n ? String(parsed.n) : `${parsed.n}/${parsed.d}` };
}

function equalRational(a, b) {
  return a.n === b.n && a.d === b.d;
}

function scoreMultipleChoice(record, response) {
  const correctOptions = correctMultipleChoiceOptions(record);
  if (correctOptions.length !== 1) return notScorable(record, response, 'ambiguous_or_missing_correct_choice');
  const normalized = normalizeDisplay(response);
  const correct = correctOptions[0];
  const matchesId = correct.id !== undefined && normalized === normalizeDisplay(correct.id);
  const matchesValue = correct.value !== undefined && normalized === normalizeDisplay(correct.value);
  return scored(record, normalized, matchesId || matchesValue);
}

function scoreShort(record, response) {
  const expected = answerList(record).map((value) => normalizeShort(value, record));
  if (expected.length === 0) return notScorable(record, response, 'missing_deterministic_answer');
  const normalized = normalizeShort(response, record);
  return scored(record, normalized, expected.includes(normalized));
}

function scoreNumeric(record, response) {
  const expectedValues = answerList(record);
  if (expectedValues.length === 0) return notScorable(record, response, 'missing_deterministic_answer');
  const parsedResponse = parseNumeric(response);
  if (!parsedResponse.ok) return notScorable(record, response, parsedResponse.reason);
  const parsedExpected = [];
  for (const expected of expectedValues) {
    const parsed = parseNumeric(expected);
    if (!parsed.ok) return notScorable(record, response, 'missing_deterministic_answer');
    parsedExpected.push(parsed.value);
  }
  return scored(record, parsedResponse.normalized, parsedExpected.some((expected) => equalRational(expected, parsedResponse.value)));
}

function resultBase(record, response) {
  const base = {
    item_identity: record.item_identity,
    source_package_id: record.source_package_id,
    source_question_id: record.source_question_id,
  };
  if (response !== undefined && response !== null && (typeof response !== 'string' || response.trim().length > 0)) {
    base.normalized_response = String(response).trim().replace(/\s+/g, ' ');
  }
  return base;
}

function scored(record, normalizedResponse, isCorrect) {
  const result = {
    item_identity: record.item_identity,
    source_package_id: record.source_package_id,
    source_question_id: record.source_question_id,
    status: isCorrect ? 'correct' : 'incorrect',
    scored: true,
  };
  if (!isCorrect) result.normalized_response = normalizedResponse;
  return result;
}

function notScorable(record, response, reason_code) {
  return {
    ...resultBase(record, response),
    status: 'not_scorable',
    scored: false,
    reason_code,
  };
}

function omitted(record) {
  return {
    item_identity: record.item_identity,
    source_package_id: record.source_package_id,
    source_question_id: record.source_question_id,
    status: 'omitted',
    scored: false,
    reason_code: 'omitted_response',
  };
}

function unknown(identity) {
  return {
    item_identity: identity,
    source_package_id: null,
    source_question_id: null,
    status: 'unknown_item',
    scored: false,
    reason_code: 'unknown_item',
  };
}

function classify(evidence) {
  const total = evidence.valid_scored_responses;
  if (total < 3) return 'Not Enough Evidence';
  const accuracy = evidence.correct_responses / total;
  if (total >= 4 && accuracy >= 0.8) return 'Ready';
  if (accuracy >= 0.5 && accuracy <= 0.79) return 'Developing';
  if (accuracy < 0.5) return 'Needs Support';
  return 'Not Enough Evidence';
}

function aggregate(results) {
  const bySkill = new Map();
  for (const result of results) {
    if (result.status === 'unknown_item') continue;
    const key = result.source_package_id;
    if (!bySkill.has(key)) {
      bySkill.set(key, {
        source_package_id: key,
        skill_id: key,
        valid_scored_responses: 0,
        correct_responses: 0,
        incorrect_responses: 0,
        omitted_responses: 0,
        not_scorable_responses: 0,
        accuracy: null,
        provisional_label: 'Not Enough Evidence',
      });
    }
    const evidence = bySkill.get(key);
    if (result.status === 'correct') {
      evidence.valid_scored_responses += 1;
      evidence.correct_responses += 1;
    } else if (result.status === 'incorrect') {
      evidence.valid_scored_responses += 1;
      evidence.incorrect_responses += 1;
    } else if (result.status === 'omitted') {
      evidence.omitted_responses += 1;
    } else if (result.status === 'not_scorable') {
      evidence.not_scorable_responses += 1;
    }
  }

  const skillEvidence = [...bySkill.values()].sort((a, b) => a.source_package_id.localeCompare(b.source_package_id));
  for (const evidence of skillEvidence) {
    if (evidence.valid_scored_responses >= 3) {
      evidence.accuracy = evidence.correct_responses / evidence.valid_scored_responses;
    }
    evidence.provisional_label = classify(evidence);
    if (!APPROVED_LABELS.has(evidence.provisional_label)) throw new Error(`Unexpected label: ${evidence.provisional_label}`);
  }
  return skillEvidence;
}

function responseIdentity(submission) {
  return firstPresent(submission, ['item_identity', 'internal_item_identity']);
}

function inferredType(record, response) {
  const explicitType = itemType(record);
  if (explicitType) return explicitType;
  const expectedValues = answerList(record);
  if (expectedValues.length === 1 && parseNumeric(expectedValues[0]).ok && parseNumeric(response).ok) return 'numeric';
  return 'short_response';
}

function scoreOne(record, response) {
  if (response && typeof response === 'object' && response.invalid_delivery === true) return notScorable(record, response, 'invalid_delivery');
  const type = inferredType(record, response);
  if (!SUPPORTED_TYPES.has(type)) return notScorable(record, response, 'unsupported_item_type');
  if (isOmitted(response)) return omitted(record);
  if (!hasDeterministicAnswer(record)) return notScorable(record, response, 'missing_deterministic_answer');
  if (type === 'multiple_choice') return scoreMultipleChoice(record, response);
  if (SHORT_TYPES.has(type)) return scoreShort(record, response);
  if (NUMERIC_TYPES.has(type)) return scoreNumeric(record, response);
  return notScorable(record, response, 'unsupported_item_type');
}

function scoreResponses(scoringRecords, submissions) {
  if (!Array.isArray(scoringRecords)) throw new TypeError('scoringRecords must be an array');
  if (!Array.isArray(submissions)) throw new TypeError('responses must be an array');

  const recordsByIdentity = new Map();
  for (const record of scoringRecords) {
    if (record && record.item_identity) recordsByIdentity.set(record.item_identity, record);
  }

  const responseResults = submissions.map((submission) => {
    const identity = responseIdentity(submission || {});
    if (!identity || !recordsByIdentity.has(identity)) return unknown(identity || null);
    const record = recordsByIdentity.get(identity);
    return scoreOne(record, firstPresent(submission, ['response', 'answer', 'value']));
  });

  return {
    responses: responseResults,
    skillEvidence: aggregate(responseResults),
  };
}

module.exports = {
  APPROVED_LABELS,
  parseNumeric,
  scoreResponses,
};
