"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createBridge } = require("../public/garvey-learning/garvey-activity-bridge");

const html = fs.readFileSync(path.join(__dirname,
  "../public/garvey-learning/rainbow-grammar-kingdom.html"), "utf8");

test("Grammar game loads the existing Garvey bridge; inline game still parses", () => {
  assert.match(html, /<script src="\/garvey-learning\/garvey-activity-bridge\.js"><\/script>/);
  const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]).filter(Boolean);
  assert.equal(inline.length, 1);
  assert.doesNotThrow(() => new vm.Script(inline[0], { filename: "rainbow-grammar-kingdom.html" }));
  assert.doesNotMatch(html, /fetch\(|XMLHttpRequest|sendBeacon|localStorage/);
});

test("announced sky rule changes and new Sky Catch rounds are recorded without treating them as scores", () => {
  const rule = html.slice(html.indexOf("function announceSkyRule("), html.indexOf("function addTarget()"));
  const start = html.slice(html.indexOf("function startSky("), html.indexOf("$('start').onclick"));
  assert.match(rule, /observeGrammar\('rule_changed'/);
  assert.match(rule, /practiceTags:\['rule_switching','selective_attention'\]/);
  assert.match(start, /observeGrammar\('task_started'/);
});

test("Sky Catch records real correct and incorrect taps, not missed falling items", () => {
  const tap = html.slice(html.indexOf("el.onclick=()=>{if(!active||paused)"), html.indexOf("targets.push(target);"));
  assert.match(tap, /if\(type!==\$\('targetType'\)\.value\)\{observeGrammar\('answer_submitted'/);
  assert.match(tap, /outcome:'incorrect'/);
  assert.match(tap, /outcome:'correct'/);
  const frame = html.slice(html.indexOf("function frame(time)"), html.indexOf("function startSky()"));
  assert.doesNotMatch(frame, /observeGrammar\('answer_submitted'/);
});

test("Sentence Magic is unscored creative exploration; Sentence Builder captures attempts and undo", () => {
  const magic = html.slice(html.indexOf("function renderSwap()"), html.indexOf("const SENTENCES="));
  assert.match(magic, /taskId:'sentence_magic'/);
  assert.match(magic, /outcome:'unscored'/);
  assert.doesNotMatch(magic, /'plan_revised'/);
  const builder = html.slice(html.indexOf("let buildIndex=0"), html.indexOf("const PUNCTS="));
  assert.match(builder, /taskId:'sentence_builder'/);
  assert.match(builder, /attemptNumber:grammarAttempt/);
  assert.match(builder, /outcome:ok\?'correct':'incorrect'/);
  assert.match(builder, /observeGrammar\('retry'/);
  assert.match(builder, /observeGrammar\('plan_revised'/);
});

test("Word Detective, punctuation and capitals emit item-specific observable outcomes", () => {
  for (const task of ["word_detective", "punctuation_check", "capitalization_check"]) {
    assert.ok(html.includes("taskId:'" + task + "'"));
  }
  for (const skill of ["word_categories", "ending_punctuation", "capital_letters"]) {
    assert.ok(html.includes("skillId:'" + skill + "'"));
  }
  assert.match(html, /attemptNumber:grammarAttempt\('punct_'/);
  assert.match(html, /attemptNumber:grammarAttempt\('caps_'/);
});

test("existing feedback and game rules are preserved", () => {
  assert.match(html, /if\(type!==\$\('targetType'\)\.value\)\{[\s\S]*?streak=0/);
  assert.match(html, /function renderPunct\(/);
  assert.match(html, /function renderCaps\(/);
  assert.match(html, /function renderBuild\(/);
  assert.match(html, /function startSky\(/);
  assert.match(html, /function clearSky\(/);
});

test("a wrong academic answer never produces a low-Genius interpretation", () => {
  const activity = createBridge({ activityId: "rainbow-grammar" });
  const wrong = activity.record("answer_submitted", {
    taskId: "punctuation_check", skillId: "ending_punctuation", outcome: "incorrect",
    practiceTags: ["selective_attention"], geniusDimensionCodes: ["SR", "FB"],
    rawWord: "private", learnerId: "client_supplied",
  });
  assert.equal(wrong.academic.outcome, "incorrect");
  assert.equal(wrong.genius_exploration.evidence_level, "opportunity_only");
  assert.equal(wrong.academic.skill_area, "grammar");
  assert.doesNotMatch(JSON.stringify(wrong), /private|learnerId|low_genius/);
  const creative = activity.record("answer_submitted", {
    taskId: "sentence_magic", skillId: "word_choice", ruleId: "verb",
    outcome: "unscored", geniusDimensionCodes: ["CR", "RS"],
  });
  assert.equal(creative.academic.outcome, "unscored");
});
