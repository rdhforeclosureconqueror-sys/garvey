"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createBridge } = require("../public/garvey-learning/garvey-activity-bridge");

const html = fs.readFileSync(path.join(__dirname,
  "../public/garvey-learning/rainbow-writing-adventure.html"), "utf8");

test("writing game remains self-contained and JavaScript is valid", () => {
  assert.match(html, /<script src="\/garvey-learning\/garvey-activity-bridge\.js"><\/script>/);
  const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).filter(Boolean);
  assert.equal(inline.length, 1);
  assert.doesNotThrow(() => new vm.Script(inline[0], { filename: "rainbow-writing-adventure.html" }));
  assert.match(html, /localStorage\.setItem\(storageKey/);
  assert.doesNotMatch(html, /fetch\(|XMLHttpRequest|sendBeacon/);
});

test("planning and drafting record process observation without content or unverified quality", () => {
  const plan = html.match(/\$\('checkPlan'\)\.onclick=[^\n]+/);
  const draft = html.match(/\$\('checkStory'\)\.onclick=[^\n]+/);
  assert.ok(plan && draft);
  assert.match(plan[0], /taskId:'story_plan'/);
  assert.match(plan[0], /skillId:'writing_plan'/);
  assert.match(plan[0], /outcome:'unscored'/);
  assert.match(draft[0], /taskId:'story_draft'/);
  assert.match(draft[0], /skillId:'story_structure'/);
  assert.match(draft[0], /outcome:'unscored'/);
  assert.doesNotMatch(plan[0] + draft[0], /outcome:'correct'/);
});

test("model detail choices and actual child revision are distinguished", () => {
  const model = html.match(/function renderDetail\(\)\{[^\n]+/);
  assert.ok(model);
  assert.match(model[0], /skillId:'revision_detail'/);
  assert.doesNotMatch(model[0], /'plan_revised'/);
  assert.match(html, /if\(draftWasChecked&&!revisionRecorded\)\{observeWriting\('plan_revised'/);
  assert.match(html, /revisionRecorded=true/);
});

test("edit attempts, incorrect retry, and hints emit task evidence, not raw sentence text", () => {
  const edit = html.match(/\$\('checkEdit'\)\.onclick=[^\n]+/);
  assert.ok(edit);
  assert.match(edit[0], /skillId:'sentence_editing'/);
  assert.match(edit[0], /outcome:isCorrect\?'correct':'incorrect'/);
  assert.match(edit[0], /observeWriting\('retry'/);
  assert.match(html, /observeWriting\('hint_used',\{taskId:'sentence_edit_'/);
  assert.match(html, /supportUsed:\['hint'\]/);
});

test("a new writing adventure gets a fresh bridge session", () => {
  assert.match(html, /function resetScenario\(\)\{writingAttempts\.clear\(\);draftWasChecked=false;revisionRecorded=false;writingBridge=newWritingBridge\(\)/);
  assert.match(html, /writingBridge\.start\('story_plan'\)/);
  assert.match(html, /if\(writingBridge\)writingBridge\.start\('story_plan'\)/);
});

test("optional reflection comes before publish completion with no story text in the event", () => {
  assert.match(html, /id="learningReflection"/);
  const publish = html.match(/\$\('publishBtn'\)\.onclick=[^\n]+/);
  assert.ok(publish);
  assert.match(publish[0], /if\(reflection\)observeWriting\('reflection_submitted'/);
  assert.match(publish[0], /observeWriting\('activity_completed'/);
  assert.ok(publish[0].indexOf("reflection_submitted") < publish[0].indexOf("activity_completed"));
  assert.match(publish[0], /outcome:'unscored'/);
  assert.doesNotMatch(publish[0], /observeWriting\([^;]*\btext\b/);
});

test("shared bridge drops unapproved child-written text, keeping four evidence lanes separate", () => {
  const bridge = createBridge({ activityId: "rainbow-writing" });
  const plan = bridge.record("answer_submitted", {
    taskId: "story_plan", skillId: "writing_plan", outcome: "unscored",
    practiceTags: ["sequencing"], geniusDimensionCodes: ["SR", "RS"],
    rawStory: "My private story", childName: "private child",
  });
  assert.equal(plan.academic.skill_area, "writing");
  assert.equal(plan.academic.outcome, "unscored");
  assert.deepEqual(plan.executive_practice.practice_tags, ["sequencing"]);
  assert.equal(plan.genius_exploration.evidence_level, "opportunity_only");
  assert.doesNotMatch(JSON.stringify(plan), /My private story|private child|rawStory|childName/);
  const reflection = bridge.record("reflection_submitted", {
    taskId: "author_review", reflection: "used_feedback",
    practiceTags: ["self_reflection"],
  });
  assert.equal(reflection.reflection_choice, "used_feedback");
  assert.equal(reflection.academic.outcome, "not_applicable");
  assert.equal(bridge.complete({taskId:"author_review", outcome:"unscored"}).event_type, "activity_completed");
});
