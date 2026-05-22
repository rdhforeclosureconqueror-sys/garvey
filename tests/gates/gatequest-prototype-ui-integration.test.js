"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("gatequest prototype launch links and sandbox wrapper are present", () => {
  const js = fs.readFileSync("public/gates.js", "utf8");
  assert.match(js, /Launch GateQuest Prototype \(Standalone\)/);
  assert.match(js, /\/gates\/prototypes\/gatequest/);
  assert.match(js, /\/gates\/child\/\$\{[^}]+\}\/prototypes\/gatequest/);
  assert.match(js, /sandbox="allow-scripts allow-same-origin"/);
  assert.match(js, /Prototype play does not change official Gates assessments/);
});
