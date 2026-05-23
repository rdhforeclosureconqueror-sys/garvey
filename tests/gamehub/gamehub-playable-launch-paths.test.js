const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const registry = require('../../public/gamehub/gamehub-registry.js');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('every registry launch path resolves to a playable HTML file', () => {
  registry.listGames().forEach((entry) => {
    assert.ok(entry.launch_path, `missing launch_path for ${entry.game_key}`);
    assert.match(entry.launch_path, /\.html$/, `launch_path must be .html for ${entry.game_key}`);
    const rel = entry.launch_path.replace(/^\//, '');
    const full = path.join(root, 'public', rel.replace(/^public\//, ''));
    assert.equal(fs.existsSync(full), true, `missing launch file: ${entry.launch_path}`);
    const html = fs.readFileSync(full, 'utf8').trimStart();
    assert.match(html, /<!DOCTYPE html>|<html/i, `launch path must resolve to HTML content: ${entry.launch_path}`);
  });
});

test('registry launch paths are not attachment-oriented routes', () => {
  registry.listGames().forEach((entry) => {
    assert.doesNotMatch(entry.launch_path, /download|attachment/i, `launch path hints download behavior: ${entry.launch_path}`);
  });
});

test('GameHub and Gates discovery links use playable launch paths', () => {
  const gamehubIndex = read('public/gamehub/index.html');
  const gatesUi = read('public/gates.js');
  assert.match(gamehubIndex, /entry\.launch_path\s*\|\|\s*entry\.file_path/);
  assert.match(gatesUi, /entry\.launch_path\s*\|\|\s*entry\.file_path/);
});

test('playable launch path patch does not add tracking, scoring, or db write wiring', () => {
  const registrySource = read('public/gamehub/gamehub-registry.js');
  const gatesUi = read('public/gates.js');
  const gamehubIndex = read('public/gamehub/index.html');
  const combined = `${registrySource}\n${gatesUi}\n${gamehubIndex}`;
  assert.doesNotMatch(combined, /tracking_ready\s*:\s*true/i);
  assert.doesNotMatch(combined, /gatesScoring|insert\s+into|update\s+gates_|db\.|database\s+write/i);
});
