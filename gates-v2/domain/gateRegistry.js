'use strict';

const APPROVED = [
  ['gate_attention', 1, 'attention'], ['gate_emotion', 2, 'emotion'],
  ['gate_choice', 3, 'choice'], ['gate_body', 4, 'body'],
  ['gate_discipline', 5, 'discipline'], ['gate_truth', 6, 'truth'],
  ['gate_repair', 7, 'repair'], ['gate_creation', 8, 'creation'],
  ['gate_community', 9, 'community'], ['gate_legacy', 10, 'legacy'],
];

const GATES = Object.freeze(APPROVED.map(([gate_id, order, slug]) =>
  Object.freeze({ gate_id, order, slug })));

function validateGateRegistry(registry = GATES) {
  const errors = [];
  if (!Array.isArray(registry) || registry.length !== 10) errors.push('Registry must contain exactly 10 Gates');
  const fields = ['gate_id', 'slug', 'order'];
  for (const field of fields) {
    const values = registry.map((gate) => gate && gate[field]);
    if (new Set(values).size !== values.length) errors.push(`Duplicate ${field}`);
  }
  APPROVED.forEach(([id, order, slug], index) => {
    const gate = registry[index];
    if (!gate || gate.gate_id !== id || gate.order !== order || gate.slug !== slug) {
      errors.push(`Gate ${order} must be ${id}/${slug}`);
    }
  });
  return { valid: errors.length === 0, errors };
}

const initial = validateGateRegistry();
if (!initial.valid) throw new Error(initial.errors.join('; '));
const BY_ID = new Map(GATES.map((gate) => [gate.gate_id, gate]));
const BY_SLUG = new Map(GATES.map((gate) => [gate.slug, gate]));

module.exports = Object.freeze({
  GATES,
  getById: (id) => BY_ID.get(id),
  getBySlug: (slug) => BY_SLUG.get(slug),
  ordered: () => GATES[Symbol.iterator](),
  validateGateRegistry,
});
