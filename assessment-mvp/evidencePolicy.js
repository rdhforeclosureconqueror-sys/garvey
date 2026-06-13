const PROVISIONAL_GRADE1_MATH_EVIDENCE_POLICY_VERSION = 'g1-math-provisional-3-response-v1';

const PROVISIONAL_MIN_VALID_RESPONSES = 3;

const PROVISIONAL_EVIDENCE_POLICY = Object.freeze({
  version: PROVISIONAL_GRADE1_MATH_EVIDENCE_POLICY_VERSION,
  minimumValidResponses: PROVISIONAL_MIN_VALID_RESPONSES,
  labels: Object.freeze({
    ready: 'Ready',
    developing: 'Developing',
    needsSupport: 'Needs Support',
    notEnoughEvidence: 'Not Enough Evidence',
  }),
});

function classifyWithProvisionalPolicy(evidence, policy = PROVISIONAL_EVIDENCE_POLICY) {
  const total = Number(evidence && evidence.valid_scored_responses) || 0;
  const correct = Number(evidence && evidence.correct_responses) || 0;
  if (total < policy.minimumValidResponses) return policy.labels.notEnoughEvidence;
  const accuracy = total ? correct / total : 0;
  if (correct === total) return policy.labels.ready;
  if (total > policy.minimumValidResponses && accuracy >= 0.8) return policy.labels.ready;
  if (correct >= 2 && total === policy.minimumValidResponses) return policy.labels.developing;
  if (accuracy >= 0.5) return policy.labels.developing;
  return policy.labels.needsSupport;
}

module.exports = {
  PROVISIONAL_EVIDENCE_POLICY,
  PROVISIONAL_GRADE1_MATH_EVIDENCE_POLICY_VERSION,
  PROVISIONAL_MIN_VALID_RESPONSES,
  classifyWithProvisionalPolicy,
};
