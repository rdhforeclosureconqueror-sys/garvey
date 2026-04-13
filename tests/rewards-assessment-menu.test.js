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

  assert.deepEqual(options.map((x) => x.key), ["voc", "love", "leadership", "loyalty"]);
  assert.equal(options[0].title, "Voice of the Customer");
  assert.equal(options[1].title, "Love Archetype");
  assert.equal(options[2].title, "Leadership Archetype");
  assert.equal(options[3].title, "Loyalty Archetype");
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
  assert.match(links.love, /^\/archetype-engines\/love\/browse\?/);
  assert.match(links.leadership, /^\/archetype-engines\/leadership\/browse\?/);
  assert.match(links.loyalty, /^\/archetype-engines\/loyalty\/browse\?/);

  for (const href of Object.values(links)) {
    assert.match(href, /tenant=demo/);
    assert.match(href, /email=user%40example\.com/);
    assert.match(href, /name=Jane/);
    assert.match(href, /cid=c-1/);
    assert.match(href, /crid=r-1/);
    assert.match(href, /source_type=tap/);
  }
});
