"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("static game files exist", () => {
  ["public/gates/practice-games/brain-game-suite.html","public/gates/practice-games/brick-burst.html","public/gates/practice-games/neurospark-kids-lab.html"].forEach((f)=>assert.equal(fs.existsSync(f), true));
});

test("gates js includes practice routes, launch buttons, and safety copy", () => {
  const js = fs.readFileSync("public/gates.js", "utf8");
  assert.match(js, /\/gates\/practice-games/);
  assert.match(js, /Play Practice Game/);
  assert.match(js, /Explore Practice Games/);
  assert.match(js, /These games are optional developmental practices/);
  assert.doesNotMatch(js, /diagnostic claims/i);
});

test("routes include child practice route auth gate", () => {
  const routes = fs.readFileSync("server/gatesRoutes.js", "utf8");
  assert.match(routes, /\/gates\/child\/:childId\/practice-games\/:gameKey/);
  assert.match(routes, /resolveGatesSession/);
});
