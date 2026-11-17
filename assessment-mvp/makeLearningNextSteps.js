'use strict';

// Child-friendly, non-diagnostic feedback based ONLY on provisional assessment evidence.
// No personality labels, genius types, placement claims or raw student responses.
const TYPE_TITLES = Object.freeze({
  current_skill_support: 'Practice this next',
  prerequisite_support: 'Build the foundation',
  additional_evidence: 'Try another question',
});

function cleanText(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text && text.length <= 120 ? text : fallback;
}

function makeLearningNextSteps({ skillEvidence = [], recommendations = [] } = {}) {
  if (!Array.isArray(skillEvidence) || !Array.isArray(recommendations)) {
    throw new TypeError('assessment evidence and recommendations must be arrays');
  }
  const supported = skillEvidence.filter(e => e && e.provisional_label === 'Ready' &&
    Number(e.valid_scored_responses) >= 3);
  const strengths = supported.slice(0, 2).map(e => ({
    skill: cleanText(e.skill, 'This skill'),
    message: 'You showed promising understanding here. Keep exploring!',
    label: 'Promising progress',
  }));

  const practice = [];
  const seen = new Set();
  for (const rec of recommendations) {
    if (!rec || !Object.hasOwn(TYPE_TITLES, rec.recommendation_type) ||
        typeof rec.package_id !== 'string' || !rec.package_id.trim() ||
        seen.has(rec.package_id)) continue;
    seen.add(rec.package_id);
    practice.push({
      title: TYPE_TITLES[rec.recommendation_type],
      skill: cleanText(rec.skill, 'This learning skill'),
      message: rec.recommendation_type === 'additional_evidence'
        ? 'We need a little more information. Try another example when you are ready.'
        : 'Every practice round helps. Try this skill again with support if you need it.',
      package_id: rec.package_id,
      practice_route: typeof rec.practice_route === 'string' && /^\/skill-world\/[a-zA-Z0-9_-]+\/drill$/.test(rec.practice_route)
        ? rec.practice_route : null,
    });
    if (practice.length === 3) break;
  }

  return {
    headline: strengths.length ? 'Look at what you are learning!' : 'Your learning journey is underway!',
    strengths,
    practice,
    encouragement: 'Everyone learns through practice, curiosity, and trying again.',
    note: 'These are practice suggestions from one assessment, not labels or a final measure of ability.',
  };
}

module.exports = { makeLearningNextSteps };
