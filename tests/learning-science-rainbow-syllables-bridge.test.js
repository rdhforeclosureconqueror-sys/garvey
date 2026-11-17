"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const html = fs.readFileSync(path.join(__dirname, "../public/garvey-learning/rainbow-syllable-academy.html"), "utf8");
const { createBridge } = require("../public/garvey-learning/garvey-activity-bridge");

test("Syllables still includes the existing standalone game and loads only the shared bridge", () => {
  assert.match(html, /<script src="\/garvey-learning\/garvey-activity-bridge\.js"><\/script>/);
  assert.match(html, /function startGame\(/);
  assert.match(html, /function announceMissionChange\(/);
  assert.match(html, /function renderBuild\(/);
  assert.match(html, /function score\(/);
  assert.match(html, /localStorage\.getItem\('nia360_progress_v2'\)/);
  assert.doesNotMatch(html, /fetch\(|XMLHttpRequest|sendBeacon/);
});

test("inline game JavaScript remains syntactically valid after instrumentation", () => {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length >= 2, true);
  const inline = scripts.map(match => match[1]).filter(Boolean);
  assert.equal(inline.length, 1);
  assert.doesNotThrow(() => new vm.Script(inline[0], { filename: "rainbow-syllable-academy.html" }));
});

test("confidence selection is not recorded as objective academic correctness", () => {
  const relevant = html.match(/\$\('markKnow'\)\.onclick[\s\S]*?\$\('nextCard'\)\.onclick/);
  assert.ok(relevant);
  assert.match(relevant[0], /reflection_submitted/);
  assert.match(relevant[0], /ready_to_continue/);
  assert.match(relevant[0], /want_more_practice/);
  assert.doesNotMatch(relevant[0], /observeSyllable\('answer_submitted'/);
});

test("word-building and rule-change observations are present at real gameplay decision points", () => {
  assert.match(html, /buildAttempts\+\+;observeSyllable\('answer_submitted'/);
  assert.match(html, /outcome:answer===expected\?'correct':'incorrect'/);
  assert.match(html, /observeSyllable\('retry',\{taskId:'word_build'/);
  assert.match(html, /observeSyllable\('rule_changed',\{taskId:'sky_blaster'/);
  assert.match(html, /observeSyllable\('task_started',\{taskId:'sky_blaster'/);
});

test("wrong Sky Blaster touches remain ignored rather than inventing a learner-error event", () => {
  const start = html.indexOf("function shoot(t){");
  const stop = html.indexOf("function updateGame(){", start);
  const body = html.slice(start, stop);
  const earlyReturn = body.indexOf("if(!correct)return;");
  const observation = body.indexOf("observeSyllable('answer_submitted'");
  assert.ok(earlyReturn > 0 && observation > earlyReturn);
  assert.match(body, /outcome:'correct'/);
});

test("sample observations preserve separate academic, executive and Genius lanes", () => {
  const bridge = createBridge({ activityId: "rainbow-syllables" });
  const confidence = bridge.record("reflection_submitted", {
    taskId: "flashcard", skillId: "sight_word_confidence",
    reflection: "want_more_practice", practiceTags: ["self_reflection"],
    geniusDimensionCodes: ["SR"],
  });
  const written = bridge.record("answer_submitted", {
    taskId: "word_build", skillId: "word_spelling", ruleId: "closed",
    attemptNumber: 1, outcome: "incorrect",
    practiceTags: ["sequencing"], geniusDimensionCodes: ["RS", "FB"],
  });
  assert.equal(confidence.academic.outcome, "not_applicable");
  assert.equal(confidence.reflection_choice, "want_more_practice");
  assert.equal(written.academic.outcome, "incorrect");
  assert.equal(written.genius_exploration.evidence_level, "opportunity_only");
  assert.equal(written.executive_practice.practice_tags[0], "sequencing");
});
