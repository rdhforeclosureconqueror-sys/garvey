#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'public', 'archetypes', 'cards-manifest.json');
const publicRoot = path.join(repoRoot, 'public');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const cards = Object.values(manifest.cards || {});

const missing = [];
for (const card of cards) {
  for (const key of ['image', 'image_male', 'image_female']) {
    const raw = card?.[key];
    if (!raw) continue;
    if (!raw.startsWith('/')) {
      missing.push({ id: card.id, key, value: raw, reason: 'path must start with /' });
      continue;
    }
    const diskPath = path.join(publicRoot, raw.replace(/^\//, ''));
    if (!fs.existsSync(diskPath)) {
      missing.push({ id: card.id, key, value: raw, reason: 'missing file' });
    }
  }
}

if (missing.length) {
  console.error('Manifest image validation failed:');
  for (const item of missing) {
    console.error(`- ${item.id}.${item.key}: ${item.value} (${item.reason})`);
  }
  process.exit(1);
}

console.log(`Validated ${cards.length} cards. All image paths exist under public/.`);
