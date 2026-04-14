#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { validateBank } = require('../archetype-engines/generator/love');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/audit-love-bank.mjs <bank-file.json>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const bankId = data[0]?.bank_id || 'UNKNOWN_BANK';
const audit = validateBank(bankId, data);
console.log(JSON.stringify(audit, null, 2));
process.exit(audit.valid ? 0 : 2);
