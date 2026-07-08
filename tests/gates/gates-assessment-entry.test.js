const test = require("node:test");
const assert = require("node:assert/strict");

const { createAssessmentOptions } = require("../../public/js/assessment-menu.js");

function createQuery() {
  return new URLSearchParams({
    entry: "tap-hub",
    tap_source: "tap",
    tap_tag: "spring",
    tap_session: "sess-1",
  });
}

test("assessment selector includes Gates entry while preserving existing cards", () => {
  const options = createAssessmentOptions({
    origin: "https://example.com",
    sourceType: "tap",
    query: createQuery(),
    ctx: { tenant: "demo", email: "user@example.com", name: "Jane", cid: "c-1", rid: "r-1" },
  });

  const labels = options.map((x) => x.title);
  assert.deepEqual(options.map((x) => x.key), ["voc", "love", "leadership", "loyalty", "youth", "leader_within", "gates"]);
  assert.ok(labels.includes("Voice of the Customer"));
  assert.ok(labels.includes("Take Love Assessment"));
  assert.ok(labels.includes("Take Leadership Assessment"));
  assert.ok(labels.includes("Take Loyalty Assessment"));
  assert.ok(labels.includes("Take Youth Assessment"));
  assert.ok(labels.includes("The Leader Within"));
  assert.ok(labels.includes("Youth Rite of Passage Assessment"));

  const youth = options.find((x) => x.key === "youth");
  const leaderWithin = options.find((x) => x.key === "leader_within");
  const gates = options.find((x) => x.key === "gates");
  assert.equal(youth.title, "Take Youth Assessment");
  assert.match(youth.href, /^\/youth-development\/intake\?/);
  assert.equal(leaderWithin.title, "The Leader Within");
  assert.match(leaderWithin.href, /^\/the-leader-within\.html\?/);
  assert.equal(
    gates.description,
    "Explore your child's developmental Gates through guided parent observation.",
  );
  assert.match(gates.href, /^\/gates\?/);
});
