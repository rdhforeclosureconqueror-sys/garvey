"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// This is an import/smoke contract, not a claim that browser gameplay or
// authenticated telemetry has been end-to-end validated.
const cases = [
  ["rainbow-syllable-academy.html", "Rainbow Syllable Academy", "checkBuild"],
  ["rainbow-writing-adventure.html", "Rainbow Writing Adventure", "checkStory"],
  ["rainbow-grammar-kingdom.html", "Rainbow Grammar Kingdom", "targetType"],
];

for (const [filename, title, activityHook] of cases) {
  test("imported Rainbow game retains original standalone activity: " + filename, () => {
    const html = fs.readFileSync(path.join(__dirname, "../public/garvey-learning", filename), "utf8");
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /<script/i);
    assert.ok(html.includes(title));
    assert.ok(html.includes(activityHook));
    assert.ok(html.length > 15000, "source must be a full playable HTML file");
  });
}
