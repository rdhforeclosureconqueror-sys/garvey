import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INCLUDE_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.html']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'reports']);

const directPatterns = [
  { key: 'tenant=undefined', re: /tenant=undefined/g },
  { key: 'tenant=null', re: /tenant=null/g },
  { key: '/t/undefined/', re: /\/t\/undefined\//g },
  { key: '/t/null/', re: /\/t\/null\//g },
  { key: 'email=undefined', re: /email=undefined/g },
  { key: 'email=null', re: /email=null/g },
];

const riskyTemplatePatterns = [
  { key: 'tenant template propagation', re: /tenant\s*=\s*\$\{\s*tenant\s*\}/g },
  { key: 'email template propagation', re: /email\s*=\s*\$\{\s*email\s*\}/g },
  { key: 'tenant path template propagation', re: /\/t\/\$\{\s*tenant\s*\}\//g },
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (INCLUDE_EXT.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll('\\\\', '/');
}

function findAll(re, text) {
  const matches = [];
  let m;
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  while ((m = rx.exec(text))) matches.push({ index: m.index, match: m[0] });
  return matches;
}

function lineOf(text, index) {
  const upto = text.slice(0, index);
  return upto.split('\n').length;
}

export function runContextGuardCheck() {
  const files = walk(ROOT);
  const findings = [];

  for (const file of files) {
    const relative = rel(file);
    if (relative.startsWith('scripts/context-guard-check.mjs') || relative.startsWith('scripts/system-readiness-check.mjs') || relative.startsWith('scripts/live-smoke.mjs')) continue;
    const src = fs.readFileSync(file, 'utf8');

    for (const pat of directPatterns) {
      for (const hit of findAll(pat.re, src)) {
        findings.push({
          severity: 'FAIL',
          subsystem: 'Context propagation',
          file: rel(file),
          line: lineOf(src, hit.index),
          expected: 'No literal undefined/null context value in URL/query strings',
          actual: `Detected ${pat.key}`,
          likely_cause: 'Context helper accepted or emitted a literal undefined/null value',
        });
      }
    }

    for (const pat of riskyTemplatePatterns) {
      for (const hit of findAll(pat.re, src)) {
        findings.push({
          severity: 'WARN',
          subsystem: 'Context propagation',
          file: rel(file),
          line: lineOf(src, hit.index),
          expected: 'Context string interpolation should guard tenant/email before building URLs',
          actual: `Detected ${pat.key}`,
          likely_cause: 'Missing explicit null/undefined guard before interpolation',
        });
      }
    }
  }

  const summary = {
    pass: findings.filter((f) => f.severity === 'PASS').length,
    warn: findings.filter((f) => f.severity === 'WARN').length,
    fail: findings.filter((f) => f.severity === 'FAIL').length,
  };

  return { summary, findings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = runContextGuardCheck();
  if (report.findings.length === 0) {
    console.log('PASS: Context propagation guard scan');
  } else {
    for (const f of report.findings) {
      console.log(`${f.severity}: ${f.subsystem}`);
      console.log(`  File: ${f.file}:${f.line}`);
      console.log(`  Expected: ${f.expected}`);
      console.log(`  Actual: ${f.actual}`);
      console.log(`  Likely cause: ${f.likely_cause}`);
    }
  }
  process.exit(report.summary.fail > 0 ? 1 : 0);
}
