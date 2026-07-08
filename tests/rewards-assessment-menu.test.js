const test = require("node:test");
const assert = require("node:assert/strict");

const { createAssessmentOptions } = require("../public/js/assessment-menu.js");

function createQuery() {
  return new URLSearchParams({
    entry: "tap-hub",
    tap_source: "tap",
    tap_tag: "spring",
    tap_session: "sess-1",
  });
}

test("assessment registry renders all required customer options", () => {
  const options = createAssessmentOptions({
    origin: "https://example.com",
    sourceType: "tap",
    query: createQuery(),
    ctx: { tenant: "demo", email: "user@example.com", name: "Jane", cid: "c-1", rid: "r-1" },
  });

  assert.deepEqual(options.map((x) => x.key), ["voc", "love", "leadership", "loyalty", "youth", "leader_within", "gates"]);
  assert.equal(options[0].title, "Voice of the Customer");
  assert.equal(options[1].title, "Take Love Assessment");
  assert.equal(options[2].title, "Take Leadership Assessment");
  assert.equal(options[3].title, "Take Loyalty Assessment");
  assert.equal(options[4].title, "Take Youth Assessment");
  assert.equal(options[5].title, "The Leader Within");
  assert.equal(options[5].description, "Discover how your leadership shows up through your choices, teamwork, communication, and response to challenges.");
  assert.equal(options[5].secondaryLabel, "Youth Leadership Assessment • Ages 11–18");
  assert.equal(options[6].title, "Youth Rite of Passage Assessment");
});

test("assessment routes stay isolated and carry return-page context", () => {
  const options = createAssessmentOptions({
    origin: "https://example.com",
    sourceType: "tap",
    query: createQuery(),
    ctx: { tenant: "demo", email: "user@example.com", name: "Jane", cid: "c-1", rid: "r-1" },
  });
  const links = Object.fromEntries(options.map((item) => [item.key, item.href]));

  assert.match(links.voc, /^\/voc\.html\?/);
  assert.doesNotMatch(links.voc, /archetype-engines/);
  assert.match(links.love, /^\/archetype-engines\/love\/assessment\?/);
  assert.match(links.leadership, /^\/archetype-engines\/leadership\/assessment\?/);
  assert.match(links.loyalty, /^\/archetype-engines\/loyalty\/assessment\?/);
  assert.match(links.youth, /^\/youth-development\/intake\?/);
  assert.match(links.leader_within, /^\/archetype-engines\/leadership\/assessment\?/);
  assert.doesNotMatch(links.love, /\/browse\?/);
  assert.doesNotMatch(links.leadership, /\/browse\?/);
  assert.doesNotMatch(links.loyalty, /\/browse\?/);
  assert.match(links.gates, /^\/gates\?/);
  assert.doesNotMatch(links.leader_within, /^\/youth-development\/intake/);
  assert.doesNotMatch(links.leader_within, /^\/gates/);
  assert.match(links.leader_within, /audience_type=youth/);
  assert.match(links.leader_within, /assessment_variant=youth/);
  assert.match(links.leader_within, /content_variant=youth/);
  assert.match(links.leader_within, /source_application=garvey/);
  assert.match(links.leader_within, /program_context=leader_within/);
  assert.match(links.leader_within, /first_party_program=true/);

  for (const href of Object.values(links)) {
    assert.match(href, /tenant=demo/);
    assert.match(href, /email=user%40example\.com/);
    assert.match(href, /name=Jane/);
    assert.match(href, /cid=c-1/);
    assert.match(href, /crid=r-1/);
    assert.match(href, /source_type=tap/);
  }
});
