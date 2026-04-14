#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { generateLoveBank } = require('../archetype-engines/generator/love');
const { exportBank } = require('../archetype-engines/generator/love/exportBank');

const ARCHETYPES = ['RS', 'AL', 'EC', 'AV', 'ES'];
const CLASS_MULTIPLIER = { ID: 1.0, BH: 1.0, SC: 1.25, ST: 1.5, DS: 1.0 };
const SEEDS = ['BANK_A', 'BANK_B', 'BANK_C'];

function normalizeQuestion(question) {
  return {
    id: question.id || question.question_id,
    bankId: question.bankId || question.bank_id,
    questionClass: question.questionClass || question.question_class,
    prompt: question.prompt,
    options: (question.options || []).map((opt) => ({
      id: opt.id || opt.option_id,
      text: opt.text,
      primary: opt.primary || opt.primary_archetype,
      secondary: opt.secondary || opt.secondary_archetype,
    })),
  };
}

function contribution(code, question, option) {
  const m = CLASS_MULTIPLIER[question.questionClass] || 1;
  let score = 0;
  if (option.primary === code) score += 2 * m;
  if (option.secondary === code) score += 1 * m;
  return score;
}

function maxPossible(questions) {
  const max = Object.fromEntries(ARCHETYPES.map((code) => [code, 0]));
  for (const q of questions) {
    for (const code of ARCHETYPES) {
      max[code] += Math.max(...q.options.map((opt) => contribution(code, q, opt)));
    }
  }
  return max;
}

function scoreQuestions(questions, answers) {
  const raw = Object.fromEntries(ARCHETYPES.map((code) => [code, 0]));
  for (const q of questions) {
    const answerId = answers[q.id];
    const option = q.options.find((opt) => opt.id === answerId) || q.options[0];
    const m = CLASS_MULTIPLIER[q.questionClass] || 1;
    raw[option.primary] += 2 * m;
    raw[option.secondary] += 1 * m;
  }
  const max = maxPossible(questions);
  const normalized = Object.fromEntries(ARCHETYPES.map((code) => [code, Number(((raw[code] / Math.max(max[code], 1)) * 100).toFixed(2))]));
  const rankOrder = Object.entries(normalized).sort((a, b) => b[1] - a[1]).map(([code, score], idx) => ({ rank: idx + 1, code, score }));
  const primary = rankOrder[0]?.code || null;
  const secondary = rankOrder[1]?.code || null;
  const hybridGap = rankOrder.length > 1 ? Number((rankOrder[0].score - rankOrder[1].score).toFixed(2)) : null;
  const hybrid = hybridGap !== null && hybridGap <= 7;
  return { raw, normalized, rankOrder, primary, secondary, hybridStatus: hybrid ? `${primary}-${secondary}` : null };
}

function dominantAnswers(questions, targetCode) {
  const answers = {};
  for (const q of questions) {
    const best = q.options
      .map((opt) => ({ opt, score: contribution(targetCode, q, opt) }))
      .sort((a, b) => b.score - a.score)[0]?.opt;
    answers[q.id] = best.id;
  }
  return answers;
}

function balancedMixedAnswers(questions) {
  const answers = {};
  for (const [idx, q] of questions.entries()) {
    const target = ARCHETYPES[idx % ARCHETYPES.length];
    const best = q.options
      .map((opt) => ({ opt, score: contribution(target, q, opt) }))
      .sort((a, b) => b.score - a.score)[0]?.opt;
    answers[q.id] = best.id;
  }
  return answers;
}

function weightedProfileAnswers(questions, weights) {
  const answers = {};
  for (const q of questions) {
    const best = q.options
      .map((opt) => ({
        opt,
        utility: ((weights[opt.primary] || 0) * 2) + (weights[opt.secondary] || 0),
      }))
      .sort((a, b) => b.utility - a.utility)[0]?.opt;
    answers[q.id] = best.id;
  }
  return answers;
}

function bankWordingAudit(questions, audit) {
  const promptStartCounts = {};
  const optionStarts = {};
  const awkwardFragments = [];
  const healthyLexicon = ['secure', 'healthy', 'always', 'never', 'best', 'ideal'];
  let healthyLoadedOptions = 0;

  for (const q of questions) {
    const start = q.prompt.split(' ').slice(0, 4).join(' ').toLowerCase();
    promptStartCounts[start] = (promptStartCounts[start] || 0) + 1;

    for (const opt of q.options) {
      const s = opt.text.split(' ').slice(0, 3).join(' ').toLowerCase();
      optionStarts[s] = (optionStarts[s] || 0) + 1;
      if (healthyLexicon.some((token) => opt.text.toLowerCase().includes(token))) healthyLoadedOptions += 1;
      if (/\bvery\s+very\b/i.test(opt.text) || /\balways\b.*\balways\b/i.test(opt.text)) {
        awkwardFragments.push({ questionId: q.id, text: opt.text });
      }
    }
  }

  const repeatedPromptStarts = Object.entries(promptStartCounts)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([start, count]) => ({ start, count }));

  const repeatedOptionStarts = Object.entries(optionStarts)
    .filter(([, count]) => count > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([start, count]) => ({ start, count }));

  return {
    repeatedPromptStarts,
    repeatedOptionStarts,
    awkwardFragments,
    healthyLoadedOptionRatio: Number((healthyLoadedOptions / Math.max(questions.length * 4, 1)).toFixed(3)),
    desirabilityWarnings: audit.warnings,
  };
}

function auditBankFile(bankFile) {
  const out = execFileSync('node', ['scripts/audit-love-bank.mjs', bankFile], { encoding: 'utf8' });
  return JSON.parse(out);
}

function main() {
  const timestamp = new Date().toISOString();
  const phase1 = [];
  const bankData = {};

  for (const seed of SEEDS) {
    const generated = generateLoveBank({ seed, bankId: seed });
    const questions = generated.questions.map(normalizeQuestion);
    const outFile = exportBank({ bank: generated, outFile: path.join('artifacts', 'love-banks', `${seed.toLowerCase()}.generated.json`) });
    const audit = auditBankFile(outFile);
    const auditFile = path.join('artifacts', 'love-banks', `${seed.toLowerCase()}.audit.json`);
    fs.mkdirSync(path.dirname(auditFile), { recursive: true });
    fs.writeFileSync(auditFile, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');

    bankData[seed] = { questions, audit, bankFile: outFile, auditFile };
    phase1.push({
      seed,
      bankFile: outFile,
      auditFile,
      classCounts: audit.classCounts,
      primaryCounts: audit.primaryCounts,
      pairBalanceSpread: (() => {
        const values = Object.values(audit.pairCounts || {});
        return values.length ? Math.max(...values) - Math.min(...values) : 0;
      })(),
      weightedPrimaryOpportunity: audit.weightedPrimaryOpportunity,
      schemaValidity: Boolean(questions.every((q) => q.id && q.bankId && q.questionClass && q.prompt && q.options.length === 4)),
      auditValid: audit.valid,
      failures: audit.failures,
    });
  }

  const phase2 = [];
  const simulationPatterns = [
    ['RS-heavy', (questions) => dominantAnswers(questions, 'RS')],
    ['AL-heavy', (questions) => dominantAnswers(questions, 'AL')],
    ['EC-heavy', (questions) => dominantAnswers(questions, 'EC')],
    ['AV-heavy', (questions) => dominantAnswers(questions, 'AV')],
    ['ES-heavy', (questions) => dominantAnswers(questions, 'ES')],
    ['balanced-mixed', balancedMixedAnswers],
  ];

  for (const seed of SEEDS) {
    const { questions } = bankData[seed];
    const runs = [];
    for (const [label, builder] of simulationPatterns) {
      const answers = builder(questions);
      const scored = scoreQuestions(questions, answers);
      runs.push({ pattern: label, ...scored });
    }
    phase2.push({ seed, runs });
  }

  const fixedProfiles = [
    ['FIXED_PROFILE_ALPHA', (questions) => weightedProfileAnswers(questions, { RS: 1.0, EC: 0.85, ES: 0.55, AL: 0.35, AV: 0.25 })],
    ['FIXED_PROFILE_BETA', (questions) => weightedProfileAnswers(questions, { AV: 1.0, AL: 0.85, ES: 0.6, EC: 0.45, RS: 0.3 })],
  ];

  const phase3 = [];
  for (const [profileLabel, builder] of fixedProfiles) {
    const bySeed = {};
    for (const seed of SEEDS) {
      const questions = bankData[seed].questions;
      bySeed[seed] = scoreQuestions(questions, builder(questions));
    }

    const baseline = bySeed[SEEDS[0]].normalized;
    const deltas = {};
    for (const seed of SEEDS.slice(1)) {
      deltas[seed] = Object.fromEntries(ARCHETYPES.map((code) => [code, Number((bySeed[seed].normalized[code] - baseline[code]).toFixed(2))]));
    }

    phase3.push({
      profile: profileLabel,
      results: bySeed,
      rankingStable: new Set(SEEDS.map((seed) => bySeed[seed].primary)).size === 1,
      deltasVsBankA: deltas,
    });
  }

  const phase4 = [];
  for (const seed of SEEDS) {
    const { questions, audit } = bankData[seed];
    phase4.push({ seed, ...bankWordingAudit(questions, audit) });
  }

  const structuralPass = phase1.every((item) => item.auditValid && item.schemaValidity)
    && phase2.every((seedResult) => ARCHETYPES.every((code) => seedResult.runs.find((r) => r.pattern === `${code}-heavy`)?.primary === code));
  const wordingNeedsRefinement = phase4.some((entry) => (entry.repeatedOptionStarts[0]?.count || 0) > 8);
  const recommendation = structuralPass && !wordingNeedsRefinement
    ? 'generator ready for candidate-bank use'
    : 'generator needs wording-rule refinement before promotion';

  const report = {
    generatedAt: timestamp,
    seeds: SEEDS,
    phase1,
    phase2,
    phase3,
    phase4,
    recommendation,
  };

  const output = path.join('artifacts', `love-generator-validation-pass-${timestamp.slice(0, 10)}.json`);
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ output, recommendation }, null, 2));
}

main();
