"use strict";

const ENGINE_REGISTRY = Object.freeze({
  love: { id: 'love', status: 'live', hasScoring: true, questionBanks: 3 },
  leadership: { id: 'leadership', status: 'live', hasScoring: true, questionBanks: 3 },
  loyalty: { id: 'loyalty', status: 'live', hasScoring: true, questionBanks: 3 },
});

const CONTENT_SCHEMA_FIELDS = Object.freeze([
  'name','code','emoji','coreEnergy','tagline','description','whenStrong','outOfBalanceHigh','outOfBalanceLow','coreStrengths','blindSpots','needsToStayBalanced','dailyBuildUps','weeklyBuildUps','balanceSignals','visualDirection','imageKey'
]);

module.exports = {
  ENGINE_REGISTRY,
  CONTENT_SCHEMA_FIELDS,
  QUESTION_SCHEMA: { id: 'string', bank: 'string', archetypeCode: 'string', prompt: 'string', scale: { min: 'number', max: 'number' }, reverseScored: 'boolean' },
  RESULT_SCHEMA: { primaryArchetype: 'object', secondaryArchetype: 'object', normalizedScores: 'object', balanceState: 'string' },
  PAGE_RENDER_CONTRACT: { list: 'engine/archetypes', detail: 'engine/archetypes/:slug', assessmentStart: 'engine/assessment/start', assessmentScore: 'engine/assessment/score' },
  ASSET_REGISTRY: { namespace: 'archetype-engines/assets', strategy: 'engine-prefixed imageKey lookup' },
};
