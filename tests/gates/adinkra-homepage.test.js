'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
test('Gates HTML exposes the Adinkra discovery console and retains parent routes',()=>{
  const html=read('public/gates.html');
  assert.match(html,/id="seven-practices"/);
  assert.equal((html.match(/data-gate-day="/g)||[]).length,7);
  assert.match(html,/href="\/gates\/signup"/);
  assert.match(html,/href="\/gamehub\/content\/index.html"/);
  assert.match(html,/href="\/ten-gates-journey.html"/);
  assert.match(html,/src="\/gates-landing.js"/);
});
test('Dynamic Gates landing contains same seven-day section',()=>{
  const js=read('public/gates.js');
  assert.match(js,/function renderLanding/);
  assert.match(js,/id="seven-practices"/);
  assert.equal((js.match(/data-gate-day="/g)||[]).length,7);
});
test('Homepage JS keeps meanings separate from authentic glyph assets',()=>{
  const js=read('public/gates-landing.js');
  assert.match(js,/Artw[o]?rk requires review/);
  assert.match(js,/MutationObserver/);
  assert.match(js,/aria-pressed/);
});
