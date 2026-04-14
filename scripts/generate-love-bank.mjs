#!/usr/bin/env node
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { generateLoveBank } = require('../archetype-engines/generator/love');
const { exportBank } = require('../archetype-engines/generator/love/exportBank');

const args = process.argv.slice(2);
const seed = args.includes('--seed') ? args[args.indexOf('--seed') + 1] : 'BANK_2026_A';
const shouldExport = args.includes('--export');

const bank = generateLoveBank({ seed, bankId: seed });

if (!bank.audit.valid) {
  console.error(JSON.stringify(bank.audit, null, 2));
  process.exit(1);
}

if (shouldExport) {
  const outFile = exportBank({ bank });
  console.log(`Exported ${bank.bankId} to ${outFile}`);
}

console.log(JSON.stringify({
  bankId: bank.bankId,
  questions: bank.questions.length,
  candidatePoolSize: bank.candidatePoolSize,
  valid: bank.audit.valid,
  warnings: bank.audit.warnings,
}, null, 2));
