"use strict";

const { ARCHETYPES, CLASS_DISTRIBUTION, SIGNAL_LIBRARY } = require("./signals");
const { createPairScheduler } = require("./pairScheduler");
const { seededRandom, shuffle } = require("./utils");

const CLASS_ORDER = ["ID", "BH", "SC", "ST", "DS"];

function buildOmissionPlan(seed) {
  const rand = seededRandom(`${seed}:omissions`);
  const plan = {};
  let offset = 0;

  for (const cls of CLASS_ORDER) {
    const count = CLASS_DISTRIBUTION[cls];
    const base = [];
    const rounds = Math.floor(count / ARCHETYPES.length);
    for (let i = 0; i < rounds; i += 1) base.push(...ARCHETYPES);
    const remainder = count % ARCHETYPES.length;
    const rotated = [...ARCHETYPES.slice(offset), ...ARCHETYPES.slice(0, offset)];
    base.push(...rotated.slice(0, remainder));
    plan[cls] = shuffle(base, rand);
    offset = (offset + 1) % ARCHETYPES.length;
  }

  return plan;
}

function buildBlueprints({ bankId, seed }) {
  const rand = seededRandom(seed || bankId);
  const omissionPlan = buildOmissionPlan(seed || bankId);
  const pairScheduler = createPairScheduler();
  const blueprints = [];

  let index = 1;
  for (const questionClass of CLASS_ORDER) {
    const omissions = omissionPlan[questionClass];
    for (let i = 0; i < omissions.length; i += 1) {
      const omitted = omissions[i];
      const primaries = shuffle(ARCHETYPES.filter((a) => a !== omitted), rand);
      const optionBlueprints = primaries.map((primary) => {
        const secondary = pairScheduler.chooseSecondary(primary, ARCHETYPES.filter((a) => a !== primary));
        pairScheduler.record(primary, secondary);
        const profile = SIGNAL_LIBRARY[primary];
        const signal = profile.coreSignals[(index + i) % profile.coreSignals.length];
        return {
          primary,
          secondary,
          signal,
          toneTarget: "neutral_positive",
        };
      });

      const qid = `${bankId}_BP_${String(index).padStart(2, "0")}`;
      blueprints.push({
        bankId,
        questionId: qid,
        questionClass,
        scenarioDomain: SIGNAL_LIBRARY[primaries[0]].scenarioDomains[(i + index) % SIGNAL_LIBRARY[primaries[0]].scenarioDomains.length],
        optionBlueprints,
        contradictionRole: questionClass === "ST" && i % 3 === 0 ? "source" : (questionClass === "DS" ? "target" : null),
        reversePairId: questionClass === "ST" && i % 3 === 0 ? `REV_${qid}` : null,
        desiredSelfEligible: questionClass === "DS",
        contradictionDirection: questionClass === "ST" ? "forward" : (questionClass === "DS" ? "reverse" : null),
      });
      index += 1;
    }
  }

  return blueprints;
}

module.exports = { buildBlueprints, CLASS_ORDER };
