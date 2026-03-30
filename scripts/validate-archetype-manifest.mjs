#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'public', 'archetypes', 'cards-manifest.json');
const publicRoot = path.join(repoRoot, 'public');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const cards = Object.values(manifest.cards || {});

const missing = [];

function validatePath(card, key, required = false) {
  const raw = card?.[key];
  if (!raw) {
    if (required) {
      missing.push({ id: card.id, key, value: raw, reason: 'missing required field' });
    }
    return;
  }

  if (!raw.startsWith('/')) {
    missing.push({ id: card.id, key, value: raw, reason: 'path must start with /' });
    return;
  }

  const diskPath = path.join(publicRoot, raw.replace(/^\//, ''));
  if (!fs.existsSync(diskPath)) {
    missing.push({ id: card.id, key, value: raw, reason: 'missing file' });
  }
}

for (const card of cards) {
  const isBuyer = String(card?.category || '').toLowerCase().includes('buyer');

  if (isBuyer) {
    validatePath(card, 'image_buying', true);
  } else {
    validatePath(card, 'image_business', true);
    validatePath(card, 'image_male', true);
    validatePath(card, 'image_female', true);
  }

  // Backward compatibility field is still allowed if present.
  validatePath(card, 'image', false);
}

if (missing.length) {
  console.error('Manifest image validation failed:');
  for (const item of missing) {
    console.error(`- ${item.id}.${item.key}: ${item.value} (${item.reason})`);
  }
  process.exit(1);
}

console.log(`Validated ${cards.length} cards. All required image paths exist under public/.`);
