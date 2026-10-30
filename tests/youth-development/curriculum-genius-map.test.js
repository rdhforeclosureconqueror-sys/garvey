"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  CONTENT_BINDINGS,
  CURRICULUM_GENIUS_MAP,
  GENIUS_DIMENSIONS,
  getCurriculumGeniusMapping,
} = require("../../youth-development/content/curriculumGeniusMap");

test("curriculum genius map uses Garvey's seven authoritative dimensions", () => {
  assert.deepEqual(Object.keys(GENIUS_DIMENSIONS).sort(), ["CQ", "CR", "DE", "FB", "PS", "RS", "SR"]);
  for (const activity of Object.values(CURRICULUM_GENIUS_MAP)) {
    assert.ok(activity.practice_tags.length > 0);
    assert.ok(activity.genius_dimension_codes.every((code) => GENIUS_DIMENSIONS[code]));
  }
});

test("current Sight Memory and lesson packages resolve to mapped activities", () => {
  for (const [contentId, binding] of Object.entries(CONTENT_BINDINGS)) {
    const resolved = getCurriculumGeniusMapping(contentId);
    assert.equal(resolved.mapping_id, binding.mapping_id);
    assert.ok(resolved.activity);
    if (binding.package_path) assert.ok(fs.existsSync(path.resolve(__dirname, "../..", binding.package_path)));
  }
});

test("Sight Memory exposes a stable content ID and observation event", () => {
  const html = fs.readFileSync(path.resolve(__dirname, "../../public/gamehub/sight-memory.html"), "utf8");
  assert.match(html, /data-garvey-content-id="gamehub\/sight-memory"/);
  assert.match(html, /garvey:activity-observation/);
  assert.match(html, /accuracy: questionCount \? correctCount \/ questionCount : 0/);
});
